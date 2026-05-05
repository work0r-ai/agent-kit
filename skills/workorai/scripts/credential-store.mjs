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
const ACCOUNT = 'candidate';
const ENV_KEY = 'WORKORAI_MCP_API_KEY';
const CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
const SHARED_FILE_PATH = join(CONFIG_HOME, 'workorai', 'mcp-token');
const TOKEN_PATTERN = /^wai_\S{16,}$/;

const [, , command, ...args] = process.argv;

const usage = () => {
  console.error(`Usage:
  node credential-store.mjs get
  node credential-store.mjs save [--best-effort|--shared-file]
  node credential-store.mjs delete [--shared-file]

save reads the WorkorAI MCP key from piped stdin or prompts in an interactive terminal.
get prints the key to stdout only when found.
Default read order: env(${ENV_KEY}) -> OS secret store -> shared file fallback.
Default save backend: OS secret store.
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
