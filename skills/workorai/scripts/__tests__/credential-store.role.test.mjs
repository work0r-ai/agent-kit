import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'credential-store.mjs',
);

const VALID_CANDIDATE_KEY = 'wai_candidate_test_token_xyz';
const VALID_EMPLOYER_KEY = 'wai_employer_test_token_xyz';

let sandbox;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'workorai-cred-'));
});

const runCli = (args, { input, env = {}, allowExit = false } = {}) => {
  try {
    return execFileSync(process.execPath, [SCRIPT, ...args], {
      input,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: sandbox,
        WORKORAI_DISABLE_OS_KEYSTORE: '1',
        WORKORAI_MCP_API_KEY: '',
        WORKORAI_EMPLOYER_MCP_API_KEY: '',
        ...env,
      },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (allowExit) {
      return { stdout: error.stdout, stderr: error.stderr, status: error.status };
    }
    throw error;
  }
};

const writeFile0600 = (filePath, content) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, { mode: 0o600 });
};

test('save --role=employer --shared-file writes to mcp-token-employer', () => {
  runCli(['save', '--role=employer', '--shared-file'], { input: `${VALID_EMPLOYER_KEY}\n` });
  const employerPath = join(sandbox, 'workorai', 'mcp-token-employer');
  const candidatePath = join(sandbox, 'workorai', 'mcp-token');
  assert.ok(existsSync(employerPath), 'employer token file should exist');
  assert.equal(readFileSync(employerPath, 'utf8').trim(), VALID_EMPLOYER_KEY);
  assert.ok(!existsSync(candidatePath), 'candidate token file should NOT be created');
});

test('save without --role (default candidate) writes to mcp-token', () => {
  runCli(['save', '--shared-file'], { input: `${VALID_CANDIDATE_KEY}\n` });
  const tokenPath = join(sandbox, 'workorai', 'mcp-token');
  assert.ok(existsSync(tokenPath));
  assert.equal(readFileSync(tokenPath, 'utf8').trim(), VALID_CANDIDATE_KEY);
});

test('save --role=candidate writes to mcp-token (explicit form)', () => {
  runCli(['save', '--role=candidate', '--shared-file'], { input: `${VALID_CANDIDATE_KEY}\n` });
  const tokenPath = join(sandbox, 'workorai', 'mcp-token');
  assert.ok(existsSync(tokenPath));
});

test('get --role=employer reads from employer slot', () => {
  writeFile0600(join(sandbox, 'workorai', 'mcp-token-employer'), VALID_EMPLOYER_KEY);
  const out = runCli(['get', '--role=employer']);
  assert.equal(out.trim(), VALID_EMPLOYER_KEY);
});

test('get (default candidate) does NOT see employer slot', () => {
  writeFile0600(join(sandbox, 'workorai', 'mcp-token-employer'), VALID_EMPLOYER_KEY);
  const result = runCli(['get'], { allowExit: true });
  assert.equal(result.status, 1, 'should exit 1 when candidate slot is empty');
});

test('get --role=employer reads WORKORAI_EMPLOYER_MCP_API_KEY env first', () => {
  const out = runCli(['get', '--role=employer'], {
    env: { WORKORAI_EMPLOYER_MCP_API_KEY: VALID_EMPLOYER_KEY },
  });
  assert.equal(out.trim(), VALID_EMPLOYER_KEY);
});

test('get (default candidate) reads WORKORAI_MCP_API_KEY env first', () => {
  const out = runCli(['get'], {
    env: { WORKORAI_MCP_API_KEY: VALID_CANDIDATE_KEY },
  });
  assert.equal(out.trim(), VALID_CANDIDATE_KEY);
});

test('delete --role=employer --shared-file removes only the employer slot', () => {
  writeFile0600(join(sandbox, 'workorai', 'mcp-token'), VALID_CANDIDATE_KEY);
  writeFile0600(join(sandbox, 'workorai', 'mcp-token-employer'), VALID_EMPLOYER_KEY);
  runCli(['delete', '--role=employer', '--shared-file']);
  assert.ok(!existsSync(join(sandbox, 'workorai', 'mcp-token-employer')));
  assert.ok(existsSync(join(sandbox, 'workorai', 'mcp-token')), 'candidate slot preserved');
});

test('--role rejects invalid value', () => {
  const result = runCli(['get', '--role=admin'], { allowExit: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--role/);
});
