# Skill Hub Submission Checklist

Current hub landscape verified July 2026. Ordered by leverage: automatic
crawlers first (zero submission work), then CLI publishes, then manual
forms and PRs.

## Canonical Facts

- Repository: `https://github.com/work0r-ai/agent-kit`
- Canonical skill path: `skills/workorai`
- npm package: `@workorai/agent-kit`
- Install: `npx @workorai/agent-kit install`
- MCP endpoint: `https://workorai.com/mcp` (streamable HTTP)
- License: MIT (root `LICENSE` + per-skill `skills/workorai/LICENSE.txt`)
- Auth model: optional WorkorAI MCP key, stored only after explicit user consent

## Tier 0 — Automatic (ship a clean public repo, done)

These crawl public GitHub; no submission step exists.

- **skills.sh** (Vercel, `npx skills` CLI, agents search it autonomously):
  indexes any public repo with `skills/*/SKILL.md`. Installable immediately
  via `npx skills add work0r-ai/agent-kit`. Ranking driven by install
  telemetry.
- **SkillsMP.com**: auto-crawls public SKILL.md files (needs >= 2 GitHub
  stars to be included).
- **Glama.ai**: auto-crawls; after it appears, claim the listing at
  `glama.ai` to control the description.
- **crossaitools.com**, **LobeHub Skill Store**: crawl-based, ranking by
  installs/stars/votes.

Prerequisite for all of the above: GitHub repository topics set (see
`package.json` keywords; apply with
`gh api repos/work0r-ai/agent-kit/topics -X PUT -f "names[]=..."`).

## Tier 1 — Official directories (highest leverage)

### Anthropic Claude Code plugin directory

Built into every Claude Code install (`claude.com/plugins`,
`claude-plugins-community`).

1. Manifests: `.claude-plugin/plugin.json` + `.mcp.json` (present).
2. Run `claude plugin validate .` — must pass (warnings tolerated).
3. Submit at `https://clau.de/plugin-directory-submission` (claude.ai
   account; NOT the platform.claude.com Console — that leads to API
   billing). PRs against anthropics/claude-plugins-community are closed
   automatically; everything flows through this form. Approved plugins
   are pinned to a commit SHA; the catalog syncs nightly, so expect lag
   after approval.
4. Until approval, users can install directly:
   `claude plugin marketplace add work0r-ai/agent-kit` then
   `claude plugin install workorai@workorai`.

### OpenAI Codex Plugin Directory (waiting for self-serve publishing)

The in-app Plugin Directory (Codex App / CLI `/plugins`) is OpenAI-curated
only as of July 2026; the docs say third-party submission and self-serve
publishing are "coming soon". Prepared in advance:

- `.codex-plugin/plugin.json` (manifest matching the openai/plugins
  reference schema) + shared `.mcp.json` + `skills/workorai`.
- When self-serve opens (watch developers.openai.com/codex/plugins/build),
  submit this repo. Until then Codex users install via
  `$skill-installer work0r-ai/agent-kit/workorai`, `npx @workorai/agent-kit
  install --agent codex`, or skills.sh.

### Official MCP Registry (`registry.modelcontextprotocol.io`)

Feeds PulseMCP, mcp.so, and other downstream directories automatically.

1. `registry/server.json` is prepared (namespace
   `io.github.work0r-ai/workorai`, remote streamable-http endpoint).
2. Install publisher CLI: `brew install mcp-publisher` (or the release
   binary from `github.com/modelcontextprotocol/registry`).
3. Copy `registry/server.json` to repo root as `server.json` (the CLI
   expects it at cwd), bump `version` to match the release.
4. `mcp-publisher login github` (device-code OAuth as a member of
   `work0r-ai`) then `mcp-publisher publish`.

## Tier 2 — Manual submissions

- **PulseMCP**: form at `pulsemcp.com/submit` (also syncs from the official
  registry, so Tier 1 may cover it automatically).
- **mcp.so**: open a GitHub issue via the Submit button (name, one-line
  description, features, connection info).
- **Smithery**: `npm i -g @smithery/cli && smithery mcp publish
  https://workorai.com/mcp`; claim the listing afterwards.
- **awesome-claude-code** (`hesreallyhim/awesome-claude-code`): PRs are
  forbidden — submissions go through the "Recommend New Resource" web UI
  issue form only (programmatic/gh submissions risk a ban). As of
  2026-07-02 issue creation is restricted to collaborators (temporary
  interaction limit) — retry the prefilled form URL after a few days;
  fallback: a thread in the repo's Discussions tab.
- **claude-code-templates** (`davila7/claude-code-templates`, aitmpl.com):
  PR contributing the skill to the `components/` folder.
- See `registry/awesome-lists.md` for the long tail of awesome lists.

## OpenClaw (Clawbot) and Hermes reach

- **ClawHub** (`clawhub.ai`) — OpenClaw's canonical skill registry:
  `npm i -g clawhub`, `clawhub login` (GitHub OAuth), then
  `clawhub skill publish skills/workorai --slug workorai --version <ver>`.
  Post-ClawHavoc (Feb 2026) every publish passes an automated security
  scan before the listing goes public; the frontmatter carries an
  explicit `disable-model-invocation` flag (set to `false` here — the
  skill is meant to auto-trigger). Direct git install works without the
  registry: `openclaw skills install git:work0r-ai/agent-kit`.
- **Hermes (Nous Research)** — no first-party registry. Three channels:
  1. **Agensi** (`agensi.io`): "Submit a Skill" dashboard — zip of
     `skills/workorai` with SKILL.md, tags, free listing.
  2. **Hermes Atlas** (`hermesatlas.com`): community crawler of public
     GitHub repos — no submission, picked up as the repo gains traction.
  3. **PR to `nousresearch/hermes-agent`** `optional-mcps/` — Nous-vetted
     MCP catalog, installs via `hermes mcp install workorai`.
  Hermes imports OpenClaw skills directly (same agentskills.io SKILL.md
  format), so the ClawHub listing also serves Hermes users.

## Pre-Submission Checks

```bash
node scripts/validate.mjs
node scripts/smoke-install.mjs
npm pack --dry-run
claude plugin validate .
```

Confirm:

- `skills/workorai/SKILL.md` frontmatter parses as strict YAML (the
  description is a quoted scalar — keep it quoted when editing).
- Frontmatter `name` is lowercase hyphen-case and under 64 characters.
- Frontmatter `description` is clear, trigger-rich, and under 1024 characters.
- `.claude-plugin/plugin.json` version matches `package.json` and
  `registry/skill-metadata.json`.
- `agents/openai.yaml` matches the skill behavior.
- No secrets appear in docs or tests; keys always redacted as `wai_[REDACTED]`.
- npm package tarball includes `skills/` and `registry/`.
- `skills/workorai/LICENSE.txt` is present for registries that require
  per-skill licensing.
- Git tag exists for the released version and GitHub release is published
  (several hubs read releases, not package feeds).

## Submission Description

Use this text when a hub asks for a longer description:

```text
WorkorAI is an Agent Skill for talent marketplace workflows through WorkorAI MCP. It supports both sides of the marketplace under one skill: candidates ask natural job-search prompts ("найди мне работу", "find me a job") and the skill guides them through candidate tools, profile onboarding, and MCP key setup; employers ask hiring prompts ("hire developers", "find candidates", "post a job") and the skill walks through the employer MCP surface (job lifecycle, tiered candidate discovery with white-box match explanations, invitations, applicants review). Credential storage is role-aware (--role=candidate|employer), so a dual-role user keeps both keys. The repository also includes a zero-dependency npm installer for Codex, Claude Code, OpenCode, Cursor, Qwen Code, Antigravity, Deep Code, OpenClaw-compatible clients, and generic Agent Skills runtimes.
```
