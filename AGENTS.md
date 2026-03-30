# AGENTS

## Code Review Instructions
- When reviewing code in this repository, use the documents in [DOCS/code-review-rules](C:/workflow-management/DOCS/code-review-rules) as the primary review standard.
- Read these files before finalizing review findings:
  - [base.md](C:/workflow-management/DOCS/code-review-rules/base.md)
  - [forbidden.md](C:/workflow-management/DOCS/code-review-rules/forbidden.md)
  - [examples.md](C:/workflow-management/DOCS/code-review-rules/examples.md)

## Repository-Specific Review Priorities
- Treat `auth-server` as the source of truth for authentication.
- Treat `authUserId` as the long-term canonical user identifier.
- Treat email-based local user matching as a temporary compatibility layer only.
- Do not approve code that trusts client-provided `userId` for protected flows.
- Review env handling, Docker runtime assumptions, and DB connectivity carefully, especially around container-to-host database access.
- Review JWT, refresh token, cookie, and OAuth handling as security-sensitive code paths.

## Review Output Expectations
- Findings should focus on bugs, regressions, security risks, and missing tests.
- Prefer concrete, actionable comments over style-only feedback.
- Call out document/implementation mismatches when API or deployment behavior changes.
