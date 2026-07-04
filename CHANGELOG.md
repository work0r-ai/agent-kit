# Changelog

All notable changes to `@workorai/agent-kit` are documented here.

## 0.4.4 - 2026-07-03

- Skill safety hardening. `SKILL.md` gains a "Confirmation & Safety" section
  that (a) states auto-activation only ever runs read/discovery calls and
  never mutates state on its own, (b) requires an explicit per-action
  confirmation before every consequential candidate/employer mutation
  (apply, withdraw, accept/decline, saved-job, and the full employer job
  lifecycle + invitations + review-status), one confirmation per call, and
  (c) surfaces two disclosures: the `--best-effort` key save may leave a
  local `0600` file fallback, and every evaluated candidate is discoverable
  to employers with no per-search opt-out. This addresses the ClawHub scan
  findings (broad implicit activation, missing per-action confirmation,
  privacy disclosure) directly in the skill contract.
- Docs/skill-copy only — no tool, schema, or runtime change; fully
  back-compatible. Published to ClawHub; other registries follow on their
  next publish.

## 0.4.3 - 2026-07-02

- Hub publication release. The repository is now an installable Claude Code
  plugin: `.claude-plugin/plugin.json` (plugin identity),
  `.claude-plugin/marketplace.json` (direct
  `claude plugin marketplace add work0r-ai/agent-kit` support), and `.mcp.json`
  bundling the WorkorAI MCP server with the plugin.
- Fixed `skills/workorai/SKILL.md` frontmatter: the description contained
  unquoted `: ` sequences, so strict YAML parsers rejected it and tolerant
  runtimes silently loaded the skill with empty metadata. The description is
  now a quoted scalar.
- Fixed repository metadata: `package.json` and registry docs pointed at the
  nonexistent `github.com/workorai/agent-kit`; all URLs now reference the real
  `github.com/work0r-ai/agent-kit`. Added the `author` field.
- Registry docs rebuilt around the verified 2026 hub landscape
  (`registry/submission-checklist.md`), plus `registry/server.json` prepared
  for the official MCP Registry (`io.github.work0r-ai/workorai`).
- No tool, schema, or runtime behavior change; fully back-compatible.

## 0.4.2 - 2026-06-17

- Candidate first-touch: warmer, value-first onboarding. `auth-flow.md`
  "What To Say First (Candidate)" is reframed from a dry checklist into a
  career-agent persona that leads with value (mirror the user's language),
  keeping the same onboarding steps. Adds an honest, dosed key-safety
  treatment — a one-line note in the hello plus a full "What is this key?"
  reply: the `wai_` key is a bearer secret (treat it like a password), works
  only inside WorkorAI, is shown once at generation, and a fresh key revokes
  the old one; an anti-phishing red flag for any non-WorkorAI prompt asking for
  it. Plus a value-framed "why only WorkorAI?" reply that keeps the in-platform
  flow without sounding like a refusal. Full step transparency (developer tool —
  it never hides what it runs; only the key VALUE is never printed).
- Candidate result presentation: new `candidate-recipes.md` Recipe 6
  ("Present results — Agent Pick"). The strongest scored match is shown as an
  Agent Pick with fit bars bound to REAL `matchExplanation` fields (overall
  score, must/nice coverage, verified-in-interview skills, gap, rationale) —
  no fabricated axes (seniority/salary/remote/company-fit and "chance to get
  hired %" are dropped; `seniorityFit` is always `UNKNOWN`). The per-row band
  word (Best/Good/Weak) shows only when a `tier` was queried, never recomputed
  from a threshold. No-score browse (`matchScore: null`) renders a plain list
  with no bars, message split by cause (finish your interview vs. drop the
  free-text `q`).
- Docs/skill-copy only — no tool, schema, or runtime change; fully
  back-compatible.

## 0.4.1 - 2026-06-15

- Document the empty-Best advisory (WorkorAI MCP M4): `employer.search_candidates_for_job`
  now returns an optional `advisory { code: 'EMPTY_BEST_REVIEW_MUST_HAVES', message }`
  when no candidate reaches the Best tier (`tierCounts.best === 0`) but candidates exist
  below. The agent relays it — suggest the employer move less-critical must-have skills to
  nice-to-have to widen the search. A suggestion only; never auto-edits the job, and a
  Good/Weak candidate is never re-labeled as Best. Docs-only; pairs with the matching
  server M4 change. Back-compat (absent `advisory` = no change for 0.4.0 clients).

## 0.4.0 - 2026-06-15

- Tier band filter + white-box explainability on the candidate-search tools
  (WorkorAI MCP T3b — pairs with the matching server `outputSchema`; both layers
  move together):
  - `employer.search_candidates_for_job` + `candidate.search_jobs` gain an opt-in
    `tier` (`best | good | weak`); OMIT for the full ranked pool (back-compatible,
    no behavior change for existing callers). New additive
    `tierCounts: { matched, unmatched, best, good, weak }`. Each scored row now
    carries `matchExplanation` — the white-box "why" (fit score, the skills the
    candidate PROVED in their interview, matched/missing, reliability, and a
    ready-to-quote rationale). The reverse `page` gains `hasMore` (paginate WITHIN
    a band, not by the full-pool `total`).
  - NEW `employer.get_candidate_evidence(jobId, userId)` — job-scoped interview
    evidence (facts + Q&A + résumé summary + GitHub/LinkedIn signals) for one
    candidate; the basis for an agent to write its own comparative review. Gated
    on owning the PUBLISHED job + the candidate being in its searchable pool (same
    gate as the in-app deep review — no widened exposure).
- Recommended agent workflow: `search_candidates_for_job(tier:'best')` → cascade
  via `tierCounts` → explain from `matchExplanation` → `get_candidate_evidence`
  for the shortlist.
- Anonymous `tools/list` is now 29 tools (1 + 9 candidate + 19 employer).

## 0.3.1 - 2026-06-09

- Full candidate MCP surface (9 tools): `candidate.search_jobs`, `get_job`,
  `get_applications`, `apply_to_job`, `accept_invitation`,
  `decline_invitation`, `withdraw_application`, `set_saved_job`,
  `get_saved_jobs`. New `candidate-recipes.md` + `candidate-troubleshooting.md`;
  `auth-flow.md` access states expanded to the 7 runtime states (adds
  `EVALUATION_FAILED`; the gate is the fact of a completed + evaluated
  interview, no score threshold).
- Employer accuracy sweep: `invite_candidate` block reasons reconciled to the
  runtime set (`JOB_NOT_FOUND` / `JOB_NOT_PUBLISHED` / `CANDIDATE_NOT_FOUND` /
  `NOT_DISCOVERABLE` / `INVITE_NOT_ALLOWED`); `PRIVACY_NOT_PUBLIC` +
  `PROFILE_MISSING` collapsed to `NOT_DISCOVERABLE`. Anonymous `tools/list` is
  28 tools (1 + 9 candidate + 18 employer).
- Reconcile `candidate.search_jobs` docs to the semantic runtime: a free-text
  `q` or a not-yet-interviewed candidate returns a no-score recency BROWSE
  (`matchScore` is `null`), not a keyword matcher; `seniorityFit` is always
  `UNKNOWN` and `matchReasons` always `[]`.

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

### Hardening (post-review fixes)

- Windows PowerShell SecretManagement now embeds the role in the
  secret name (`workorai-candidate` vs `workorai-employer`) so
  dual-role users on Windows do not collide their candidate and
  employer keys. macOS Keychain and Linux Secret Service already
  separated by `account=`.
- OS keystore read failures (locked vault, dismissed unlock prompt,
  missing secret-tool daemon) are no longer silently swallowed. The
  `surfaceKeystoreReadFailure` helper differentiates "not present"
  (the normal fall-through case) from real errors and logs the
  redacted error message to stderr.
- `handleGet` emits a stale-fallback advisory to stderr when it
  returns a shared-file token after the OS keystore read errored —
  authentication failures against WorkorAI MCP that previously
  looked like "the token I just saved doesn't work" now carry a
  breadcrumb.
- `handleDelete` aggregates platform delete results and exits 1 on
  real backend failures. Scripts piping
  `credential-store delete && next-cmd` no longer run `next-cmd`
  when the rotation actually failed.
- `KEYSTORE_NOT_FOUND_PATTERNS` broadened with the real not-found
  error strings from PowerShell SecretManagement and a
  Linux-specific exit-1-empty-stderr heuristic for `secret-tool`.
- `WORKORAI_TEST_FAKE_KEYSTORE_ERROR` and
  `WORKORAI_TEST_FAKE_DELETE_FAILURE` test hooks are gated on
  `WORKORAI_DISABLE_OS_KEYSTORE=1` so they cannot affect any
  production context where the user has not opted into the
  test-isolation kill-switch.
- `MCP outputSchema`: date and proficiency fields on
  `APPLICANT_DETAIL.resume.*` tightened from `['string', 'null']`
  to `'string'` to match what the serializer actually emits
  (`formatDate` returns empty strings, never null). Fields that
  are nullable in the underlying TypeScript types (candidate
  headline/avatarUrl/location, contact email/phone, interview
  summary, fact notes) keep their nullable declaration.

### Known issues — targeted for 0.3.1

- `APPLICANT_DETAIL.resume.personalInfo` contact fields
  (`email`, `phone`, `linkedinUrl`, `githubUrl`, `websiteUrl`) use
  empty strings as the redaction sentinel below `SHORTLISTED`. The
  canonical contact-gating discriminator lives on
  `list_applicants.contact` (nullable object); the resume blob is a
  convenience view. A future release will widen these fields to
  `['string', 'null']` and emit `null` on the gated path so the
  redaction is observable from the JSON Schema alone.
- `WORKORAI_DISABLE_OS_KEYSTORE=1` + `credential-store delete`
  without `--shared-file` is a warned no-op (stderr line fires,
  exit code 0). A future release may exit 2 to make the no-op
  detectable from a script's `$?` check.

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
