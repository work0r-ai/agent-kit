# AGENTS.md

This repository packages the WorkorAI talent marketplace Agent Skill for public distribution. The single `workorai` skill covers both candidate (9 tools: job search, job detail, applications, apply, invitation accept/decline, withdraw, saved jobs) and employer (18 tools: job lifecycle, candidate discovery, invitations, applicants review) workflows on the WorkorAI MCP server.

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

---

## ClawMem — Semantic Code Memory

> ⚠️ Not indexed yet. Add to `~/.config/clawmem/index.yml` to enable.

**When indexed:** use `memory_retrieve` MCP tool before code searches and `reindex` after each commit.

---

# Implementation Protocol

Applies when a task is a **feature or touches 3+ files**. For smaller changes
(1-2 files, typo, question, research-only), skip this protocol and work normally.

## Preconditions (first step)
- **git**: if the repo is under git, the commit rule is active. If not, skip
  commits and note `Commit: N/A (no git)` in the diary.
- **clawmem**: check the index (`index_stats` / `status`). If not indexed, index
  it first (`reindex`; add the project to `~/.config/clawmem/index.yml` if
  needed), then continue. If indexing is impossible, mirror the durable summary
  into the diary with `clawmem: N/A`.

## 1. Prior-art search (before planning)
Search whether this was built or researched before — including by other agents
in other projects (clawmem covers all indexed collections simultaneously):
- **clawmem**: `search` / `intent_search` for direct matches;
  `find_similar` for semantically close patterns;
  `kg_query` / `find_causal_links` for graph-based cross-project discovery
- **git**: `git log --grep` and `git log -S`
- **tasks**: grep past diaries in `.tasks/`

Record findings in the diary. If a similar feature exists in another project,
reuse or adapt — note what was borrowed and why.

If a brainstorm precedes the work, run this same search during the brainstorm
too — the findings sharpen the design doc. This does not replace the
pre-planning search; do both.

## 2. Diary (`.tasks/`, gitignored)
Create `.tasks/YYYY-MM-DD-<slug>.md` first. One file per task. The agent only
creates and appends — it never deletes (the human cleans manually).

Structure:
- **Plan**: checklist of tickets (T1, T2, …)
- **Prior art**: clawmem / git / tasks findings + conclusion
- **Per ticket on close**: what done, how, deviations from plan + why, research,
  commit hash (if git), clawmem id

## 3. Stages & commits
A **stage = an atomic, revertable unit** that can be described as one change.
Group tickets into a stage by this criterion, not by ticket count.

On closing a stage → commit. The message is detailed and natural, the way a
person writes it:
- **what** changed (files / modules)
- **why** (the problem it solves)
- **how** (approach, key decisions)
- **deviations** from plan, and research if it shaped the decision

The commit message MUST stay sterile: no task slug, no clawmem id, no mention of
`.tasks/`, clawmem, or this protocol, and no `Co-Authored-By` / "Generated with"
trailer. The commit is the only artifact that leaves the machine.

## 4. clawmem (per stage + final)
- **Per stage**: a durable entry mirroring the commit content (what / how /
  deviations / research) plus the commit hash.
- **On task completion**: pin a final summary (`memory_pin`) — outcome, key
  decisions, pitfalls. This survives diary cleanup and is what the next task's
  prior-art search finds.

## 5. The linked graph (wiring lives on the private side only)
Join key = **commit hash** (a hash reveals nothing about the system).
- diary ticket stores: commit hash + clawmem id
- clawmem entry stores: commit hash + task slug
- commit stores: nothing pointing back

From any node, reach the other two via the hash. The commit stays clean; the
working artifacts (slug, ids, diaries) never leave the machine.

## Team mode

Triggered only when the user explicitly requests team work (or `/team-feature-development`).
Without an explicit request, work single-agent — the protocol above as written.

In team mode the protocol roles redistribute:

| Protocol element | Single-agent | Team mode |
|---|---|---|
| Prior-art search | the agent | the lead, once, in the brainstorm/planning phase |
| Diary (`.tasks/`) | the agent | the lead owns the master diary; teammates report stage results, the lead records them |
| Stage = atomic commit | agent commits sequentially | each teammate commits their own atomic stages in parallel, within their file-ownership boundary (no two teammates touch the same file) |
| Verification | the agent (+ human) | the lead: review-with-scoring (finder ≠ judge) + a verification pass |
| clawmem per stage + final pin | the agent | teammates write per-stage entries; the lead writes the final `memory_pin` |

**Milestone vs stage.** A stage is one teammate's atomic revertable commit (fine-grained,
parallel, no gate). A milestone is an integration point where several teammates' parallel
work converges into something coherent. The lead defines milestones in the plan, before
spawning the team.

**Milestone cycle (the human gate):**
1. the lead hands the milestone's parallel tasks to teammates
2. teammates work in parallel, committing their atomic stages
3. teammates report completion to the lead
4. the lead runs review-with-scoring + verification on the milestone
5. the lead records the milestone in the master diary + clawmem
6. the lead STOPS, shows the milestone result to the human, waits for approval
7. approval → next milestone; otherwise → fixes within the current milestone

Parallelism stays within a milestone; milestones are serialized by the human gate. If the
feature is a single milestone, there is one gate, at the end before merge. The commit
sterility rule and the linked-graph wiring are unchanged.
