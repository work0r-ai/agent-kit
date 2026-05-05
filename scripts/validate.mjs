#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, 'skills');
const REQUIRED_ROOT_FILES = [
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'package.json',
];

const fail = (message) => {
  console.error(`validate: ${message}`);
  process.exitCode = 1;
};

const readText = (path) => readFileSync(path, 'utf8');

const parseFrontmatter = (content, filePath) => {
  if (!content.startsWith('---\n')) {
    fail(`${filePath} must start with YAML frontmatter`);
    return {};
  }

  const endIndex = content.indexOf('\n---', 4);

  if (endIndex === -1) {
    fail(`${filePath} has unterminated YAML frontmatter`);
    return {};
  }

  const raw = content.slice(4, endIndex).trim();
  const fields = {};

  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!match) {
      fail(`${filePath} has unsupported frontmatter line: ${line}`);
      continue;
    }

    fields[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }

  return fields;
};

for (const file of REQUIRED_ROOT_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`missing root file ${file}`);
  }
}

if (!existsSync(SKILLS_DIR)) {
  fail('missing root skills/ directory');
} else {
  const skillNames = readdirSync(SKILLS_DIR).filter((name) => {
    const fullPath = join(SKILLS_DIR, name);
    return statSync(fullPath).isDirectory();
  });

  if (skillNames.length === 0) {
    fail('skills/ must contain at least one skill directory');
  }

  for (const skillName of skillNames) {
    const skillDir = join(SKILLS_DIR, skillName);
    const skillFile = join(skillDir, 'SKILL.md');
    const openAiFile = join(skillDir, 'agents', 'openai.yaml');
    const licenseFile = join(skillDir, 'LICENSE.txt');

    if (!/^[a-z0-9-]{1,64}$/.test(skillName)) {
      fail(`${skillName} must be lowercase hyphen-case and 64 chars or fewer`);
    }

    if (!existsSync(skillFile)) {
      fail(`${skillName} is missing SKILL.md`);
      continue;
    }

    if (!existsSync(licenseFile)) {
      fail(`${skillName} is missing LICENSE.txt`);
    }

    const skillContent = readText(skillFile);
    const frontmatter = parseFrontmatter(skillContent, skillFile);

    if (frontmatter.name !== skillName) {
      fail(`${skillFile} frontmatter name must equal folder name`);
    }

    if (!frontmatter.description) {
      fail(`${skillFile} must include description`);
    } else if (frontmatter.description.length > 1024) {
      fail(`${skillFile} description exceeds 1024 chars`);
    }

    if (skillContent.includes('wai_') && !skillContent.includes('wai_[REDACTED]')) {
      fail(`${skillFile} appears to contain an unredacted WorkorAI key`);
    }

    if (!existsSync(openAiFile)) {
      fail(`${skillName} is missing agents/openai.yaml`);
    } else {
      const openAiContent = readText(openAiFile);

      for (const field of ['display_name', 'short_description', 'default_prompt']) {
        if (!openAiContent.includes(`${field}:`)) {
          fail(`${openAiFile} missing ${field}`);
        }
      }
    }
  }
}

const packageJson = JSON.parse(readText(join(ROOT, 'package.json')));

if (!packageJson.files?.includes('skills')) {
  fail('package.json files must include skills');
}

if (packageJson.files?.includes('templates')) {
  fail('package.json files must not include obsolete templates directory');
}

const repoFilesToScan = [
  'README.md',
  'AGENTS.md',
  'CHANGELOG.md',
  'bin/workorai-agent.mjs',
  'registry/submission-checklist.md',
  'registry/openai-codex.md',
  'registry/claude-code.md',
  'registry/cursor.md',
  'registry/opencode.md',
  'registry/qwen-code.md',
  'registry/antigravity.md',
  'registry/deepcode.md',
  'registry/cursor-windsurf-compatible.md',
  'registry/skill-metadata.json',
];

for (const file of repoFilesToScan) {
  const content = readText(join(ROOT, file));

  if (file !== 'CHANGELOG.md' && content.includes('workorai-find-job')) {
    fail(`${file} contains obsolete skill name workorai-find-job`);
  }

  if (content.includes('opencode/skill/')) {
    fail(`${file} contains obsolete OpenCode singular skill path`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('validate: ok');
