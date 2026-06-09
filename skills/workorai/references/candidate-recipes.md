# Candidate Recipes

Calling-order recipes for the common candidate flows. Tool names match
`references/candidate-catalog.md`. Every tool takes an optional `apiKey`
(used when the MCP client started anonymously) — omitted below for brevity.

## Recipe 1 — Find and apply

The core journey: search, inspect, apply.

```
candidate.search_jobs({ q?, workModel?, seniority?, jobType?, limit, offset })
  → present top entries by matchScore, with TWO links each:
       job page (jobUrl/url) and apply (applicationUrl/applyUrl)
  → on user pick:
       candidate.get_job({ jobId })        # full detail BEFORE applying
       candidate.apply_to_job({ jobId })    # idempotent; reused=true if re-apply
```

Guidance:
- Always show the job page link too — never apply-only. The user must be
  able to inspect the vacancy first.
- `apply_to_job` is gated on a completed + evaluated interview. On
  `GATE_LOCKED`/`GATE_EVALUATING`/`GATE_FAILED`, route to the onboarding
  step in `auth-flow.md` — do NOT retry blindly.
- `reused: true` means the candidate had already applied — tell them, don't
  imply a fresh application.

## Recipe 2 — Paginated / filtered search

Use when the first page isn't enough or the user has hard constraints.

```
candidate.search_jobs({ workModel: 'REMOTE', seniority: 'SENIOR', limit: 20, offset: 0 })
  → read page.hasMore
  → next page: same filters, offset += limit
```

Guidance:
- Filters are enums: `workModel ∈ {REMOTE, HYBRID, ON_SITE}`,
  `seniority ∈ {INTERN, JUNIOR, MIDDLE, SENIOR, LEAD, PRINCIPAL}`,
  `jobType ∈ {FULL_TIME, PART_TIME, CONTRACT, FREELANCE}`.
- Passing a free-text `q` switches ranking to the keyword fallback (which
  DOES populate `seniorityFit` + `matchReasons`). Without `q`, ranking is
  semantic and those two fields are `UNKNOWN`/`[]`.
- Page with `offset` + `page.hasMore`; don't refetch page 0.

## Recipe 3 — Gap analysis

Use when the user asks "am I a fit?" or "what am I missing?".

```
candidate.search_jobs({ q?/filters })       # or get_job for one known jobId
  → for a target job, read:
       matchedMustHaveSkills[]   # strengths to highlight
       missingMustHaveSkills[]   # gaps to discuss
       matchScore                # overall fit
  → frame missing skills as gaps to close, NOT as rejections.
```

Guidance:
- A missing must-have skill is a conversation, not a hard stop — the
  candidate can still apply. Be encouraging and concrete.
- Use `get_job` to pull the full `mustHaveSkills`/`niceToHaveSkills`/
  `qualifications` when the user wants the complete requirement list.

## Recipe 4 — Manage applications & invitations

Use when the user asks "where did I apply?", "any invites?", or wants to
respond to an employer.

```
candidate.get_applications()
  → branch on each row's status:
       INVITED   → candidate.accept_invitation({ jobId })   # → APPLIED
                   or candidate.decline_invitation({ jobId }) # TERMINAL
       APPLIED   → candidate.withdraw_application({ jobId })  # soft exit
       DECLINED  → terminal (no re-invite possible)
       WITHDRAWN → terminal for this row (employer may re-invite)
```

Guidance:
- ⚠️ `decline_invitation` is TERMINAL — it blocks any future re-invite from
  that employer. Confirm with the user; if they're merely unsure, leave the
  invite open (do nothing) instead of declining.
- `withdraw_application` is the soft exit: WITHDRAWN is the one state an
  employer can re-invite from later.
- `accept_invitation` puts the user in the employer's applicant funnel —
  confirm before accepting.
- All four are idempotent — a repeated call on an already-final row succeeds
  without changing anything.

## Recipe 5 — Saved jobs (shortlist)

Use to build and review a personal shortlist.

```
candidate.set_saved_job({ jobId, saved: true })    # bookmark
candidate.set_saved_job({ jobId, saved: false })   # remove
candidate.get_saved_jobs()                          # PUBLISHED-only list
```

Guidance:
- `set_saved_job` is a desired-state setter, NOT a toggle — always pass an
  explicit `saved` boolean.
- `get_saved_jobs` omits jobs that were closed/archived after saving (the
  bookmark persists, the listing filters). A vanished entry = unpublished,
  not unsaved.
