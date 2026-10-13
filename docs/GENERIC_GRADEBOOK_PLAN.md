# Generic, Config-Driven Gradebook — Plan

> **Status:** Done (2026-08-05) — structure resolution fix + teacher UI refresh  
> **Scope:** Gradebook Structure on each calendar assessment; live school template unless explicitly custom  
> **Companions:** [`docs/gradebook-architecture.md`](gradebook-architecture.md), [`docs/TEACHER_GRADEBOOK_PLAN.md`](TEACHER_GRADEBOOK_PLAN.md)

---

## Resolution model (2026-08-05 fix)

| Flag | Behavior |
| :--- | :--- |
| `ExamComponent.gradebookStructureCustom = false` | **Live** `School.gradebookConfig` drives columns (Settings changes apply immediately) |
| `ExamComponent.gradebookStructureCustom = true` | Stored `gradebookStructure` JSON is authoritative for that assessment |

Saving **Settings → Grading → Structure** calls `POST …/gradebook/sync-structure-template`, which updates all assessments where `gradebookStructureCustom = false`.

Calendar Step 3: **Customize for this assessment** sets custom=true; **Use school template** sets custom=false and re-syncs from Settings.

---

## Data model

### ExamComponent

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `gradebookStructure` | `String?` | Cached JSON when custom, or last synced template snapshot |
| `gradebookStructureCustom` | `Boolean` | Explicit override flag (default `false`) |

### GradeEntry

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `structureColumnId` | `String?` | Activity column id within the assessment |
| `examComponentId` | `String?` | Parent assessment |

---

## Phases

| Phase | Deliverable | Status |
| :--- | :--- | :--- |
| **A** | `gradebookStructureCustom` + fixed `resolveEffectiveAssessmentStructure` + sync | done |
| **B** | Calendar custom toggle, default assessment mode, structure source badge | done |
| **C** | Gradesheet, StudentGrades API, period summary use structure rollup | done |
| **D** | Migration `scripts/migrate-gradebook-structure-custom.ts` + SQL | done |
| **E** | `tests/assessment-structure.test.ts` extended | done |
| **UI** | Executive Slate gradebook hub + assessment sheet redesign | done |

---

## Verify

- [ ] Settings: add 3 homework columns → save → teacher gradebook (By assessment) shows 3 HW columns
- [ ] Calendar: customize one assessment → only that assessment differs from Settings
- [ ] Re-save Settings → non-custom assessments pick up new columns
- [ ] Gradesheet uses structure-column entries when present
- [ ] `npx tsx tests/assessment-structure.test.ts`
- [ ] Rebuild `identity`, `academic`, `frontend-spa`

### 2026-08-05 — Internal API omitted `gradebookConfig` (iprep / all schools)

**Bug:** `GET /api/internal/schools/:id` (used by Academic to load the live school template) did **not** include `gradebookConfig`. Academic always saw `null`, fell back to stale per-assessment JSON (4 columns HW/QZ/CW/EXAM), and showed **Custom structure** even when `gradebookStructureCustom = false`.

**Fix:** Include `gradebookConfig` in `getSchoolInternal` response (`services/identity/src/controllers/schoolController.ts`). Rebuild `identity` + `academic`.

**After deploy:** Hard-refresh gradebook → Mid-Term 1 should show **8 columns** (HW1, HW2, HW3, QZ1, QZ2, CW, MID, FIN) with badge **School template**. Optionally re-save Settings → Structure once to normalize column codes.
