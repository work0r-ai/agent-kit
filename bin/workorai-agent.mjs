#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_ROOT = join(PACKAGE_ROOT, 'skills', 'workorai');
const CREDENTIAL_HELPER = join(TEMPLATE_ROOT, 'scripts', 'credential-store.mjs');
const SKILL_NAME = 'workorai';
const MCP_NAME = 'workorai';
const DEFAULT_ENDPOINT = process.env.WORKORAI_MCP_ENDPOINT || 'https://workorai.com/mcp';
const SUPPORTED_AGENTS = new Set([
  'codex',
  'claude',
  'opencode',
  'cursor',
  'openclaw',
  'qwen',
  'antigravity',
  'deepcode',
  'generic',
  'all',
]);

const usage = () => {
  console.log(`WorkorAI Agent Kit

Usage:
  workorai-agent install [options]
  workorai-agent configure --agent <codex|claude|opencode|cursor|openclaw|qwen|antigravity|deepcode|generic|all> [--endpoint URL]
  workorai-agent print-config --agent <codex|claude|opencode|cursor|openclaw|qwen|antigravity|deepcode|generic> [--endpoint URL]
  workorai-agent credential <get|save|delete> [--shared-file]
  workorai-agent doctor [--agent AGENT] [--endpoint URL]

Options:
  --agent <agent|all>           Limit install/configure to one client. Default: all
  --scope <user|project>       Install skill globally for the user or into a project. Default: user
  --project-dir <path>         Project directory for --scope project. Default: current directory
  --target-dir <path>          Install skill into an explicit directory
  --endpoint <url>             MCP endpoint. Default: ${DEFAULT_ENDPOINT}
  --no-configure               Install skill files only; do not write MCP client configs
  --dry-run                    Show what would change without writing files

Examples:
  npx @workorai/agent-kit install
  npx @workorai/agent-kit install --endpoint http://127.0.0.1:3001/mcp
  npx @workorai/agent-kit install --agent cursor
  npx @workorai/agent-kit install --agent openclaw
  npx @workorai/agent-kit install --agent qwen
  npx @workorai/agent-kit install --agent antigravity
  npx @workorai/agent-kit print-config --agent codex
  npx @workorai/agent-kit credential save --best-effort`);
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const parseArgs = (argv) => {
  const options = {
    _: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      options._.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split('=', 2);
    const name = rawName.trim();

    if (['dry-run', 'shared-file', 'configure', 'no-configure', 'help'].includes(name)) {
      options[name] = true;
      continue;
    }

    const value = inlineValue ?? argv[index + 1];

    if (!value || value.startsWith('--')) {
      fail(`Missing value for --${name}`);
    }

    options[name] = value;

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return options;
};

const expandHome = (pathValue) => {
  if (pathValue === '~') {
    return homedir();
  }

  if (pathValue.startsWith('~/')) {
    return join(homedir(), pathValue.slice(2));
  }

  return pathValue;
};

const ensureAgent = (agent, allowAll = false) => {
  if (!agent) {
    fail('Missing --agent.');
  }

  if (!SUPPORTED_AGENTS.has(agent) || (!allowAll && agent === 'all')) {
    fail(`Unsupported --agent "${agent}".`);
  }
};

const userSkillDirForAgent = (agent) => {
  if (agent === 'codex') {
    return join(homedir(), '.codex', 'skills', SKILL_NAME);
  }

  if (agent === 'claude') {
    return join(homedir(), '.claude', 'skills', SKILL_NAME);
  }

  if (agent === 'opencode') {
    return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'opencode', 'skills', SKILL_NAME);
  }

  if (agent === 'cursor') {
    return join(homedir(), '.cursor', 'skills', SKILL_NAME);
  }

  if (agent === 'qwen') {
    return join(homedir(), '.qwen', 'skills', SKILL_NAME);
  }

  if (agent === 'antigravity') {
    return join(homedir(), '.gemini', 'antigravity', 'skills', SKILL_NAME);
  }

  return join(homedir(), '.agents', 'skills', SKILL_NAME);
};

const canonicalUserSkillDir = () => join(homedir(), '.agents', 'skills', SKILL_NAME);

const projectSkillDirForAgent = (agent, projectDir) => {
  if (agent === 'claude') {
    return join(projectDir, '.claude', 'skills', SKILL_NAME);
  }

  if (agent === 'opencode') {
    return join(projectDir, '.opencode', 'skills', SKILL_NAME);
  }

  if (agent === 'cursor') {
    return join(projectDir, '.cursor', 'skills', SKILL_NAME);
  }

  if (agent === 'qwen') {
    return join(projectDir, '.qwen', 'skills', SKILL_NAME);
  }

  if (agent === 'deepcode') {
    return join(projectDir, '.deepcode', 'skills', SKILL_NAME);
  }

  return join(projectDir, '.agents', 'skills', SKILL_NAME);
};

const canonicalProjectSkillDir = (projectDir) => join(projectDir, '.agents', 'skills', SKILL_NAME);

const expandAgents = (agent) => {
  if (agent !== 'all') {
    return [agent];
  }

  return [
    'codex',
    'claude',
    'opencode',
    'cursor',
    'openclaw',
    'qwen',
    'antigravity',
    'deepcode',
    'generic',
  ];
};

const resolveInstallTargets = (options) => {
  const agent = options.agent || 'all';
  const scope = options.scope || 'user';
  const projectDir = resolve(expandHome(options['project-dir'] || process.cwd()));

  ensureAgent(agent, true);

  if (!['user', 'project'].includes(scope)) {
    fail('--scope must be "user" or "project".');
  }

  if (options['target-dir']) {
    return [
      {
        agent,
        scope: 'custom',
        dir: resolve(expandHome(options['target-dir'])),
      },
    ];
  }

  const seen = new Set();
  const targets = [];

  for (const agentName of expandAgents(agent)) {
    const dir = scope === 'project'
      ? projectSkillDirForAgent(agentName, projectDir)
      : userSkillDirForAgent(agentName);
    const resolvedDir = resolve(dir);

    if (seen.has(resolvedDir)) {
      continue;
    }

    seen.add(resolvedDir);
    targets.push({
      agent: agentName,
      scope,
      dir: resolvedDir,
    });
  }

  return targets;
};

const removeExistingPath = (pathValue) => {
  if (!existsSync(pathValue)) {
    return;
  }

  rmSync(pathValue, {
    recursive: true,
    force: true,
  });
};

const copySkillToDir = (dir, label, dryRun) => {
  if (!existsSync(TEMPLATE_ROOT)) {
    fail(`Missing skill template at ${TEMPLATE_ROOT}`);
  }

  if (dryRun) {
    console.log(`[dry-run] install ${TEMPLATE_ROOT} -> ${dir}`);
    return;
  }

  removeExistingPath(dir);
  mkdirSync(dirname(dir), { recursive: true });
  cpSync(TEMPLATE_ROOT, dir, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });

  const helperPath = join(dir, 'scripts', 'credential-store.mjs');

  if (existsSync(helperPath)) {
    chmodSync(helperPath, 0o755);
  }

  console.log(`Installed ${label} at ${dir}`);
};

const aliasOrCopySkill = (sourceDir, target, dryRun) => {
  if (resolve(sourceDir) === resolve(target.dir)) {
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] link ${target.dir} -> ${sourceDir}`);
    return;
  }

  removeExistingPath(target.dir);
  mkdirSync(dirname(target.dir), { recursive: true });

  try {
    symlinkSync(sourceDir, target.dir, 'dir');
    console.log(`Linked ${SKILL_NAME} for ${target.agent} at ${target.dir}`);
    return;
  } catch {
    cpSync(sourceDir, target.dir, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
    console.log(`Copied ${SKILL_NAME} for ${target.agent} at ${target.dir}`);
  }
};

const resolveInstallPlan = (options) => {
  const agent = options.agent || 'all';
  const scope = options.scope || 'user';
  const projectDir = resolve(expandHome(options['project-dir'] || process.cwd()));

  ensureAgent(agent, true);

  if (!['user', 'project'].includes(scope)) {
    fail('--scope must be "user" or "project".');
  }

  if (options['target-dir']) {
    return {
      canonical: {
        agent,
        scope: 'custom',
        dir: resolve(expandHome(options['target-dir'])),
      },
      aliases: [],
    };
  }

  const canonicalDir = scope === 'project'
    ? canonicalProjectSkillDir(projectDir)
    : canonicalUserSkillDir();
  const aliases = resolveInstallTargets(options).filter((target) => resolve(target.dir) !== resolve(canonicalDir));

  return {
    canonical: {
      agent: 'universal',
      scope,
      dir: resolve(canonicalDir),
    },
    aliases,
  };
};

const handleInstall = (options) => {
  const plan = resolveInstallPlan(options);
  const dryRun = Boolean(options['dry-run']);

  copySkillToDir(plan.canonical.dir, `${SKILL_NAME} universal skill`, dryRun);

  for (const target of plan.aliases) {
    aliasOrCopySkill(plan.canonical.dir, target, dryRun);
  }

  if (!options['no-configure']) {
    handleConfigure(options);
  }

  console.log('');
  console.log(`Universal skill: ${plan.canonical.dir}`);
  console.log(`Shared credential store: ${join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'workorai', 'mcp-token')}`);
};

const writeTextFile = (filePath, content, dryRun) => {
  if (dryRun) {
    console.log(`[dry-run] write ${filePath}`);
    return;
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
};

const readJsonFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = readFileSync(filePath, 'utf8').trim();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Cannot parse JSON config at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const writeJsonFile = (filePath, value, dryRun) => {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`, dryRun);
};

const removeTomlSection = (content, sectionName) => {
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionPattern = new RegExp(`\\n?\\[${escapedName}\\][\\s\\S]*?(?=\\n\\[[^\\]]+\\]|$)`, 'g');

  return content.replace(sectionPattern, '').trimEnd();
};

const upsertTomlSection = (filePath, sectionName, body, dryRun) => {
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const withoutOldSection = removeTomlSection(existing, sectionName);
  const withoutOldHeaders = removeTomlSection(withoutOldSection, `${sectionName}.http_headers`);
  const prefix = withoutOldHeaders.trimEnd();
  const nextContent = `${prefix ? `${prefix}\n\n` : ''}[${sectionName}]\n${body.trim()}\n`;

  writeTextFile(filePath, nextContent, dryRun);
};

const configureCodex = (endpoint, dryRun) => {
  const configPath = join(homedir(), '.codex', 'config.toml');

  upsertTomlSection(
    configPath,
    `mcp_servers.${MCP_NAME}`,
    `url = "${endpoint}"
startup_timeout_sec = 20.0
tool_timeout_sec = 120.0`,
    dryRun
  );

  console.log(`${dryRun ? '[dry-run] ' : ''}Configured codex MCP at ${configPath}`);
};

const configureClaude = (endpoint, dryRun) => {
  const configPath = join(homedir(), '.claude.json');
  const config = readJsonFile(configPath);

  config.mcpServers = {
    ...(config.mcpServers ?? {}),
    [MCP_NAME]: {
      type: 'http',
      url: endpoint,
    },
  };

  writeJsonFile(configPath, config, dryRun);
  console.log(`${dryRun ? '[dry-run] ' : ''}Configured claude MCP at ${configPath}`);
};

const configureOpenCode = (endpoint, dryRun) => {
  const configPath = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'opencode', 'config.json');
  const config = readJsonFile(configPath);

  config.mcp = {
    ...(config.mcp ?? {}),
    [MCP_NAME]: {
      type: 'remote',
      url: endpoint,
      enabled: true,
      oauth: false,
      timeout: 120000,
    },
  };

  writeJsonFile(configPath, config, dryRun);
  console.log(`${dryRun ? '[dry-run] ' : ''}Configured opencode MCP at ${configPath}`);
};

const configureGeneric = (agent, endpoint, dryRun) => {
  const configPath = join(homedir(), '.agents', 'mcp.json');
  const config = readJsonFile(configPath);

  config.mcpServers = {
    ...(config.mcpServers ?? {}),
    [MCP_NAME]: {
      type: 'http',
      url: endpoint,
    },
  };

  writeJsonFile(configPath, config, dryRun);
  console.log(`${dryRun ? '[dry-run] ' : ''}Configured ${agent} MCP at ${configPath}`);
};

const shouldUseGenericMcpConfig = (agentName) =>
  ['openclaw', 'deepcode', 'generic'].includes(agentName);

const handleConfigure = (options) => {
  const agent = options.agent || 'all';
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const dryRun = Boolean(options['dry-run']);
  const configuredPaths = new Set();

  ensureAgent(agent, true);

  for (const agentName of expandAgents(agent)) {
    if (agentName === 'codex') {
      configureCodex(endpoint, dryRun);
      continue;
    }

    if (agentName === 'claude') {
      configureClaude(endpoint, dryRun);
      continue;
    }

    if (agentName === 'opencode') {
      configureOpenCode(endpoint, dryRun);
      continue;
    }

    if (!shouldUseGenericMcpConfig(agentName)) {
      continue;
    }

    const genericPath = join(homedir(), '.agents', 'mcp.json');
    if (configuredPaths.has(genericPath)) {
      continue;
    }

    configuredPaths.add(genericPath);
    configureGeneric(agentName, endpoint, dryRun);
  }
};

const handleSetup = (options) => {
  handleInstall({
    ...options,
    configure: true,
  });
};

const printJson = (value) => {
  console.log(JSON.stringify(value, null, 2));
};

const printCodexConfig = (endpoint) => {
  console.log(`# ~/.codex/config.toml
[mcp_servers.${MCP_NAME}]
url = "${endpoint}"
startup_timeout_sec = 20.0
tool_timeout_sec = 120.0`);
};

const printClaudeConfig = (endpoint) => {
  console.log(`# Claude Code CLI
claude mcp add --transport http ${MCP_NAME} ${endpoint}

# Equivalent JSON shape for clients that use .mcp.json-style config:`);
  printJson({
    mcpServers: {
      [MCP_NAME]: {
        type: 'http',
        url: endpoint,
      },
    },
  });
};

const printOpenCodeConfig = (endpoint) => {
  console.log('# ~/.config/opencode/config.json');
  printJson({
    mcp: {
      [MCP_NAME]: {
        type: 'remote',
        url: endpoint,
        enabled: true,
        oauth: false,
        timeout: 120000,
      },
    },
  });
};

const printGenericConfig = (endpoint) => {
  printJson({
    mcpServers: {
      [MCP_NAME]: {
        type: 'http',
        url: endpoint,
      },
    },
  });
};

const handlePrintConfig = (options) => {
  const agent = options.agent || 'generic';
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;

  ensureAgent(agent);

  if (agent === 'codex') {
    printCodexConfig(endpoint);
    return;
  }

  if (agent === 'claude') {
    printClaudeConfig(endpoint);
    return;
  }

  if (agent === 'opencode') {
    printOpenCodeConfig(endpoint);
    return;
  }

  if (agent === 'openclaw') {
    console.log('# Generic MCP JSON for OpenClaw-compatible clients:');
    printGenericConfig(endpoint);
    return;
  }

  printGenericConfig(endpoint);
};

const handleCredential = (argv) => {
  if (!existsSync(CREDENTIAL_HELPER)) {
    fail(`Missing credential helper at ${CREDENTIAL_HELPER}`);
  }

  const result = spawnSync(process.execPath, [CREDENTIAL_HELPER, ...argv], {
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
};

const checkPath = (label, pathValue) => {
  if (!existsSync(pathValue)) {
    console.log(`missing ${label}: ${pathValue}`);
    return;
  }

  const stats = statSync(pathValue);
  const type = stats.isDirectory() ? 'dir' : 'file';
  console.log(`ok ${label}: ${pathValue} (${type})`);
};

const handleDoctor = (options) => {
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const agent = options.agent || 'all';

  ensureAgent(agent, true);

  console.log(`node: ${process.version}`);
  console.log(`endpoint: ${endpoint}`);
  checkPath('template', TEMPLATE_ROOT);
  checkPath('credential-helper', CREDENTIAL_HELPER);

  for (const agentName of expandAgents(agent)) {
    checkPath(`${agentName} user skill`, userSkillDirForAgent(agentName));
  }
};

const main = () => {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    usage();
    return;
  }

  if (command === 'credential') {
    handleCredential(rest);
    return;
  }

  const options = parseArgs(rest);

  if (options.help) {
    usage();
    return;
  }

  if (command === 'install') {
    handleInstall(options);
    return;
  }

  if (command === 'configure') {
    handleConfigure(options);
    return;
  }

  if (command === 'setup') {
    handleSetup(options);
    return;
  }

  if (command === 'print-config') {
    handlePrintConfig(options);
    return;
  }

  if (command === 'doctor') {
    handleDoctor(options);
    return;
  }

  fail(`Unknown command "${command}". Run workorai-agent --help.`);
};

main();
