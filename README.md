# WorkorAI Agent Kit

[![npm](https://img.shields.io/npm/v/@workorai/agent-kit.svg)](https://www.npmjs.com/package/@workorai/agent-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Agent Skill](https://img.shields.io/badge/agent-skill-0F766E.svg)](skills/workorai/SKILL.md)

WorkorAI Agent Kit packages the `workorai` Agent Skill and a zero-dependency installer for WorkorAI MCP talent marketplace workflows.

It lets candidates ask ordinary prompts like `найди мне работу`, `find me a job`, or `help me get hired`, then guides the agent to use WorkorAI candidate MCP tools, profile onboarding, and safe MCP key storage. The skill name is intentionally role-neutral so employer workflows can be added as WorkorAI exposes employer MCP tools.

## Install

Install the skill and write MCP config for supported local agents:

```bash
npx @workorai/agent-kit install
```

Install for one client:

```bash
npx @workorai/agent-kit install --agent codex
npx @workorai/agent-kit install --agent claude
npx @workorai/agent-kit install --agent opencode
npx @workorai/agent-kit install --agent openclaw
```

Use a local development MCP endpoint:

```bash
npx @workorai/agent-kit install --endpoint http://127.0.0.1:3001/mcp
```

After install, restart the agent client and ask:

```text
найди мне работу
```

## What Is Included

- `skills/workorai/SKILL.md` - canonical Agent Skill.
- `skills/workorai/agents/openai.yaml` - Codex/OpenAI-style UI metadata.
- `skills/workorai/references/` - WorkorAI MCP auth, catalog, and troubleshooting notes.
- `skills/workorai/scripts/credential-store.mjs` - consent-based local MCP key storage.
- `bin/workorai-agent.mjs` - installer, MCP config writer, diagnostics, and credential command wrapper.

## Supported Targets

| Agent target | Skill location | MCP config |
| --- | --- | --- |
| `codex` | `~/.codex/skills/workorai` | `~/.codex/config.toml` |
| `claude` | `~/.claude/skills/workorai` | `~/.claude.json` |
| `opencode` | `~/.config/opencode/skills/workorai` | `~/.config/opencode/config.json` |
| `openclaw` | `~/.agents/skills/workorai` | `~/.agents/mcp.json` |
| `generic` | `~/.agents/skills/workorai` | `~/.agents/mcp.json` |

The default `install` command installs a canonical copy at `~/.agents/skills/workorai` and links or copies compatible client locations.

## Commands

```bash
npx @workorai/agent-kit --help
npx @workorai/agent-kit install --dry-run
npx @workorai/agent-kit configure --agent all
npx @workorai/agent-kit print-config --agent codex
npx @workorai/agent-kit doctor --agent all
npx @workorai/agent-kit credential get
```

## Credentials

The skill reads WorkorAI MCP keys in this order:

1. `WORKORAI_MCP_API_KEY`
2. OS secret store
3. Shared local fallback at `~/.config/workorai/mcp-token`

Save with OS storage by default:

```bash
npx @workorai/agent-kit credential save
```

Use best-effort storage for headless agent sessions:

```bash
npx @workorai/agent-kit credential save --best-effort
```

Use the shared file fallback only after explicit user consent:

```bash
npx @workorai/agent-kit credential save --shared-file
```

Never put real WorkorAI MCP keys in repositories, screenshots, issue text, or MCP config. Redact keys as `wai_[REDACTED]`.

## Skill Hub Compatibility

This repository is structured for direct ingestion by major skill surfaces:

- **GitHub**: readable standalone repository with license, security policy, CI, and contribution docs.
- **npm**: `@workorai/agent-kit` CLI package for one-command install.
- **Codex/OpenAI-style skills**: canonical folder at `skills/workorai` plus `agents/openai.yaml`.
- **Claude Code**: standard `SKILL.md` folder installable into `.claude/skills/` or `~/.claude/skills/`.
- **OpenCode**: standard `SKILL.md` folder installable into `.opencode/skills/`, `~/.config/opencode/skills/`, or Claude-compatible locations.
- **skills.re and similar registries**: root `skills/` folder with at least one skill directory.
- **Cursor/Windsurf-compatible hubs**: canonical `SKILL.md` folder plus generic MCP config notes in `registry/`.

Submission notes live in [`registry/submission-checklist.md`](registry/submission-checklist.md).

## Candidate Onboarding

When personalized MCP access is not available, the skill guides the user through:

1. Register and sign in: <https://workorai.com/candidate/login>
2. Complete profile: <https://workorai.com/candidate/profile>
3. Complete the profile interview and wait for evaluation.
4. Generate or copy the MCP key: <https://workorai.com/candidate/home?tab=mcp>
5. Paste the key into the agent session for immediate `candidate.search_jobs` use.

## Employer Roadmap

The skill is named `workorai` rather than a candidate-only name because WorkorAI is a two-sided talent marketplace. Current public MCP tools are candidate-first; employer MCP tools should be added under the same skill when they become available.

## Development

```bash
npm run validate
npm run smoke
npm pack --dry-run
```

`npm run smoke` installs into a temporary directory only and does not touch user agent config.

## Release

1. Update `CHANGELOG.md`.
2. Run validation, smoke, and `npm pack --dry-run`.
3. Tag the GitHub release.
4. Publish npm:

```bash
npm publish --access public
```

5. Submit the repository URL to relevant skill hubs using `registry/submission-checklist.md`.

## License

MIT. See [`LICENSE`](LICENSE).
