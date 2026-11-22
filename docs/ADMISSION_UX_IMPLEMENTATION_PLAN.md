# Admission and Student Experience Implementation Plan

## 1. Goal

Improve the current Registrar experience, not replace working features:

- Preserve the existing status machine, admission wizard, public/returning applicant flow, entrance scheduling, fee gate, classroom gate, and server-side enrollment orchestration.
- Improve the Admissions queue, application review workspace, student directory, student dossier, and edit student modal.
- Make document collection an explicitly post-admission, post-entrance, post-enrollment capability.
- Keep UI controls aligned with the server; the server remains the authority.

## 2. Existing Implementation Confirmed

The current implementation already has several useful foundations:

- The canonical status transitions live in [services/lifecycle/src/domain/admissionStates.ts](/C:/Users/IPREP/Desktop/GNET-2026/services/lifecycle/src/domain/admissionStates.ts).
- The canonical next-action logic lives in [services/lifecycle/src/domain/admissionFunnel.ts](/C:/Users/IPREP/Desktop/GNET-2026/services/lifecycle/src/domain/admissionFunnel.ts).
- Enrollment is orchestrated in [services/lifecycle/src/services/admissionService.ts](/C:/Users/IPREP/Desktop/GNET-2026/services/lifecycle/src/services/admissionService.ts).
- [src/components/OnboardingStepper.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/components/OnboardingStepper.tsx) already visualizes Submitted, Review, Approved, Fee, and Enrolled.
- [src/features/admission-form/AdmissionFormWizard.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/admission-form/AdmissionFormWizard.tsx) already provides a validated three-step Student, Guardians, and Schooling flow shared by staff and public applicants.
- [src/features/registrar/components/ApplicationReviewModal.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/ApplicationReviewModal.tsx) already loads server next-action data and includes applicant details, evaluation, document controls, fee/classroom gates, and status actions.
- [src/features/registrar/components/StudentDossierModal.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/StudentDossierModal.tsx) already provides profile and transcript tabs.
- [src/features/registrar/components/EditStudentModal.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/EditStudentModal.tsx) already uses the shared modal family and loads grade options safely.
- [src/features/registrar/components/DirectoryTab.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/DirectoryTab.tsx) already has filtering, import, dossier, edit, and delete actions.
- Entrance scheduling already exists in [services/lifecycle/src/services/entranceService.ts](/C:/Users/IPREP/Desktop/GNET-2026/services/lifecycle/src/services/entranceService.ts) and [src/pages/EntranceSchedule.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/pages/EntranceSchedule.tsx).
- The lifecycle Prisma schema already contains `entranceStatus`, `entranceScheduledAt`, `studentUserId`, `AdmissionDocument`, and related enrollment fields.

## 3. Existing Gaps to Address

1. The review modal has too many equal-weight actions and mixes applicant review, entrance, enrollment, fee, and documents in one dense two-column screen.
2. The student list relies on a desktop table; smaller screens need a real card layout.
3. The student dossier has custom chrome rather than the shared modal shell and has no designed enrolled-document state.
4. The edit student modal is a long form rather than a guided, sectioned editor.
5. The admissions queue cards show limited workflow context and document counts.
6. `entranceStatus` currently represents scheduling, with values such as `NOT_SCHEDULED` and `BOOKED`; it does not represent the required entrance-completion state.
7. The document endpoints accept and review files without a shared post-enrollment entrance-completion eligibility check.
8. `requiredDocTypes` is intentionally parsed as an empty list today, so it must not be used as the sole rule for document availability.
9. `waiveDocs` exists as an enrollment concept. It must not become permission to collect documents during application or before entrance completion.
10. The root Prisma schema is not the lifecycle application's source for Admission Application fields. Database changes belong in [services/lifecycle/prisma/schema.prisma](/C:/Users/IPREP/Desktop/GNET-2026/services/lifecycle/prisma/schema.prisma), followed by a lifecycle migration.

## 4. Document Eligibility Rule

Implement one pure eligibility service that is reused everywhere.

An applicant becomes document-eligible only when all three conditions are met:

1. The application status is `ENROLLED`.
2. Entrance is explicitly completed or exempted.
3. A valid, active student record exists for the same school and is linked to `studentUserId`.

Recommended lifecycle schema additions:

- `entranceCompletedAt: DateTime?`
- `entranceResult: String?` with an explicit set such as `SAT`, `EXEMPT`, `PASSED`, or `NOT_PASSED`
- `entranceCompletedBy: String?`
- `admissionDecision: String?` with `ADMITTED` or `NOT_ADMITTED`

Do not infer completion from:

- A non-empty score field.
- Booking a future or past appointment.
- `entranceStatus === "BOOKED"`.
- A status checkbox or legacy `documents` JSON.
- `waiveDocs === true`.

For a school that does not require scheduling, staff must use an explicit “Entrance completed” action. For a scheduled entrance, completion must be confirmed by authorized staff or an auditable future integration.

### Canonical result

Return a typed result such as:

```ts
type DocumentEligibility =
  | { eligible: true }
  | {
      eligible: false;
      reason:
        | "NOT_ENROLLED"
        | "ENTRANCE_NOT_COMPLETED"
        | "STUDENT_RECORD_MISSING"
        | "STUDENT_INACTIVE";
    };
```

Return `DOCUMENT_COLLECTION_NOT_ELIGIBLE` for API rejection. Include the reason in a machine-readable field and a translated human-readable message.

The approval/admission decision and enrollment status remain separate:

- Admission or approval determines whether a candidate may proceed.
- Entrance completion records that the candidate sat or was exempted.
- Enrollment creates the student and is the point from which they are considered part of the school.
- Only all three, together with a valid student link, enable document collection.

## 5. Server Implementation

### 5.1 Add an eligibility helper

Create a pure helper in the lifecycle domain or service layer:

- Read application status, entrance fields, school ID, and `studentUserId`.
- Verify the linked student by a tenant-safe identity lookup.
- Keep active-student behavior explicit.
- Make the result suitable for both API responses and UI `next-action` payloads.

Return no partial authorization. Treat unknown, missing, or stale state as ineligible.

### 5.2 Reuse on every document route

Apply the helper to:

- Staff document presign.
- Staff document confirm.
- Staff direct document add.
- Staff document review/approve/reject.
- Public document add.
- Public document presign.
- Public document confirm.
- Public status payloads that expose uploaded documents or document actions.

Staff presign must fail before generating a signed URL. Confirm must re-check eligibility because state may change after presign. Public routes must validate the access token first, then enforce the same eligibility rule.

Do not change the existing file storage, MIME validation, virus scanning, or signed-upload implementation unnecessarily.

### 5.3 Enrollment and entrance updates

- Keep fee and classroom enrollment behavior unchanged unless a separate approved product requirement changes it.
- Keep `requiredDocTypes` and `waiveDocs` as optional enrollment/document requirements if the application policy later defines them.
- Never allow `waiveDocs` to make a pre-enrollment document upload eligible.
- When enrollment succeeds, ensure `studentUserId` points to the created or matched student and `enrolledAt` is set.
- Add staff and public entrance-completion actions that update only dedicated entrance fields and produce audit information.
- Update `next-action` so document collection has a clear state after enrollment, but preserve the existing status transitions and action names.

## 6. UI Implementation

### 6.1 Preserve existing components

Use the existing:

- [src/features/registrar/Page.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/Page.tsx) state and handler architecture.
- [src/features/registrar/hooks/usePageActions.ts](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/hooks/usePageActions.ts) API operations.
- [src/features/admission-form/AdmissionFormWizard.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/admission-form/AdmissionFormWizard.tsx) wizard.
- [src/components/OnboardingStepper.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/components/OnboardingStepper.tsx) presentation primitive.
- [src/features/registrar/components/StatusBadge.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/StatusBadge.tsx).
- [src/features/academics-shared/FeatureModalShell.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/academics-shared/FeatureModalShell.tsx).

Avoid introducing a parallel modal system or rewriting server state handling during the UI pass.

### 6.2 Admissions queue

Improve [src/features/registrar/components/AdmissionsTab.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/AdmissionsTab.tsx):

- Keep existing filters, saved views, pagination, and CSV export.
- Replace repeated summary cards with a compact pipeline that groups Pending, Under Review, Entrance, Awaiting Fee, and Enrolled.
- Make each row show:
  - Applicant identity and application number.
  - New/returning/applicant source indicators.
  - Applied grade.
  - Admission status.
  - Entrance state.
  - Next action.
  - Document eligibility state.
- Replace the plain row with a clear candidate card on narrow screens.
- Add a stable “Review application” action rather than requiring a click anywhere on the row.
- Preserve skeleton, empty, and server-pagination behavior.

### 6.3 Application review workspace

Refactor [src/features/registrar/components/ApplicationReviewModal.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/ApplicationReviewModal.tsx) instead of redesigning the workflow from scratch:

- Use shared modal chrome and correct body-scroll behavior.
- Keep the existing `OnboardingStepper` as the visible workflow summary.
- Split the content into clear sections or tabs:
  1. Applicant: demographics, guardian, grade, and source.
  2. Entrance: schedule or completed state, result, and reviewer notes.
  3. Decision: under review, approved/admitted, waitlisted, rejected, and withdrawal.
  4. Enrollment: classroom, fee, and final enrollment.
  5. Documents: rendered only when server eligibility is true.
- Keep entrance and enrollment fields in the same modal, but de-emphasize them until the relevant status.
- Replace the five equal action buttons with a primary action derived from `nextAction`, plus safe secondary actions.
- Keep save-without-status separate from status-changing actions.
- Add confirmation dialogs for reject, withdraw, waive fee, waive documents, and finalize enrollment.
- Show explicit blockers returned by `next-action`, rather than duplicating fee/document logic in the component.
- Move uploaded document rows into the final Documents section.
- Show an eligibility notice when the user cannot yet collect documents.

The Documents section must be omitted or replaced by a non-actionable eligibility notice until the server confirms eligibility.

### 6.4 Direct/new admission wizard

Improve [src/features/registrar/components/ManualAdmissionTab.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/ManualAdmissionTab.tsx):

- Keep the existing new/returning picker and three-step wizard.
- Place returning-student selection before the wizard fields.
- Improve the step indicator, final review, and edit-step behavior already provided by the wizard.
- Show loading, retry, and empty states for grade catalogs.
- Do not include document uploads or document checklists in the application wizard.
- Preserve the existing redirect to the Admissions queue after successful creation.

### 6.5 Student directory

Improve [src/features/registrar/components/DirectoryTab.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/DirectoryTab.tsx):

- Keep server/search/filter behavior and the existing import action.
- Use the existing `DataTable` on desktop.
- Add mobile cards below the tablet breakpoint.
- Make View dossier the primary action; Edit and Delete remain secondary.
- Add clear active/inactive and grade labels.
- Ensure table actions have accessible names and tooltips.

### 6.6 Student dossier

Refactor [src/features/registrar/components/StudentDossierModal.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/StudentDossierModal.tsx):

- Replace custom modal chrome with `FeatureModalShell`, or preserve the custom shell only if it can pass identical focus and scroll behavior.
- Retain Profile and Transcript tabs.
- Add a Documents tab only for enrolled students.
- Profile tab: identity, contact, guardian, placement, and account information.
- Documents tab: requested document types, file state, approved/rejected/pending status, upload, replace, and review actions.
- Transcript tab: retain generated content or the existing clear no-transcript state.
- Add loading and retry states for each tab.
- Keep close and destructive actions predictable.

### 6.7 Edit student modal

Improve [src/features/registrar/components/EditStudentModal.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/EditStudentModal.tsx):

- Retain the existing shared modal shell and photo editor.
- Split the form into Personal, Contact, Guardian, Placement, and Account sections.
- On desktop use a left section navigator and a right form area.
- On mobile use an ordered vertical layout with sticky section navigation or a compact step indicator.
- Add inline validation and an unsaved-change indicator.
- Keep grade loading and disabled behavior.
- Use a sticky footer with Cancel and Save changes.
- Disable save while invalid or submitting.
- Confirm discarding unsaved changes for dirty-form close actions.
- Return focus to the initiating directory action after close when practical.

## 7. Public Status and Entrance Experience

Improve the existing [src/pages/PublicApplyStatus.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/pages/PublicApplyStatus.tsx):

- Show clear Submitted, Under Review, Approved, Fee, Enrolled, and Rejected states.
- Keep entrance scheduling as an existing separate section.
- Show no document upload section until the student is document-eligible.
- Once eligible, show a dedicated document collection section or direct users to a secure upload flow.
- Keep documents private and separate from public applicant display.
- Preserve application-reference lookup and access-token behavior.

Do not add document upload fields to the application submission screen.

## 8. Shared Presentation and i18n

Add or reuse only a small set of components:

- A workflow stepper wrapper around existing `OnboardingStepper`.
- An admission status badge.
- A document status badge.
- A document row/upload component.
- A post-eligibility notice.
- Shared modal tabs/section navigation.

Add i18n keys for:

- Entrance not scheduled/completed/exempt.
- Entrance result and completion confirmation.
- Document eligibility reasons.
- Document collection stage.
- Unsaved changes and confirmation prompts.
- Mobile card actions and no-document states.

Add no hard-coded English UI copy where existing i18n patterns apply.

## 9. Testing

### 9.1 Server/domain tests

Add focused tests for:

- Every non-`ENROLLED` status rejects presign, confirm, add, and review.
- Enrolled plus entrance incomplete rejects.
- Enrolled plus entrance complete but missing `studentUserId` rejects.
- Enrolled plus entrance complete and inactive/mismatched school student rejects.
- Enrolled plus entrance complete and valid active same-school student permits.
- Confirm re-checks eligibility after presign.
- Public routes use the same eligibility helper.
- Document review cannot update a document from another application or tenant.
- Unknown or malformed entrance fields fail closed.
- `waiveDocs` alone never authorizes document collection before eligibility.
- Existing admission funnel, approval-path, and enrollment tests remain passing.

### 9.2 UI/contract tests

Update or add tests for:

- Document controls are absent until eligibility is returned by the server.
- The review modal uses server next-action/blockers and never pre-executes status transitions.
- Edit student grade loading remains disabled while grades load.
- Directory and dossier layouts have mobile-safe grids and no horizontal clipping.
- The modal shell supports scroll lock, Escape/backdrop behavior, and focus where applicable.
- New i18n keys resolve.
- Existing `ux-wiring`, `responsive-ui`, `admission-funnel`, and `enroll-approval-path` contracts pass.

Suggested commands:

- `npm run test:admission-funnel`
- `npm run test:enroll-approval-path`
- `npm run test:onboarding`
- `npm run test:ux-wiring`
- `npm run test:responsive`
- `npm run test:i18n`
- `npm run lint`
- Relevant Playwright tier and HTTP smoke suites

## 10. Implementation Order

1. Define dedicated entrance completion fields and lifecycle migration.
2. Implement the canonical document eligibility helper.
3. Add identity/student lookup verification for same school and active status.
4. Wire eligibility into every staff and public document endpoint.
5. Add next-action/document eligibility fields to relevant application responses.
6. Add entrance-completion staff/public actions and audit behavior.
7. Add server and contract tests.
8. Rework the Application Review modal into sections and primary/secondary actions.
9. Improve the Admissions queue row/card presentation.
10. Rework the Student Directory and Edit Student modal.
11. Rework the Student Dossier and add an enrolled-only Documents tab.
12. Improve public status document states.
13. Add i18n strings and accessibility/focus behavior.
14. Run targeted tests, lint/build, HTTP smoke tests, and relevant E2E suites.

## 11. Acceptance Criteria

- Document upload and document review are inaccessible for every state that has not created an active enrolled student.
- Entrance completion is explicit and auditable; a booked appointment is not considered completion.
- Every document route independently enforces eligibility and tenant scope.
- Presign, confirm, public upload, and review cannot be bypassed by stale UI state or direct API calls.
- `ENROLLED` is not enough by itself; explicit entrance completion and linked active student are also required.
- Existing status transitions and enrollment gates remain server-controlled.
- Admissions, application review, student directory, dossier, edit modal, and public status are responsive and keyboard accessible.
- No document-related control appears before eligibility.
- Loading, empty, error, retry, save, close, and confirmation states are predictable.
- Existing tests pass and no i18n or responsive UI baseline regresses.
