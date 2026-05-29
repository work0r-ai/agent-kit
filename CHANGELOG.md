# Changelog

All notable changes to `@workorai/agent-kit` are documented here.

## 0.3.0 - 2026-05-29

- Live employer MCP surface support: 18 tools across job lifecycle
  (list/get/create/update/publish/close/archive/delete), candidate
  discovery (search for job, search by query, get candidate),
  invitations (invite/list/cancel), and applicants review
  (list/set_review_status/get_applicant_detail/get_applicant_transcript).
- New references: `employer-catalog.md` (mini-schemas for the 18
  employer tools), `employer-recipes.md` (hire / review / lifecycle
  recipes), `employer-troubleshooting.md` (employer-side error
  scenarios with sub-reason taxonomy and fixes).
- Renamed `references/catalog.md` to `references/candidate-catalog.md`.
- Role-aware credential storage in
  `skills/workorai/scripts/credential-store.mjs`: new
  `--role=candidate|employer` flag on `get`/`save`/`delete`. Default
  `candidate` preserves backward compatibility. Separate OS secret
  store accounts, separate shared-file fallbacks (`mcp-token` vs
  `mcp-token-employer`), separate env vars (`WORKORAI_MCP_API_KEY`
  vs `WORKORAI_EMPLOYER_MCP_API_KEY`).
- `SKILL.md` rewritten as a thin two-lane role router (~130 lines):
  candidate intent loads `candidate-catalog.md` + `auth-flow.md`;
  employer intent loads `employer-catalog.md` +
  `employer-recipes.md`. Saved-key behaviour passes `--role=<role>`
  to `credential-store.mjs`.
- `agents/openai.yaml` `default_prompt` updated to reflect the live
  employer workflows.
- `bin/workorai-agent.mjs` usage helptext now documents `--role` on
  the credential subcommand. No installer logic change (the
  credential command is a passthrough).
- `README.md`, `AGENTS.md`, and `registry/` updated to drop
  "planned employer workflows" wording and document the dual-role
  surface.

### Notes

- This release pairs with WorkorAI MCP server-side `outputSchema`
  expansion. Every employer tool's `outputSchema` now declares the
  nested response shape, and this catalog mirrors the same fields.
  Both layers move together (defence-in-depth schema strategy; see
  WorkorAI repo `docs/plans/2026-05-29-workorai-skill-employer-update-design.md`).

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
