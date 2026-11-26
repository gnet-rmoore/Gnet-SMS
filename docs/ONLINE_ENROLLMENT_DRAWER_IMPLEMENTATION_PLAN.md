# Modern Online Enrollment Drawer Implementation Plan

## 1. Objective

Replace the current in-page "Direct admission" / "New Online Enrollment" experience with a wide, professional right-side enrollment drawer while preserving the existing admission data model and submission flow.

The finished experience must feel like a focused registrar workspace:

- Clean, modern, and visually consistent.
- Wide enough for a sophisticated two-column application.
- Easy to scan on desktop.
- Fully usable as a full-height sheet on tablet and mobile.
- Fast to complete without losing the existing wizard validation.
- Suitable for both new applicants and returning students.

This is an enhancement of the existing registrar experience, not a rewrite of the admission state machine or API.

## 2. Existing Implementation to Reuse

### Current entry point

- [RegistrarChrome.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/RegistrarChrome.tsx)
  - The `new_admission` tab already opens the direct-admission experience.
- [Page.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/Page.tsx)
  - Owns the active tab and shared submission state.
- [ManualAdmissionTab.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/ManualAdmissionTab.tsx)
  - Currently renders a large centered card inside the page.
- [AdmissionFormWizard.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/admission-form/AdmissionFormWizard.tsx)
  - Already provides three validated steps:
    - Student
    - Guardians
    - Schooling
- [AdmissionApplicationFields.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/admission-form/AdmissionApplicationFields.tsx)
  - Already owns staff/public field behavior and validation presentation.
- [manualAdmissionForm.ts](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/lib/manualAdmissionForm.ts)
  - Extends the shared form with `existingStudentId`.
- [usePageActions.ts](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/hooks/usePageActions.ts)
  - Already submits the direct-admission API payload.
- [AdmissionApplicantPhoto.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/registrar/components/AdmissionApplicantPhoto.tsx)
  - Already distinguishes linked existing students from new/pending applicants.
- [StudentPhotoEditor.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/components/StudentPhotoEditor.tsx)
  - Already supports image validation, compression, preview, remove, and upload.

### Existing drawer patterns

Reuse the visual conventions established by:

- [FeeDetailDrawer.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/fees/components/FeeDetailDrawer.tsx)
- [RegistrationDetailDrawer.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/pages/SuperAdmin/components/RegistrationDetailDrawer.tsx)
- [LeaveDetailDrawer.tsx](/C:/Users/IPREP/Desktop/GNET-2026/src/features/leave-approval/components/LeaveDetailDrawer.tsx)

The common pattern should remain:

- Darkened backdrop.
- Right-side animated panel.
- Fixed height and independent body scrolling.
- Dark executive header.
- Light or neutral content surface.
- Sticky footer actions.
- Full-width mobile behavior.

## 3. Scope

### Include

- Replace the in-page direct-admission card with an openable, wide right drawer.
- Add a polished primary entry action.
- Improve applicant-type selection.
- Improve profile-photo selection and review.
- Improve every field section and review step.
- Preserve new and returning student behavior.
- Add clear unsaved, submitting, success, and validation states.
- Add complete i18n, keyboard, focus, backdrop, and mobile behavior.

### Defer unless explicitly requested

- Changing the backend application statuses.
- Changing admission document eligibility.
- Replacing the admission wizard's business validation.
- Removing the existing public online application URL.
- Adding custom file management for student documents in this drawer.

## 4. Drawer Entry and Lifecycle

### Drawer trigger

The `New Admission` / `Direct admission` tab should present a polished action page or directly open the drawer.

Recommended behavior:

- Keep the tab in `RegistrarChrome`.
- On entering the `new_admission` tab, show a small enrollment landing/workspace:
  - "Start new enrollment" primary button.
  - "Returning student" secondary quick start.
  - Recent direct admissions or setup guidance if useful.
- Clicking the action opens the drawer.
- A successful submission closes the drawer and switches to the Admissions queue.

This avoids leaving staff on an awkward blank page and gives a clear starting action.

### Drawer size

Use:

- Desktop: `w-full max-w-[920px]` or `max-w-[960px]`.
- Large desktop: optionally `max-w-[1040px]`.
- Tablet and mobile: full viewport width.
- Height: `100dvh`.
- Header and footer: fixed.
- Body: independently scrollable.

The drawer should be substantially wider than the existing four fields inside a single card.

### Backdrop and close behavior

- Close with close button, Escape, and backdrop.
- If the form is clean, close immediately.
- If it is dirty, show an unsaved-change confirmation before closing.
- Prevent accidental close while submitting.
- Lock body scroll while open.
- Restore focus to the trigger after close.
- Respect right-to-left layout.

## 5. Proposed Drawer Structure

### Header

Use a dark slate or executive gradient header with:

- Eyebrow: "New enrollment".
- Title: "Enroll a student".
- Subtitle: "Create a new application or link a returning student."
- Applicant reference or draft indicator.
- Close icon with accessible label.
- Optional unsaved-change indicator.

Do not overload the header with all form actions.

### Left rail / summary

Desktop drawer layout:

- A narrow left rail for the workflow:
  - Applicant type
  - Student
  - Guardians
  - Schooling
  - Review
- A live summary card:
  - Selected applicant type.
  - Student name.
  - Grade.
  - Applicant photo.
  - Completion percentage.
- A small action or note block.

On narrow screens:

- Replace the rail with a horizontal stepper.
- Place the current step label above the form.
- Keep the footer primary action visible.

### Body

Use a clean neutral canvas:

- `#f8fafc` or existing slate surface.
- White cards with 1px slate borders.
- 16px to 24px spacing.
- 16px to 20px border radius for cards.
- 12px to 16px controls.
- No decorative gradients inside every field group.
- Strong but restrained indigo accent.
- Emerald for completed states.
- Amber for incomplete or optional states.
- Rose for validation and errors.

### Footer

Keep actions sticky and predictable:

- Left: "Back".
- Center: optional "Save draft" if draft persistence is implemented.
- Right: "Continue" or "Submit application".
- Disable navigation/submission while saving.
- Show a spinner and clear label while submitting.
- On the final step, show the number of validation issues before submission.

## 6. Applicant-Type Section

Replace the current compact applicant-picker card with a card-based selector.

### New applicant

- Large radio-style card.
- Clear icon and description.
- Selecting this clears the existing-student link.
- New applicant fields remain open.

### Returning student

- Large radio-style card.
- Search existing-student field.
- Search by name, email, phone, or student ID if available.
- Show a result list with avatar, name, grade, and status.
- Selecting a result prefills the form.
- Use a selected-student summary instead of a plain native dropdown.

If the drawer must remain within existing dependencies, a searchable native/select fallback is acceptable, but the result list should be visually refined.

### Returning-student safety

- Show when the form was prefilled.
- Mark fields that differ from the existing record.
- Do not silently change the existing student name or identity.
- Make "Clear selected student" obvious.
- Reset the form cleanly when the selection is cleared.

## 7. Profile-Image Section

The current direct-admission flow has no polished profile-photo step or field. Add it to the Student section.

### Display

- A 120px to 144px square or circular preview.
- Existing-student photos use `StudentPhotoEditor`.
- New applicant photos use `AdmissionApplicantPhoto`'s pending-photo behavior.
- Show the applicant initials as fallback.
- Put upload/remove actions below or beside the avatar, not as overlapping tiny icons.

### Upload UX

- Offer a clear "Upload photo" button.
- Support click and drag/drop.
- Accept JPEG, PNG, WebP, and GIF.
- Show validation before compression.
- Show upload/compression progress.
- Show a preview immediately.
- Show file requirements:
  - Supported formats.
  - Size limit.
  - Recommended square crop.
- Add "Remove photo".

### Existing student

- Editing a linked student's photo must remain an existing-user photo action.
- Clearly label "Updates existing student profile".
- Confirm destructive removal if it affects the existing student.

### New applicant

- Store a pending photo as the existing `pendingPhotoUrl` note field.
- Do not create an identity or student record as part of the photo upload.
- Apply the photo only after enrollment succeeds, using the existing post-enrollment photo persistence pattern.
- If submission fails, retain the preview rather than silently dropping it.

## 8. Student Step

Redesign the existing Student section as professional form groups.

### Identity card

- Profile photo on the left.
- Name fields on the right.
- Full name layout:
  - First name.
  - Middle name.
  - Last name.
- Label required fields clearly.
- Show inline validation under each field.

### Personal details card

- Date of birth.
- Gender.
- Grade applying for.
- Student ID number (returning applicants only).

### Address card

- Home address.
- Character count.
- Better resize behavior.
- Responsive two-column layout.

### Field behavior

- 44px minimum control height.
- Visible focus rings.
- Consistent borders and backgrounds.
- Do not disable grade loading; show skeleton/loading and retry states.
- Surface grade-empty and grade-error states clearly.
- Preserve the existing staff validation rules.

## 9. Guardians Step

Replace dense checkbox and side-by-side blocks with clearly grouped cards.

### Father/Guardian card

- Name.
- Phone.
- Email.

### Mother card

- Name.
- Phone.
- Email.

### Family arrangement card

- Replace plain checkboxes with selectable option cards or a styled multi-select.
- Use accessible checkbox semantics.
- Allow an "Other" selection.

### UX rules

- Make Father/Guardian required behavior explicit.
- Keep mother and optional fields visually secondary.
- Add a clear "No guardian email" state if neither email is entered.
- Validate phone and email with inline messages.

## 10. Schooling Step

Improve the prior-schooling section:

- Previous school.
- Grade completed.
- Admission notes.
- Optional classroom selection if staff direct admission supports it.

Use:

- Two-column layout on desktop.
- One-column layout on mobile.
- A plain but well-styled text area.
- A clear optional label for non-required fields.
- Character count where useful.

## 11. Final Review Step

Replace the current small review table with a polished summary.

### Review sections

- Student identity and photo.
- Personal information.
- Guardians.
- Family information.
- Schooling.
- Admission source.

### Review behavior

- Provide an explicit "Edit" button for each section.
- Jump back to the corresponding wizard step.
- Return to Review after edit or preserve the expected next action.
- Show missing required fields before submit.
- Show a clear submission summary:
  - "Creates a new application."
  - "Links to existing student" for returning applicants.
  - "No documents are requested at this stage."

### Submission confirmation

Before final submit:

- Validate every step.
- Show a concise inline issue summary.
- Scroll/focus the first invalid field.
- Use a confirmation only if the submission is high impact or staff settings require it.

## 12. Modern Component Structure

### Add a dedicated drawer component

Create a focused registrar component, for example:

- `src/features/registrar/components/NewEnrollmentDrawer.tsx`

Its responsibilities:

- Drawer shell.
- Header and close behavior.
- Applicant/step navigation.
- Footer actions.
- Dirty-state confirmation.
- Body scroll and focus.

Keep form field rendering in the existing:

- `AdmissionFormWizard`
- `AdmissionApplicationFields`
- `AdmissionApplicantPhoto`

Do not duplicate the existing validation and payload logic.

### Refactor ManualAdmissionTab

Keep `ManualAdmissionTab` as the business-state wrapper:

- Existing student search.
- Form state.
- Submission handler.
- Drawer open/close state.

Move the visual drawer shell out of the tab.

### Preserve existing props

Avoid changing these public behaviors unnecessarily:

- `handleManualAdmissionSubmit`
- `manualAdmissionForm`
- `setManualAdmissionForm`
- `submitting`

## 13. Profile-Photo Data Flow

Extend `ManualAdmissionForm` with a pending-photo field if it does not exist:

- `pendingPhotoUrl: string | null`

Update:

- `emptyManualAdmissionForm`
- `studentToManualAdmissionForm`
- `buildAdmissionApiPayload`
- The Staff submission handler

Store pending photo in application notes using the existing `pendingPhotoUrl` pattern already used by application review.

Apply it after enrollment using the existing `persistUserPhoto` flow.

Do not collect profile photos as admissions documents.

## 14. i18n

Add translated copy for:

- New enrollment drawer title and subtitle.
- Start enrollment.
- Applicant type cards.
- Student search and selected student.
- Profile upload requirements.
- Unsaved changes.
- Step labels and step of count.
- Section names and edit actions.
- Submission success/failure.
- Returning-student behavior.
- Empty and loading states.

Update:

- English catalog.
- All locale files that use `manualAdmission`.
- Any shared admission wizard keys where labels remain hard-coded.

No new visible string should be hard-coded in JSX.

## 15. Accessibility

- Use `role="dialog"`, `aria-modal="true"`, and a labelled title.
- Add focus containment while open.
- Move focus to the drawer on open.
- Restore focus to the trigger on close.
- Make backdrop closing keyboard-safe.
- Use semantic form labels and `aria-invalid`.
- Announce validation and submission progress.
- Keep all controls at least 44px.
- Preserve Escape behavior.
- Ensure drag/drop has a keyboard upload alternative.

## 16. Responsive Behavior

### Desktop

- Wide right drawer.
- Fixed header and footer.
- Optional left workflow rail.
- Two-column field cards.

### Tablet

- Full-width or 85% width drawer.
- Horizontal step indicator.
- Two-column fields where space allows.
- Single-column compact cards below 768px.

### Mobile

- Full viewport drawer.
- Compact header.
- Horizontal or stacked step label.
- Single-column fields.
- Full-width footer actions.
- Body scroll remains independent.

## 17. Loading and Error States

Add explicit states for:

- Grade loading.
- Grade loading failure with retry.
- No grades configured.
- Student search loading.
- No search matches.
- Existing student prefill.
- Photo processing.
- Submission in progress.
- Submission failure.
- Submission success.
- Unsaved change close attempt.

Do not silently clear the form after a failed submission.

## 18. Testing

### Contract tests

Add or update tests for:

- The Direct Admission tab opens a right-side drawer.
- The drawer is wide and full-height.
- The drawer has Escape/backdrop behavior and body scroll lock.
- New applicants clear `existingStudentId`.
- Returning applicants prefill and preserve existing student identity.
- Pending photos are included in application notes.
- Pending photos are not submitted as document records.
- Final submission does not erase unsaved form state on failure.
- Existing validation rules remain unchanged.
- Grade loading/empty/error states remain accessible.

### UI wiring tests

- `NewEnrollmentDrawer` uses shared `AdmissionFormWizard`.
- The drawer uses `AdmissionApplicantPhoto` for pending or existing photos.
- The submit handler remains wired to `handleManualAdmissionSubmit`.
- The success path switches to `admissions`.
- i18n keys resolve.

### Responsive tests

- No bare two-column layout at phone widths.
- Drawer is full-height.
- Footer remains visible.
- Body scroll is independent.
- Controls do not overlap the sticky footer.

### Suggested commands

- `npm run test:ux-wiring`
- `npm run test:responsive`
- `npm run test:i18n`
- `npm run test:admission-funnel`
- `npm run lint`
- Relevant Playwright tier smoke tests

## 19. Implementation Order

1. Add the new drawer shell and open/close lifecycle.
2. Wire it to the existing `new_admission` tab.
3. Move the current direct-admission card into drawer content.
4. Improve applicant-type selection and returning-student search.
5. Add pending/existing profile-photo treatment.
6. Add pending-photo state to the manual admission form payload.
7. Improve Student, Guardians, and Schooling sections.
8. Improve wizard step indicator and final review.
9. Improve sticky header, footer, validation, loading, and close states.
10. Add i18n strings and accessibility behavior.
11. Add focused contract and responsive tests.
12. Run targeted tests and relevant build checks.

## 20. Acceptance Criteria

- The Direct Admission/New Enrollment experience opens as a wide, high-quality right-side drawer instead of an in-page card.
- The drawer is visually modern, clean, and consistent with other application drawers.
- Profile-photo selection is polished and usable for both new and returning applicants.
- Every field section has clear labels, spacing, validation, and responsive layout.
- Existing student search and prefilling remain reliable.
- The final review is clear and editable.
- Unsaved changes are protected.
- Submission behavior, loading, failure, and success states are predictable.
- No admission documents or eligibility controls are introduced by this flow.
- i18n, keyboard navigation, focus handling, and mobile behavior pass existing contracts.
