# Changelog

All notable changes to `@workorai/agent-kit` are documented here.

## 0.2.1 - 2026-05-05

- Adds explicit install targets for Cursor, Qwen Code, Antigravity, and Deep Code / DeepSeek workflows.
- Adds registry notes for Cursor, Qwen Code, Antigravity, and Deep Code.
- Extends smoke tests to verify Cursor, Qwen Code, and Antigravity skill links.
- Adds `WORKORAI_AGENT_HOME` for isolated installer smoke tests without touching the real user home.

## 0.2.0 - 2026-05-05

- Renames the canonical skill from `workorai-find-job` to `workorai` to support both candidate and employer workflows.
- Moves the canonical skill into `skills/workorai` so GitHub and skill registries can ingest it directly.
- Adds publishing documentation for GitHub, npm, Codex/OpenAI-style skill catalogs, Claude Code, OpenCode, and skills.re.
- Adds package metadata, validation, smoke testing, security policy, contribution guide, and issue templates.
- Keeps the CLI installer compatible with existing `npx @workorai/agent-kit install` usage.

## 0.1.0 - 2026-04-21

- Initial public npm release.
- Includes the initial candidate-focused WorkorAI skill, WorkorAI MCP config writer, and local credential helper.
