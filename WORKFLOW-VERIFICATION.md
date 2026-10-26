# Portal update and workflow verification

Branch: codex/portal-polish-workflow. No push or deployment.

## Changes
- Reused the supplied design emblem through a CSS crop; replaced emoji icons and favicon; added per-view titles.
- Student registration, own-case submission and tracking, status history, and notifications based on current case data.
- Public registration only creates STUDENT accounts. Staff provisioning remains administrator-controlled.
- Student routes enforce ownership and expose status history, not inter-bureau remarks or documents. All staff API routes reject student tokens.
- Valid status choices, role-aware disposal/reopening, officer object rendering, persistent inline action errors, and correct disposal date clearing.
- Local development defaults to the local backend; changing backend signs out the current session.

## Verified 26 October 2026
- Production frontend build passed.
- 6 unit suites, 52 tests passed.
- Real backend lifecycle: student sign-up, RB processing, pending, escalation, head disposal, reopen and disposal again; stale versions rejected; students denied staff endpoints and other students' cases; internal notes excluded.
- Browser: registration link, new student account, institution selection, complaint submission (RB/2026/00068), status refresh and notification panel. RB/head handling of this browser-submitted case was exercised through the API.
- Synthetic case RB/2026/00067 also retained as a disposed audit record. QA accounts and labelled synthetic records remain in the configured Neon database. No real complaints were edited.
- Frontend lint has pre-existing warnings (unused imports and React hook/purity warnings); it is not warning-free.

## Running the workflow check
From the repository root: node backend/scripts/test-student-lifecycle.mjs --allow-test-records
This creates synthetic records in the configured database. It does not reset the database.

## Deployment
Student support requires deploying this backend as well as the frontend. The local server runs the changes, but the hosted Render service has not been updated. Startup applies the additive student-role constraint migration. Notifications are current-case summaries fetched on opening; no email/push delivery or unread-state service is claimed.
