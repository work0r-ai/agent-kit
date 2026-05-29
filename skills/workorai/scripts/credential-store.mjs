#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

const SERVICE = 'workorai';
const CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
const TOKEN_PATTERN = /^wai_\S{16,}$/;

// Role-aware storage slots — see
// `docs/plans/2026-05-29-workorai-skill-employer-update-design.md`
// (Q4 in the WorkorAI repo).
const ROLE_VALUES = new Set(['candidate', 'employer']);
const DEFAULT_ROLE = 'candidate';
const ENV_KEY_BY_ROLE = {
  candidate: 'WORKORAI_MCP_API_KEY',
  employer: 'WORKORAI_EMPLOYER_MCP_API_KEY',
};
const SHARED_FILE_BY_ROLE = {
  candidate: join(CONFIG_HOME, 'workorai', 'mcp-token'),
  employer: join(CONFIG_HOME, 'workorai', 'mcp-token-employer'),
};
// OS secret store account name. Distinguishes roles inside the same
// service entry so candidate + employer keys coexist.
const ACCOUNT_BY_ROLE = {
  candidate: 'candidate',
  employer: 'employer',
};

const extractRoleFlag = (argv) => {
  let role = DEFAULT_ROLE;
  const rest = [];
  for (const arg of argv) {
    const match = /^--role(?:=(.+))?$/.exec(arg);
    if (!match) {
      rest.push(arg);
      continue;
    }
    const value = match[1];
    if (!value || !ROLE_VALUES.has(value)) {
      throw new Error(
        `--role requires one of: ${[...ROLE_VALUES].join(', ')}`,
      );
    }
    role = value;
  }
  return { role, rest };
};

const rawArgs = process.argv.slice(2);
const command = rawArgs[0];
let role;
let args;
try {
  const extracted = extractRoleFlag(rawArgs.slice(1));
  role = extracted.role;
  args = extracted.rest;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const ACCOUNT = ACCOUNT_BY_ROLE[role];
const ENV_KEY = ENV_KEY_BY_ROLE[role];
const SHARED_FILE_PATH = SHARED_FILE_BY_ROLE[role];

// Test isolation hook — set `WORKORAI_DISABLE_OS_KEYSTORE=1` to short-
// circuit the macOS/Linux/Windows secret-store paths so the tests can
// exercise env + shared-file behaviour without touching the real
// keystore (which would prompt for unlock or fail in CI).
const OS_KEYSTORE_DISABLED = process.env.WORKORAI_DISABLE_OS_KEYSTORE === '1';

const usage = () => {
  console.error(`Usage:
  node credential-store.mjs get [--role=candidate|employer]
  node credential-store.mjs save [--role=candidate|employer] [--best-effort|--shared-file]
  node credential-store.mjs delete [--role=candidate|employer] [--shared-file]

save reads the WorkorAI MCP key from piped stdin or prompts in an interactive terminal.
get prints the key to stdout only when found.
Default read order: env(${ENV_KEY}) -> OS secret store -> shared file fallback.
Default save backend: OS secret store.
Default role is 'candidate'. Pass --role=employer to use the employer key slot
(env WORKORAI_EMPLOYER_MCP_API_KEY, file ~/.config/workorai/mcp-token-employer,
OS keystore account 'employer').
Use --best-effort after explicit consent to save to OS secret store, then fall back to the shared 0600 file if OS storage is unavailable.
Use --shared-file only when the user explicitly chooses file fallback.`);
};

const normalizeToken = (value) => value.trim();

const redactSecrets = (value) => value.replace(/wai_\S+/g, 'wai_[REDACTED]');

const assertValidToken = (token) => {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error('Invalid WorkorAI MCP key format. Expected wai_... token.');
  }
};

const commandExists = (name) => {
  const checker = platform() === 'win32' ? 'where' : 'command';
  const checkerArgs = platform() === 'win32' ? [name] : ['-v', name];
  const result = spawnSync(checker, checkerArgs, {
    shell: platform() !== 'win32',
    stdio: 'ignore',
  });

  return result.status === 0;
};

const readHiddenTtyToken = async () => {
  if (!process.stdin.isTTY) {
    throw new Error(
      'No WorkorAI MCP key provided on stdin. Run this command in an interactive terminal and paste the key when prompted, or pass it through stdin.'
    );
  }

  process.stderr.write('Paste WorkorAI MCP key: ');
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  const canUseRawMode = typeof process.stdin.setRawMode === 'function';

  if (canUseRawMode) {
    process.stdin.setRawMode(true);
  }

  let token = '';

  return await new Promise((resolvePromise, rejectPromise) => {
    const cleanup = () => {
      process.stdin.off('data', handleData);

      if (canUseRawMode) {
        process.stdin.setRawMode(false);
      }

      process.stdin.pause();
    };

    const handleData = (chunk) => {
      for (const char of String(chunk)) {
        if (char === '\u0003') {
          cleanup();
          process.stderr.write('\n');
          rejectPromise(new Error('Cancelled.'));
          return;
        }

        if (char === '\r' || char === '\n') {
          cleanup();
          process.stderr.write('\n');
          resolvePromise(normalizeToken(token));
          return;
        }

        if (char === '\u007f' || char === '\b') {
          token = token.slice(0, -1);
          continue;
        }

        token += char;
      }
    };

    process.stdin.on('data', handleData);
  });
};

const readTokenForSave = async () => {
  if (!process.stdin.isTTY) {
    const input = readFileSync(0, 'utf8');
    const token = normalizeToken(input);

    if (!token) {
      throw new Error(
        'No WorkorAI MCP key provided on stdin. Run this command in an interactive terminal/PTY and paste the key when prompted, or pass it through stdin.'
      );
    }

    assertValidToken(token);
    return token;
  }

  const token = await readHiddenTtyToken();
  assertValidToken(token);
  return token;
};

const tryGetFromEnv = () => {
  const token = normalizeToken(process.env[ENV_KEY] ?? '');

  if (!token) {
    return null;
  }

  assertValidToken(token);
  return token;
};

const getFromMacKeychain = () => {
  if (platform() !== 'darwin') {
    return null;
  }

  try {
    return normalizeToken(
      execFileSync('/usr/bin/security', [
        'find-generic-password',
        '-a',
        ACCOUNT,
        '-s',
        SERVICE,
        '-w',
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    );
  } catch {
    return null;
  }
};

const saveToMacKeychain = (token) => {
  const result = spawnSync('/usr/bin/security', [
    'add-generic-password',
    '-a',
    ACCOUNT,
    '-s',
    SERVICE,
    '-w',
    token,
    '-U',
  ], { encoding: 'utf8' });

  if (result.status === 0) {
    return;
  }

  const details = redactSecrets(
    normalizeToken(result.stderr || result.stdout || result.error?.message || 'No system error details.')
  );

  throw new Error(
    `macOS Keychain save failed (exit ${result.status ?? 'unknown'}): ${details}. If this is a headless or sandboxed agent session, allow Keychain access, use ${ENV_KEY}, or explicitly approve shared file fallback with --shared-file.`
  );
};

const deleteFromMacKeychain = () => {
  try {
    execFileSync('/usr/bin/security', [
      'delete-generic-password',
      '-a',
      ACCOUNT,
      '-s',
      SERVICE,
    ], { stdio: 'ignore' });
  } catch {
    // Missing credentials are already deleted.
  }
};

const getFromLinuxSecretService = () => {
  if (platform() !== 'linux' || !commandExists('secret-tool')) {
    return null;
  }

  try {
    return normalizeToken(
      execFileSync('secret-tool', [
        'lookup',
        'service',
        SERVICE,
        'account',
        ACCOUNT,
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    );
  } catch {
    return null;
  }
};

const saveToLinuxSecretService = (token) => {
  if (!commandExists('secret-tool')) {
    throw new Error(`secret-tool is not installed. Use ${ENV_KEY} or --shared-file.`);
  }

  execFileSync('secret-tool', [
    'store',
    '--label',
    'WorkorAI MCP key',
    'service',
    SERVICE,
    'account',
    ACCOUNT,
  ], { input: token, stdio: ['pipe', 'ignore', 'ignore'] });
};

const deleteFromLinuxSecretService = () => {
  if (!commandExists('secret-tool')) {
    return;
  }

  try {
    execFileSync('secret-tool', [
      'clear',
      'service',
      SERVICE,
      'account',
      ACCOUNT,
    ], { stdio: 'ignore' });
  } catch {
    // Missing credentials are already deleted.
  }
};

const findPowerShell = () => {
  if (platform() !== 'win32') {
    return null;
  }

  if (commandExists('pwsh')) {
    return 'pwsh';
  }

  if (commandExists('powershell')) {
    return 'powershell';
  }

  return null;
};

const getFromPowerShellSecretManagement = () => {
  const powerShell = findPowerShell();

  if (!powerShell) {
    return null;
  }

  try {
    return normalizeToken(
      execFileSync(powerShell, [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-Secret -Name '${SERVICE}' -AsPlainText -ErrorAction Stop`,
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    );
  } catch {
    return null;
  }
};

const saveToPowerShellSecretManagement = (token) => {
  const powerShell = findPowerShell();

  if (!powerShell) {
    throw new Error(`PowerShell is not available. Use ${ENV_KEY} or --shared-file.`);
  }

  const result = spawnSync(powerShell, [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `$secret = ConvertTo-SecureString -String $env:WORKORAI_SECRET_INPUT -AsPlainText -Force; Set-Secret -Name '${SERVICE}' -Secret $secret`,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      WORKORAI_SECRET_INPUT: token,
    },
  });

  if (result.status === 0) {
    return;
  }

  const details = redactSecrets(
    normalizeToken(result.stderr || result.stdout || result.error?.message || 'No system error details.')
  );

  throw new Error(`PowerShell SecretManagement save failed (exit ${result.status ?? 'unknown'}): ${details}`);
};

const removePowerShellSecretManagement = () => {
  const powerShell = findPowerShell();

  if (!powerShell) {
    return;
  }

  try {
    execFileSync(powerShell, [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Remove-Secret -Name '${SERVICE}' -ErrorAction SilentlyContinue`,
    ], { stdio: 'ignore' });
  } catch {
    // Missing credentials are already deleted.
  }
};

const tryGetFromOsStore = () => {
  if (OS_KEYSTORE_DISABLED) {
    return null;
  }

  const token =
    getFromMacKeychain() ??
    getFromLinuxSecretService() ??
    getFromPowerShellSecretManagement();

  if (!token) {
    return null;
  }

  assertValidToken(token);
  return token;
};

const readTokenFile = (filePath) => {
  if (!existsSync(filePath)) {
    return null;
  }

  const fileMode = statSync(filePath).mode & 0o777;

  if (platform() !== 'win32' && fileMode !== 0o600) {
    throw new Error(`${filePath} must have 0600 permissions.`);
  }

  const token = normalizeToken(readFileSync(filePath, 'utf8'));
  assertValidToken(token);
  return token;
};

const saveTokenFile = (filePath, token) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${token}\n`, { mode: 0o600 });

  if (platform() !== 'win32') {
    chmodSync(filePath, 0o600);
  }

  return filePath;
};

const deleteTokenFile = (filePath) => {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
};

const saveToOsStore = (token) => {
  if (OS_KEYSTORE_DISABLED) {
    throw new Error(
      `OS keystore disabled via WORKORAI_DISABLE_OS_KEYSTORE. Use ${ENV_KEY} or --shared-file.`,
    );
  }

  if (platform() === 'darwin') {
    saveToMacKeychain(token);
    return 'macOS Keychain';
  }

  if (platform() === 'linux') {
    saveToLinuxSecretService(token);
    return 'Secret Service';
  }

  if (platform() === 'win32') {
    saveToPowerShellSecretManagement(token);
    return 'PowerShell SecretManagement';
  }

  throw new Error(`No OS secret store backend for ${platform()}. Use ${ENV_KEY} or --shared-file.`);
};

const deleteFromOsStore = () => {
  if (OS_KEYSTORE_DISABLED) {
    return;
  }
  deleteFromMacKeychain();
  deleteFromLinuxSecretService();
  removePowerShellSecretManagement();
};

const handleGet = () => {
  const token = tryGetFromEnv() ?? tryGetFromOsStore() ?? readTokenFile(SHARED_FILE_PATH);

  if (!token) {
    process.exit(1);
  }

  process.stdout.write(`${token}\n`);
};

const handleSave = async () => {
  const token = await readTokenForSave();

  if (args.includes('--shared-file')) {
    const path = saveTokenFile(SHARED_FILE_PATH, token);
    console.error(`Saved WorkorAI MCP key to shared file fallback at ${path}`);
    return;
  }

  try {
    const backend = saveToOsStore(token);
    console.error(`Saved WorkorAI MCP key to ${backend}`);

    if (args.includes('--best-effort')) {
      const path = saveTokenFile(SHARED_FILE_PATH, token);
      console.error(`Mirrored WorkorAI MCP key to shared file fallback at ${path}`);
    }
  } catch (error) {
    if (!args.includes('--best-effort')) {
      throw error;
    }

    const path = saveTokenFile(SHARED_FILE_PATH, token);
    const details = redactSecrets(error instanceof Error ? error.message : String(error));

    console.error(`OS secret store unavailable: ${details}`);
    console.error(`Saved WorkorAI MCP key to shared file fallback at ${path}`);
  }
};

const handleDelete = () => {
  if (args.includes('--shared-file')) {
    deleteTokenFile(SHARED_FILE_PATH);
    return;
  }

  deleteFromOsStore();
};

try {
  if (command === 'get') {
    handleGet();
  } else if (command === 'save') {
    await handleSave();
  } else if (command === 'delete') {
    handleDelete();
  } else {
    usage();
    process.exit(2);
  }
} catch (error) {
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}
