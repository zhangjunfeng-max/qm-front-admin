# Activity UX Simplification Implementation Plan

> 历史实施计划：保留业务设计与实施记录，后续变更使用 OpenSpec 工作流；保留已有未提交工作。

**Goal:** Reduce activity creation, operation and registration steps across the management system and customer channels.

**Architecture:** Reuse one activity editor inside the workspace or creation drawer. Keep authorization and company isolation in existing backend services; initial personnel and stores save in the activity transaction. Independent customer and management operations are implemented in parallel and integrated before final verification.

**Tech Stack:** Vue 3, Ant Design Vue/Vben, uniapp, Go/Gin/GORM, MySQL, Redis.

**Spec:** Approved three-batch UX proposal in the current conversation.

## Global Constraints

- No compatibility code, schema backup or unrelated changes.
- Continuous compact activity form; visible common actions; customer wording uses company.
- Platform administrators operate the platform and cannot join activities.
- Preserve company isolation, activity visibility, review restrictions and change notifications.
- No actual payment integration or fabricated business records.

## Review Focus

- Switching company while a request is pending must not display or save the previous company's data.
- Save then submission failure must retain the saved draft rather than creating another activity.
- Copying must clear dates and business history; preview must remain protected.
- Selected personnel must be company employees and save atomically without overwriting existing assignments.
- Registration drafts must not cross activity or identity boundaries.

### Task 1: Backend contracts

Files: activity configuration/create services, admin routes, order repository/service and integration tests.

- [x] Add initial `employeeIds` and company-scoped creation options; verify transaction rollback and unauthorized targets.
- [x] Add authorized status counts independent of current status filter.
- [x] Provide protected preview without public publication or visit side effects.
- [x] Run Go tests and vet.

### Task 2: Unified activity creation and workspace

Files: activities.vue, activity-detail.vue, activity-editor.vue, store/employee selectors, focused API helpers/tests.

- [x] Use one form inline in workspace; list editing opens that workspace.
- [x] Choose stores/personnel at creation; allow in-place store creation.
- [x] Save draft or save and submit; retain saved ID/media on submission failure.
- [x] Copy content into a new draft with dates cleared; protected preview.
- [x] State-aware list actions, direct registration/share/rank entry, compact schedule/results.
- [x] Merge people/groups and retain visible workspace lifecycle operations.

### Task 3: Management operation paths

Files: mobile views, orders/customers/personnel/home views, platform review view.

- [x] Share in place; mobile company administrators access creation/edit/state/application operations.
- [x] Registration status counts, direct phone/copy, customer embedded records and preserved context.
- [x] Selection-only batch toolbar and group creation in add flow.
- [x] Home direct create and review next pending item.

### Task 4: Customer registration

Files: uniapp index/registration components, draft helper and tests.

- [x] Restore same-device activity draft and preserve OAuth restoration.
- [x] Explain channel requirements before filling; no extra login form.
- [x] One order entry, optional follow-up, no non-group price clutter.
- [x] Run customer tests and H5/WeChat builds.

### Task 5: Integration verification

- [x] Review all approved scope against implementation and fix gaps.
- [x] Admin typecheck, relevant tests and production build.
- [x] Backend tests/vet and customer tests/both channel builds.
- [x] Check desktop/mobile layouts and independently review sensitive flows.

No deployment or Git commit is included in this task.

## Verification Results

- Admin: typecheck, 185 tests across 47 files, production build passed.
- Customer: 100 tests, H5 and WeChat mini-program builds passed.
- Backend: full Go tests against disposable MySQL/Redis and go vet passed.
- Browser: desktop creation, inline workspace editing, protected real-renderer preview, mobile layout, and atomic new-store/selected-employee save passed.
- Independent review: no remaining P1/P2 blocker in reviewed final changes.
- Real-device WeChat testing and production deployment are not included.
