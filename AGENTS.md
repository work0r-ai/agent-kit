# AGENTS.md

This repository packages the WorkorAI job-search Agent Skill for public distribution.

## Structure

- `skills/workorai/` is the canonical skill folder for GitHub and skill registries.
- `skills/workorai/SKILL.md` is the required Agent Skills entry point.
- `skills/workorai/agents/openai.yaml` is UI metadata for Codex/OpenAI-style skill surfaces.
- `skills/workorai/references/` contains progressively loaded domain references.
- `skills/workorai/scripts/credential-store.mjs` stores WorkorAI MCP keys after explicit user consent.
- `skills/workorai/LICENSE.txt` is the per-skill license for registries that inspect skill folders directly.
- `bin/workorai-agent.mjs` installs the skill and writes MCP config for supported local agent clients.
- `registry/` contains human-facing submission notes for external skill hubs.
- Supported explicit install targets include Codex, Claude Code, OpenCode, Cursor, OpenClaw-compatible clients, Qwen Code, Antigravity, Deep Code, and generic `.agents` hosts.

## Maintenance Rules

- Keep `skills/workorai` as the source of truth. Do not reintroduce a second `templates/` copy.
- If the skill behavior changes, update `README.md`, `CHANGELOG.md`, and relevant `registry/*.md` files.
- If the CLI install paths change, update `README.md` and run `npm run validate`.
- Never commit real WorkorAI MCP keys. Examples must use redacted `wai_[REDACTED]` values.
- Preserve compatibility with Node.js 18+ and avoid runtime dependencies unless they are clearly necessary.

## Validation

Run:

```bash
npm run validate
npm run smoke
npm pack --dry-run
```

The smoke test installs into a temporary directory only.
