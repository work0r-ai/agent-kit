# Catalog

## Runtime Surface

Public:
- `request_access`

Visible but gated:
- `candidate.search_jobs`
- `candidate.get_job`

Planned but not enabled:
- `candidate.get_applications`
- `candidate.get_profile`
- employer MCP tools

## Calling Order

Preferred order:
1. `candidate.search_jobs`
2. `candidate.get_job`

Use `candidate.search_jobs` first unless a trusted `jobId` is already known.

## `candidate.search_jobs`

Inputs:
- `apiKey` - optional WorkorAI MCP key for in-session auth when the MCP client started anonymously
- `q`
- `workModel`
- `seniority`
- `jobType`
- `limit`
- `offset`

Behavior:
- requires either an authenticated MCP session or `apiKey`
- returns published jobs only, filtered and ranked for the authenticated candidate
- uses candidate profile signals plus query/title, skills, seniority, work model, and job type filters where available
- returns `matchScore`, `matchedMustHaveSkills`, `matchedNiceToHaveSkills`, `missingMustHaveSkills`, `seniorityFit`, and `matchReasons`
- returns the `jobId` needed by `candidate.get_job`
- returns `url` and `jobUrl` for the job page
- returns `applyUrl` and `applicationUrl` for the application flow

Agent guidance:
- Use `matchReasons` to explain recommendations.
- Surface missing must-have skills as gaps, not rejections.
- Give the user two distinct links for every recommendation: job page (`jobUrl`/`url`) and apply (`applicationUrl`/`applyUrl`).
- Do not show only the apply link; the user must be able to inspect the job page first.
- Treat `jobId` as internal/debug metadata.
- Prefer higher `matchScore` jobs unless the user asks for a specific filter tradeoff.

## `candidate.get_job`

Inputs:
- `apiKey` - optional WorkorAI MCP key for in-session auth when the MCP client started anonymously
- `jobId`

Behavior:
- requires either an authenticated MCP session or `apiKey`
- returns one published job
- rejects missing or non-published jobs
- includes `url`, `jobUrl`, `applyUrl`, and `applicationUrl`
