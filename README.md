# WorkorAI Agent Kit

[![npm](https://img.shields.io/npm/v/@workorai/agent-kit.svg)](https://www.npmjs.com/package/@workorai/agent-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Agent Skill](https://img.shields.io/badge/agent-skill-0F766E.svg)](skills/workorai/SKILL.md)

WorkorAI Agent Kit packages the `workorai` Agent Skill and a zero-dependency installer for WorkorAI MCP talent marketplace workflows.

It supports both sides of the marketplace through one skill:

- **Candidates** ask prompts like `найди мне работу`, `find me a job`, or `help me get hired`; the skill guides them through onboarding, MCP key setup, and the candidate match tools.
- **Employers** ask prompts like `найди кандидатов`, `hire developers`, `post a job`, or `review applicants`; the skill walks through the 18-tool employer MCP surface (job lifecycle, candidate discovery, invitations, applicants review).

Both roles share one skill name (`workorai`) and one credential helper, with role-aware storage slots so a dual-role user can keep both keys.

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
npx @workorai/agent-kit install --agent cursor
npx @workorai/agent-kit install --agent openclaw
npx @workorai/agent-kit install --agent qwen
npx @workorai/agent-kit install --agent antigravity
npx @workorai/agent-kit install --agent deepcode
```

Use a local development MCP endpoint:

```bash
npx @workorai/agent-kit install --endpoint http://127.0.0.1:3001/mcp
```

For isolated installer tests, set `WORKORAI_AGENT_HOME` to a temporary directory:

```bash
WORKORAI_AGENT_HOME=/tmp/workorai-agent-home npx @workorai/agent-kit install
```

After install, restart the agent client and ask:

```text
find me a job
```

## What Is Included

- `skills/workorai/SKILL.md` - canonical Agent Skill (thin role router).
- `skills/workorai/agents/openai.yaml` - Codex/OpenAI-style UI metadata.
- `skills/workorai/references/`
  - `candidate-catalog.md` - candidate tool mini-schemas
  - `employer-catalog.md` - 18 employer tool mini-schemas
  - `employer-recipes.md` - hire / review / lifecycle recipes
  - `employer-troubleshooting.md` - employer-side error scenarios
  - `auth-flow.md` - candidate and employer onboarding + saved-key flow
  - `troubleshooting.md` - cross-role MCP transport / saved-key issues
- `skills/workorai/scripts/credential-store.mjs` - role-aware consent-based local MCP key storage.
- `bin/workorai-agent.mjs` - installer, MCP config writer, diagnostics, and credential command wrapper.

## Supported Targets

| Agent target | Skill location | MCP config |
| --- | --- | --- |
| `codex` | `~/.codex/skills/workorai` | `~/.codex/config.toml` |
| `claude` | `~/.claude/skills/workorai` | `~/.claude.json` |
| `opencode` | `~/.config/opencode/skills/workorai` | `~/.config/opencode/config.json` |
| `cursor` | `~/.cursor/skills/workorai` | Use WorkorAI MCP config supported by your Cursor setup |
| `openclaw` | `~/.agents/skills/workorai` | `~/.agents/mcp.json` |
| `qwen` | `~/.qwen/skills/workorai` | Configure MCP according to your Qwen Code setup |
| `antigravity` | `~/.gemini/antigravity/skills/workorai` | Configure MCP according to your Antigravity setup |
| `deepcode` | `~/.agents/skills/workorai` | `~/.agents/mcp.json` |
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

The skill reads WorkorAI MCP keys role-aware. Default `--role` is `candidate`; pass `--role=employer` for the employer slot.

Candidate read order:

1. `WORKORAI_MCP_API_KEY`
2. OS secret store (account `candidate`)
3. Shared local fallback at `~/.config/workorai/mcp-token`

Employer read order:

1. `WORKORAI_EMPLOYER_MCP_API_KEY`
2. OS secret store (account `employer`)
3. Shared local fallback at `~/.config/workorai/mcp-token-employer`

Save with OS storage by default:

```bash
npx @workorai/agent-kit credential save                  # candidate (default)
npx @workorai/agent-kit credential save --role=employer
```

Use best-effort storage for headless agent sessions:

```bash
npx @workorai/agent-kit credential save --best-effort --role=candidate
npx @workorai/agent-kit credential save --best-effort --role=employer
```

Use the shared file fallback only after explicit user consent:

```bash
npx @workorai/agent-kit credential save --shared-file --role=<role>
```

Never put real WorkorAI MCP keys in repositories, screenshots, issue text, or MCP config. Redact keys as `wai_[REDACTED]`.

## Skill Hub Compatibility

This repository is structured for direct ingestion by major skill surfaces:

- **GitHub**: readable standalone repository with license, security policy, CI, and contribution docs.
- **npm**: `@workorai/agent-kit` CLI package for one-command install.
- **Codex/OpenAI-style skills**: canonical folder at `skills/workorai` plus `agents/openai.yaml`.
- **Claude Code**: standard `SKILL.md` folder installable into `.claude/skills/` or `~/.claude/skills/`.
- **OpenCode**: standard `SKILL.md` folder installable into `.opencode/skills/`, `~/.config/opencode/skills/`, or Claude-compatible locations.
- **Cursor**: standard `SKILL.md` folder installable into `.cursor/skills/` or `~/.cursor/skills/`.
- **Qwen Code**: standard `SKILL.md` folder installable into `.qwen/skills/` or `~/.qwen/skills/`.
- **Antigravity / Gemini Antigravity**: standard `SKILL.md` folder installable into `~/.gemini/antigravity/skills/`.
- **Deep Code / DeepSeek**: standard `SKILL.md` folder installable into `.deepcode/skills/` or the shared `~/.agents/skills/`.
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

## Employer Onboarding

When the user asks to hire, post jobs, or review candidates, the skill guides them through:

1. Sign in: <https://workorai.com/employer/login>
2. Open the Employer Dashboard and locate the Employer MCP card: <https://workorai.com/employer/dashboard>
3. Generate or copy the MCP key from the card.
4. Paste the key into the agent session for immediate `employer.*` tool use.
5. Save with `--role=employer` for future hiring searches.

The 18 employer tools cover the full hire-to-review lifecycle. See `skills/workorai/references/employer-catalog.md` for the mini-schemas and `skills/workorai/references/employer-recipes.md` for the four calling-order recipes (hire from a specific job, free-form hire, funnel review, pending-invites cleanup) plus the job lifecycle (create → publish → close → archive).

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
