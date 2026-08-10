# WorkflowEngine Enterprise Admin — Production Backend Architecture Plan

## Progress status (updated as work proceeds)

Roadmap steps completed so far (see Phase 5 numbering below):

- [x] **1. Scaffold backend** — `backend/` NestJS project, `docker-compose.yml` (Postgres on host port **5433**, not 5432 — that port was already taken by an unrelated project's container on this machine), TypeORM data source (`backend/src/config/typeorm.config.ts`), `AppModule`/`AuthModule`/`UsersModule` + `/health`.
- [x] **2. Auth + RBAC** — `users`, `roles`, `permissions`, `role_permissions`, `user_roles` entities/migrations; JWT login (`POST /auth/login`, `GET /auth/me`); `PermissionsGuard` + `@RequirePermissions(...)` decorator (functionally the plan's "RolesGuard"); seed script (`npm run seed` in `backend/`) creates 3 permissions, 4 roles (`admin`, `workflow_designer`, `approver`, `viewer`), and the 5 Phase-4 demo users — all share password `Password123!`.
- [x] **3. OrgUnitsModule** — `org_unit_types`, `org_units` (adjacency list + `level`), `org_unit_closure` table; tree CRUD (`GET /org-units/tree`, `GET /org-units?level=`, `GET /org-units/:id/descendants?minLevel=&maxLevel=`, `POST/PATCH/DELETE /org-units`, `GET/POST /org-unit-types`) guarded by `org.manage` permission on writes; seed script extended with the Phase-4 org tree (Khối Kỹ thuật → 2 Ban → 3 Tổ), heads wired to the seeded users. **Not yet done**: reparenting/move support (closure-table subtree re-linking) — create/delete are fully implemented, move is deferred. `OrgChartView.tsx` frontend port is deferred to roadmap step 7.
- [x] **4. WorkflowsModule + RaciModule** — `workflows`, `workflow_steps` (unique `(workflow_id, step_order)`), `raci_assignments` (unique `(step_id, column_org_unit_id, target_org_unit_id, role_letter)`, `CHECK` constraints enforcing C-requires-fixed-target / A-never-stores-fixed-target), `role_letter_allowlist` entities + migration (`InitWorkflowsRaci`). Endpoints: `GET/POST /workflows`, `GET /workflows/:id` (nested steps + RACI tags), `POST /workflows/:id/steps`, `GET /workflows/:id/role-letter-options`, `GET /workflows/:id/steps/:stepId/valid-rollback-targets`, `PUT /workflows/:id/steps/:stepId/raci` (bulk-replaces one cell's tags; all writes guarded by `workflow.design` permission). `RaciService.replaceCellAssignments` validates: column must be Level 1, targets must be Level 2/3 descendants of that column, role letter must be in the workflow-kind's allowlist, Role C tags require a valid prior-step `fixedRollbackStepId`, Role A tags always force `fixedRollbackStepId` to `null` even if the client sends one. Seed script extended with the Phase-4 CapEx workflow (4 steps, full R/C/S/I/A tag set) and the 3 role-letter-allowlist rows. All endpoints verified end-to-end via curl: full workflow round-trip, role-letter-options, valid-rollback-targets for both a Role A step (all 3 prior steps) and a Role C step (only its designated prior step), rejection of a disallowed role letter, rejection of a non-Level-1 column, confirmation that Role A silently drops any client-supplied `fixedRollbackStepId`, and 403 from a non-`workflow_designer` user attempting the guarded `PUT .../raci` route.
  - **Deviation from this doc's own Phase 4 JSON**: that example used the Level-2 unit `org-ban-phat-trien` directly as step-1's RACI column, which violates the column-must-be-Level-1 rule stated earlier in this same document. The seed script corrects this: step-1's `S` tag is now column=`org-khoi-ky-thuat` (L1) + target=`org-ban-phat-trien` (L2), consistent with the architecture.

- [x] **5. TasksModule + ApprovalsModule** — `task_instances`, `task_step_instances` (unique `(task_id, step_order)`), `task_step_assignees` (composite PK), `approval_actions` entities + migration (`InitTasksApprovals`). `POST /tasks` (`TasksService.create`) instantiates a run from a workflow template: copies its steps 1:1, marks step 1 `In Progress`/rest `Pending`, and resolves `task_step_assignees` by walking each step's `raci_assignments` to `(targetOrgUnit ?? columnOrgUnit).headUserId` — rows are only created where a head is actually set (several seeded org units, e.g. Tổ Backend/Tổ QA, have no head, so those steps end up with fewer resolved assignees than RACI tags; documented below, not a bug). `GET /tasks?status=&assignedToMe=true`, `GET /tasks/:id` also implemented.
  - **`RaciActionGuard`** (`approvals/guards/raci-action.guard.ts`) loads the caller's `task_step_assignees` rows for `:stepId` and 403s if none exist; it runs alongside (not instead of) `PermissionsGuard('task.approve')` on both `approve` and `reject` routes — matching Phase 1's "both must pass" guard spec exactly.
  - **`ApprovalsService.approveStep`**: requires the step be `In Progress`; accepts any role letter the caller holds (ambiguous-letter callers must pass `roleLetter` explicitly); on success marks the step `Completed`/100%, advances `stepOrder + 1` to `In Progress`, or completes the task if it was the last step.
  - **`ApprovalsService.rejectStep`** — the core A-vs-C branch: only role letters `A` or `C` may reject (others 400). **Role C**: any client-supplied `targetStepId` is ignored (logged via `console.warn`) — the target is looked up from `raci_assignments.fixedRollbackStepId` for that template step, then mapped to the matching `task_step_instance` in this specific run. **Role A**: `targetStepId` is required in the payload, must belong to the same task, and must have a `stepOrder` strictly before the rejecting step, else 400 — validated against the same prior-steps set `GET /tasks/:taskId/steps/:stepId/valid-rollback-targets` returns. On success: the target step → `In Progress`/0%; every step with `stepOrder` in `(target, rejecting]` → `Pending`/0% (this *includes* the rejecting step itself, since it can no longer stay active once the target retakes that role); steps before the target are untouched; task status → `Active`.
  - **Deviation/clarification**: Phase 1's spec says the target step becomes `status='Pending'` on rollback. Implemented as `'In Progress'` instead — a `Pending` target would leave the task with no actionable step, which can't be resumed. This is treated as a necessary clarification of the plan, not a contradiction of its intent ("resuming from target").
  - **Verified end-to-end via curl** using a live `POST /tasks` CapEx run: approved step 1 (role S) → step 2 auto-advanced to `In Progress`; rejected step 2 as role **C** with no `targetStepId` in the payload → correctly auto-routed back to step 1 (fixed rollback, ignoring any client input); re-approved 1→2→3 to reach step 4 (role **A**); rejecting step 4 as A *without* `targetStepId` → 400; with a valid `targetStepId` (step 2) → step 2 became `In Progress`, steps 3–4 reset to `Pending`, step 1 stayed `Completed` untouched; confirmed role `I` (Informed) cannot reject (400 "Only Role A or Role C can reject").
  - **Known simplification, not yet enforced**: `approveStep` currently accepts *any* role letter the caller holds (including `I`/`S`), not just conventionally-"approving" letters — matches Phase 1's guard spec literally (RACI assignment + RBAC permission, no letter-type restriction stated) but is worth revisiting once the frontend defines what "approve" should mean per letter.

- [x] **6. WorkflowRequestsModule** — `workflow_requests` entity + migration (`InitWorkflowRequests`). `POST /workflow-requests` (any authenticated user; status starts `Initiated`), `GET /workflow-requests?status=`, `POST /workflow-requests/:id/triage` (guarded by `workflow.design`, matching the RaciModule's design-time permission) creates the resulting `task_instances` row via `TasksService.create` and links it back via `resultingTaskId`; rejects re-triaging a request that's already past `Initiated`.
  - **Deviation from plan.md's triage payload**: the plan's example shows `{ workflowId }` only. `task_instances.org_unit_id` is required and `workflow_requests` has no org unit of its own (users aren't linked to org units in this schema — only `org_units.head_user_id` points the other way), so `TriageWorkflowRequestDto` also requires `orgUnitId`, supplied by whoever performs the triage.
  - `priority` uses the frontend's lowercase convention (`low|normal|high`, matching `WorkflowRequest.priority` in `src/types.ts`) and is mapped to `task_instances.priority`'s capitalized convention (`Low|Normal|High`) at triage time.
  - The resulting task's `initiator` is set to the **original submitter** (`workflow_requests.submitted_by_user_id`), not the person who performed the triage.
  - **Real bug found and fixed during verification**: the first triage implementation loaded the `WorkflowRequest` entity with its `resultingTask` relation eagerly joined (still `null`), then set `resultingTaskId` and called `repository.save(request)` — TypeORM used the stale `null` relation object to compute the FK on write and silently overwrote `resultingTaskId` back to `null` even though the column update was intended. Fixed by switching to a targeted `repository.update(id, { status, resultingTaskId })` instead of loading the full entity and saving it back. Re-verified: `resultingTaskId` now round-trips correctly and the nested `resultingTask` relation loads with the right `initiatorUserId`.
  - Verified end-to-end via curl: submit as `officer` (no `workflow.design`) → 403 when `officer` attempts `/triage` themself; triage as `vp.eng` (holds `workflow_designer`) succeeds, produces a real running `task_instances` row (step 1 `In Progress`) linked via `resultingTaskId`; re-triaging the same request → 400 ("already been triaged").

- [~] **7. Frontend API integration (started, org tree migrated; RACI/tasks/workspace deferred to steps 8–9)** — added `axios` + `@tanstack/react-query`. New files: `src/api/client.ts` (axios instance, JWT-in-`Authorization`-header request interceptor reading from `localStorage`, 401 response interceptor that clears tokens and forces logout), `src/api/auth.ts`, `src/api/orgUnits.ts` (typed wrappers for every `/org-units*` endpoint), `src/hooks/useOrgUnits.ts` (React Query hooks: `useOrgUnitTree`, `useOrgUnitTypes`, `useCreateOrgUnit`, `useUpdateOrgUnit`, `useDeleteOrgUnit`, `useCreateOrgUnitType`). `src/auth/AuthContext.tsx` + `src/auth/LoginView.tsx` — real JWT login backed by `POST /auth/login`, user persisted to `localStorage` for reload survival, `App.tsx` now gates its entire tree behind `isAuthenticated` (renders `LoginView` otherwise). `SideNavBar`'s hardcoded "Alex Nguyen" profile block replaced with the real logged-in user + a working sign-out button.
  - **`OrgChartView` fully migrated** (first per the plan's "org tree first" ordering) — now renders live data from `GET /org-units/tree` via `useOrgUnitTree()` instead of local `useState(INITIAL_ORG_TREE)`; node types from `GET /org-unit-types`; "Add Root/Child Node" creates real `org_units` rows via `POST /org-units`; "Add Node Type" via `POST /org-unit-types`. `App.tsx`'s `orgTree`/`nodeTypes` state and the now-dead `INITIAL_ORG_TREE`/`INITIAL_NODE_TYPES` imports were removed.
  - **Deviations from the mock UI, both necessary given real schema constraints**: (1) the backend tree is a **forest** (`org_units` has no single implicit root — `GET /org-units/tree` returns an array of Level-1 roots), whereas the mock's `OrgNode` was a single hardcoded root; the view now maps over multiple roots. (2) The mock's "Add Personnel" modal (freeform name/title/avatar, no real user) was **removed** rather than fake-wired — `org_units.head_user_id` is a real FK to `users`, and there is no `GET /users` listing endpoint yet, so there's no way to let an admin pick a real user to assign as head from the UI. Head assignment is now read-only, showing whichever user was seeded as head. Building `GET /users` (or reusing `/org-units/:id` with resolvable candidates) and a real head-assignment picker is a clearly scoped follow-up, not done here.
  - **RaciMatrixView, WorkspaceView, SubmitterView, MaintenanceConfigView, MaintenanceDashboardView, CanvasView still run entirely on `INITIAL_*` mock state** — these are steps 8/9's job (RACI matrix redesign + Role A rollback UI) and are intentionally untouched this pass, per the plan's own "lowest coupling first, `workspaceTasks` last" ordering.
  - **Verification performed**: `npm run lint` (`tsc --noEmit`) passes clean on all touched frontend files (also fixed a pre-existing issue where the root `tsconfig.json` had no `exclude`, so it was accidentally type-checking `backend/`'s Jest spec files too — added `"exclude": ["node_modules", "backend"]`). Started both servers (backend on 3001, Vite via `npx vite --port=5173` — **note:** `package.json`'s `dev` script still hardcodes `--port=3000`, which on this dev machine is occupied by an unrelated Next.js project's Docker container; left `package.json` unchanged since it may be tied to the Cloud Run deploy config in `metadata.json`, but anyone running `npm run dev` locally on this machine needs `--port` overridden) and confirmed via `curl`: the app's HTML/JS/TSX modules all serve and transpile with no esbuild errors, and a CORS preflight from `Origin: http://localhost:5173` to `POST /auth/login` succeeds.
  - **Not done / explicitly not claimed**: no actual browser was used to click through the login flow or the org chart UI — this environment has no browser-automation tool available (`chromium-cli`/Playwright not installed). Verification was limited to type-checking, module-transform correctness, and CORS/API reachability. **Interactive/visual correctness of the login screen and org chart is unverified** and should be manually checked in a real browser before considering step 7 done for this slice.

  - **Update**: the remaining "typed API client" surface for step 7 is now built out — `src/api/workflows.ts`, `src/api/raci.ts`, `src/api/tasks.ts`, `src/api/workflowRequests.ts` (typed wrappers for every remaining backend endpoint: workflow/step CRUD, RACI role-letter-options/valid-rollback-targets/cell-replace, task create/list/get + approve/reject, workflow-request submit/list/triage) plus matching React Query hook files (`useWorkflows`, `useRaci`, `useTasks`, `useWorkflowRequests`) mirroring the `useOrgUnits` pattern (query-key-scoped caching, mutation-triggered invalidation). **These are plumbing only — no UI component consumes them yet.** `RaciMatrixView`, `WorkspaceView`, `SubmitterView` still run entirely on `INITIAL_*` mock state; wiring them up is steps 8/9's job. Verified via `tsc --noEmit` (clean) and via Vite/esbuild module-transform checks (all new files serve/transpile with no errors) — again, no browser click-through was performed (no browser-automation tool available in this environment).
  - **`walkthrough.md`** (repo root, Vietnamese) was added per user request as a living usage guide — covers environment setup, demo accounts, login, and clearly separates "✅ nối backend thật" (Org Chart) from "⚠️ vẫn mock" (everything else) so a reader doesn't mistake demo-only interactions for persisted ones. **This file must be updated at the end of every future step that changes what a user can actually do in the running app** — both `plan.md` (technical progress) and `walkthrough.md` (user-facing, Vietnamese) are now the two durable trackers for this project.

- [x] **8. RACI matrix UI redesign** — `RaciMatrixView.tsx` fully rewritten (user explicitly chose "full redesign now" over the lower-risk alternatives of migrating `WorkspaceView` first or keeping the old UI on live data) to match Phase 3 exactly: columns are **Level-1 org units only** (`useOrgUnitsByLevel(1)`), cells are **multi-tag chip lists** — each chip shows `{roleLetter}` + optional `[Level-2/3 target]` + (`C` only) `→{rollbackStepCode}`, with a "+" popover to add a tag (role letter from `GET /workflows/:id/role-letter-options`, target from `GET /org-units/:columnId/descendants?minLevel=2&maxLevel=3`, and for `C` a required rollback-step picker from `GET /workflows/:id/steps/:stepId/valid-rollback-targets`; `A` shows an explanatory note instead — no rollback picker, since Role A's target is chosen live at reject-time in Workspace, never stored here). Add/remove a tag both call `PUT /workflows/:id/steps/:stepId/raci` with the full merged/filtered tag list (matches the backend's bulk-replace-per-cell semantics — confirmed no partial-update endpoint exists). New files: `src/hooks/useOrgUnits.ts` gained `useOrgUnitsByLevel`/`useOrgUnitDescendants`; `RaciMatrixView.tsx` is now composed of `RaciMatrixCell` (chip list + popover), `WorkflowStepsRows` (owns its own `useWorkflow(id)` fetch so each expanded workflow row fetches independently), and `WorkflowTable` (per-kind table + create-workflow footer).
  - **Scope cuts made deliberately, both because the old mock UI's version of the feature has no backend equivalent**: (1) **sub-flow linking popover removed** — `workflow_steps.linked_sub_flow_id` exists in the schema but is only settable at step-creation time (`POST /workflows/:id/steps`); there is no `PATCH` to link/unlink it after the fact, so the old "🔗 link sub-flow" UI had nothing to call. (2) **department collapse/expand and per-department sub-role columns removed** — these don't exist in the new model; Level-1 is the only column, and what used to be sub-role columns are now just tags within a cell.
  - **Verified**: `tsc --noEmit` clean; all touched files transpile correctly through Vite/esbuild; and — going a level deeper than prior steps — **replayed the exact API call sequence `RaciMatrixCell` makes against the live backend via curl**: fetched Level-1 columns, fetched a workflow's steps+tags, fetched role-letter-options and Level-2/3 descendants, then performed the actual "add a tag" flow (read existing tags for a cell, merge in a new one client-side exactly as the component does, `PUT` the merged list) and confirmed the new tag round-trips correctly alongside the old one — then reverted the test mutation to leave seed data clean. **Still not done: an actual browser click-through** (no browser-automation tool in this environment) — the popover's interactive behavior (open/close state, live query enabling on popover-open) is architecturally straightforward but visually unverified.

- [x] **7 (finished) + 9. WorkspaceView rewritten** — task list + detail + approve/reject panel now fully backend-driven, completing both "workspaceTasks last" (step 7) and the Role A rollback UI (step 9) in one pass since they're the same component. `useTasks`/`useTask`/`useCreateTask`/`useApproveStep`/`useRejectStep`/`useTaskRollbackTargets` (already built in the step-7 plumbing pass) are now actually consumed. New `ApprovalPanel` subcomponent: reads the current user's id (`useAuth()`) against the active `In Progress` step's `assignees` to compute held role letters; **Approve** works for any held letter (server-side unrestricted, per Phase 1's guard spec); **Reject** is restricted client-side to `A`/`C` holders (mirroring the server's own restriction) — holding `C` shows an info note and omits the target-step field entirely (server auto-resolves the fixed rollback); holding `A` requires picking a target from `GET /tasks/:taskId/steps/:stepId/valid-rollback-targets`, fetched live only once the popover needs it. A `CreateTaskModal` replaces the old Submitter popup, calling `POST /tasks` directly with a real `workflowId` + Level-1 `orgUnitId`.
  - **Scope cuts, all because the backend schema has no equivalent**: **executor sub-task weight breakdown** (the old `SubTask[]` with %-weight bars — `task_step_assignees` has no weight/percentage concept), **subordinate delegation dropdown**, **evidence file upload**, and the **derivative-maintenance-flow canvas branch** (auto-spawning a linked maintenance task on process approval — not implemented anywhere in the backend; `task_step_instances.linked_sub_flow_task_id` exists as a column but nothing populates it) were all removed rather than fake-wired. The step-by-step progress cards (previously a separate "Canvas" view mode) were merged into a single view since they map directly onto real `task_step_instances` — no reason to keep two view modes for the same live data.
  - **Verified with the deepest replay yet**: created a fresh task via `POST /tasks` from `vp.eng`'s session, then replayed the *exact* request payloads `ApprovalPanel.handleApprove`/`handleReject` construct — approve step 1 as the sole-held letter `S` (as `lead.dev`), reject step 2 as `C` with no `targetStepId` in the payload (confirmed auto-routes to step 1, matching the info note shown instead of a dropdown), re-approved 1→2→3, then rejected step 4 as `A` using a `targetStepId` pulled from the exact `valid-rollback-targets` response the dropdown would populate — confirmed step 2 became `In Progress` and steps 3–4 reset to `Pending`. Every call matched the component's actual request-building logic, not just "an endpoint that happens to exist." `tsc --noEmit` clean; both dev servers left running (backend :3001, frontend via `npx vite --port=5173`) at the end of this pass since the user was actively checking the app. Browser click-through still not performed (no automation tool available) — noted again rather than claimed.

- [~] **10. Testing (started; deployment not started)** — `backend/src/approvals/approvals.service.spec.ts` added: 10 unit tests (mocked repositories + `DataSource.transaction`, no real DB) directly targeting the plan's own stated test requirement ("unit tests for the approval-branching service, A vs C paths, steps between rejection and target reset to Pending"). Covers: step-not-actionable guard, ambiguous-role-letter rejection for both approve/reject, successful approve advancing to next step vs completing the task on the last step, reject blocked for non-A/C letters, **Role C ignoring a client-supplied `targetStepId`** (a literal "attacker-supplied-step-id" string in the test, confirming the server never trusts client input for the fixed-rollback path) and resolving the real target via `raci_assignments.fixed_rollback_step_id`, Role C throwing when no fixed rollback is configured, **Role A requiring `targetStepId`**, Role A rejecting a target that doesn't precede the current step, and Role A's happy path confirming its live-chosen target **is** recorded on the `approval_actions` audit row (`targetStepInstanceId`) whereas C's is always `null` — the precise structural difference the whole plan is built around. All 10 pass; full `npm test` (11 tests across 2 suites, including the pre-existing NestJS-generated `app.controller.spec.ts`) passes clean.
  - **Not done**: e2e tests for the RBAC/RaciAction guards (plan asks for these too — deferred), and all of "deployment" (Cloud Run config, CI). SubmitterView → `workflow_requests` triage-flow wiring also remains undone — deliberately deprioritized since `CreateTaskModal` (step 9) already covers the actually-reachable "create a task" path; `SubmitterView.tsx` was never wired into `App.tsx`'s navigation even in the original mock (confirmed via grep — it's dead code with no route), so this isn't a regression, just a pre-existing gap not worth closing before higher-value work.

Not started yet: e2e guard tests, deployment (rest of step 10); SubmitterView wiring (optional, low-priority per above).

## Phase 6: BRD reconciliation (reverses the earlier "ignore BRD" decision — see deviations log)

The user later reversed the earlier "ignore BRD" instruction and asked for the implementation to be reconciled against `docs/BRD - Dynamic Workflow Engine (Ma trận RCSI).pdf`, with **Role A explicitly kept** as a mandatory addition despite the BRD only defining S/R/C/I. Full plan, scope decisions, and a Vietnamese progress log live in **`plan_brd_1.md`** (repo root) — summary here:

- [x] **RACI schema**: `raci_assignments.column_org_unit_id` (Level-1-only) + `target_org_unit_id` (Level 2/3) replaced with a single `org_unit_id` (any level) — matches BRD's TH1 (tag while a dept column is collapsed) / TH2 (tag after drilling down) model directly. Added a DB-level partial unique index (`(step_id) WHERE role_letter='C'`) enforcing BRD's "max 1 Checker per step" rule, plus a matching service-level check with BRD's exact Vietnamese error message. Migration `RaciAssignmentsAnyLevel` renames the column (data-preserving) rather than drop+recreate — the auto-generated migration would have violated `NOT NULL` against existing seed rows.
- [x] **AND-logic** (BRD 3.3): `ApprovalsService.approveStep` now requires *every* R-lettered assignee on a step to approve before it completes, when a step has more than one. Verified live: a real task with 2 distinct R holders (one direct, one escalated) stayed `In Progress` at 50% after the first approval, completed and advanced only after the second.
- [x] **Escalation** (BRD 3.1 AC2): `OrgUnitsService.findAncestors` (closure-table, nearest-first) + `TasksService.resolveAssignee` now walk up the org tree when a tagged unit has no head, instead of silently producing zero assignees (a real stuck-task bug that predated the BRD ask, reproducible with the existing headless Tổ Backend/Tổ QA seed data). New `TaskStepAssignee.isEscalated` flag surfaces this in the UI ("Xử lý thay thế").
- [x] **Delegation** (BRD 3.2): `GET/POST /tasks/:taskId/steps/:stepId/delegation-candidates|delegate` — R/C holders only, candidates restricted to heads of the delegator's own descendant org units (closure table again). New `TaskStepAssignee.delegatedFromUserId` records provenance; no separate audit table (deliberate scope minimization). Verified live end-to-end: delegating C from `vp.eng` to subordinate `staff.dev` — `vp.eng` immediately loses guard access (403), `staff.dev` gains it and can act.
- [x] **RaciMatrixView rewritten a third time** to BRD's literal multi-level expand/collapse column model (user explicitly chose this over keeping the just-built Level-1+chip design). Each expanded workflow renders its own column header, auto-filtered to hide empty branches (BRD 2.2) except the tree roots (kept visible so there's always an entry point). The "+" popover simplified — no more separate target picker, since the column *is* the target now.
- **Deliberately deferred** (per explicit scope decision): BRD Epic 4 (React Flow canvas — reject-edge visualization, dagre auto-layout, node status coloring) is not part of this pass.
- **Verification**: all of the above curl-replayed against live seed data (not just "an endpoint exists" — exact request shapes the frontend builds), `npx jest` 17/17 (6 new tests for AND-logic + delegation), `tsc --noEmit` clean on both frontend and backend, Vite module-transform check on every touched file. No browser automation available in this environment — flagged again rather than claimed.

### Phase 6b: Personnel layer (Positions + Members) — completes BRD §5's 3-layer matrix

A later audit against the user's revised `plan_brd_1.md` §5 found the matrix was still **1-layer** (org units only) and that the codebase had **no User↔OrgUnit link at all** — `org_units.head_user_id` (one head per unit) was the only personnel pointer. The BRD's 3-layer columns and its position-based routing ("giao cho Phó phòng Mua hàng") therefore needed a new domain, not a UI tweak. Built:

- **`positions`** (global catalog) + **`org_unit_members`** (user ↔ org unit ↔ position) with CRUD endpoints. `head_user_id` intentionally retained as the authoritative head so the already-tested escalation path is untouched; the roster includes the head.
- **`raci_assignments` is now polymorphic**: `org_unit_id` (always) + optional `position_id` XOR `user_id` (DB CHECK enforces mutual exclusion). Unit-only → routes to head; +position → routes to **every holder**; +user → exact person. The unique index moved to `(step, org_unit, position, user, letter) NULLS NOT DISTINCT` (PG15+) so two "unnarrowed" tags still collide as duplicates — a plain unique index would silently allow them.
- **`TasksService.resolveAssignees` now returns N users**, making a position-tagged step a natural multi-R AND-logic case. Empty position → escalates to the unit head.
- **Delegation candidates are real staff** (all members of descendant units, with position + unit shown), no longer just descendant-unit heads; heads are still merged in so nothing regresses.
- **`RaciMatrixView` → `CrasiMatrixView`** with genuine 3-layer columns behaving **like the org chart tree**: expanding is *additive* (parent column stays, child units + positions appear beside it; expanding a position appends its individual holders). Read-only `R,C ⋯` aggregate badge on collapsed columns, Sổ tất cả / Thu gọn buttons, an optional "Ẩn cột trống" checkbox (default off), and client-side disabling of a second `C`. Column-building logic extracted to `src/components/crasi/columns.ts`.
  - **Two bugs found by the user (screenshot) and fixed**: (1) the first cut followed the BRD's literal wording — expansion *replaced* the parent column — which made unit-level tags vanish the moment their unit was expanded; combined with auto-hide the table rendered completely empty despite 6 seeded tags. Switched to the additive tree model and verified by executing `buildColumns` against live API data (collapsed → 1 column `direct=[C,I,A] deeper=[S,R,R]`; expanded → parent keeps C/I/A; fully expanded → 19 columns across all 3 layers with no tag lost). (2) the add-tag popover was clipped because `overflow-x-auto` forces the cross axis to `auto` too; switched to `position: fixed` measured from the trigger's `getBoundingClientRect`, with a click-away overlay.
  - The `[+ Thêm đối tượng]` picker was dropped at the user's request — visibility is now driven by the tree's own expand/collapse toggles, which is what "user decides whether to view a group or an individual" actually means.
- **C(End) deliberately not built** — per user decision, Role A already covers "the rejector chooses where it goes", making C(End) redundant. Reasoning recorded in `raci.service.ts`.
- **Verification**: `PositionsAndPersonnel` migration hand-corrected (TypeORM's differ again tried to drop the raw-SQL 1-C-per-step partial index — second occurrence of this trap); `npx jest` 18/18; both `tsc --noEmit` clean; every touched module transforms through Vite. Live curl-replay proved the position-tagged step resolves to exactly 2 people and that AND-logic holds at 50% → completes on the second approval; a headless unit escalates; all three cell kinds coexist on one step; and a second `C` is still rejected across differing target kinds. Browser click-through still not performed.

### Phase 6c: BRD 2 §6 — Maintenance module (parts, matrix, cron, tickets, Work Orders)

Epic 2 of `docs/phase2.md`, planned in `plan_brd_2.md` §6. Built:

- **`maintenance_parts`** (equipment + responsible org unit), **`maintenance_schedules`** (one row per part×frequency, `anchor_date` + cached `next_due_at` + the Execution Flow to run), **`maintenance_tickets`**, and **`notifications`** (in-app only — Q3 deferred email/push).
- **All date arithmetic lives in `maintenance-frequency.ts` as pure functions over `YYYY-MM-DD` strings**, never `Date` objects: the business date is a calendar date in Asia/Ho_Chi_Minh, and round-tripping through a JS `Date` reinterprets it in the server's timezone and can shift it a day. `addInterval` clamps short months (31/01 + 1 month → 28/02, or 29/02 in a leap year) instead of letting `Date` roll it into March.
- **The cycle is re-derived from `anchor_date` on every sweep**, never advanced blindly from `next_due_at`. That is what makes a missed run self-healing: a cron that was down for a month catches up on the next run instead of drifting permanently. `next_due_at` is only a read cache.
- **`MaintenanceSchedulerService` contains nothing but the `@Cron('0 0 * * *', {timeZone:'Asia/Ho_Chi_Minh'})` decorator**; the sweep itself takes the date as an argument (`runReminderSweep(today)`), so all of it is unit-testable without a scheduler tick or a frozen clock. `POST /maintenance/run-sweep` exposes the same entry point for catching up after downtime.
- **Anti-duplicate**: unique `(schedule_id, due_date)`. A re-run is a no-op; a concurrent run losing the race raises `23505`, which is caught and treated as "already reminded" rather than failing the whole sweep. Non-`23505` errors are still re-raised.
- **Ticket numbers come from a Postgres sequence**, not `COUNT(*)` — a count hands the same number to two concurrent sweeps and re-issues numbers after a delete.
- **Ticket urgency (CRITICAL/WARNING/ROUTINE) is computed on read**, from today's date, rather than trusting whatever the cron stamped days ago.
- **Notification recipients reuse `OrgUnitsService.resolveAssignees`** — the same single source of truth as task creation and RACI validation, so an empty seat escalates to the parent unit's head here too.
- **US 2.3 Work Order**: `TasksService.create` gained `meta.nodeEOwnerUserId`, which overrides the RACI-resolved holder for the `E` letter only — whoever clicks the button owns the Node E. `task_instances.parent_maintenance_ticket_id` is kept separate from `parent_task_id` because the parent here is a ticket, not a task; conflating them would make "re-open the originating form" ambiguous.
- **Verification**: `MaintenanceModule` migration hand-corrected — TypeORM's differ tried to drop the two raw-SQL `raci_assignments` indexes for the **sixth** time; both survived (`pg_indexes` checked after the run). `npx jest` 65/65 (11 date tests + 12 service tests new), both `tsc --noEmit` clean. Live curl-replay against seeded data: monthly schedule anchored 15/01 correctly reported `next=2026-08-15` (anchored, not drifted); sweep on 10/08 raised exactly 1 ticket, **re-running the same day raised 0**; sweep on 12/08 raised the next one; `#4001`/`#4002` numbered from the sequence; notifications landed on the two responsible unit heads and **not** on admin; Change Maintenance moved a due date 15/08→11/08 and the status correctly re-derived ROUTINE→WARNING; the Work Order made the *clicker* (Đỗ Minh Khang) the Node E holder even though the workflow's RACI would have resolved E to Trần Văn Hoàng, while the Node C stayed RACI-resolved; a second Work Order and a post-Work-Order edit were both refused.
- One incident: the first spec run failed because **my mock** typed `manager.save(entity, data)` with two arguments when the code calls it with one — a test-harness bug, not a code bug.

### Phase 7b: BRD 2 §7 — Frontend (maintenance UI, Node E breakdown, notifications)

- **`MaintenanceConfigView` rewritten** against the real API. Switched radio → **checkbox**: the mock allowed exactly one frequency per part, but the schema's unique key is `(part, frequency)`, so a part can legitimately be on both a weekly and a yearly cycle. On save the existing `anchorDate` is **preserved per frequency** — otherwise every save would silently re-anchor a monthly job to today, quietly destroying the "always the 15th" guarantee the backend works hard to keep.
- **`MaintenanceDashboardView` rewritten**: real tickets, Change Maintenance / Set Priority modal (US 2.2), Work Order button (US 2.3), and a "Quét ngay" button that calls the manual sweep endpoint so an admin can catch up after downtime.
- **`ExecutionPanel` (new)**: the Node E owner adds/edits weighted `E(x)` rows (blank weight ⇒ server splits evenly); assignees upload a report and submit. The submit button is disabled without an attachment, but the server check is independent — the UI hint is a convenience, not the rule.
- **`NotificationBell` (new)** replaces the hardcoded blue dot: unread badge polled every 60s, list fetched only when the panel opens, mark-one/mark-all.
- **Two real bugs surfaced by curl-replay** (both mine, both would have shipped):
  1. The breakdown panel first reused `delegation-candidates`, which is **deliberately descendant-units-only** — delegation means "push down to a subordinate unit". A breakdown means "assign to my own staff", so the head of a *leaf* team got **zero candidates** and could not break work down at all. Added `GET /tasks/:taskId/steps/:stepId/subtasks/candidates`, which also includes the caller's own roster. Verified: 0 candidates before, 2 after.
  2. `createWorkOrder` let **anyone** become a Node E owner, bypassing the US 1.2 manager-only rule that `RaciService` enforces at design time — a back door introduced by the `nodeEOwnerUserId` override in Phase 6c. Now gated on `hasSubordinates`, with a test.
- Seed gained two staff on Tổ Hạ tầng Mạng: without them its head was not a manager by the system's own definition, so the maintenance Work Order path dead-ended.
- **Verification**: `npx jest` 66/66, both `tsc --noEmit` clean, all 13 touched frontend modules transform through Vite. Live curl-replay of the exact shapes the components build: unticking a frequency drops that schedule while the monthly one keeps its 2026-01-15 anchor; duplicate part code rejected; staff-level Work Order rejected; even split of 2 sub-tasks → 50/50; submit-without-attachment rejected; upload → presigned download returned the real bytes → submit → step at 50%. Browser click-through still not performed — no automation available here, so visual correctness is unverified.

### Phase 7c: RSACIE rename, unit-tag anchoring, operation log, richer seed

- **Org chart "Network Error" was not a bug in that screen** — the backend simply was not running (it had been stopped at the end of the previous session). The screen now distinguishes the two cases: a bare axios error with no `response` is reported as "không kết nối được tới máy chủ" with the API URL and the command to start it, plus a **Thử lại** button; anything with a response shows the server's own message.
- **Matrix renamed to RSACIE** (`CrasiMatrixView` → `RsacieMatrixView`, `components/crasi/` → `components/rsacie/`), and `LETTER_ORDER` reordered to `R S A C I E` so the display order matches the name.
- **The "(Cả đơn vị)" / "(Cả chức vụ)" pseudo-columns are gone.** They existed only so a group-level tag had somewhere to render once its group was expanded. The rule they were papering over is: *assigning to a department at any level means the department HEAD owns it, and the head redistributes downward*. So `inheritedByLeaf` now anchors a unit-level tag onto that unit's head column — the head's own person column when drilled that far, else the position column the head holds — and a position-level tag onto its first holder. The tag is rendered read-only there (dashed indigo) with a note saying where it was configured, so it still has exactly one home for editing. Headless units fall back to their own first column so a tag can never become invisible.
- **Operation log** (`task_activity_logs` + `ActivityService` + `GET /tasks/:id/activity` + `ActivityLogPanel`): task created (with its origin — manual / auto-spawned / work order), escalation substitutions, approvals (including partial AND-logic approvals), rejections with the rollback target and reason, delegations, `E(x)` breakdowns with weights, attachments, and submissions with the resulting progress. `ActivityService.record` **never throws** — an audit trail must not be able to fail the business action it describes; a lost line is logged loudly instead. Summaries are written in Vietnamese at write time so the log stays readable after the rows it references change.
- **Seed widened**: 5 new users, a new Ban Cơ điện branch with two sub-teams, 3 more parts. **Tổ Điện & Nước is deliberately headless** so the maintenance sweep demonstrably escalates: its ticket notified the Trưởng Ban Cơ điện and *not* the staff member in that team.
- **Incidents**: (1) the TypeORM differ tried to drop the two `raci_assignments` indexes for the **7th** time — removed again, `pg_indexes` verified after the run. (2) Adding `ActivityService` mid-constructor broke four spec files; moved it to the last constructor parameter in all four services so the positional mocks line up. (3) The first log ordering put `step.escalated` *above* `task.created`, since escalation is recorded during the step loop; moved the creation entry to fire right after the task row is saved.
- **Verification**: `npx jest` 66/66, both `tsc --noEmit` clean, 8 touched frontend modules transform through Vite. The column module was re-run against live data in all three expansion states (collapsed / units expanded / fully expanded) asserting a rectangular header grid, zero pseudo-columns, and that **no configured tag becomes invisible** — passed, and printed where each unit-level tag lands (e.g. `E` on Ban Phát triển → "Trưởng đơn vị" → "Trần Văn Hoàng"). A full work-order lifecycle produced a 5-entry log; a manual CapEx run produced approve → delegate → reject entries with the rollback target and reason. Browser click-through still not performed.

### Phase 7d: unit = its head, and recursive delegation actually works

User correction: *"không cần phải quan tâm việc của bộ phận chung hay của trưởng bộ phận riêng, toàn bộ giao cho trưởng bộ phận như là của riêng"*. The previous pass still treated "assigned to the unit" and "the head's column" as two things — the head's cell showed a read-only borrowed tag saying "collapse the unit column to edit this". That distinction was the thing being rejected.

- **The head column now carries the UNIT's target.** An expanded unit emits a first child column labelled by the head's position and name whose `target` is `{ orgUnitId }` — one cell, directly editable, no indirection. The head is skipped when grouping the roster by position so they never get two cells. Headless units still get the column (subtitle "chưa có trưởng"), which also retired the old headless fallback hack.
- `inheritedByLeaf` now only covers **positions** (a position drilled into its holders still needs one holder to carry the marker). Units never need it any more, because an expanded unit always owns a leaf.
- **Real bug the user's parenthetical pointed at**: *"nếu trưởng bộ phận giao xuống bộ phận nhỏ hơn, thì trưởng bộ phận nhỏ hơn đó cũng có thể giao xuống nhân viên trong bộ phận nhỏ"* — that did not work. `getDelegationCandidates` looked only at units strictly BELOW the caller's, so the head of a leaf team (Tổ Cơ khí, two staff, no sub-units) got **0 candidates** and recursive delegation dead-ended one level early. Same shape as the Node E breakdown bug found in Phase 7b.
- Fixed by extracting **`OrgUnitsService.findSubordinates`** — own roster + descendant rosters + descendant heads, caller excluded — and pointing BOTH delegation and the Node E breakdown at it, so the two can never disagree about who is a subordinate again. The duplicated resolution in `ExecutionService` was deleted.
- Candidate-resolution tests moved out of `approvals.service.spec.ts` into a new `org-units.service.spec.ts` (6 cases, including the leaf-team case that was broken and a de-duplication case for someone on two rosters).
- **Verification**: `npx jest` 70/70 (8 suites), both `tsc --noEmit` clean. Live: Trưởng Tổ Cơ khí went from **0 → 2** delegation candidates (Vũ Thị Mai, Hoàng Đức Anh, both "Tổ Cơ khí"). The column module re-run against live data in all three expansion states still loses no tag, and now reports exactly **one** inherited tag (the position-level `R` on "Nhân viên"); every unit-level tag sits in its own editable head column. Dumping the fully-expanded leaf columns confirms each head column targets ĐƠN VỊ and each staff column targets CHỨC VỤ.

### Phase 7e: sub-flow linking UI, with placement rules per table

- **`SubFlowLink` control** on every step row of the matrix: shows the linked flow's code when set, `+ Luồng con` when not, and a menu to pick / change / unlink. Options are always Execution Flows — a process can never be someone's sub-flow.
- **Placement rules, enforced in the UI *and* the backend** (`WorkflowsService.assertSubFlowPlacement`), because the UI rule is a convenience and the API is the boundary:
  - **Bảng 1 (process)**: only the LAST step, and only once it holds Role **A**. "Approved → an execution work order appears" is only well-defined at the final approval; allowing it mid-workflow would open a work order for an approval that can still be rejected and rolled back. Non-final steps render a dimmed `—` with the reason on hover.
  - **Bảng 2 (execution)**: any step, representing that step's child flow.
- **The link is now functional on any step, not just the last one.** `spawnExecutionFlowIfConfigured` (last-step-only, one child per parent task) became **`spawnSubFlowsForCompletedSteps`**: it walks the task's completed steps and opens the child flow of each one that has a link and has not spawned yet. Idempotency moved from per-TASK to per-STEP, recorded in `task_step_instances.linked_sub_flow_task_id` — **a column that had existed since the first migration and was never written by any code** (flagged as "cột chết" in `plan_brd_2.md` §0). Also called from `ExecutionService.submitSubtask`, since a submission can be what completes a linked step; without that, links on execution steps would only ever fire for approved steps.
- **Step icons removed** from the matrix, as asked. The neutral `description` icon carried no information, but the same element doubled as the validation indicator (`error` for 2+ Checkers, `warning` for E-without-C) — so the warning survives as a small "Lỗi"/"Cảnh báo" badge shown *only* when there is one, rather than being silently dropped.
- **Verification**: `npx jest` 70/70; `tasks.service.spec.ts` rewritten for the per-step semantics (6 cases: spawns on a completed linked step; skips an incomplete one; never spawns twice; opens one child per linked step in a multi-link flow; cheap exit when nothing is linked; ad-hoc task with no workflow). Live: linking mid-process rejected with the placement message, linking the final Role-A step accepted, self-link rejected, linking a process as a sub-flow rejected, unlink works. End-to-end on Bảng 2 — a second execution flow linked to WF-EXEC's **first** step, the step completed via an `E(x)` submission, and the child flow opened automatically (`WF-SUB-…`, `origin: auto_from_parent`, referencing the parent step by name); the step recorded its child id, and re-submitting produced no duplicate.
- Docker Desktop was found stopped mid-session (not by me) and was restarted; Postgres/MinIO came back up.

### Phase 7f: popover clipping, fixed once in one place

The sub-flow picker was clipped by the matrix's scroll container — the **third** time this exact bug appeared (RACI cell editor, then this). Root cause is always the same: setting `overflow` on ONE axis makes the browser compute the other axis as `auto` too, so an `absolute` child is clipped by the scroll box regardless of z-index.

- Extracted **`useFixedPopover`** (`components/rsacie/useFixedPopover.ts`) and pointed both the RSACIE cell editor and the sub-flow picker at it, deleting the duplicated measuring code. Beyond escaping the clip, it adds what the hand-rolled versions were missing: **re-measuring on scroll** (`capture: true`, since the scroll happens on an inner container, not window) — without it a `fixed` panel simply detaches from its trigger as soon as the matrix is scrolled horizontally, which is the normal way this table is used.
- `clampLeft` keeps the panel on screen at both edges; the previous inline version clamped only the right, so a trigger near the left edge could paint partly off-screen.
- Flip-above-when-no-room-below is now shared rather than implemented in one of the two.
- **Verification**: `clampLeft` exercised against a stubbed viewport — centre, past the left edge, past the right edge, exactly flush, and a viewport narrower than the panel (must not return a negative left): all 6 pass. `tsc` clean, both modules transform through Vite. Visual behaviour itself remains unverified — no browser automation here.

**Deviations / incidents worth remembering:**
- `typeorm@latest` resolved to a brand-new `1.1.0` (this session's date is 2026-08-07) whose `migration:generate` CLI triggered a runaway process-fork loop (hundreds of processes/sec) — killed it and pinned to the `@nestjs/typeorm`-supported stable line, `typeorm@0.3.31` (npm `legacy` tag). Works cleanly. Worth checking before running any other TypeORM CLI command in a fresh environment.
- Postgres runs on host port **5433** (docker-compose.yml), not the default 5432 — an unrelated project's container already owns 5432 on this dev machine.
- Fixed a real security bug during org-units verification: `User.passwordHash` was leaking through the `head` relation on `GET /org-units/tree` (eager-loaded, no exclusion). Fixed via `select: false` on the column entity-side, with `UsersService.findByEmailWithPassword()` as the one explicit exception used only by login.
- The three BRD/spec PDFs shared mid-session were initially set aside by the user ("ignore BRD, keep continue implement approved plan") — **this was later reversed**. The user asked for reconciliation against one of them (`BRD - Dynamic Workflow Engine (Ma trận RCSI).pdf`), with Role A kept as an explicit mandatory exception. See "Phase 6: BRD reconciliation" above and `plan_brd_1.md` for what changed as a result (RACI schema, AND-logic, escalation, delegation, matrix UI redesign #3). The other two BRD PDFs have not been revisited.

**Environment notes for resuming work:**
- Backend dir: `backend/`. Start: `npm run start:dev` (port 3001). Health: `GET /health`.
- Postgres: `docker compose up -d` from repo root (container `workflowengine-postgres`, port 5433).
- Migrations: `npm run migration:generate -- src/database/migrations/<Name>`, `npm run migration:run`.
- Seed: `npm run seed` (idempotent — safe to re-run).
- **Leave the backend running after verification.** An earlier version of this note said to always kill it; that was wrong and caused two separate false bug reports — "sơ đồ tổ chức lỗi Network Error" and "không đăng nhập được tài khoản nào" — which were both just the API being down. Only kill port 3001 when a stale process actually blocks a restart (`lsof -ti:3001 -sTCP:LISTEN | xargs kill`).

---

## Context

`workflowengine-enterprise-admin` is currently a Google AI Studio-generated React 19 + Vite proof-of-concept: every domain collection (org chart, RASCI workflow matrix, running tasks, submitted requests) lives as `useState` in `src/App.tsx`, seeded once from `src/data/initialData.ts`. There is no backend, no persistence, no auth — `express`/`dotenv` sit unused in `package.json`, and approve/reject actions in `WorkspaceView.tsx` are naive client-side state flips with no role-aware logic at all.

The goal is to turn this into a production system with a real database, a real API, and two specific pieces of business logic the demo doesn't have yet:

1. **A true multi-level RACI/RASCI matrix** where columns are top-level (Level 1) org divisions only, and cells tag which specific lower-level unit (Level 2/3) a role applies to — instead of today's flat, unlinked `DepartmentGroup`/`RoleColumn` columns.
2. **Differentiated rejection routing**: a new Role **A** (Approve) where the approver picks the rollback target *at the moment of rejection*, versus the existing Role **C** (Checker), which already has a fixed rollback baked into the workflow template (`C[stepCode]` in `RaciMatrixView.tsx`) — that mechanic is correct today and just needs to move from a regex-encoded string into a real column.

Decisions already confirmed with the user:
- **Backend stack**: NestJS + TypeORM + PostgreSQL + TypeScript.
- **Auth**: include JWT-based auth with RBAC in this pass.
- **Role letters**: add `A` as a new 6th letter alongside existing `R/C/S/I/E` — no renaming of existing letters.

Findings that shape this plan (from exploring the current repo):
- `src/types.ts` (176 lines) holds every interface; `src/data/initialData.ts` (587 lines) holds every mock dataset; `src/components/*.tsx` are 9 large single-file components with local editing logic.
- `RaciMatrixView.tsx:44` already implements Role C's fixed-rollback tag: `assignments[roleId]` can be `"C[2]"`, parsed via `/^C\[(.*)\]$/`, where `2` is the leading number in another step's `stepName`. This is exactly the Role-C behavior requested — it just needs normalizing into a real FK.
- `WorkspaceView.tsx:96-134` (`handleApprove`/`handleReject`) has zero role-based branching today — approve blindly advances the first `In Progress` canvas node, reject just sets `status: 'Rejected'`. This is the gap the new Approvals module fills.
- `DepartmentGroup`/`RoleColumn` (RACI columns), `OrgNode` (org chart tree), and `WorkspaceTask.department` (free-text string) are three currently **unlinked** representations of "department." The plan unifies all three around one `org_units` hierarchy.
- `OrgNode` (`types.ts:73-82`) is already a flexible, self-referential, arbitrary-depth tree (6 levels in mock data: Khối→Chi nhánh→Phòng→Ban→Tổ→Đội) — the new "Level 1/2/3" RACI rule is a query-time projection of this hierarchy (`level = 1` for columns, `level ∈ {2,3}` relative to that column for cell tags), not a competing hardcoded 3-table structure.

---

## Phase 1: Database Architecture (ERD / Schema)

**Design principles**
1. `org_units` is a real adjacency-list table (`parent_id` self-FK + stored `level`), replacing `OrgNode`'s nested tree blob. The org chart reads it unrestricted (any depth); the RACI module filters `level = 1` for columns and `level ∈ {2,3}` (relative descendants) for cell sub-unit tags. A closure table (`org_unit_closure(ancestor_id, descendant_id, depth)`) makes "level-2/3 descendants of this level-1 column" a single indexed join.
2. Role-letter validity per workflow kind is data (`role_letter_allowlist`), not a hardcoded ternary — mirrors today's `options` logic in `RaciMatrixView.tsx:46-51` (process: no E; linked maintenance: no S, no A; direct maintenance: all six).
3. **Role A vs Role C are structurally different on purpose**: C's rollback target is a *design-time constant* stored on the assignment (`fixed_rollback_step_id`); A's target is *never* stored on the template — it only ever exists in the runtime approval log, because it's chosen by the human approver at the moment of rejection.

**Entities**

- **`users`** — `id, email (unique), password_hash, full_name, avatar_initials, is_active, created_at, updated_at`.
- **`roles`** (RBAC, not RACI) — `id, name (admin|workflow_designer|approver|viewer), description`.
- **`permissions`** — `id, key (e.g. workflow.design, task.approve, org.manage), description`.
- **`role_permissions`** / **`user_roles`** — join tables.
- **`org_unit_types`** (replaces `NodeTypeConfig`) — `id, code, name, color_class, hex_color, default_rank`.
- **`org_units`** (replaces `OrgNode`) — `id, parent_id (nullable self-FK), type_id (FK), title, level (int, 1=top), is_active, head_user_id (nullable FK users), sort_order`. Indexes on `(parent_id)`, `(level)`, `(level, parent_id)`.
- **`org_unit_closure`** — `ancestor_id, descendant_id, depth` — maintained on insert/move, powers fast descendant queries.
- **`workflows`** (replaces `WorkflowGroup`, merges process/maintenance arrays) — `id, code, name, description, kind (process|maintenance_linked|maintenance_direct), is_active, created_by, created_at, updated_at`.
- **`workflow_steps`** (replaces `WorkflowStep`) — `id, workflow_id, step_order (int, replaces the leading-number-in-stepName convention), step_code, step_name, icon, linked_sub_flow_id (nullable FK workflows), created_at, updated_at`. Unique `(workflow_id, step_order)`.
- **`raci_assignments`** (replaces `WorkflowStep.assignments` map — the entity behind the new multi-tag-chip cell) — `id, step_id (FK), column_org_unit_id (FK, must be level=1), target_org_unit_id (nullable FK; null = "[All]"; else must be a level-2/3 descendant of column_org_unit_id), role_letter (R|A|C|S|I|E), fixed_rollback_step_id (nullable FK workflow_steps — set only when role_letter='C'), created_at, updated_at`. Unique `(step_id, column_org_unit_id, target_org_unit_id, role_letter)` — allows multiple tags per cell (e.g. two Level-3 teams both `R` under one Level-1 column).
  - `CHECK (role_letter <> 'C' OR fixed_rollback_step_id IS NOT NULL)` — a C tag must have a configured rollback.
  - `CHECK (role_letter <> 'A' OR fixed_rollback_step_id IS NULL)` — **A never stores a fixed target.**
- **`role_letter_allowlist`** — `workflow_kind, role_letter`. Seed: process→`{R,A,C,S,I}`; maintenance_linked→`{R,C,I,E}`; maintenance_direct→`{R,A,C,S,I,E}`.
- **`task_instances`** (replaces `WorkspaceTask`) — `id, workflow_id (nullable), workflow_kind (snapshot), title, reference_code, reference_title, status (Active|Pending|Completed|Rejected), due_date, initiator_user_id (FK, replaces free-text initiator), org_unit_id (FK — replaces free-text WorkspaceTask.department), priority, task_code, description, checker_role, derivative_task_id (nullable self-FK, replaces embedded derivativeFlowId/derivativeCanvasNodes), created_at, updated_at`.
- **`task_step_instances`** (replaces `WorkflowCanvasStepNode`) — `id, task_id (FK), workflow_step_id (nullable FK), step_order, step_name, role_assigned_summary, status (Completed|In Progress|Pending|Rejected), progress, is_derivative, linked_sub_flow_task_id (nullable FK, real link instead of embedded array), created_at, updated_at`.
- **`task_step_assignees`** — `task_step_instance_id (FK), user_id (FK), role_letter` — resolved at task-creation time from `raci_assignments` joined against `org_unit_personnel`/`head_user_id`. This is what the approval guard checks.
- **`approval_actions`** (new — audit log, doesn't exist today) — `id, task_step_instance_id (FK), actor_user_id (FK), action (APPROVE|REJECT), role_letter_acted_as, target_step_instance_id (nullable FK — populated ONLY for Role A rejections), notes, created_at`. Append-only source of truth; `task_step_instances.status` is a derived projection updated whenever a row is inserted here.
- **`workflow_requests`** (replaces `WorkflowRequest`/`SubmitterView.tsx` intake) — `id, workflow_kind, title, description, priority, status (Initiated|Triage|In Progress|Completed), attached_file_name, submitted_by_user_id, resulting_task_id (nullable, set on triage), created_at`.

**Rejection mutation logic** (on `POST .../reject`, inside one transaction):
1. Insert `approval_actions` row (`action=REJECT`, `role_letter_acted_as`, `target_step_instance_id` set for A / null for C, `notes`).
2. Resolve effective target: **Role C** → look up `raci_assignments.fixed_rollback_step_id`, find the matching sibling `task_step_instances` row by `workflow_step_id`. **Role A** → use `target_step_instance_id` straight from the validated request payload.
3. Set target step `status='Pending', progress=0`; reset every step strictly between target and the rejecting step (by `step_order`) to `Pending` too; leave earlier steps untouched.
4. Re-derive `task_instances.status` (typically back to `Active`, resuming from target) — never silently forced to a terminal state.

**RBAC placement**: `users/roles/permissions` are system permissions (e.g. `task.approve`), entirely separate from RACI letters. Acting on a step requires **both** — the RACI letter (`task_step_assignees`) *and* the RBAC permission — checked by the same guard.

---

## Phase 2: Backend Architecture & API Endpoints

**NestJS modules**: `AuthModule`, `UsersModule`, `OrgUnitsModule`, `WorkflowsModule`, `RaciModule`, `TasksModule`, `ApprovalsModule`, `WorkflowRequestsModule`.

**Key endpoints**

```
POST   /auth/login                 { email, password } -> { accessToken, refreshToken, user }
POST   /auth/refresh               { refreshToken } -> { accessToken }
GET    /auth/me

GET    /org-units/tree                                     # full arbitrary-depth tree (org chart)
GET    /org-units?level=1                                   # RACI column source
GET    /org-units/:id/descendants?minLevel=2&maxLevel=3     # RACI cell sub-unit picker
POST   /org-units | PATCH /org-units/:id | DELETE /org-units/:id
GET/POST /org-unit-types

GET    /workflows?kind=process|maintenance_linked|maintenance_direct
POST   /workflows                  { code, name, description, kind }
GET    /workflows/:id                                       # with steps + assignments
POST   /workflows/:id/steps        { stepOrder, stepCode, stepName, icon }
GET    /workflows/:id/role-letter-options
GET    /workflows/:id/steps/:stepId/valid-rollback-targets   # C's design-time candidate list
PUT    /workflows/:id/steps/:stepId/raci                     # bulk-replace one cell's tags

GET    /tasks?status=Active&assignedToMe=true
GET    /tasks/:id
POST   /tasks                      { workflowId, title, orgUnitId, priority, dueDate, description }
                                    # server generates task_step_instances + task_step_assignees

GET    /tasks/:taskId/steps/:stepId/valid-rollback-targets   # A's runtime candidate list (prior steps in THIS run)
POST   /tasks/:taskId/steps/:stepId/approve   { notes? }
POST   /tasks/:taskId/steps/:stepId/reject    { notes, targetStepId? }

POST   /workflow-requests          { workflowKind, title, description, priority, attachedFileName? }
GET    /workflow-requests?status=
POST   /workflow-requests/:id/triage { workflowId }
```

**Reject payload — Role A** (target required, must be in the `valid-rollback-targets` result set):
```json
{ "notes": "Thiếu chứng từ pháp lý, yêu cầu làm lại từ bước Khởi tạo.",
  "targetStepId": "task-step-instance-uuid-of-step-1" }
```

**Reject payload — Role C** (no target — server resolves `fixedRollbackStepId` from the template):
```json
{ "notes": "Không đạt yêu cầu kỹ thuật, trả về Thẩm định." }
```

Server validation: if the acting user's letter on this step is `A`, `targetStepId` is required and must be in `valid-rollback-targets`, else 400. If `C`, any `targetStepId` in the payload is ignored (with a logged warning) and the server always uses the stored `fixedRollbackStepId`.

**`RaciActionGuard`** (runs after `JwtAuthGuard`): loads `task_step_assignees` for the step, confirms the JWT user holds `A`/`C` (reject) or any assigned letter (approve) there, **and** confirms the RBAC permission `task.approve` via `roles/role_permissions` — both must pass; 403 with a distinguishing message otherwise.

---

## Phase 3: Frontend Strategy

`RaciMatrixView.tsx`'s `MatrixCell` (currently one `<select>` bound to `WorkflowStep.assignments[roleId]`) becomes a chip-list cell: for each `(step, level-1 column)` pair, render zero-or-more small tags (`R`, `A`, `C[step2]`, ...), each with an optional sub-unit badge (`[All]` or a Level-2/3 short name), plus a "+ add tag" popover offering a role-letter select (from `GET /workflows/:id/role-letter-options`) and a sub-unit select (from `GET /org-units/:columnId/descendants?minLevel=2&maxLevel=3`, defaulting to `[All]`). For `C` specifically, reuse the existing hover-dropdown pattern (`RaciMatrixView.tsx:138-159`) sourced from the design-time `valid-rollback-targets` endpoint. `DepartmentGroup`/`RoleColumn` and the `INITIAL_DEPARTMENTS` prop chain through `App.tsx` are retired; the header row comes directly from `GET /org-units?level=1`.

Role A's rollback UI is deliberately **not** in `RaciMatrixView.tsx` at all (nothing is stored at design time). It lives in `WorkspaceView.tsx`'s reject panel: when the current user's letter on the active step is `A`, a required "Chọn bước quay về" dropdown appears, populated live from `GET /tasks/:taskId/steps/:stepId/valid-rollback-targets` (actual prior steps in *this specific running task*). The reject payload assembly branches on letter — `targetStepId` included only for `A`.

Broader integration: `App.tsx`'s root-level `useState(INITIAL_*)` calls are replaced by a typed API client + React Query hooks, migrated one collection at a time — lowest coupling first (org tree/types), highest coupling last (`workspaceTasks`, which touches approve/reject and derivative-flow logic).

---

## Phase 4: Dummy Data Seed (JSON)

```json
{
  "orgUnitTypes": [
    { "id": "type-khoi", "code": "khoi", "name": "Khối", "defaultRank": 1 },
    { "id": "type-ban", "code": "ban", "name": "Ban", "defaultRank": 2 },
    { "id": "type-to", "code": "to", "name": "Tổ", "defaultRank": 3 }
  ],
  "orgUnits": [
    { "id": "org-khoi-ky-thuat", "parentId": null, "typeId": "type-khoi", "title": "Khối Kỹ thuật", "level": 1, "headUserId": "user-vp-eng" },
    { "id": "org-ban-phat-trien", "parentId": "org-khoi-ky-thuat", "typeId": "type-ban", "title": "Ban Phát triển Phần mềm", "level": 2, "headUserId": "user-lead-dev" },
    { "id": "org-ban-ha-tang", "parentId": "org-khoi-ky-thuat", "typeId": "type-ban", "title": "Ban Hạ tầng & Vận hành", "level": 2, "headUserId": "user-staff-dev" },
    { "id": "org-to-backend", "parentId": "org-ban-phat-trien", "typeId": "type-to", "title": "Tổ Backend", "level": 3, "headUserId": null },
    { "id": "org-to-qa", "parentId": "org-ban-phat-trien", "typeId": "type-to", "title": "Tổ QA", "level": 3, "headUserId": null },
    { "id": "org-to-mang", "parentId": "org-ban-ha-tang", "typeId": "type-to", "title": "Tổ Hạ tầng Mạng", "level": 3, "headUserId": "user-auditor" }
  ],
  "users": [
    { "id": "user-vp-eng", "email": "vp.eng@company.vn", "fullName": "Nguyễn Văn Tuấn", "orgUnitId": "org-khoi-ky-thuat", "roles": ["approver", "workflow_designer"] },
    { "id": "user-lead-dev", "email": "lead.dev@company.vn", "fullName": "Trần Văn Hoàng", "orgUnitId": "org-ban-phat-trien", "roles": ["approver"] },
    { "id": "user-staff-dev", "email": "staff.dev@company.vn", "fullName": "Lê Văn Nam", "orgUnitId": "org-to-backend", "roles": ["approver"] },
    { "id": "user-officer", "email": "officer@company.vn", "fullName": "Phạm Thị Hà", "orgUnitId": "org-to-qa", "roles": ["approver"] },
    { "id": "user-auditor", "email": "auditor@company.vn", "fullName": "Đỗ Minh Khang", "orgUnitId": "org-to-mang", "roles": ["approver", "admin"] }
  ],
  "workflows": [
    {
      "id": "wf-capex", "code": "WF-CAPEX", "name": "Quy trình Phê duyệt CapEx",
      "description": "Quy trình thẩm định và cấp phát vốn đầu tư tài sản cố định.",
      "kind": "process",
      "steps": [
        { "id": "step-1", "stepOrder": 1, "stepCode": "1", "stepName": "Khởi tạo Yêu cầu CapEx",
          "assignments": [ { "columnOrgUnitId": "org-ban-phat-trien", "targetOrgUnitId": null, "roleLetter": "S" } ] },
        { "id": "step-2", "stepOrder": 2, "stepCode": "2", "stepName": "Thẩm định Kỹ thuật & Dự toán",
          "assignments": [
            { "columnOrgUnitId": "org-khoi-ky-thuat", "targetOrgUnitId": "org-to-backend", "roleLetter": "R" },
            { "columnOrgUnitId": "org-khoi-ky-thuat", "targetOrgUnitId": null, "roleLetter": "C", "fixedRollbackStepId": "step-1" }
          ] },
        { "id": "step-3", "stepOrder": 3, "stepCode": "3", "stepName": "Kiểm tra Tuân thủ & Khung Pháp lý",
          "assignments": [
            { "columnOrgUnitId": "org-khoi-ky-thuat", "targetOrgUnitId": "org-to-qa", "roleLetter": "R" },
            { "columnOrgUnitId": "org-khoi-ky-thuat", "targetOrgUnitId": null, "roleLetter": "I" }
          ] },
        { "id": "step-4", "stepOrder": 4, "stepCode": "4", "stepName": "Phê duyệt Cấp Khối",
          "assignments": [ { "columnOrgUnitId": "org-khoi-ky-thuat", "targetOrgUnitId": null, "roleLetter": "A" } ] }
      ]
    }
  ],
  "roleLetterAllowlist": {
    "process": ["R", "A", "C", "S", "I"],
    "maintenance_linked": ["R", "C", "I", "E"],
    "maintenance_direct": ["R", "A", "C", "S", "I", "E"]
  }
}
```

Coherence notes: `user-vp-eng` (head of the Level-1 `org-khoi-ky-thuat` column) is the Role A actor on step 4 — rejecting there means picking a target live (e.g. step 2), not a baked-in value. `user-officer`/`user-auditor` sit at Level 3 under different Level-2 branches, giving concrete sub-unit tag targets for steps 2–3. The Role C tag on step 2 mirrors today's `assignments: { 'vp-eng': 'C[1]' }` in `initialData.ts:73`, now as a real FK.

---

## Phase 5: Implementation Roadmap

1. **Scaffold backend** — new `backend/` NestJS project at repo root; PostgreSQL via Docker Compose for local dev; TypeORM data source + migrations; `AppModule`/`AuthModule`/`UsersModule` + health check. Net-new: `backend/src/**`, `docker-compose.yml`, `.env` (supersedes the unused `dotenv`/`express` already in `package.json`).
2. **Auth + RBAC** — `users/roles/permissions/role_permissions/user_roles` entities + migrations; JWT strategy; seed script for Phase 4 users; `RolesGuard`.
3. **OrgUnitsModule** — `org_unit_types/org_units/org_unit_closure` + migrations; tree CRUD; seed Phase 4 org tree; port `OrgChartView.tsx`'s add/update logic (`OrgChartView.tsx:41-79`) to call the new endpoints.
4. **WorkflowsModule + RaciModule** — `workflows/workflow_steps/raci_assignments/role_letter_allowlist` + migrations; design-time CRUD; seed the Phase 4 CapEx workflow; transcribe `INITIAL_PROCESS_WORKFLOWS`/`INITIAL_MAINTENANCE_WORKFLOWS` from `src/data/initialData.ts` via a one-time migration script.
5. **TasksModule + ApprovalsModule** — `task_instances/task_step_instances/task_step_assignees/approval_actions` + migrations; server-side port of task creation (replacing `WorkspaceView.tsx:150-230`'s canvas-node generation); approve/reject endpoints with the A/C branching from Phase 1; `RaciActionGuard`.
6. **WorkflowRequestsModule** — `workflow_requests` + migration + triage endpoint; port `SubmitterView.tsx`'s local form state to POST against it.
7. **Frontend API integration** — typed API client (`src/api/*.ts`) + React Query hooks; migrate `App.tsx`'s `useState(INITIAL_*)` calls one at a time, org tree first, `workspaceTasks` last.
8. **RACI matrix UI redesign** — rewrite `MatrixCell` for the multi-tag-chip model (Phase 3); remove `DepartmentGroup`/`RoleColumn`/`MatrixRow` from `src/types.ts` once fully migrated.
9. **Role A runtime rollback UI** — add the conditional target-step dropdown to `WorkspaceView.tsx`'s reject panel.
10. **Testing & deployment** — unit tests for the approval-branching service (A vs C paths, "steps between rejection and target reset to Pending"); e2e tests for the RBAC guard; deploy NestJS API to Cloud Run alongside the Vite frontend build (per the Cloud Run hints already in `metadata.json`).

**Files replaced**: `DepartmentGroup`, `RoleColumn`, `MatrixRow` in `src/types.ts:11-54`; `INITIAL_DEPARTMENTS`, `INITIAL_MATRIX_ROWS` in `src/data/initialData.ts`.
**Files refactored** (kept, rewired to API): `src/App.tsx`, `src/components/RaciMatrixView.tsx`, `src/components/OrgChartView.tsx`, `src/components/WorkspaceView.tsx`, `src/components/SubmitterView.tsx`.
**Net-new backend**: `backend/src/{auth,users,org-units,workflows,raci,tasks,approvals,workflow-requests}/**`, TypeORM migrations, Docker Compose, seed scripts.
**Net-new frontend**: `src/api/**` client modules, React Query hooks, JWT-aware auth context + login screen (none exists today).

## Verification

- Backend: `docker compose up`, run TypeORM migrations, run the seed script, then hit `POST /auth/login` with a seeded user, `GET /org-units/tree`, `GET /workflows/:id` (confirm the CapEx workflow + RACI tags round-trip), and exercise the reject flow twice — once as the Role C holder on step 2 (confirm it auto-routes to step 1 with no `targetStepId` in the request), once as the Role A holder on step 4 (confirm rejecting without `targetStepId` returns 400, and with a valid one correctly resets the intermediate steps to `Pending`).
- Frontend: after wiring the API client, run `npm run dev`, log in with a seeded user, open the RACI matrix and confirm columns render as Level-1 org units only with multi-tag cells, then open a running task and confirm the reject panel shows the dynamic target dropdown only for Role A steps.
