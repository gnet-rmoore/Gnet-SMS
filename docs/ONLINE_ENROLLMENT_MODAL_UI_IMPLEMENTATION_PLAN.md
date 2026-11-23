# New Online Enrollment Review Modal — UI/UX Implementation Plan

> Superseded by `docs/APPLICATION_REVIEW_DRAWER_STAGE_UX_PLAN.md` (stage-separated review drawer). Kept for historical context only.

## 1. Goal

Modernize the Registrar's online enrollment review experience so it looks and behaves like a polished, professional back-office workspace:

- Replace the dense, mixed-weight review modal with a clean, sectioned, state-aware workspace.
- Fix the applicant profile image section for both pending online applicants and already-linked students.
- Improve every section in the modal: identity, guardians, evaluation, entrance, decision, classroom/fee, enrollment, and documents.
- Preserve all existing server-controlled workflow, status transitions, eligibility rules, and enrollment behavior.

This is a UI/UX pass. No database or API contract changes are planned unless a gap is found during implementation.

---

## 2. Scope Interpretation

The literal label `New Online enrollment` does not exist in the codebase. The closest current flow is:

`Admission sidebar → Admissions page → Admissions tab → click an applicant row marked Online · New → ApplicationReviewModal`

Relevant current locations:

- Route: `src/App.tsx:798-805`
- Page: `src/features/registrar/Page.tsx:30`
- Default tab is `overview`: `src/features/registrar/Page.tsx:42`
- Tabs: `src/features/registrar/components/RegistrarChrome.tsx:35-41`
- Online applicant row: `src/features/registrar/components/AdmissionsTab.tsx:144-181`
- Modal render: `src/features/registrar/Page.tsx:453-480`
- Modal implementation: `src/features/registrar/components/ApplicationReviewModal.tsx:129-608`

There is also a `Direct admission` tab (`new_admission`) at `src/features/registrar/components/RegistrarChrome.tsx:40`, rendered by `ManualAdmissionTab` at `src/features/registrar/Page.tsx:428-437`.

Plan assumption: the requested modal is the **online applicant review modal** opened from the Admissions tab. The work will also make the entry point clearer by adding an explicit “New online enrollment” / “Review application” action and by considering a direct deep link from the dashboard `New Admission` action, which currently lands on `Overview`.

If the user instead meant the `Direct admission` wizard, the same visual system and profile-image improvements still apply; only the target component changes.

---

## 3. Current State and Problems

### 3.1 Modal shell and layout

- `ApplicationReviewModal.tsx:129-133` uses a bespoke fixed overlay instead of the shared `FeatureModalShell` (`src/features/academics-shared/FeatureModalShell.tsx:24-118`).
- The modal is `max-w-4xl` with a two-column grid and one long scrolling body (`ApplicationReviewModal.tsx:184`).
- Header, stepper, body, and footer compete for attention; the footer action is inside the scrolling grid rather than a true sticky action bar (`ApplicationReviewModal.tsx:586-604`).
- `hover:bg-red-150` at `ApplicationReviewModal.tsx:556` references an undefined token in `src/index.css:9-55`, so the hover state is unreliable.

### 3.2 Action hierarchy

- `ApplicationReviewModal.tsx:532-579` shows five nearly equal status buttons: Under Review, Approve, Reject, Waitlist, and Finalize Enrollment.
- This makes the primary next step unclear and risks accidental status changes.
- `nextAction`, `blockedBy`, and `documentEligibility` are already fetched at `ApplicationReviewModal.tsx:99-122` but are only used lightly in the stepper and document gate.

### 3.3 Mixed sections

The body combines:

- Applicant photo and demographics (`ApplicationReviewModal.tsx:186-234`)
- Document checklist and file upload (`ApplicationReviewModal.tsx:236-347`)
- Placement/evaluation (`ApplicationReviewModal.tsx:350-391`)
- Entrance completion (`ApplicationReviewModal.tsx:393-431`)
- Classroom/fee waivers (`ApplicationReviewModal.tsx:433-530`)
- Five status actions (`ApplicationReviewModal.tsx:532-579`)

These should become distinct, state-aware sections with clear responsibilities.

### 3.4 Profile image problems

Current implementation:

- `src/features/registrar/components/AdmissionApplicantPhoto.tsx:19-123` handles pending applicants.
- `src/components/StudentPhotoEditor.tsx:38-230` handles linked users.
- `AdmissionApplicantPhoto.tsx:141-157` switches between them.

Problems:

- `PendingApplicantPhoto` keeps a local `preview` at `AdmissionApplicantPhoto.tsx:29` that is not reset when `pendingPhotoUrl` changes externally.
- `StudentPhotoEditor` sets `preview` before awaiting save at `StudentPhotoEditor.tsx:98-100`; on failure, `savePhoto` does not clear the preview at `StudentPhotoEditor.tsx:70-87`, so a failed upload can still look applied.
- No confirmation on image removal.
- No drag/drop for pending applicants even though linked students have it.
- Avatar/editor sizes are inconsistent: `UserAvatar` `xl` is `w-28 h-28` (`src/components/UserAvatar.tsx:9-24`) while `StudentPhotoEditor` `xl` is `!w-32 !h-32` (`StudentPhotoEditor.tsx:17-21`).
- Buttons are small icon squares with no visible labels or hover/focus polish.
- File input is hidden with no clear “choose photo” affordance beyond a camera icon.
- No explicit validation summary for file type/size near the control.

### 3.5 Entry point problems

- `AdmissionsTab.tsx:150-154` makes the whole row clickable, with only a chevron affordance.
- `Online · New` at `AdmissionsTab.tsx:164-167` is a badge, not an action.
- Dashboard `New Admission` action navigates to `admissions` (`src/features/dashboard/registry.ts:105`, `:145`) but lands on `Overview` because `Page.tsx:42` defaults to `overview`.

### 3.6 Types and i18n

- `ApplicationReviewModalProps` is mostly `any` (`ApplicationReviewModal.tsx:24-51`).
- `usePageActions` dependencies are mostly `any` (`src/features/registrar/hooks/usePageActions.ts:10-40`).
- Some hard-coded English remains in the admission form/photo helpers (`src/features/admission-form/AdmissionApplicationFields.tsx:88`, `:239`, `:295`, `:325`; `src/lib/profileImage.ts:12`, `:15`, `:31`, `:53`, `:66`).

---

## 4. Design Direction

Use the existing **Executive Slate + brand blue** system rather than inventing a new visual language.

### 4.1 Visual principles

- Charcoal header (`from-slate-950 to-slate-900`) with restrained white typography.
- White modal surface with `rounded-[32px]`, hairline `slate-200` borders, and the existing soft shadow token.
- Nested sections on `bg-slate-50` with `rounded-2xl` and `border-slate-100`.
- Controls use `rounded-xl`, 12px minimum focus ring, and consistent `px-4 py-2.5` density from `src/components/ui/tokens.ts:53-63`.
- Headings use Plus Jakarta Sans; body uses Inter (`src/index.css:40-55`).
- Brand accent comes from `--school-brand-*` through `indigo-*`/`violet-*` aliases (`src/index.css:9-32`).
- Use at most one accent color per section; reserve emerald/rose/amber for status and validation.
- Add subtle 180–220 ms fade/translate motion already used by `FeatureModalShell`; respect `prefers-reduced-motion` (`src/index.css:83-87`).

### 4.2 Information hierarchy

1. **Header:** source badge, applicant name, reference number, status pill, close button.
2. **Workflow strip:** existing `OnboardingStepper` with `nextAction` and blockers.
3. **Section rail:** Overview / Applicant / Entrance / Decision / Enrollment / Documents.
4. **Main panel:** one focused section at a time, with a persistent identity summary at the top.
5. **Sticky footer:** one primary action derived from `nextAction`, plus Save draft and Close.

---

## 5. Proposed Modal Architecture

Create a focused folder instead of continuing to grow the 609-line component:

```text
src/features/registrar/components/admission-review/
  ApplicationReviewDialog.tsx
  ApplicantIdentityHero.tsx
  ReviewSectionRail.tsx
  ApplicantProfileSection.tsx
  ApplicantPhotoCard.tsx
  EvaluationSection.tsx
  EntranceSection.tsx
  DecisionSection.tsx
  EnrollmentSection.tsx
  DocumentsSection.tsx
  ReviewFooter.tsx
  types.ts
  reviewSections.ts
  useReviewNavigation.ts
```

`ApplicationReviewModal.tsx` becomes a thin adapter that keeps the existing prop contract and renders `ApplicationReviewDialog`.

### 5.1 Component responsibilities

- `ApplicationReviewDialog`: shared shell, header, stepper, section rail, scroll container, footer.
- `ApplicantIdentityHero`: photo, name, reference, grade, source, status, next action, blockers.
- `ReviewSectionRail`: desktop vertical section navigation; mobile horizontal segmented control.
- `ApplicantProfileSection`: demographics, address, guardian contacts.
- `ApplicantPhotoCard`: unified photo UI for linked and pending applicants.
- `EvaluationSection`: score, interview rating, comments.
- `EntranceSection`: scheduled appointment or explicit completion state.
- `DecisionSection`: approve/reject/waitlist/withdraw with confirmation.
- `EnrollmentSection`: classroom, fee, waivers, final enrollment.
- `DocumentsSection`: checklist, uploaded files, upload/review actions, rendered only when eligible.
- `ReviewFooter`: primary action, save-without-status, close, dirty/submitting state.
- `useReviewNavigation`: active section, visibility, completion badges, keyboard navigation.
- `reviewSections`: pure section definitions and status-dependent visibility rules.

---

## 6. Detailed UI/UX Changes

### 6.1 Application Review Dialog

- Replace `ApplicationReviewModal.tsx:129-133` with `FeatureModalShell` using:
  - `wide` or `maxWidthClass="max-w-6xl"`
  - `fullscreen` on small screens or `h-[92dvh]` on desktop
  - `lockBodyScroll`
  - `dismissOnBackdropClick={false}` while dirty
  - `eyebrow`, `title`, `subtitle`
- Keep the existing `OnboardingStepper` (`ApplicationReviewModal.tsx:176-182`) directly under the header.
- Move status badges and applicant type out of the header title into a compact metadata row.
- Add Escape handling and return focus to the row/action that opened the modal.
- Use `aria-labelledby`, `aria-describedby`, and labelled section regions.
- Show a small unsaved-changes indicator when evaluation fields, waivers, classroom, fee, or pending photo differ from the loaded state.

### 6.2 Section rail and navigation

- Show all sections on desktop with a compact left rail; collapse to a horizontal scrollable segmented control below `lg`.
- Each item shows:
  - Section label.
  - Completion or blocker dot.
  - Disabled/locked state where server eligibility or status prevents action.
- Derive visibility from the existing API data:
  - Documents section hidden or replaced with an eligibility notice unless `documentEligibility?.eligible`.
  - Entrance completion controls shown when status requires them.
  - Enrollment controls de-emphasized until fee/classroom gates are satisfied by `blockedBy`.
- Keep section content mounted where practical so unsaved input is not lost while navigating.

### 6.3 Applicant identity hero

Create a single top card with:

- 96–112 px avatar/photo on the left.
- Name, application number, `Online · New` / `Returning` badge, grade, and status.
- `Next step` line from `nextAction`.
- Blocker chips from `blockedBy` with plain-language labels.
- Guardians’ names/emails as secondary metadata.
- “Copy reference” action only for the application number; never show a token.

### 6.4 Profile image section

Create `ApplicantPhotoCard` as the single visual and behavioral component. It will own both modes and delegate persistence:

- Linked applicant: reuse `StudentPhotoEditor` persistence via `persistUserPhoto`.
- Pending applicant: reuse `compressProfileImage`, `validateProfileImageFile`, and `onPendingPhotoChange`.

Required fixes:

- One source of truth for the displayed image:
  - Derive from `photoUrl` or `pendingPhotoUrl`; do not keep an independent `preview` that can desync.
  - For optimistic UI, keep a transient `optimisticUrl` only inside the card and clear it in `finally`.
- On failed save, roll back the preview and show an inline error; never leave a failed image looking applied.
- Add `useEffect` to reset local state when `pendingPhotoUrl` or `photoUrl` changes.
- Add drag-and-drop for both pending and linked modes.
- Provide a visible “Change photo” button and a separate “Remove” text action with confirmation.
- Add file type/size hint near the control and an inline validation message with `role="alert"`.
- Add `aria-label` to all icon buttons and meaningful `alt` text.
- Show a spinner overlay while compressing/uploading and disable all photo controls.
- Standardize image size to 112 px on desktop and 96 px on mobile, with `rounded-3xl`, `object-cover`, and a subtle ring.
- Align `StudentPhotoEditor` and `UserAvatar` `xl` sizing to one shared token rather than `!w-32` vs `w-28`.
- Add a “Pending upload — applied on enrollment” chip for pending applicants so staff understand the photo is not yet persisted to a user account.

`AdmissionApplicantPhoto.tsx` becomes a compatibility wrapper around `ApplicantPhotoCard`.

### 6.5 Applicant profile section

- Replace the dense `bg-slate-50` text block at `ApplicationReviewModal.tsx:187-233` with a definition grid:
  - Identity: gender, date of birth, address.
  - Schooling: applied grade, source, applicant type.
  - Guardians: name, email, phone, primary/secondary relationship.
- Use `Field`-style labels for readability but keep values read-only.
- Use icons sparingly: `Mail`, `Phone`, `MapPin`, `School`.
- Truncate long addresses with an expand affordance.

### 6.6 Evaluation section

- Move score, interview rating, and comments out of “Placement” into a dedicated Evaluation card (`ApplicationReviewModal.tsx:350-391`).
- Use `Field`, `TextField`, and `SelectField` from `src/components/ui/Field.tsx` instead of raw inputs.
- Add inline validation for score range and required comments if the school workflow requires them.
- Show a compact evaluation summary after save.

### 6.7 Entrance section

- Show scheduled appointment details from the application when present:
  - slot date/time, location, instructions, reschedule count, status.
- Show explicit completion controls only when applicable (`ApplicationReviewModal.tsx:393-431`).
- Use result labels from i18n instead of raw `SAT`, `EXEMPT`, `PASSED`, `NOT_PASSED`.
- Add confirmation before recording entrance completion.

### 6.8 Decision and status section

- Extract the five equal buttons at `ApplicationReviewModal.tsx:532-579` into `DecisionSection`.
- Replace them with:
  - One primary button derived from `nextAction`.
  - Secondary actions in an “More actions” menu or compact button row.
  - Destructive actions (Reject, Withdraw) behind confirm dialogs.
- Keep server `nextAction` authoritative; do not infer the next step from local state.
- Show `blockedBy` reasons directly next to disabled actions.

### 6.9 Enrollment section

- Keep classroom selection, fee creation, fee waiver, and document waiver in a dedicated card (`ApplicationReviewModal.tsx:433-530`).
- Replace raw checkboxes with accessible switch/checkbox rows and short helper text.
- Show seats available and full-class state from existing classroom capacity fields.
- Combine fee ID/status into a small status panel.
- Add confirmation before final enrollment.
- Disable enrollment when the server reports blockers; display the blockers, not a generic disabled button.

### 6.10 Documents section

- Keep the eligibility rule from `documentEligibility`.
- When ineligible, show a single non-actionable notice with the reason from the server (`ApplicationReviewModal.tsx:273-284`).
- When eligible:
  - Checklist rows with icon, label, status pill, and verified/missing state.
  - Uploaded file rows with type, filename, status, approve/reject actions.
  - Upload action as a clear dashed drop area or button, not a tiny label.
- Do not add document upload to the application wizard or public application form.

### 6.11 Footer

- Sticky footer with:
  - Left: unsaved indicator and “Save changes” secondary action.
  - Right: Close and the status-aware primary action.
- Disable primary action while submitting or blocked; show spinner and resulting error inline.
- Replace undefined `red-150` with an existing token such as `rose-100`/`rose-50`.

### 6.12 Entry point improvements

In `AdmissionsTab.tsx:144-181`:

- Keep the whole row clickable, but add an explicit “Review application” affordance.
- Add a `UserRoundCheck`/`ArrowUpRight` icon button with an accessible label.
- Show application number, grade, and `nextAction` summary when available.
- Keep `Online · New` as a source badge.

In `RegistrarChrome.tsx:35-41`:

- If product confirms the wording, change the `new_admission` label from `Direct admission` to `New online enrollment` via i18n key `admissions.tabs.directAdmission`, without changing the tab id.
- Alternatively keep `Direct admission` and add a page-level “New online enrollment” button that opens the Direct Admission tab.

In `src/features/dashboard/registry.ts:105`:

- Make `New Admission` navigate with a tab hint, e.g. `admissions?tab=new_admission` or `admissions?tab=admissions`, and have `Page.tsx:42` respect it.

---

## 7. Shared Components and Tokens

Reuse, do not duplicate:

- `src/features/academics-shared/FeatureModalShell.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Field.tsx`
- `src/components/ui/SectionTitle.tsx`
- `src/components/ui/Surface.tsx`
- `src/components/ui/tokens.ts`
- `src/components/OnboardingStepper.tsx`
- `src/features/registrar/components/StatusBadge.tsx`
- `src/lib/cn.ts`
- `src/index.css` density and motion tokens

Add small admission-specific primitives only where no shared equivalent exists:

- `ReviewSectionRail`
- `ApplicantPhotoCard`
- `ApplicantIdentityHero`
- `ReviewFooter`

---

## 8. Types and Data Flow

- Keep the existing API calls:
  - `registrarApi.getNextAction(id)` at `ApplicationReviewModal.tsx:105`
  - `handleSaveReview`, `handleUploadAdmissionDoc`, `handleReviewAdmissionDoc`, `handleCreateEntranceFee`, `handleCompleteEntrance`
- Replace `[key: string]: any` in `ApplicationReviewModalProps` with explicit types in `admission-review/types.ts`:
  - `ApplicationSummary`
  - `EvaluationDraft`
  - `NextActionPayload`
  - `DocumentEligibility`
  - `ClassroomOption`
  - `DocumentRecord`
- Type `nextAction`, `blockedBy`, and `documentEligibility` from the API payload instead of `string | null` and inline objects.
- Keep all mutations in `src/features/registrar/hooks/usePageActions.ts`; dialog components remain presentational and call callbacks.
- Do not duplicate server eligibility, fee, classroom, or status logic in the UI.

---

## 9. i18n Plan

Add and use keys under `admissions.review.*` and `studentPhoto.*` in:

- `src/i18n/catalogs/en.ts`
- `src/i18n/catalogs/enPagesGaps.ts`
- `src/i18n/catalogs/locales/ar.ts`
- `src/i18n/catalogs/locales/de.ts`
- `src/i18n/catalogs/locales/es.ts`
- `src/i18n/catalogs/locales/fr.ts`
- `src/i18n/catalogs/locales/hi.ts`
- `src/i18n/catalogs/locales/zh-Hans.ts`
- `src/i18n/catalogs/translations.ts`

New key groups:

- `review.sections.*`
- `review.nextAction.*`
- `review.blockers.*`
- `review.photo.*`
- `review.documents.*`
- `review.confirm.*`
- `review.dirty.*`
- `studentPhoto.dropHint`, `studentPhoto.invalidType`, `studentPhoto.tooLarge`, `studentPhoto.pendingChip`

Replace hard-coded English strings in the affected review/photo components. Avoid touching unrelated pre-existing duplicate locale keys unless they block the build.

---

## 10. Testing Plan

### 10.1 Unit/component tests

Add or update focused tests for:

- Shared shell: backdrop, Escape, scroll lock, focus return, and dirty-close confirmation.
- Section rail: correct sections visible per status, `nextAction`, blockers, and `documentEligibility`.
- Primary action: derived from server `nextAction`, not from local guessing.
- Destructive actions require confirmation.
- Documents section absent/inert when ineligible.
- Profile photo:
  - pending photo applied to parent state
  - external `pendingPhotoUrl` change resets local preview
  - failed upload rolls back preview and shows error
  - remove asks for confirmation
  - drag/drop and keyboard activation work
- No hard-coded English in the new admission review components.
- Responsive classes: mobile horizontal rail and desktop vertical rail.

### 10.2 Existing contracts

Run:

- `npm run test:admission-funnel`
- `npm run test:admission-document-eligibility`
- `npm run test:enroll-approval-path`
- `npm run test:ux-wiring`
- `npm run test:ui-primitives`
- `npm run test:ui-drift`
- `npm run test:responsive`
- `npm run test:i18n`
- `npm run lint`
- `npm run build`

Add a targeted Playwright check for the online applicant review path if the existing tier suites do not cover it.

---

## 11. Implementation Order

1. Confirm the entry-point interpretation and capture before/after screenshots of the current modal at desktop and mobile widths.
2. Add typed props and `NextActionPayload`/`DocumentEligibility` types in `admission-review/types.ts`.
3. Introduce `ApplicationReviewDialog` using `FeatureModalShell`, with header, stepper, section rail, and sticky footer only.
4. Extract the current content into section components without changing behavior.
5. Rebuild `ApplicantPhotoCard` and make `AdmissionApplicantPhoto` a wrapper; fix preview rollback and state sync.
6. Polish `StudentPhotoEditor` and `UserAvatar` sizing/accessibility to match the new card.
7. Redesign each section in place using shared tokens, `Field`, and `SectionTitle`.
8. Replace the five equal status actions with a `nextAction`-driven primary action and confirmed secondary actions.
9. Implement eligibility-aware documents rendering.
10. Improve `AdmissionsTab` review affordance and dashboard/tab deep linking.
11. Add all i18n keys and remove hard-coded copy from affected components.
12. Add component/contract tests, then run the verification commands.

---

## 12. Acceptance Criteria

- The online applicant review modal uses the shared modal shell and consistent Executive Slate styling.
- Desktop and mobile layouts are intentional: desktop section rail, mobile segmented rail, no horizontal clipping.
- There is one clear primary action derived from server `nextAction`; destructive actions require confirmation.
- `blockedBy` reasons are visible next to disabled actions.
- The profile image control supports pending and linked applicants with the same visual design.
- Failed image upload/removal rolls back state and shows an error; no failed image appears applied.
- Image controls are keyboard accessible, labelled, support drag/drop, and show busy/validation states.
- Every section uses shared tokens and existing UI primitives; no undefined color classes.
- Documents controls remain hidden/inert until server eligibility is true.
- All new copy is localized and key resolution tests pass.
- Existing admission, enrollment, document eligibility, responsive, UI drift, and ux-wiring tests pass.
- No server workflow, status transition, fee, classroom, or enrollment gate is weakened.

---

## 13. Out of Scope

- Changing admission state machines or enrollment orchestration.
- Adding new photo storage endpoints or changing compression configuration.
- Adding a crop library or new third-party UI dependency.
- Redesigning the public application form or public status page in this pass.
- Refactoring unrelated maintenance, PTA, bulk import, or logistics UI work already present in the working tree.
