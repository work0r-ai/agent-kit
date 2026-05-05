#!/usr/bin/env node

import { existsSync, lstatSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const cli = join(ROOT, 'bin', 'workorai-agent.mjs');
const tempRoot = mkdtempSync(join(tmpdir(), 'workorai-agent-kit-'));
const expectedSkill = join(tempRoot, '.agents', 'skills', 'workorai');
const expectedCodexSkill = join(tempRoot, '.codex', 'skills', 'workorai');
const expectedClaudeSkill = join(tempRoot, '.claude', 'skills', 'workorai');
const expectedOpenCodeSkill = join(tempRoot, '.config', 'opencode', 'skills', 'workorai');
const expectedCursorSkill = join(tempRoot, '.cursor', 'skills', 'workorai');
const expectedQwenSkill = join(tempRoot, '.qwen', 'skills', 'workorai');
const expectedAntigravitySkill = join(tempRoot, '.gemini', 'antigravity', 'skills', 'workorai');

const assertExists = (path) => {
  if (!existsSync(path)) {
    throw new Error(`expected path missing: ${path}`);
  }
};

const assertSymlink = (path) => {
  assertExists(path);

  if (!lstatSync(path).isSymbolicLink()) {
    throw new Error(`expected symlink: ${path}`);
  }
};

const assertFileIncludes = (path, text) => {
  assertExists(path);

  const content = readFileSync(path, 'utf8');

  if (!content.includes(text)) {
    throw new Error(`expected ${path} to include ${text}`);
  }
};

const run = (args, options = {}) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`command failed: ${args.join(' ')}`);
  }

  return result;
};

try {
  run(['install'], {
    env: {
      ...process.env,
      HOME: tempRoot,
      WORKORAI_AGENT_HOME: tempRoot,
      XDG_CONFIG_HOME: join(tempRoot, '.config'),
    },
  });
  assertExists(join(expectedSkill, 'SKILL.md'));
  assertSymlink(expectedCodexSkill);
  assertSymlink(expectedClaudeSkill);
  assertSymlink(expectedOpenCodeSkill);
  assertSymlink(expectedCursorSkill);
  assertSymlink(expectedQwenSkill);
  assertSymlink(expectedAntigravitySkill);
  assertFileIncludes(join(tempRoot, '.codex', 'config.toml'), '[mcp_servers.workorai]');
  assertFileIncludes(join(tempRoot, '.claude.json'), '"workorai"');
  assertFileIncludes(join(tempRoot, '.config', 'opencode', 'config.json'), '"workorai"');
  assertFileIncludes(join(tempRoot, '.agents', 'mcp.json'), '"workorai"');
  run(['doctor', '--agent', 'generic'], {
    env: {
      ...process.env,
      HOME: tempRoot,
      WORKORAI_AGENT_HOME: tempRoot,
      XDG_CONFIG_HOME: join(tempRoot, '.config'),
    },
  });
  run(['print-config', '--agent', 'codex']);
  console.log('smoke: ok');
} finally {
  rmSync(tempRoot, {
    recursive: true,
    force: true,
  });
}
