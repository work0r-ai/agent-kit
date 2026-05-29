# Employer Recipes

Calling-order recipes for the four common employer flows plus the job
lifecycle. Tool names match `references/employer-catalog.md`.

## Recipe 1 — Hire from a specific job

Use when the employer has a vacancy in mind and wants the agent to
find and invite suitable candidates.

```
employer.search_candidates_for_job({ jobId, sort: 'bestMatch' })
  → for each promising entry:
       employer.get_candidate({ userId })
         # inspect existingApplications:
         #  - INVITED  → already pending, skip
         #  - APPLIED  → already in funnel, route to list_applicants
         #  - DECLINED → terminal, do not re-invite
         #  - WITHDRAWN → re-invite is allowed (service UPDATEs row)
         #  - (no entry) → fresh invite is fine
       employer.invite_candidate({ jobId, candidateUserId })
  → employer.list_invitations({ jobId })   # confirm pending state
later, once the candidate has accepted:
  → employer.list_applicants({ jobId })    # source='INVITED'
```

Guidance:
- Present `matchScore`, `matchedMustHaveSkills`, and
  `missingMustHaveSkills` when explaining candidate recommendations.
- Never invite more candidates than the user asked for in one batch.

## Recipe 2 — Hire from a free-form description

Use when the user describes the role in plain text but has not picked
a specific vacancy yet.

```
employer.search_candidates_by_query({ query })
  → present top entries to the user
  → on user pick:
       employer.get_candidate({ userId })   # check existingApplications
       (vacancy selection branch:)
         either employer.list_jobs({ status: 'PUBLISHED' })
         or     employer.create_job({ rawText }) + employer.publish_job
       employer.invite_candidate({ jobId, candidateUserId })
```

Guidance:
- `search_candidates_by_query` does NOT return match metadata. Use
  Recipe 1 once a vacancy id is selected to get ranking.

## Recipe 3 — Funnel review

Use when the employer wants to triage applicants on a published job.

```
employer.list_applicants({ jobId })
  → for each row, surface status, reviewStatus, source, match
    summary from candidate + interview slice.
  → on triage action:
       employer.set_review_status({ applicationId, reviewStatus })
         # 'SHORTLISTED' or 'HIRED' unlocks contact in next reads.
  → for shortlisted candidates:
       employer.get_applicant_detail({ applicationId })
         # full evidence bundle, contact now visible.
       employer.get_applicant_transcript({ applicationId })
         # optional, on user request.
```

Error guidance:
- `CONFLICT: NOT_APPLIED` from `set_review_status` means the row is
  still INVITED (candidate has not accepted). Tell the user to wait
  for acceptance; review controls activate only after.
- `CONFLICT: WITHDRAWN` means the candidate withdrew. Nothing to
  review. Suggest `invite_candidate` to re-engage (allowed for
  WITHDRAWN).
- Contact gating: `email`/`phone`/`linkedinUrl`/`githubUrl`/
  `websiteUrl` are null until `reviewStatus ∈ {SHORTLISTED, HIRED}`.
  Don't promise contact details before moving the row.

## Recipe 4 — Pending invites cleanup

Use when the employer is auditing outstanding invites or wants to
rescind an unanswered invitation.

```
employer.list_invitations({ jobId })
  → for each pending row (status INVITED):
       employer.cancel_invitation({ jobId, candidateUserId })
         # errors NOT_INVITED if candidate accepted/declined meanwhile
```

Guidance:
- After cancellation, the candidate disappears from `list_invitations`.
- Re-inviting a previously cancelled candidate creates a brand-new
  application row (no DB row exists after cancel — unlike WITHDRAWN
  which preserves history).

## Lifecycle recipe — Create through retire

```
employer.create_job({ rawText })
  → returns DRAFT job (Gemini parse, 5-30 s sync)
  → optional: employer.update_job({ jobId, fields: { ... } })
employer.publish_job({ jobId })
  → status DRAFT → PUBLISHED, publishedAt set
running:
  Recipe 1/2/3 against the job
when filled or paused:
employer.close_job({ jobId })
  → status PUBLISHED → CLOSED, closedAt set
later, when no longer needed in the active list:
employer.archive_job({ jobId })
  → status CLOSED → ARCHIVED
to drop a DRAFT that was never published:
employer.delete_job({ jobId })
  → DRAFT-only; on non-DRAFT use close + archive instead.
```

Guidance:
- `update_job` whitelist excludes `rawInput` (audit-only) and
  `dataSource` (auto-flipped to `USER_EDITED` on every agent update).
- `create_job` client timeout recovery: do NOT resubmit. Run
  `employer.list_jobs({ status: 'DRAFT' })` and pick the newest row.
