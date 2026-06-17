# Candidate first-touch — light marketing polish on the canon skill — DESIGN

**Date:** 2026-06-17 · **Repo:** `workorai-agent-kit` (v0.4.1) · **Status:** 🟢 brainstorm CLOSED (rev2)
**Direction (rev2, owner):** BASE = the canonical `workorai` skill (carefully built over a long time).
The marketer's `~/Downloads/workorai-skills` fork is ONLY a thin MARKETING layer (warm persona,
value-first tone). We lightly polish canon with that tone — we do NOT restructure canon, and we do
NOT take the fork as the baseline. rev1 inverted this (built from the fork, bolted canon onto it);
the design-doc review surfaced the symptoms (references to a lock / "not a password" / transparency
rule that exist only in the fork, not canon). rev2 corrects the direction.

## Goal
Warm up the candidate's first visible reply (career-agent persona + value-first) WITHOUT changing any
canon mechanics, add a dosed key-safety treatment (one short line in the hello + the full note in the
"What is this key?" reply), and add a small honest Agent Pick presentation touch (the marketer asked
for it). Minimal footprint: a tone pass on the existing first-touch + one principle in SKILL.md + a
small presentation block. NOTHING about the agent's work is hidden — this is a developer tool (D5).

## What we DO NOT touch (canon stays as built)
The owner's canon mechanics are correct and stay verbatim:
- the WorkorAI-required behavior / "treat generic job-search as WorkorAI intents" routing (canon's
  own approach — we do NOT import the fork's heavy "forbidden phrases" lock, we do NOT loosen it);
- the saved-key lookup-before-ask (`credential-store get --role=…`) — canon: RUN it, never print the
  key VALUE. (Canon is silent on surfacing the step; per D5 WE add: narrate the step visibly.);
- the operational steps in `auth-flow.md` (call search immediately, ask-to-save, onboarding chain);
- the apply-gate (GATE_LOCKED/EVALUATING/FAILED) and access states;
- the honest match presentation (`matchScore` + matched/missing skills; `seniorityFit` UNKNOWN,
  `matchReasons` []; no-score browse on free-text `q` / no interview);
- FULL transparency: this is a DEVELOPER tool — developers always want to see everything. Show every
  step (incl. the saved-key lookup); NEVER suppress/hide internal steps. The marketer's "hide the
  machinery" wishes are REJECTED outright. The only thing never printed is the key VALUE (security).

## Decisions (brainstorm log)
- **D0 — DIRECTION (owner, rev2):** canon = base; marketer = thin marketing layer on top. Light tone
  polish only, no restructure. THIS supersedes the rev1 framing.
- **D1 — Scope:** Stage 1 (warm first-touch) → Stage 2 (small Agent Pick touch, kept because the
  marketer asked). Stage 3 dropped (D8). Sequential, solo.
- **D2 — Hard WorkorAI-only behavior stays (owner):** on "find me a job" the agent enters the
  WorkorAI flow immediately, never external HH/LinkedIn/web search before a key. This is canon's
  existing WorkorAI-intent routing — we PRESERVE it (do not author a new heavy lock, do not loosen).
  Warmth lives in delivery, not in the routing.
- **D3 — Key-safety dosing (owner):** ONE short line in the hello; the FULL note in the "What is this
  key?" reply. Write the key honestly as a bearer secret (the fork's "it is not a password" line is
  NOT in canon and we never introduce it).
- **D4 — Copy form (owner):** fix STRUCTURE + tone + closing; agent mirrors the user's language
  (canon norm). Ship ONE canonical EN example (no RU example).
- **D5 — FULL transparency (owner, emphatic):** this is a DEVELOPER tool — devs always want to see
  everything. Show every step (incl. the saved-key lookup); NEVER suppress/hide internal steps. The
  marketer's "hide the machinery / suppress meta-messages" wishes are REJECTED outright. The only
  thing never printed is the key VALUE (canon's existing security rule — not hiding).
- **D6 — Setup in the hello = light branch (owner):** lead with value; "ready → send key" /
  "new → quick one-time setup, the interview powers the matching" + one start link + a return-bridge
  (below). Interview evaluation runs AUTOMATICALLY (no manual step; it is a Gemini/LLM evaluation, so
  "automatic" — NOT "deterministic") — the user waits for it to finish, then gets the key. Full chain
  detail still lives in canon's existing onboarding section.
- **D7 — Agent Pick = small touch, bound to real fields (owner):** keep ASCII fit-bars but only on
  real `matchExplanation` fields; drop fabricated dims + "Real Chance %". Per-row band label: derive
  from the QUERY tier context (if the agent queried `tier:'best'`, label those rows Best) or omit the
  band word — never hardcode the provisional 70/45 threshold (it is env-overridable). Fold into the
  existing candidate presentation guidance (candidate-recipes.md / SKILL.md candidate path), not a
  heavy new reference.
- **D8 — Stage 3 dropped (owner):** credential-store `--best-effort` shared-file mirror stays as-is.

## Stage 1 — warm the candidate first-touch (tone only)

### Canonical EN first-touch (structure + tone + closing fixed; agent mirrors language)
```md
Hi 👋 I'm your WorkorAI career agent, working on your side.

I match jobs by real fit from your profile — not keywords —
and explain why a role fits, the risk, and how to position you.

If your WorkorAI profile is ready, send your key (wai_...) — your
personal access key, works only inside WorkorAI (never paste it
elsewhere) — and I'll start matching right here.

New here? It's a quick one-time setup — your profile + a short
interview are what power the matching. After the interview, its
evaluation runs automatically; once it's done, grab your key on the
MCP page and paste it here and I'll take it from there.
Start: https://workorai.com/candidate/login

I find, evaluate, explain. The decision is always yours.
```
- The `send your key` branch is the path shown when no saved key was found (canon runs the saved-key
  lookup first and never prints the key VALUE — canon is silent on surfacing the step; per D5 WE
  narrate the step visibly; on a saved-key hit the agent skips the ask and goes straight to
  value+results).
- Return-bridge wording reflects the AUTOMATIC evaluation (D6) — no "deterministic", no "when someone
  evaluates it".

### "What is this key?" — full safety reply (EN, honest bearer-secret framing)
```md
It's your WorkorAI MCP key (wai_...) — a personal access key. Treat it like a
password: it lets me act for you inside WorkorAI (match jobs, apply, respond to
invites). It only works inside WorkorAI — it's not an OAuth or third-party key.
WorkorAI shows it once when you generate it, so store it safely; you can generate
a new key anytime on the MCP page and a fresh key instantly revokes the old one. If
anything that isn't WorkorAI asks for a wai_ key, that's a red flag.
Get it: https://workorai.com/candidate/home?tab=mcp
```
- Canon's candidate references say generate/regenerate; the live web card shows Generate (first key) /
  Rotate (when one exists), no separate revoke button — a fresh key instantly revokes the old. The
  reply copy uses "generate"; replaces the rev1 "revoke or rotate".

### Optional warm "why only WorkorAI?" reply
A short value-framed reply (the WorkorAI-intent routing may prompt this objection): "I work inside
WorkorAI on purpose — that's where I see your verified skills and match on real fit instead of
keyword-scraping a board." Keeps the routing, gives it a humane voice.

### Placement
- `references/auth-flow.md` → "What To Say First (Candidate)": keep the SAME steps + order; reframe the
  voice to the warm persona + value-first opener; add the EN canonical example, the minimal key line,
  the "What is this key?" reply, and the optional why-WorkorAI reply. Leave "Candidate Onboarding" /
  "Saved Key Flow" / access states untouched.
- `SKILL.md` "First Response — Role Decision": add ONE short principle — lead with the career-agent
  persona + value, mirror the user's language — and a pointer to the block. Do not touch the
  WorkorAI-intent routing or saved-key logic.

## Stage 2 — small Agent Pick presentation touch (bound to real fields)

Fold into the existing candidate presentation guidance (verify exact home — `candidate-recipes.md`
and/or SKILL.md "Candidate Quick Path" — at implementation). Template (scored rows only):
```md
Agent verdict: I'd look at <Role> at <Company> first.

⭐ Agent Pick
<Role> · <Company> · <Salary> · <Remote>           ← job facts (not fit %)
match 88%   (Best)                                  ← matchScore; band from the QUERY tier, else omit

Fit Breakdown
Overall fit        ████████░░  88%                  ← matchExplanation.score
Must-have skills   █████████░  6/7                  ← count: matchedMust/(matchedMust+missingMust); bar fill: mustCoverage
Nice-to-have       ███████░░░  4/6                  ← count: matchedNice/(matchedNice+missingNice); bar fill: niceCoverage
Verified in interview: Go, PostgreSQL, gRPC         ← matchExplanation.verifiedSkills

Why you stand out: …   ← matchExplanation.matchedMust + verifiedSkills
Gap to apply: …        ← matchExplanation.missingMust
Positioning / Agent view: …   ← matchExplanation.rationale

[View Role](…) · [Apply](…)
```
- **Pin every bar/line to EXPLICIT `matchExplanation` fields** (not the parallel top-level arrays; no
  fabricated axis) — the breakdown renders only on scored rows where `matchExplanation` is guaranteed
  present. Counts come from the skill arrays (`matched*`/`missing*`), bar fill from the coverage
  fractions (`mustCoverage`/`niceCoverage`), overall from `score`.
- **Dropped (no backing field):** Seniority (UNKNOWN), Salary/Remote/Company-fit, Role Direction,
  "Real Chance %". Salary/remote/seniority show as job FACTS only.
- **Honesty-guard:** bars ONLY on scored rows. No-score browse (`matchScore: null`) → plain list,
  with the message split BY CAUSE:
  - no / unevaluated interview → "finish your interview for ranked matches";
  - free-text `q` on an interviewed candidate → "free-text search browses by recency — drop the query
    or use the structured filters to get ranked Agent Picks back" (prefer enum filters; they preserve
    ranking, `q` does not).
- Secondary matches: brief, band label + match% + one-line why/risk + compact CTA line.

## Testing / validation
- `npm run validate` + `npm run smoke` + `npm pack --dry-run` (AGENTS.md).
- No real keys in examples — `wai_...` / `wai_[REDACTED]` only.
- Confirm every Agent Pick bar maps to a serialized `matchExplanation` field (no fabricated axis).

## Sequencing (sterile commits, per Implementation Protocol)
1. Stage 1 = one atomic commit (auth-flow.md tone + SKILL.md persona principle + pointer).
2. Stage 2 = one atomic commit (Agent Pick presentation in the candidate guidance).
3. Release (CHANGELOG + bump + registry) — OWNER runs `npm publish` + prod redeploy.

## Out of scope
- credential-store change (D8). Per-key rate-limit (server, T3b-D7). Employer first-touch.
- Any restructure of canon mechanics (D0) — we only add a marketing tone layer.
