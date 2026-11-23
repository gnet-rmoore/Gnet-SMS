# Application Review Drawer — Stage-Focused UX/UI Implementation Plan

> Status: Implemented (automated contracts pass; manual smoke pending)
> Date: 2026-11-23
> Goal: one stage view at a time, previous stages browsable read-only, at most one primary action.
> Scope: registrar application review drawer only.
> Non-goals: no server state-machine changes, no new route, no payment automation, no audit-log rebuild.

---

## 1. Problem statement

The registrar review drawer currently renders almost everything at once:

- applicant demographics and photo,
- placement score, interview rating, and comments,
- class assignment,
- entrance-fee amount and waive controls,
- all five status-transition buttons,
- entrance completion,
- document checklist and uploads,

…regardless of the application's current stage. The `OnboardingStepper` already knows the stage, but the body ignores it. The result is a dense form where completed work still looks editable, future work is visible before it is relevant, and the primary action is buried in a grid of decisions.

The requested redesign is: **separate the stages into distinct views inside a persistent drawer shell, show only the fields and action needed for the current stage, allow browsing completed stages in read-only mode, and narrow the drawer to a professional working width.** The drawer must behave like a small stage workbench, not one long form with every section stacked together.

Note: the trailing `5` in `SubmittedReviewApprovedEntrance fee5Enrolled` is treated as a typo. This plan uses five stages:

1. Submitted
2. Review
3. Approved
4. Entrance fee
5. Enrolled

---

## 2. Research summary

### 2.1 Progressive disclosure and staged forms

| Source | Relevant finding | Design decision in this plan |
| :--- | :--- | :--- |
| [GOV.UK Service Manual — Structuring forms](https://www.gov.uk/service-manual/design/form-structure) | Use a “question protocol”: only ask for information you need, know why you need it, and know how you will check it. Start with “one thing per page”; use branching so people only answer relevant questions. | Each stage gets a single purpose and a small field set. Fee, class, documents, and entrance fields stop appearing everywhere. |
| [W3C WAI — Multi-page Forms](https://www.w3.org/WAI/tutorials/forms/multi-page/) | Divide long forms into logical stages; show progress; visually distinguish completed/current steps; allow returning to completed steps; save data already entered. | Keep the stepper, add read-only completed-stage summaries, and preserve all draft state across stage views. |
| [USWDS — Progress easily](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/) | Progressively disclose questions; show one micro-topic at a time; show where the user is; offer inline validation; avoid disabling inputs without explanation; support save/resume. | Stage header says “Step X of 5”, blockers are explained inline, and `Save & close` remains available. |
| [GitLab Pajamas — Stepper](https://design.gitlab.com/components/stepper) | Use steppers for related linear tasks. Provide visible Back/Next actions. Summarize selections on the last step. Warn before leaving an incomplete flow. | Linear stage rail, at most one primary CTA per stage, final Enrolled stage becomes a summary/document workspace. |
| [Carbon Design System — Forms](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms) | Progressive disclosure and multistep forms reduce overwhelm; each screen should have a logical relationship between fields. | No mixed-topic panels such as “fee + classification + documents + final status” in one view. |

### 2.2 Drawer / side-sheet behavior

| Source | Relevant finding | Design decision in this plan |
| :--- | :--- | :--- |
| [Material Design 3 — Side sheets](https://m3.material.io/components/side-sheets/guidelines) | Side sheets are anchored to a screen edge, usually the right; they span the screen height; they scroll vertically and not horizontally; modal sheets need focus management, close affordance, Escape, and scrim behavior. | Keep the right-side modal drawer, full viewport height, single vertical scroller, header/footer outside the scroller. |
| [Material side sheet documentation](https://md3.io/docs/components/side-sheet/) | Modal side sheets are dialogs with `aria-modal`, titled by the header; opening moves focus in, closing restores it; Tab stays inside; Escape and scrim close; named “Close” button. | Preserve and extend the current focus trap/backdrop/Escape/scroll-lock behavior; add `aria-describedby`. |
| [UL Design System — Drawers](https://designsystem.ul.com/components-v2/drawers/) | Drawers slide from the right, sit flush to the edge, use 100% width on small screens, at least 320px on desktop, scroll internally, return focus on close, and should not place CTAs below the fold. | Mobile full-width; desktop narrower than today; sticky footer with the primary CTA always visible. |

### 2.3 Why not a centered modal or a full page?

- A **centered modal** would hide the admissions list and make triage slower.
- A **full page** would be justified if this were a long-lived record editor, but the current task is rapid review of one row while the queue remains useful.
- A **right-side drawer** is the right container as long as it stays narrow enough to preserve list context and replaces itself stage-by-stage instead of stacking another overlay.

---

## 3. Current-state audit

### 3.1 The drawer shell

- `src/features/registrar/components/ApplicationReviewModal.tsx:170-184`
  - Root: `fixed inset-0 z-[100] flex items-stretch justify-end`.
  - Backdrop: full-size button with `bg-slate-950/45 backdrop-blur-[2px]`.
  - Panel: `h-[100dvh] w-full max-w-[1040px] flex flex-col overflow-hidden`.
- Header: `ApplicationReviewModal.tsx:185-228`.
- Stepper band: `ApplicationReviewModal.tsx:230-236`.
- Single scrolling body: `ApplicationReviewModal.tsx:238-639`.
- Footer: `ApplicationReviewModal.tsx:641-659`.
- Focus trap, Escape, scroll lock, focus restore: `ApplicationReviewModal.tsx:100-138`.
- The same focus-trap selector is duplicated in `src/features/registrar/components/NewEnrollmentDrawer.tsx:29-30,109-144`.

### 3.2 The stepper already computes a stage

- `src/components/OnboardingStepper.tsx:23` defines the stage order: `SUBMITTED`, `REVIEW`, `APPROVED`, `FEE`, `ENROLLED`.
- `src/components/OnboardingStepper.tsx:30-47` maps status to a step index.
- `src/components/OnboardingStepper.tsx:49-66` maps `nextAction` to a step index.
- `src/components/OnboardingStepper.tsx:70-73` lets `nextAction` override status.
- Labels live at `src/i18n/catalogs/en.ts:4046-4053`.
- The second consumer, `src/pages/PublicApplyStatus.tsx:257`, passes status only.

Important semantic gap: `PENDING + nextAction REVIEW` currently highlights **Review**, not **Submitted**. For the registrar drawer, this plan intentionally changes the body and stepper to open on **Submitted** for `PENDING`; `nextAction` still drives the CTA and blockers. `PublicApplyStatus` must not change.

### 3.3 Everything is rendered at once

`ApplicationReviewModal.tsx` currently renders most of these unconditionally:

| Current section | Lines | Problem |
| :--- | :--- | :--- |
| Demographics/photo | `239-288` | Useful as context, but currently full-size at every stage; photo editing remains available after enrollment. |
| Placement score/rating/comments | `404-445` | Editable even for ENROLLED and terminal applications. |
| Class group | `490-527` | Every stage offers enrollment finalization setup. |
| Entrance fee/waive controls | `529-584` | Every stage shows fee amount, waive fee, waive docs, and `Create entrance fee`. |
| Status action grid | `586-633` | Five transitions render at all stages, including terminal states. |
| Footer | `641-659` | Generic `Save without changing status` + `Close` does not tell the user what the stage is for. |

Conditional sections:

- Document checklist/unavailable panel: `ApplicationReviewModal.tsx:290-338`.
- Uploaded document review/upload: `ApplicationReviewModal.tsx:340-401`.
- Entrance completion: `ApplicationReviewModal.tsx:447-485`, only for `ENROLLED && !documentEligibility?.eligible`.

Document eligibility is server-controlled:

- `services/lifecycle/src/domain/documentEligibility.ts:30-60`
  - Eligible only when enrolled, entrance completed, result is `SAT`/`EXEMPT`/`PASSED`, decision is `ADMITTED`, and there is a linked active `STUDENT` in the same school.
- Therefore document work belongs in the **Enrolled** stage, after entrance completion, not in a generic global panel.

### 3.4 Data contract already exists

- Server next-action resolver: `services/lifecycle/src/domain/admissionFunnel.ts:56-103`.
- Server response: `services/lifecycle/src/services/admissionService.ts:375-420` returns `nextAction`, `blockedBy`, `required`, `documentEligibility`, `fee`, and `documents`.
- Client fetch: `ApplicationReviewModal.tsx:140-163` calls `registrarApi.getNextAction(id)` via `src/features/registrar/api.ts:68`.
- Client handlers: `src/features/registrar/hooks/usePageActions.ts:217-222` (open), `224-229` (doc toggle), `231-312` (save/decision/enroll), `367-412` (upload), `414-435` (review doc), `437-459` (entrance complete), `461-493` (create fee).
- Parent state: `src/features/registrar/Page.tsx:181,185,201-227`; drawer wiring: `Page.tsx:476-503`.

No API changes are required. The drawer is currently fetching the right information and using only a fraction of it.

### 3.5 Tests and docs that freeze the current shape

- `tests/ux-wiring.test.ts:77-85` asserts `role="dialog"`, `aria-modal`, `h-[100dvh]`, `max-w-[1040px]`, document eligibility, and entrance completion.
- `tests/responsive-ui.test.ts:70-80` asserts `role="dialog"`, `h-[100dvh]`, `w-full max-w-[1040px]`, `overflow-y-auto overscroll-contain`.
- `tests/responsive-ui.test.ts:82-112` freezes bare-grid drift at `20`.
- `tests/ui-drift.test.ts:24-28,73-118` freezes `rounded-3xl: 0`, `shadow-sm: 28`, `text-[10px]: 19`. The repo already has a known `shadow-sm 35 > 28` baseline failure; do not add new instances.
- `docs/RESPONSIVE_UI_PLAN.md:76-81` says drawers should be `max-w-md`, which conflicts with `ApplicationReviewModal` at `max-w-[1040px]` (and `NewEnrollmentDrawer` at `max-w-[960px]` in its separate plan). Update this doc as part of the change.
- `docs/ONLINE_ENROLLMENT_DRAWER_IMPLEMENTATION_PLAN.md` covers `NewEnrollmentDrawer`, not this component. Cross-link it; do not overwrite it.
- `docs/ONLINE_ENROLLMENT_MODAL_UI_IMPLEMENTATION_PLAN.md` describes the earlier modal-era review flow and has stale line references. Mark it as superseded by this plan.

---

## 4. Target experience

### 4.1 Information architecture

```text
┌────────────────────────────────────────────────────┐
│ Header: applicant, reference, status, close        │ fixed
├────────────────────────────────────────────────────┤
│ Stage rail: ✓ Submitted  ✓ Review  ● Approved  ... │ fixed
│             completed steps are buttons            │
│             current step is highlighted            │
│             future steps are locked labels         │
├────────────────────────────────────────────────────┤
│ Stage 3 of 5 — Approved                            │
│ Confirm class and finalize enrollment.             │
│                                                    │
│ ┌ Current stage card ────────────────────────────┐ │
│ │ Class group [ select ▾ ]                      │ │  one scroller
│ │ Waiting on: classroom assignment              │ │
│ └────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ Browse previous ▾   Save & close   [Confirm class]│ fixed
└────────────────────────────────────────────────────┘

History mode (after clicking a completed step):
┌────────────────────────────────────────────────────┐
│ READ-ONLY HISTORY — Review                         │
│ This stage is complete. Return to the current stage │
│ to make changes.                      [Return]     │
├────────────────────────────────────────────────────┤
│ Score: 82 · Interview: 4/5 · Decision: Approved    │
│ no inputs, no save button, no status actions       │
├────────────────────────────────────────────────────┤
│ Close                                              │ fixed
└────────────────────────────────────────────────────┘
```

Rules:

1. The drawer shell is persistent; stage content is swapped, never stacked.
2. Only the active stage has editable inputs and at most one mutation CTA.
3. Completed stages are clickable in the stage rail and open a read-only history view.
4. History view never reopens inputs, checkboxes, file uploads, or status buttons.
5. Future stages are visible as locked labels only; their fields are not in the DOM.
6. The footer changes with mode: active mode has `Browse previous` (when applicable), `Save & close`, and at most one primary CTA; history mode has only `Close`. `Return to current stage` lives in the history banner, not the footer.
7. Reject, waitlist, and other secondary decisions stay inside the stage where they are relevant; they are not global buttons.
8. `Close` requests drawer close. If dirty, the dirty-close confirmation appears first; otherwise the drawer closes. Escape and backdrop close the topmost layer: menu → confirmation → drawer. `Return to current stage` only switches mode.
9. `Browse previous` is a footer menu of completed stages; selecting an item calls the same navigation action as clicking its rail button.

### 4.2 Stage navigation and history browsing

The drawer has two modes, and only four stages are ever history targets:

```ts
type BrowsableStage = Exclude<AdmissionStage, "TERMINAL" | "ENROLLED">;

type StageSnapshot = Pick<
  ApplicationReviewModalProps,
  | "selectedApp"
  | "evaluationData"
  | "docsChecklist"
  | "selectedClassroomId"
  | "entranceFeeAmount"
  | "waiveFee"
  | "waiveDocs"
> & {
  nextAction: Record<string, unknown> | null;
  entranceResult: string;
  entranceNotes: string;
};

type ReviewViewState =
  | { mode: "active"; stage: AdmissionStage }
  | { mode: "history"; stage: BrowsableStage };
```

Navigation rules:

- Opening the drawer always starts in `active` mode at the resolver's active stage and captures a `StageSnapshot`.
- The snapshot is recaptured when `selectedApp` changes and after every successful mutation plus `getNextAction` refresh.
- The footer `Browse previous` control opens a menu of completed stages; focus moves to the first item, Escape closes only the menu, and selecting an item calls the same navigation action as clicking its rail button.
- Clicking a completed step (`canBrowseStage(stage, activeStage)` is true) switches to `history` mode for that step.
- Clicking the current step returns to `active` mode.
- Future steps are rendered with `aria-disabled="true"`, `tabIndex={-1}`, and no click handler.
- Switching modes does not save, clear, or mutate `evaluationData`, `docsChecklist`, fee state, class selection, or local draft state; history reads only the snapshot.
- After a mutation succeeds and `getNextAction` refreshes, recapture the snapshot, clear the history selection, and return to the new active stage.
- After any stage/history navigation or successful mutation, move focus to the stage title or history banner heading, then announce via a polite live region: `Viewing completed stage: Review` or `Returned to current stage: Approved`.
- `Close` requests drawer close. Escape and backdrop close the topmost layer: `Browse previous` menu → confirmation → drawer; when the drawer layer is reached and the draft is dirty, show the dirty-close confirmation first. `Return to current stage` only switches mode.
- Accessible names: `View completed step 2: Review`, `Current step: Approved`, `Locked step 4: Entrance fee`.

History view content by stage:

| Browse target | Read-only content |
| :--- | :--- |
| Submitted | photo thumbnail, gender, DOB, applied grade, address, guardian, submitted document count |
| Review | score, interview rating, comments, decision outcome |
| Approved | class assignment, approval timestamp if available, fee status at approval |
| Entrance fee | fee amount, payment reference/status, waive flags, blockers resolved |

`Enrolled` is never a history target because no active stage follows it; terminal applications disable browsing entirely. Enrolled data is shown in the active Enrolled stage and the terminal summary.

History is a **read-only view of the last saved snapshot**, not an audit log. It derives from a local `StageSnapshot` captured on open and after successful mutations; unsaved edits in live draft state, including entrance result/notes, never appear in history. Document rows derive from `selectedApp.admissionDocuments` (currently read as `fileDocs`), not a separate prop. If the school later needs immutable per-stage snapshots, add a backward-compatible `stageSnapshots` object to the notes JSON in a separate change; it is out of scope here.

### 4.3 Stage contract

| Stage | Entry | Editable now | Read-only context | Primary CTA | Secondary actions | Substep |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Submitted | `status=PENDING` | applicant photo | gender, DOB, address, guardian, application reference, applied grade, submitted docs count | `Confirm details & start review` only when `nextAction=REVIEW` → `UNDER_REVIEW` | none | `null` |
| Review | `status=UNDER_REVIEW` / `WAITLISTED`, `nextAction=APPROVE` | placement score, interview rating, comments | submitted snapshot, photo; waiting/on blockers | `Approve` → `APPROVED` | `UNDER_REVIEW`: `Move to waitlist`, `Reject`. `WAITLISTED`: `Return to review`, `Reject`; `Move to waitlist` hidden | `null` |
| Approved | `status=APPROVED` / `FEE_PENDING` / `DOCS_PENDING`, `nextAction=ASSIGN_CLASS` / `ENROLL` | class group when class is required | decision, score, interview rating, fee status | `Confirm class` when class is missing; `Finalize enrollment` when no blocker remains | none | `null` |
| Entrance fee | `status=APPROVED` / `FEE_PENDING` / `DOCS_PENDING`, `nextAction=PAY_FEE` / `WAIT_DOCS`, or `APPROVED + APPROVE` with `FEE_REQUIRED` | fee amount, `waiveFee`, `waiveDocs` | decision, class, mapped blocker copy | `Create entrance fee` when amount > 0; no primary CTA when amount <= 0, only a `Fee not required` helper plus `Save & close` | none | `null` |
| Enrolled | `status=ENROLLED` | Substep A: entrance result + notes. Substep B after eligibility: doc checklist + upload/review. | full application snapshot, fee, class, decision | `Record entrance complete` → then `Save documents` | `Refresh` in waiting state | `entrance` / `documents` / `waiting` |

Fallbacks and ownership rules:

- While `getNextAction` is `loading` or `error`, render a shell-level skeleton with no stage fields and no CTAs; do not resolve a stage from status alone.
- After `getNextAction` is `loaded`, resolve normally. A loaded `PENDING` with missing or unexpected `nextAction` resolves to `SUBMITTED` with no mutation CTA; only `Save & close` remains.
- `WAITLISTED` never shows `Move to waitlist`; it shows `Return to review` instead. `Reject` always requires confirmation.
- `WAIT_DOCS` is a legacy `nextAction`, not a `blockedBy` code; it maps to the Entrance fee stage and gets no blocker label.
- Unknown statuses fall back to `REVIEW` to match the server default (`admissionFunnel.ts:99-101`). Only `REJECTED` and `WITHDRAWN` are terminal.
- `SubmittedStage` reuses the existing `src/features/registrar/components/AdmissionApplicantPhoto.tsx` with `onPhotoError` / `onPhotoSuccess`; no new photo component or handler is introduced.
- Terminal applications (`REJECTED`, `WITHDRAWN`) render a terminal summary card with all data read-only and no stage CTAs except `Close`.

### 4.4 Enrolled-stage nested disclosure

The Enrolled stage is the only stage with two substeps because document editing is server-gated:

1. `entranceStatus !== COMPLETED` → show only entrance result + notes.
2. `documentEligibility.eligible === true` → show only the document checklist/upload workspace.
3. Otherwise → show a calm “Waiting for eligibility” card with mapped copy for the server reason and a `Refresh` button that re-runs `getNextAction`. Reason codes are limited to `NOT_ENROLLED`, `ENTRANCE_NOT_COMPLETED`, `STUDENT_RECORD_MISSING`, `STUDENT_INACTIVE`, `STUDENT_SCHOOL_MISMATCH` (`services/lifecycle/src/domain/documentEligibility.ts:5-10`), each with an i18n leaf and a generic fallback; raw codes are never rendered.

This removes the current contradiction where “Record entrance complete”, fee controls, and “Finalize enrollment” are visible at the same time.

### 4.5 Field disposition

| Current field/section | Target stage | Behavior elsewhere |
| :--- | :--- | :--- |
| Applicant photo | Submitted editable | Avatar/summary only from Review onward |
| Gender, DOB, address, guardian, applied grade, application reference | Submitted read-only context | Compact summary rows in later stages |
| Placement score, interview rating, comments | Review editable | Read-only one-line summary in later stages |
| Document checklist flags | Enrolled, only when eligible | Absent before eligibility |
| Uploaded document review/upload | Enrolled, only when eligible | Absent before eligibility |
| Entrance result + notes | Enrolled, before completion | Read-only after completion |
| Class group | Approved, only when needed | Read-only summary later |
| Fee amount + waive controls | Entrance fee | Read-only fee status later |
| Five status buttons | Removed; replaced by stage CTAs | Secondary decisions scoped to Review |
| `Save without changing status` | Renamed `Save & close` in footer | Available on every non-terminal stage |

---

## 5. Proposed architecture

### 5.1 Keep the public surface stable

Keep the `ApplicationReviewModal` export and prop contract (`ApplicationReviewModal.tsx:26-53`) so `src/features/registrar/Page.tsx:476-503` needs little or no change. This component becomes an orchestrator that resolves the stage and renders one stage panel.

### 5.2 New files

| File | Responsibility |
| :--- | :--- |
| `src/features/registrar/lib/admissionStage.ts` | Pure `resolveAdmissionStage`, `getStageFieldKeys`, `getCompletedStages`, `getStageHistorySummary`, `canBrowseStage`, `StageSnapshot` helpers. No React. |
| `src/features/registrar/hooks/useReviewStageNavigation.ts` | Owns `ReviewViewState`, `StageSnapshot` capture/reset, stage selection, accessible announcements, and focus targets. |
| `src/features/registrar/components/review/ReviewDrawerShell.tsx` | Backdrop, panel, header, stepper slot, scroll body, sticky footer. Owns width/shell classes. |
| `src/features/registrar/components/review/StageRail.tsx` | Clickable completed steps, highlighted current step, locked future steps. Wraps/extends `OnboardingStepper`. |
| `src/features/registrar/components/review/BrowsePreviousMenu.tsx` | Footer menu of completed stages; reuses the same `onStageSelect` action as `StageRail`. |
| `src/features/registrar/components/review/StageHeader.tsx` | `Step X of 5`, title, description, status pill, blocker line. |
| `src/features/registrar/components/review/StageHistoryBanner.tsx` | Read-only banner with `Return to current stage`. |
| `src/features/registrar/components/review/ReadOnlyStageView.tsx` | Shared read-only renderer for browsed stages; never renders editable controls. |
| `src/features/registrar/components/review/StageSummaryRow.tsx` | Optional compact completed summary inside the active body. |
| `src/features/registrar/components/review/StageFrame.tsx` | Chooses `ReadOnlyStageView` vs active stage panel based on mode. |
| `src/features/registrar/components/review/stages/SubmittedStage.tsx` | Intake summary and photo verification. |
| `src/features/registrar/components/review/stages/ReviewStage.tsx` | Score, rating, comments. |
| `src/features/registrar/components/review/stages/ApprovedStage.tsx` | Class assignment. |
| `src/features/registrar/components/review/stages/EntranceFeeStage.tsx` | Fee amount, waive controls, blockers. |
| `src/features/registrar/components/review/stages/EnrolledStage.tsx` | Entrance substep, then document substep. |
| `src/features/registrar/components/review/TerminalStage.tsx` | Read-only terminal summary. |
| `src/hooks/useDrawerA11y.ts` | Shared focus trap, Escape, body scroll lock, focus restore. |
| `tests/admission-review-stage.test.ts` | Pure resolver, field-key, snapshot, and navigation-eligibility matrix tests. |
| `tests/admission-review-drawer.test.ts` | Source/component-contract tests for single-panel rendering, history read-only guarantees, and mode-aware footer. |

### 5.3 Stage resolver

Recommended shape:

```ts
export type AdmissionStage =
  | "SUBMITTED"
  | "REVIEW"
  | "APPROVED"
  | "ENTRANCE_FEE"
  | "ENROLLED"
  | "TERMINAL";

export type StepperStage =
  | "SUBMITTED"
  | "REVIEW"
  | "APPROVED"
  | "FEE"
  | "ENROLLED";

export type BrowsableStage = Exclude<AdmissionStage, "TERMINAL" | "ENROLLED">;
export type EnrolledSubstep = "entrance" | "documents" | "waiting" | null;

export type AdmissionStageView = {
  stage: AdmissionStage;
  step: number | null;
  titleKey: string;
  descriptionKey: string;
  fieldKeys: string[];
  primaryActionKey: string | null;
  secondaryActionKeys: string[];
  blockedBy: string[];
  substep: EnrolledSubstep;
  primaryActionDisabledReasonKey?: string | null;
};

export type ReviewViewState =
  | { mode: "active"; stage: AdmissionStage }
  | { mode: "history"; stage: BrowsableStage };

export type StageSnapshot = Pick<
  ApplicationReviewModalProps,
  | "selectedApp"
  | "evaluationData"
  | "docsChecklist"
  | "selectedClassroomId"
  | "entranceFeeAmount"
  | "waiveFee"
  | "waiveDocs"
> & {
  nextAction: Record<string, unknown> | null;
  entranceResult: string;
  entranceNotes: string;
};

export type StageHistorySummary = {
  stage: BrowsableStage;
  rows: Array<{ labelKey: string; value: string }>;
};
```

Resolver input invariant: call it only after `getNextAction` is `loaded`. While state is `loading` or `error`, render the shell-level skeleton for all statuses; do not fabricate a stage from status alone.

Resolution rules:

1. `REJECTED` / `WITHDRAWN` → `TERMINAL`.
2. `PENDING` → `SUBMITTED`. Primary action exists only when `nextAction=REVIEW`; otherwise `primaryActionKey: null`.
3. `UNDER_REVIEW` / `WAITLISTED` → `REVIEW`.
4. `APPROVED` + `PAY_FEE`, or `APPROVED` + `APPROVE` with `FEE_REQUIRED` → `ENTRANCE_FEE`. The server returns `APPROVE` for an approved application whose invoice has not been created yet (`services/lifecycle/src/domain/admissionFunnel.ts:85-89`).
5. `FEE_PENDING` + `PAY_FEE` → `ENTRANCE_FEE`.
6. `DOCS_PENDING` + `PAY_FEE`, or legacy `WAIT_DOCS` → `ENTRANCE_FEE`.
7. `APPROVED` / `FEE_PENDING` / `DOCS_PENDING` + `ASSIGN_CLASS` / `ENROLL` → `APPROVED`. The user is not enrolled until the mutation succeeds.
8. `ENROLLED` → `ENROLLED` with `substep` from `entranceStatus` and `documentEligibility`.
9. Unknown status → `REVIEW` with `nextAction=REVIEW`, matching the server default (`admissionFunnel.ts:99-101`).

Do not invent new status strings. Status establishes the broad stage; `nextAction` disambiguates fee/class/enroll substate and drives CTA/blockers. `ENTRANCE_FEE` is the registrar UI name for the generic `FEE` step. This intentionally differs from `stepIndexForAction` for `ENROLL` / `DONE` while the status is still pre-enrollment; the stepper will use the resolver's explicit `activeStage`.

### 5.4 Stepper change

Update `src/components/OnboardingStepper.tsx` without importing registrar domain types:

- define a local `StepperStage` union using the existing `FEE` label;
- add optional `activeStage?: StepperStage | null`;
- add optional `onStageSelect?: (stage: StepperStage) => void` and `browsableStages?: StepperStage[]`;
- when provided, use `activeStage` for the highlight instead of the current `nextAction` override;
- render completed steps as real `<button>` elements when `onStageSelect` is supplied;
- render future steps as non-interactive labels with `aria-disabled="true"`;
- leave default behavior unchanged for `src/pages/PublicApplyStatus.tsx:257`;
- keep `data-testid="onboarding-stepper"` and the existing completed/active/future visual states.

`StageRail.tsx` is the registrar-specific adapter:

- map registrar `ENTRANCE_FEE` → stepper `FEE` for display;
- map stepper `FEE` → registrar `ENTRANCE_FEE` in `onStageSelect`;
- map `TERMINAL` to no highlighted step;
- pass only `BrowsableStage[]` as `browsableStages` so `ENROLLED` is never offered as history.

Do not make the public status page clickable.

### 5.5 Shared a11y hook

Extract the duplicated logic from:

- `ApplicationReviewModal.tsx:100-138`, and
- `NewEnrollmentDrawer.tsx:109-144`.

Hook contract:

```ts
useDrawerA11y({
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreTriggerRef?: RefObject<HTMLElement | null>;
  onRequestClose: () => void;
});
```

It must preserve:

- `role="dialog"` and `aria-modal` on the panel,
- labelled and described title/description,
- focus into the panel on open,
- Tab/Shift+Tab trap,
- Escape close via a ref so the effect does not re-subscribe every render,
- body overflow lock/restore,
- focus restore to the trigger.

Do not change `NewEnrollmentDrawer` behavior during this work; migrating it to the hook should be behavior-neutral.

### 5.6 Reuse existing primitives

Use what the codebase already has:

- `src/components/ui/Button.tsx:6-68` — forwardRef, variants, loading.
- `src/components/ui/Field.tsx:11-220` — `Field`, `TextField`, `SelectField`, `TextAreaField`.
- `src/components/ui/Surface.tsx:5-25` and `src/components/ui/tokens.ts:26-33` — card surfaces.
- `src/components/ui/SectionTitle.tsx:5-21` — section headings.
- `src/features/registrar/components/StatusBadge.tsx:5-47` — status pill.

There is no shared `Badge` primitive in `src/components/ui`; adding one is optional follow-up, not part of this plan.

Avoid:

- `rounded-3xl` (drift baseline is zero);
- new `shadow-sm` instances (baseline already failing);
- `text-[10px]` (baseline is max 19);
- `hover:bg-red-150` (`ApplicationReviewModal.tsx:610`) — replace with `hover:bg-red-100`.

### 5.7 Deprecation map for the old all-in-one drawer

| Old block | Current lines | Replacement | Removal rule |
| :--- | :--- | :--- | :--- |
| Two-column always-on body | `ApplicationReviewModal.tsx:238-639` | `StageFrame` + one stage panel | Remove after all five stage panels are wired. |
| Demographics block | `239-288` | `SubmittedStage` summary + `ReadOnlyStageView` | Remove the full block from `ApplicationReviewModal.tsx`; keep photo only in Submitted. |
| Document eligibility branch | `290-338` | `EnrolledStage` document substep | Delete from the orchestrator; move verbatim business rules into the stage component. |
| Uploaded document panel | `340-401` | `EnrolledStage` document substep | Move; do not change handlers. |
| Placement form | `404-445` | `ReviewStage` | Delete from every other stage. |
| Entrance completion | `447-485` | `EnrolledStage` entrance substep | Move; show while `entranceStatus !== COMPLETED`, then documents only when `documentEligibility.eligible`, otherwise waiting card. |
| Registry actions/fee/class section | `487-584` | `ApprovedStage` and `EntranceFeeStage` | Split by blocker; no shared `registryActions` card. |
| Five-status-button grid | `586-633` | Per-stage primary/secondary CTAs | Delete entirely. |
| Generic footer | `641-659` | Mode-aware footer in `ReviewDrawerShell` | Keep `Save & close` and add `Browse previous`; history mode keeps only `Close` because `Return` lives in the banner. |

This is the concrete meaning of "deprecate these stages": the old all-in-one sections are deleted, not hidden with CSS.

---

## 6. Visual and responsive design

### 6.1 Width

Current `max-w-[1040px]` is too wide for a review workbench on a 1440px laptop: only about 400px of the admissions list remains visible. It also encourages the current two-column “everything” layout.

Target:

```text
w-full max-w-[720px] xl:max-w-[880px]
```

- Phone: 100% width, no side gaps, full-height sheet.
- Tablet/laptop: capped at 720px, one column.
- Large desktop: capped at 880px, allowing a narrow summary rail beside the active field card without hiding the queue.
- Always `h-[100dvh]`, right-aligned, flush to the right edge.
- No horizontal scrolling inside the drawer.

Update `tests/responsive-ui.test.ts:70-80` and `tests/ux-wiring.test.ts:77-85` to assert the new responsive width classes. Update `docs/RESPONSIVE_UI_PLAN.md:76-81` so the `max-w-md` guidance no longer contradicts the implementation.

### 6.2 Layout

- Header: slate-950/900 gradient, applicant name, application reference, status pill, close icon. Keep `px-5 py-5 sm:px-8 sm:py-6`.
- Stage rail: white, `shrink-0`, compact, `border-b border-slate-200`.
  - Completed: emerald check, `text-slate-700`, `hover:bg-emerald-50 hover:text-emerald-900`, visible focus ring, real button.
  - Current: indigo filled circle, `text-indigo-800 font-extrabold`, subtle `bg-indigo-50/60` pill, `aria-current="step"`.
  - Future: `text-slate-400`, no pointer cursor, no hover state, no button semantics.
- History banner: `bg-indigo-50 border-b border-indigo-100 px-5 py-3 sm:px-8`, indigo “Read-only history” pill, one explanation line, right-aligned `Return to current stage` button.
- Body: `min-h-0 flex-1 overflow-y-auto overscroll-contain`, `p-5 sm:p-7`.
- Stage header: `Step X of 5` eyebrow, one clear title, one-sentence description.
- Active card: `Surface primary`, `rounded-2xl`, existing dual-layer shadow token; do not invent a new heavy shadow.
- Blocker card: amber `bg-amber-50`, `border-amber-200`, `text-amber-900`; use `blockedBy` codes mapped to human copy, never raw codes.
- Footer: `shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-8`; active mode left `Browse previous` (only when completed stages exist) + `Save & close`, right at most one primary CTA (none when no fee is required); history mode has only `Close` on the left.
- Motion: 120–160ms slide/fade between stage views, disabled under `prefers-reduced-motion` from `src/index.css:83-87`.

### 6.3 Density

- At most three editable controls per stage; Enrolled documents uses a four-toggle checklist plus uploads.
- Stage title: `text-2xl font-extrabold tracking-tight`.
- Body text: `text-sm leading-relaxed text-slate-600`.
- Labels: `text-xs font-bold uppercase tracking-wider text-slate-600`.
- No `text-[10px]`.
- Primary stage controls use at least 44px touch targets: `min-h-11` / `--sms-target-touch: 44px` (`src/components/ui/tokens.ts:46`, `src/index.css:79`). Compact button variants remain intentionally smaller and are not used for primary stage actions.

### 6.4 Professional finish checklist

This is the visual bar for "real and professional", not optional polish:

- **Spacing:** 4px/8px rhythm from `src/components/ui/tokens.ts`; no ad-hoc `mt-1.5`-style spacing unless correcting alignment.
- **Hierarchy:** one `h3` stage title, one `h4` card title, at most one primary CTA. Never more than one visually dominant action.
- **Alignment:** labels above controls, helpers directly below, error text below helpers; no inline label/control mixing except the compact stepper.
- **Status color semantics:** emerald = complete, indigo = current, amber = waiting/blocked, red = destructive only, slate = neutral/read-only.
- **Focus:** every interactive element gets `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`. After stage/history navigation or a successful mutation, focus moves to the new stage title or history banner heading.
- **Feedback:** after each mutation, keep the drawer open, refresh `getNextAction`, recapture `StageSnapshot`, show the existing toast, and animate to the next stage. Stage CTAs save the current stage and stay open; `Save & close` saves then closes.
- **Dirty close:** compare live draft with `StageSnapshot`, including entrance result/notes; `Close`, or Escape/backdrop once it reaches the drawer layer, shows a confirmation with `Save`, `Discard`, and `Cancel` when dirty. Stage switching alone never triggers this confirmation because it preserves draft state.
- **Loading:** initial `nextAction` load uses a shell-level skeleton with no stage fields or CTAs; mutation buttons use `Button loading`; stage rail remains visible but non-interactive while `submitting`.
- **Errors:** inline field errors plus a top-of-card error summary; never raw API codes. Document eligibility reasons use the mapped i18n leaves from section 7.3.
- **Empty states:** document uploads show an icon, one sentence, and the `Upload` action; no blank panels. Submitted shows a photo placeholder; Approved shows a class-empty hint; Entrance fee shows `Fee not required` when amount is zero.
- **Destructive actions:** `Reject` requires a confirmation dialog nested above the drawer; focus moves to the confirm button, Escape cancels the confirmation before closing the drawer, focus returns to `Reject`, and the dialog uses a z-index above `z-[100]`. `Move to waitlist` does not.
- **Read-only trust:** history mode uses a distinct banner, muted surface, snapshot-only values, and no save footer so it cannot be mistaken for an edit screen. `Return to current stage` appears only in the banner.
- **RTL:** stepper order, `Browse previous` menu alignment, and history banner action alignment must flip naturally with the app's RTL support.

State inventory that must be visually designed, not improvised:

| State | Treatment | Applies to |
| :--- | :--- | :--- |
| Normal | White surface, one primary action | All active stages |
| Blocked | Amber blocker card with mapped copy, no false finalization CTA | Approved, Entrance fee, Enrolled waiting |
| Empty | Icon + one sentence + single action/hint | Submitted photo, class list, document uploads, no-fee state |
| History | Indigo banner, slate read-only rows, no inputs | Four browsable stages |
| Terminal | Slate summary, no stage CTAs | `REJECTED`, `WITHDRAWN` |
| Loading | Button spinner, rail non-interactive | Any mutation |
| Error | Top summary + inline errors | Any mutation or form stage |
| Confirmation | Nested above drawer, focus returned | `Reject`, dirty close |

---

## 7. Localization

### 7.1 Reuse existing keys

Existing review keys:

- `src/i18n/catalogs/enPagesGaps.ts:420-467`
- `src/i18n/catalogs/en.ts:4105-4130`
- stepper keys at `src/i18n/catalogs/en.ts:4046-4053`

### 7.2 Add real catalog leaves

These strings currently exist only as inline `defaultValue` in `ApplicationReviewModal.tsx` and are invisible to `i18n:check`:

- `documentsUnavailable` — component line 330
- `documentsUnavailableHint` — component lines 333-335
- `entranceCompletionTitle` — component line 450
- `entranceCompletionHint` — component lines 453-455
- `entranceNotes` — component line 471
- `markEntranceComplete` — component line 482

Add all of these to `src/i18n/catalogs/enPagesGaps.ts` or `src/i18n/catalogs/en.ts` under `pages.admissions.review.*`, then remove the hard-coded `defaultValue` strings from JSX.

### 7.3 New keys

Add under `pages.admissions.review.stage.*`:

- `stepOf` — `Step {{current}} of {{total}}`
- `completed` — `Completed`
- `current` — `Current`
- `viewSummary`
- `hideSummary`
- `historyTitle` — `Read-only history`
- `historyHint` — `This stage is complete. Return to the current stage to make changes.`
- `returnToCurrent`
- `browsePrevious` — `Browse previous`
- `viewCompleted` — `View completed step {{step}}: {{stage}}`
- `currentStep` — `Current step: {{stage}}`
- `lockedStep` — `Locked step {{step}}: {{stage}}`
- `viewingCompleted` — `Viewing completed stage: {{stage}}`
- `returnedToCurrent` — `Returned to current stage: {{stage}}`
- `waitingOn`
- `nothingWaiting`
- `back`
- `saveAndClose`
- `terminalTitle`
- `terminalHint`
- `noPrimaryAction`
- `feeNotRequired`
- `refresh`
- `submitted.title`, `submitted.description`, `submitted.primary`
- `review.title`, `review.description`, `review.primary`, `review.moveToWaitlist`, `review.returnToReview`, `review.reject`
- `approved.title`, `approved.description`, `approved.confirmClass`, `approved.finalizeEnrollment`
- `entranceFee.title`, `entranceFee.description`, `entranceFee.createFee`
- `enrolled.title`, `enrolled.description`, `enrolled.entranceTitle`, `enrolled.documentsTitle`, `enrolled.waitingTitle`, `enrolled.saveDocuments`
- `summary.photo`, `summary.score`, `summary.interview`, `summary.fee`, `summary.documents`, `summary.decision`, `summary.class`

Add blocker labels under `pages.admissions.review.blocker.*` for:

- `FEE_REQUIRED`
- `CLASSROOM_REQUIRED`
- unknown fallback

Do **not** add `WAIT_DOCS` as a blocker; it is a `nextAction`, not a `blockedBy` value.

Add document-eligibility reason copy under `pages.admissions.review.documentReason.*` for:

- `NOT_ENROLLED`
- `ENTRANCE_NOT_COMPLETED`
- `STUDENT_RECORD_MISSING`
- `STUDENT_INACTIVE`
- `STUDENT_SCHOOL_MISMATCH`
- `fallback`

Add confirmation copy under `pages.admissions.review.confirm.*`:

- `reject.title`, `reject.body`, `reject.confirm`, `reject.cancel`
- `dirtyClose.title`, `dirtyClose.body`, `dirtyClose.save`, `dirtyClose.discard`, `dirtyClose.cancel`

### 7.4 Regenerate and assert

- Regenerate locales: `& npx.cmd tsx scripts/i18n-build-full-locales.ts`.
- Add assertions to `tests/i18n-resolve.test.ts`.
- Note: `scripts/i18n-check.ts:40-63` does not include `pages.admissions.*` in critical prefixes, so explicit tests are required.

---

## 8. Testing plan

### 8.1 New pure tests

`tests/admission-review-stage.test.ts`:

- `PENDING + REVIEW` resolves to `SUBMITTED`, `fieldKeys=["photo"]`, `primaryActionKey="confirmDetails"`, `secondaryActionKeys=[]`.
- `PENDING + loaded null` and `PENDING + unexpected` resolve to `SUBMITTED` with `primaryActionKey=null` and no secondary actions.
- `loading` or `error` `nextAction` state never calls the resolver for any status; the drawer renders the skeleton with no stage fields or CTAs.
- `UNDER_REVIEW + APPROVE` resolves to `REVIEW`, `fieldKeys=["score","interview","comments"]`, primary `approve`, secondaries `moveToWaitlist` and `reject`.
- `WAITLISTED + APPROVE` resolves to `REVIEW`, hides `moveToWaitlist`, and shows `returnToReview` plus `reject`.
- `APPROVED + PAY_FEE`, `FEE_PENDING + PAY_FEE`, `DOCS_PENDING + PAY_FEE`, `legacy WAIT_DOCS`, and `APPROVED + APPROVE + FEE_REQUIRED` all resolve to `ENTRANCE_FEE` with `fieldKeys=["feeAmount","waiveFee","waiveDocs"]`.
- Approved with fee paid but no `feePaymentId` still resolves to `ENTRANCE_FEE` through the `APPROVE + FEE_REQUIRED` rule.
- Entrance fee with amount `<= 0` has `primaryActionKey=null`; only `Save & close` remains.
- `APPROVED + ASSIGN_CLASS`, `FEE_PENDING + ENROLL`, and `DOCS_PENDING + ENROLL` resolve to `APPROVED`, `fieldKeys=["classroom"]`, primary `confirmClass` or `finalizeEnrollment` according to blockers.
- `ENROLLED` with incomplete entrance resolves to `ENROLLED`, `substep="entrance"`, `fieldKeys=["entranceResult","entranceNotes"]`.
- `ENROLLED` with completed entrance and `documentEligibility.eligible=true` resolves to `substep="documents"`, `fieldKeys=["documents"]`.
- `ENROLLED` with completed entrance and ineligibility resolves to `substep="waiting"`, `fieldKeys=[]`, and no mutation CTA except refresh.
- Every document-eligibility reason maps to an i18n key; no test output contains a raw reason code.
- `REJECTED` / `WITHDRAWN` resolve to `TERMINAL`; `fieldKeys=[]`; `step=null`.
- Unknown status resolves to `REVIEW` with `nextAction=REVIEW`, matching the server default.
- No resolver result contains all five status actions.
- `getCompletedStages(activeStage)` returns only earlier stages, never `TERMINAL`, and never `ENROLLED`.
- `canBrowseStage(stage, activeStage)` is true only when `stage` is earlier than `activeStage`; terminal returns no browsable stages.
- `getStageHistorySummary` exists only for the four browsable stages and returns label/value rows with no `fieldKeys`.
- `ENTRANCE_FEE` maps to stepper `FEE` for display and back to `ENTRANCE_FEE` on selection; `TERMINAL` maps to no highlight.
- Navigation reducer: selecting a completed stage sets `mode: "history"`; selecting current sets `mode: "active"`; future selections are ignored.
- Navigation reducer: `resetOnMutation` recaptures the snapshot, clears history selection, and returns to `active`.
- Snapshot tests prove unsaved live edits, including entrance result/notes, do not appear in history and a successful mutation refreshes snapshot values.

### 8.2 Updated source-contract tests

The repo uses source-contract tests rather than a browser DOM runner; do not add a new test framework in this change. Encode rendered-structure guarantees as composition contracts plus the manual smoke matrix in Phase 5.

- `tests/ux-wiring.test.ts`: change width expectation; assert at most one primary stage CTA mapping for `nextAction`; assert all handlers remain wired; assert `onStageSelect` is wired from `StageRail` and `BrowsePreviousMenu`; assert photo handlers are wired to `SubmittedStage`.
- `tests/responsive-ui.test.ts`: change width expectation; assert `min-h-0 flex-1 overflow-y-auto overscroll-contain`; assert no `md:grid-cols-2` in the new single-stage body unless an explicit `xl:` summary rail is used.
- `tests/admission-review-drawer.test.ts`: assert `ReviewDrawerShell` renders exactly one `StageFrame`, `StageFrame` chooses either one active stage panel or `ReadOnlyStageView`, all five stage panels are imported once, and no stage panel is rendered twice.
- `tests/admission-review-drawer.test.ts`: assert `ReadOnlyStageView.tsx` contains no `<input`, `<select`, `<textarea`, upload controls, `handle*`, `save*`, or status-action names.
- `tests/admission-review-drawer.test.ts`: assert history footer contains `Close` and not `Return`, `StageHistoryBanner` contains `Return`, and `BrowsePreviousMenu` is present only in active mode.
- `tests/admission-review-drawer.test.ts`: assert focus-target refs are set on stage title/history heading and that dirty-close confirmation has `Save`, `Discard`, and `Cancel`.
- `tests/admission-review-drawer.test.ts`: assert Escape order is `Browse previous` menu → confirmation → drawer, and that backdrop follows the same topmost-layer rule.
- `tests/i18n-resolve.test.ts`: new stage, history-mode, blocker, document-reason, and confirmation keys.

### 8.3 Commands

Use `& npm.cmd` / `& npx.cmd` in PowerShell because plain `npx` is blocked by execution policy.

Add `test:admission-review-stage` and `test:admission-review-drawer` to `package.json` in Phase 0, then run:

```powershell
& npm.cmd run test:admission-review-stage
& npm.cmd run test:admission-review-drawer
& npm.cmd run test:ux-wiring
& npm.cmd run test:responsive
& npm.cmd run test:i18n
& npm.cmd run test:ui-primitives
& npm.cmd run test:ui-drift
& npm.cmd run test:admission-funnel
& npm.cmd run test:admission-document-eligibility
& npm.cmd run test:enroll-approval-path
& npm.cmd run lint
& npm.cmd run i18n:check
```

Known baseline failures to preserve, not expand:

- `npm run lint` still fails in `api-docs`, `online-exam`, and duplicate locale keys unrelated to this work.
- `npm run test:ui-drift` still reports `shadow-sm drift 35 > 28` from existing files.
- `npm run i18n:check` still reports pre-existing `pages.payroll.*` and `public.apply.*` gaps.

---

## 9. Implementation order

- [ ] **Phase 0 — Contract**
  - [ ] Freeze five stage names, `PENDING → Submitted`, and the stepper adapter map; no product decision remains open.
  - [ ] Use the local `StageSnapshot` model for history; not an audit log.
  - [ ] Add `test:admission-review-stage` and `test:admission-review-drawer` scripts.
  - [ ] Freeze the stage resolver and navigation matrices in `tests/admission-review-stage.test.ts`.

- [ ] **Phase 1 — Shell and width (behavior-neutral PR)**
  - [ ] Create `ReviewDrawerShell.tsx` and `useDrawerA11y.ts`.
  - [ ] Move header/stepper/body/footer into the shell.
  - [ ] Change width to `w-full max-w-[720px] xl:max-w-[880px]`.
  - [ ] Keep all existing handlers and the current old body working; no field migration yet.

- [ ] **Phase 2 — Stage frame and navigation (same PR as Phase 3)**
  - [ ] Add `admissionStage.ts`, `StageSnapshot` helpers, and `useReviewStageNavigation.ts`.
  - [ ] Add `StageHeader`, `StageRail`, `BrowsePreviousMenu`, `StageHistoryBanner`, `ReadOnlyStageView`, `StageFrame`, `TerminalStage`.
  - [ ] Pass `activeStage` and `onStageSelect` through the `StepperStage` adapter.
  - [ ] Do not merge this phase alone; a half-migrated drawer must not ship.

- [ ] **Phase 3 — Migrate fields (same PR as Phase 2)**
  - [ ] `SubmittedStage` with existing `AdmissionApplicantPhoto` handlers.
  - [ ] `ReviewStage` with status-conditioned secondary actions.
  - [ ] `ApprovedStage` with class-only editing.
  - [ ] `EntranceFeeStage` with no-primary no-fee state.
  - [ ] `EnrolledStage` (entrance → documents → waiting substeps with mapped reasons).
  - [ ] Add history summaries for the four browsable stages only.
  - [ ] Delete dead conditional rendering and the five-status-button grid from `ApplicationReviewModal.tsx`.

- [ ] **Phase 4 — Copy, i18n, docs**
  - [ ] Add catalog leaves and regenerate locales.
  - [ ] Replace inline `defaultValue` strings and all raw blocker/reason codes.
  - [ ] Replace `hover:bg-red-150`.
  - [ ] Mark the old modal plan superseded; fix `RESPONSIVE_UI_PLAN.md`.

- [ ] **Phase 5 — Verify and ship**
  - [ ] Run all commands in section 8.
  - [ ] Manual smoke: PENDING with and without `nextAction`, UNDER_REVIEW, WAITLISTED, APPROVED + fee blocker, APPROVED + class blocker, FEE_PENDING, DOCS_PENDING, ENROLLED pre-entrance, ENROLLED eligible, ENROLLED ineligible for each reason, REJECTED, phone/tablet/1440px desktop.
  - [ ] Manual smoke: browse each completed stage, confirm no inputs/actions, return via banner only, mutate once, confirm snapshot/history resets to the new active stage.
  - [ ] Manual smoke: dirty close via `Close`, Escape, and backdrop; reject confirmation focus/Escape/return-focus.
  - [ ] Commit only files owned by this plan; leave unrelated dirty work untouched.

---

## 10. Acceptance criteria

1. Once `getNextAction` is `loaded`, the drawer renders exactly one editable stage panel.
2. Completed stages are absent from the active body; they are reachable only through `StageRail` or `Browse previous`.
3. Future-stage fields are not rendered at all.
4. The active stepper label matches the mapped stage title for every status in section 4.3, including `ENTRANCE_FEE → FEE`.
5. The five-status-button grid is gone. Each stage has at most one primary CTA and at most two secondary actions.
6. Fee, waive, and class inputs never appear in Submitted, Review, or terminal states.
7. Placement inputs never appear outside Review.
8. Document checklist/upload never appears before server eligibility is true.
9. Entrance result/notes are never editable after entrance completion; completed entrance values appear only as read-only summary where specified.
10. `REJECTED` and `WITHDRAWN` are read-only; unknown status falls back to Review.
11. Drawer width is `w-full max-w-[720px] xl:max-w-[880px]`; tests and docs agree.
12. Header/footer stay fixed; only the body scrolls; no horizontal scrolling in the drawer.
13. Focus trap, Escape, backdrop close, scroll lock, and focus restore still work.
14. All user-visible strings come from i18n catalogs; no new inline `defaultValue` English and no raw blocker/reason codes.
15. No new `rounded-3xl`, `shadow-sm`, `text-[10px]`, or `hover:bg-red-150` instances.
16. All new and updated tests pass; baseline failures are unchanged.
17. The drawer never renders more than one stage view at a time; stage panels are swapped, not stacked.
18. Completed steps in the stage rail are clickable and open a read-only history view; `Enrolled` is never offered as a history target.
19. History mode renders zero `input`, `select`, `textarea`, upload controls, save buttons, and status actions.
20. History mode shows a distinct `Read-only history` banner with `Return to current stage`; the footer shows only `Close`.
21. Future steps are locked labels, are not clickable, and render no fields.
22. Browsing history does not mutate or clear live draft/form state, and history shows only `StageSnapshot` values, never unsaved edits.
23. After a successful mutation, the drawer recaptures the snapshot, returns to the new active stage, and clears the history selection.
24. The visual finish checklist and state inventory in section 6.4 are satisfied on phone, tablet, and 1440px desktop.
25. `PENDING` with no `nextAction` shows no mutation CTA; only `Save & close` remains.
26. `WAITLISTED` hides `Move to waitlist` and shows `Return to review`; `Reject` requires confirmation.
27. Entrance fee amount `<= 0` shows no primary CTA and uses mapped `Fee not required` copy.
28. `Browse previous` is the only footer history affordance and opens a menu whose selection matches rail behavior.
29. Stage/history navigation and successful mutations move focus to the stage title or history heading and announce the change.
30. Dirty close confirmation offers `Save`, `Discard`, and `Cancel`; `Reject` confirmation traps focus above the drawer and returns focus to `Reject`.
31. Every document-eligibility reason renders mapped copy with a fallback, never a raw code.
32. Initial `nextAction` loading or failure shows a shell-level skeleton with no stage fields or CTAs.
33. Escape and backdrop close the topmost layer in order: `Browse previous` menu → confirmation → drawer.

---

## 11. Risks and mitigations

| Risk | Mitigation |
| :--- | :--- |
| Stage switching clears unsaved edits | Keep all live form state in `Page.tsx`; stage components are views over existing state. Switching mode never saves or clears. |
| `nextAction` and status disagree | Status establishes the broad stage; `nextAction` disambiguates fee/class/enroll substate and drives CTA/blockers. Pure tests cover the matrix. |
| Hidden required fields block progression | Each stage validates only its own fields before its CTA; blockers are explained with mapped copy inline. |
| History view mutates live draft state | History is a pure renderer over `StageSnapshot`; no handlers, no form registration, no save footer. |
| History shows stale or unsaved values | Snapshot is captured on open/app change and after each successful mutation; unsaved draft edits are excluded. It is not an audit log. |
| `Enrolled` is offered as a history target | `BrowsableStage` excludes `ENROLLED` and `TERMINAL`; `canBrowseStage` enforces earlier-only navigation. |
| Users mistake read-only history for the active stage | Persistent indigo banner, muted surface, snapshot-only values, no mutation footer, and `Return` in the banner only. |
| Document panel appears too early | Trust `documentEligibility.eligible` from `getNextAction`; refresh after entrance completion; map every reason code. |
| Buttons expose raw codes or false actions | Map all blockers/reasons to i18n; remove `WAIT_DOCS` blocker; hide `Move to waitlist` for `WAITLISTED`; remove `Continue` for no-fee state. |
| Backdrop/Escape loses work | Dirty-close confirmation with `Save`, `Discard`, `Cancel` is defined and tested in Phase 5. |
| Nested confirmation traps/drawer conflict | Confirmation sits above `z-[100]`, Escape cancels it first, focus returns to `Reject`. |
| Tests freeze old width strings | Update `ux-wiring` and `responsive-ui` in the same PR as the shell change. |
| Over-narrow drawer harms complex documents view | Keep 880px at `xl`; allow the document table/list to use full body width, not a two-column layout. |
| Locales lag English | Regenerate full locales and add explicit i18n assertions; accept temporary English fallback only where existing pipeline already does. |

---

## 12. Out of scope

- Changing `services/lifecycle` status transitions or eligibility rules.
- Adding a dedicated full-page application review route.
- Redesigning `NewEnrollmentDrawer` beyond the shared a11y hook extraction.
- Adding a full design-system `Drawer` or `Badge` primitive for the whole app.
- Automating fee payment or parent notifications.
- Reworking the public admissions status page.

---

## 13. Change log

### 2026-11-23 — Initial proposal

- Audited the current always-visible review drawer and stepper semantics.
- Researched progressive disclosure, stepper, and side-sheet guidance.
- Proposed stage resolver, component split, width change, i18n work, tests, and acceptance criteria.

### 2026-11-23 — Revision: true stage separation and history browsing

- Clarified that the drawer shell persists but stage panels are swapped, never stacked.
- Added two-mode navigation: active stage vs read-only history of completed stages.
- Made completed stepper nodes clickable, future nodes locked, and added `Return to current stage`.
- Added read-only history summaries, history-mode i18n keys, tests, and acceptance criteria.
- Added a professional finish checklist covering spacing, hierarchy, status semantics, focus, loading, errors, empty states, destructive confirmation, and RTL.

### 2026-11-23 — Final double-check revision

- Corrected touch-target references to `tokens.ts:46` and `index.css:79`; clarified compact variants are excluded.
- Removed `WAIT_DOCS` as a blocker label and mapped it as a legacy next action.
- Replaced ambiguous “last saved values” wording with an explicit local `StageSnapshot` captured on open/app change and after mutations; unsaved edits never appear in history.
- Excluded `ENROLLED` from history targets and added `BrowsableStage` / `canBrowseStage` invariants.
- Consolidated history navigation into banner `Return` plus footer `Browse previous` menu; removed duplicate footer `Return`.
- Defined fallback and edge behavior for `PENDING` without `nextAction`, `WAITLISTED`, no-fee state, unknown status, document reasons, photo handlers, and the `ENTRANCE_FEE ↔ FEE` stepper adapter.
- Added state inventory, dirty-close/reject-confirmation contracts, focus movement, expanded tests/scripts, and phase-shipping rules.
- Removed the non-existent `documents` prop from `StageSnapshot`; documents derive from `selectedApp.admissionDocuments`. Added entrance result/notes to the snapshot and defined topmost-layer Escape/backdrop order plus loading/fetch-failure skeleton behavior.
- Distinguished `nextAction` `loading | loaded | error` states: only `loaded` data reaches the resolver; `loaded null/unexpected PENDING` has no mutation CTA. Clarified `Close` requests close and may hit dirty confirmation; AC1/AC9 aligned with these contracts.
