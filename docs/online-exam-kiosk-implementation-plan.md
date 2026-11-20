# Online Exam Kiosk & Paper-Design Implementation Plan

**Status:** Planning (double-checked against current codebase). No implementation applied.  
**Scope:** (1) Apply exam-paper preview design to the student online exam question view, (2) enforce one-way, one-question-at-a-time navigation with no backtracking, (3) harden screen sharing to be application-driven and tamper-resistant within web-platform limits.

---

## 0. Current state (verified)

| Area | Current implementation | Key files |
|---|---|---|
| Student exam (live) | Pre-flight → kiosk exam → results; single question rendered but navigation is reversible (palette jump, prev, arrow keys, review jump); resume hydrates attempt but requires re-entering kiosk (`started` remains false until user action) | `src/features/online-exam/TakePage.tsx` |
| Student exam (preview/demo) | Mirrors TakePage flow; local/preview scoring and local violation counting (no real attempt persistence semantics identical to live) | `src/features/online-exam/PreviewPage.tsx` |
| Shared kiosk UI | `QuestionPalette` (clickable `onJump`), `PrevNextButtons` (prev/next/finish), `ShortcutHint` (advertises arrows), `ReviewSheet` (clickable chips that jump then close), timer/save/violation, intro/rules/system-check, screen-share UI/copy | `src/features/online-exam/KioskUI.tsx` |
| Screen sharing & capture | `navigator.mediaDevices.getDisplayMedia({ video: true })` (user-chosen surface, no `displaySurface` validation). `track.onended` → `SCREEN_SHARE_STOPPED` (TakePage reports violation; Preview counts only if type is in `kioskConfig.blockedEvents`, and defaults omit it). `needsScreenConsent = kioskConfig.requireScreenShare || proctorLevel === "SCREEN_VIEW"`. Precondition checked at start but not continuously enforced/validated. Frame capture for `SCREEN_VIEW` via `getScreenConfig`/interval depends on a live stream | `TakePage.tsx`, `PreviewPage.tsx`, `api.ts` |
| Fullscreen/violations | `requestFullscreen` + listeners for fullscreen/visibility/blur/copy/context/keys; event/level types incl. `EXIT_FULLSCREEN`, `SCREEN_SHARE_STOPPED`, `ProctorLevel` | `TakePage.tsx`, `PreviewPage.tsx`, `src/features/online-exam/api.ts` |
| Paper document design | Print-ready A4 navy/white document: branded header, exam-info cards, standardized question blocks (badge/type/marks), option/TF/fill/essay layouts, per-page PDF export; downloaded PDF strips selector inputs in export only | `src/features/exam-paper/ExamPaperDocument.tsx`, `src/features/exam-paper/PreviewPage.tsx` |
| Routing/shell | Exam routes under school `Layout` (`online-exams/:examId/take[:attemptId]`, sample/demo/exam `.../preview`, proctor/script). `Layout` has kiosk behavior for take/preview routes but they still mount within the school shell | `src/App.tsx`, `src/components/Layout.tsx` |

### Backtrack paths that must be removed (all of them)
- **Palette jump:** `QuestionPalette` `onJump` usage in `TakePage.tsx` and `PreviewPage.tsx`.
- **Previous navigation:** `goPrevQuestion` + `PrevNextButtons.onPrev` in both pages; ArrowLeft handling in key listeners (`navRef` direction -1).
- **Review jump:** `ReviewSheet` clickable chips call `onJump(i)` and close (so students can navigate back). `TakePage`/`PreviewPage` pass `onJump={(i) => setCurrentIndex(i)}`.
- **Shortcuts/copy:** `ShortcutHint` currently implies arrow navigation.
- **Index initialization:** `firstUnansweredIndex` returns the last index when all are answered; hydrate sets `currentIndex` to `firstUnansweredIndex(...)` — must be reconciled with forward-only/resume rules.

---

## 1. Apply exam-paper preview design to the student question view

**Goal:** Match the redesigned exam-paper visual language (navy/white, school branding, clear header/meta, standardized question/marks/answer presentation) for the **interactive, one-question-at-a-time** student experience in both live (`TakePage`) and preview/demo (`PreviewPage`).

### 1.1 Approach
- **Do not render the static `ExamPaperDocument` for answering.** It is a multi-question print/PDF artifact with paginated export behavior. Reuse its **design tokens and block styling** for an interactive exam-taking presentation.
- Extract shared tokens/constants/helpers derived from `ExamPaperDocument.tsx` (palette e.g. navy/border/muted, radii, typography scale, spacing, header/meta-card, question badge/type/marks pill, option/TF/fill/essay containers) into a shared module (e.g. `src/features/online-exam/examPaperTheme.ts` or `src/features/exam-paper/theme.ts`) used by document and exam views to prevent drift.
- Reuse existing primitives where appropriate: `RichContent` (prompts/choices), `SchoolLogo`/school branding, timer/save/violation status; restyle to the paper look.
- Keep on-screen answer controls **interactive and accessible** (selected/focus/hover/keyboard states). PDF-only selector stripping remains confined to document/PDF export, not the taking UI.

### 1.2 In-exam student view (Take/Preview)
- **Header band (paper-style):** school logo/name (and contact if available/appropriate), examination context, prominent exam title, compact meta (date/duration/total marks/questions) consistent with the document header; integrate essential live status (timer, save state, violation/integrity, screen-share status) styled with navy accents/badges without adding navigable elements.
- **Active question card:** single-question block using paper treatment — question number badge, `Question N · <Type>` label, marks badge (PDF-safe/explicit alignment), prompt via `RichContent`, consistent padding/radius/border/spacing.
- **Answer controls (paper-styled, interactive):**
  - **MCQ/True-False:** option rows matching paper containers (letter chip, borders, alignment) with accessible selection state.
  - **Fill-in-the-blank:** paper-style answer line/input.
  - **Essay:** paper-style response area (lined/marks-scaled height) with text entry; integrate word count/rough-work unobtrusively.
- **Progress:** read-only “Question X of Y” and/or a non-interactive progress bar/stepper styled to fit (no clickable navigation; see §2).
- **Pre-flight:** align IntroFacts/ExamRules/SystemCheck/consent to the same brand/header language (secure context preserved) for coherence.

### 1.3 Parity & scope
- Apply identical question/paper styling to **TakePage and PreviewPage** (and shared `KioskUI` subcomponents) so preview/demo mirrors the real student experience.
- Prioritize pre-flight and in-exam question view; style result/review screens consistently only where low-risk. No regression to answering, autosave, heartbeat, timer, or submission.

### 1.4 Tasks
1. Audit `ExamPaperDocument.tsx` → define shared theme/tokens/helpers.
2. Restyle pre-flight and in-exam header/meta/question/answer UI in `TakePage`/`PreviewPage`; refactor duplicated fragments into shared components to reduce drift.
3. Restyle `IntroFacts`, `ExamRules`, `SystemCheck` to align with paper identity.
4. Verify responsive behavior and accessibility (focus, contrast, labels, keyboard interaction for answering/advancing only).
5. Manual visual QA: live take vs preview/demo vs exam-paper document for equivalent content.

### 1.5 Acceptance criteria
- Student sees the same navy/white branded paper design language while answering each question (live and preview/demo).
- Question number/type/marks and option/response presentation are consistent with the exam-paper design.
- No regression to answering, autosave, timer, or submission flows.

---

## 2. One-way, one-question-at-a-time navigation (no backtracking)

**Goal:** Students answer the current question and move forward only; no return/jump to previous (or arbitrary) questions via UI, keyboard, or review, in live and preview/demo.

### 2.1 Required behavior
- **Remove all jump/back affordances:** eliminate clickable `QuestionPalette`/`onJump`; remove “Previous”/`goPrevQuestion`/`onPrev` from `PrevNextButtons` and page handlers; remove ArrowLeft/back handling in key listeners and `navRef`; update `ShortcutHint` and related i18n to reflect forward-only behavior.
- **Read-only progress:** replace palette with a non-interactive indicator (e.g. `Question X of Y` and/or progress bar/stepper) that conveys position but is not clickable.
- **Forward-only invariant:** `currentIndex` must be **monotonic non-decreasing** (guard all setters and stale handlers). Advance only when the current question satisfies existing gating (`canAdvance`/`currentAnswered` semantics preserved unless explicitly changed). ArrowRight/Next, if kept, must respect gating and never navigate backward.
- **Last question:** allow only Finish/Submit → confirmation → final submit; never navigate back.
- **Review sheet (make non-navigable):** `ReviewSheet` must not provide navigation. Remove/disable question-jump chips and `onJump`; closing/returning must not change question (student remains on current/last question). Use it as a **read-only confirmation summary** (answered/unanswered counts/status) before submit, or remove if redundant — recommended to keep as read-only summary.
- **Lock-on-advance (recommended, to confirm):** current question may be edited while active; once the student advances, previous answers are not revisitable/editable (consistent with no-back). Enforce in UI/state transitions.
- **Resume/initialization:** deterministic forward position for hydrated/resumed attempts (e.g. clamp to `firstUnansweredIndex`/saved forward cursor as defined) with no ability to decrease index; handle “all answered” edge case without enabling back-navigation.

### 2.2 Parity & server considerations
- Apply identical rules to `TakePage.tsx` and `PreviewPage.tsx`.
- Autosave/heartbeat/payload logic unchanged (saves by question id); confirm no API assumes revisitation. No schema changes expected.

### 2.3 Tasks
1. Update `KioskUI.tsx`: remove/replace `QuestionPalette` jump UI with read-only progress, make `PrevNextButtons` forward-only (drop prev props/handler), make `ReviewSheet` non-navigable/read-only summary, update `ShortcutHint`.
2. Update `TakePage.tsx` and `PreviewPage.tsx`: remove `goPrev`/ArrowLeft/palette/review jump wiring, clamp index to monotonic increase, adjust finish/submit flow, and define resume/initial index behavior.
3. Update i18n strings/copy to avoid misleading “previous/jump/arrow” guidance.
4. Regression-test: no back/jump by click, touch, keyboard, or review; forward gating intact; last-question submit works; resume behaves per chosen rule.

### 2.4 Acceptance criteria
- Exactly one active question at a time with **no UI, keyboard, or review path to return to a previous question** (live and preview/demo).
- Forward progression (when allowed) and final submission function correctly.

### 2.5 Clarifications (confirm during implementation)
- **Edit-after-advance:** lock previous questions on advance (recommended) vs any alternative (note: no-back makes revisits impossible regardless).
- **Resume position:** first unanswered vs last reached/saved cursor (deterministic) and handling for fully-answered-in-progress attempts.

---

## 3. Screen sharing: application-driven and tamper-resistant (web-platform limits)

**Goal:** When sharing/capture is required, obtain the correct exam surface with minimal friction, keep it valid for the exam duration, and prevent (or reliably detect and respond to) stopping/sharing the wrong surface — **within browser constraints**.

### 3.1 Platform constraints (must be explicit)
- **Not fully automatic / not guaranteed prompt-free:** `getDisplayMedia` is user-consent gated and requires user activation in standard web contexts; a page cannot silently capture an arbitrary window with no prompt/chooser in compliant browsers.
- **Cannot hide or disable the browser sharing UI:** the browser-controlled sharing indicator/banner and “Stop sharing” control **cannot be hidden, suppressed, or programmatically dismissed** by web JavaScript or libraries. “Fix” means **best-effort mitigation and enforcement**, not removal.
- **Exam-window selection cannot be forced:** the app can only *request/prefer* a surface; the browser/OS controls the picker and final choice, so acquired streams must be validated.

### 3.2 Implementation strategy

#### A. Prefer and validate the exam tab/surface (Chromium hints + fallback)
- Centralize capture in a shared module (e.g. `src/features/online-exam/screenShare.ts`) wrapping `getDisplayMedia` with feature-detected options and fallbacks, e.g.:
  - `preferCurrentTab: true`
  - `selfBrowserSurface: "include"` (to allow the exam tab)
  - `surfaceSwitching: "exclude"` (where supported)
  - `monitorTypeSurfaces: "exclude"` (bias away from other monitors, per policy)
  - reasonable `video` constraints (frame rate/cursor) as needed
- Request capture at a **user-gesture point** aligned with consent + fullscreen/kiosk entry to maximize compliance and preference behavior.
- **Validate selection:** inspect `track.getSettings().displaySurface` (and available settings). If policy requires the exam tab/current browser surface and the user selected an invalid surface, **stop tracks, reject start, explain requirement, and require retry** (do not begin/continue). Treat inability to verify on a given browser as a defined policy case (fail closed when required).

#### B. Continuous, non-optional sharing when required
- Treat `requireScreenShare` / `SCREEN_VIEW` capture as a **hard precondition** for start and a **continuous requirement** during the exam.
- Monitor liveness: `track.onended`, `muted` (where relevant), and `readyState`/video viability (including for proctor frame capture). On loss/invalid stream, **immediately enforce**: record `SCREEN_SHARE_STOPPED` (or equivalent) and apply termination policy (see below) so the student cannot continue unsupervised.
- **Enforcement must not depend solely on `blockedEvents` membership** (Preview currently counts only if included and defaults omit it). Make required-share loss a deterministic, policy-driven outcome (recommended: critical violation → auto-submit/end session per configured `maxViolations`/integrity rules) in **both** TakePage and PreviewPage.
- Mid-exam re-acquisition cannot be automatic (needs user gesture) and reopens chooser risk; default to **end session on stop** unless a supervised re-share flow is explicitly approved.

#### C. Mitigate (not hide) the browser “Stop sharing” UI
- Keep fullscreen, focus/visibility/fullscreen enforcement and violation handling to reduce opportunity/impact of interacting outside the exam.
- Pre-exam consent/rules/system-check must clearly state: the exam tab/window will be shared, the browser sharing indicator may remain visible and cannot be removed by the app, and stopping sharing ends/penalizes the exam.
- Poll/verify stream health frequently; fail-safe immediately on end.

#### D. Libraries & implementation notes
- **Fullscreen:** optionally adopt `screenfull` for cross-browser reliability, or harden native handling — avoid unnecessary dependencies.
- **Capture:** implement directly with typed wrappers (no library bypasses consent/UI). Share lifecycle (`start`/`verify`/`onEnded`/`stop`) between `TakePage` and `PreviewPage`. Be defensive for Safari/Firefox/mobile differences.

### 3.3 Tasks
1. Add shared capture utility: preferred-tab/surface hints, fallbacks, `displaySurface`/settings validation, lifecycle hooks, and clear error states.
2. Integrate in `TakePage` and `PreviewPage`: system check reflects real capability/state; obtain and verify stream before/with kiosk start when required; block on denial/invalid surface; bind proctor frame capture to verified stream; handle `onended`/liveness with deterministic enforcement.
3. Update consent, secure-bullets, and system-check copy/i18n for accurate expectations and consequences.
4. Ensure parity: Preview simulates the same constraint/termination behavior as live (even if not server-persisted identically).
5. QA matrix: Chrome/Edge (primary), Firefox/Safari, permission denied, wrong surface selected, user clicks browser Stop sharing, track ends/muted mid-exam, multi-monitor, resume/re-entry after interruption.

### 3.4 Acceptance criteria
- On supported browsers, share request prefers the current exam tab/surface and rejects invalid selections per policy (within what the browser allows).
- Required sharing is a hard, continuous precondition; stopping/losing sharing is detected immediately and handled by a deterministic violation/termination policy in live and preview/demo.
- UX/copy sets correct expectations; **no attempt to hide/suppress browser-controlled sharing UI** and no claim of fully automatic capture.
- Proctor frame capture (when enabled) uses a verified, live stream.

### 3.5 Risks & escalation (must be acknowledged)
- Browser support for `preferCurrentTab`/`surfaceSwitching`/`monitorTypeSurfaces` and `displaySurface` varies; fallbacks and clear failure messaging are required.
- **If true suppression of the stop-sharing control or guaranteed no-prompt/forced-window capture is a hard requirement, it is out of scope for a standard web app.** Escalate to a controlled runtime (managed/locked-down browser/kiosk OS policy or an Electron/proctored desktop shell with OS-level capture permissions) — separate product/architecture decision.

---

## 4. Cross-cutting impact

- **Expected touchpoints:** `TakePage.tsx`, `PreviewPage.tsx`, `KioskUI.tsx`, new shared helpers (`online-exam` theme/capture and/or navigation guards), i18n strings for `onlineExams.take/preview/author` hints and consent, and minor `App.tsx`/`Layout.tsx` only if kiosk-shell isolation needs adjustment.
- **Keep stable unless required:** question/answer schemas, scoring/submission APIs, proctor review pages, and exam-paper document/PDF export logic (token reuse is fine).
- **Consistency rule:** behavior and visuals must be mirrored in **live and preview/demo**.

## 5. Recommended implementation phases

1. **Foundations:** shared exam-paper theme/tokens; shared screen-capture/validation utility; navigation guard helpers.
2. **Navigation lock-down (§2):** remove all back/jump paths (incl. review), read-only progress, monotonic index + lock/resume rules, shortcut/copy updates.
3. **Visual redesign (§1):** restyle pre-flight and in-exam single-question UI to paper design in Take/Preview via shared components.
4. **Screen-share hardening (§3):** preferred-tab capture, `displaySurface` validation, liveness monitoring, config-independent enforcement, updated system checks/consent.
5. **QA & polish:** accessibility, responsive, browser matrix, end-to-end proctor capture, and regression (autosave/timer/violations/submission/resume).

## 6. Verification plan

- **Automated:** extend/update online-exam tests for navigation guards and capture helpers as feasible; run `npm.cmd run test:online-exam` (and related suites) plus targeted lint/typecheck for touched files.
- **Manual:**
  - *Design parity:* paper preview vs student take vs demo/preview (header, meta, question/marks/options/response).
  - *Navigation:* no previous/jump via mouse, touch, keyboard, or review; forward gating; finish/submit from last question; deterministic resume with no back-navigation.
  - *Screen share:* required-share cannot start without valid exam-tab share (supported browser); wrong surface rejected; stop/loss ends/violates immediately per policy; browser indicator may remain (expected) but enforcement works; proctor receives frames when enabled.
  - *Fullscreen/violations:* composed correctly with new flow.
  - *Regression:* autosave/reconnect, timer expiry, manual submit, demo/preview scoring.

## 7. Deliverables

- Student online exam UI matching exam-paper design for question viewing/answering (live + preview/demo).
- Forward-only, non-backtrackable question flow with no jump-to-previous capability and non-navigable review/confirmation.
- Hardened, app-driven screen-share acquisition/validation/enforcement with accurate UX/copy and documented browser limitations, plus an escalation path if true stop-share suppression or forced no-prompt capture is required.
