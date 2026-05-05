# Skill Hub Submission Checklist

Use this checklist after publishing the standalone GitHub repository.

## Repository URL

Use:

```text
https://github.com/workorai/agent-kit
```

## Canonical Skill Path

Use:

```text
skills/workorai
```

## Required Metadata

- Name: `workorai`
- Display name: `WorkorAI`
- Category: Job search, recruiting, MCP, productivity
- Short description: `Use WorkorAI talent marketplace MCP tools for candidate and employer workflows.`
- License: MIT
- Runtime dependencies: Node.js 18+ only for helper scripts and installer
- External service: WorkorAI MCP at `https://workorai.com/mcp`
- Auth model: optional WorkorAI MCP key, stored only after explicit user consent

## Submit To

- GitHub repository discovery: publish public repo with topics from `package.json` keywords.
- npm: publish `@workorai/agent-kit`.
- OpenAI/Codex skill catalogs: submit `skills/workorai`, including `agents/openai.yaml`.
- Claude Code/Agent Skills catalogs: submit the same `skills/workorai` folder.
- OpenCode skill directories: submit the same `skills/workorai` folder.
- Cursor-compatible directories: submit the GitHub repository URL and canonical skill path.
- Qwen Code-compatible directories: submit the GitHub repository URL and canonical skill path.
- Antigravity-compatible directories: submit the GitHub repository URL and canonical skill path.
- Deep Code / DeepSeek-compatible directories: submit the GitHub repository URL and canonical skill path.
- skills.re: submit the GitHub repository URL; the registry expects a root `skills/` folder.
- Cursor/Windsurf-compatible skill directories: submit the GitHub repository URL and canonical skill path when they support the common `SKILL.md` folder convention.
- Any OpenClaw-compatible marketplace: submit the GitHub repository URL and canonical skill path.
- Awesome lists and discovery indexes: see `registry/awesome-lists.md`.

## Pre-Submission Checks

```bash
npm run validate
npm run smoke
npm pack --dry-run
```

Confirm:

- `skills/workorai/SKILL.md` has valid YAML frontmatter.
- Frontmatter `name` is lowercase hyphen-case and under 64 characters.
- Frontmatter `description` is clear, trigger-rich, and under 1024 characters.
- `agents/openai.yaml` matches the skill behavior.
- No secrets appear in docs or tests.
- npm package tarball includes `skills/`, not an obsolete `templates/` source.
- `skills/workorai/LICENSE.txt` is present for registries that require per-skill licensing.

## Submission Description

Use this text when a hub asks for a longer description:

```text
WorkorAI is an Agent Skill for talent marketplace workflows through WorkorAI MCP. It lets candidates ask natural job-search prompts such as "найди мне работу" or "find me a job", then guides compatible agents to use WorkorAI candidate tools, profile onboarding, MCP key setup, and safe local credential storage. The skill name is role-neutral so employer hiring workflows can be added as WorkorAI exposes employer MCP tools. The repository also includes a zero-dependency npm installer for Codex, Claude Code, OpenCode, Cursor, Qwen Code, Antigravity, Deep Code, OpenClaw-compatible clients, and generic Agent Skills runtimes.
```
