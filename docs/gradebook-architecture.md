# Gradebook & Grading Architecture

This document describes how the platform handles gradebooks, customizable weight categories, grade calculations, and multi-category grading scales (Grade Legends).

---

## 1. Dynamic Gradebook Configuration (`gradebookConfig`)

Rather than relying on fixed or hardcoded grading categories, every school can fully configure its weight categories through a JSON-serialized configuration string saved inside the `School` table's `gradebookConfig` field.

### Default Columns and Weights
If a school does not have a customized configuration, the system automatically falls back to the following standard weights:

| Category Name | Code (Short Code) | Weight Percentage | Default Component Type |
| :--- | :---: | :---: | :--- |
| **Homework** | `HW` | 20% | `ASSIGNMENT` |
| **Quizzes** | `QZ` | 20% | `QUIZ` |
| **Class Work** | `CW` | 10% | `CLASS` |
| **Midterm Exam** | `MID` | 20% | `EXAM` |
| **Final Exam** | `FIN` | 30% | `EXAM` |

### JSON Schema
The `gradebookConfig` string represents an array of objects structured as follows:
```json
[
  { "id": "homework", "name": "Homework", "code": "HW", "weightPct": 20, "isActive": true },
  { "id": "quizzes", "name": "Quizzes", "code": "QZ", "weightPct": 20, "isActive": true },
  { "id": "classwork", "name": "Class Work", "code": "CW", "weightPct": 10, "isActive": true },
  { "id": "midterm", "name": "Midterm Exam", "code": "MID", "weightPct": 20, "isActive": true },
  { "id": "final", "name": "Final Exam", "code": "FIN", "weightPct": 30, "isActive": true }
]
```

---

## 2. Weighted Average Calculations

To prevent layout flickers or database mismatches, the weighted average logic has absolute parity between the backend calculation service (`src/services/gradeService.ts`) and the frontend assembler used by print grade sheets (`src/features/gradesheets/assembleGradeSheet.ts`) and `StudentGrades.tsx`.

Print templates (classic A4 ledger, modern A4 mastery bars, official Legal record) live under `src/features/gradesheets` — see `docs/GRADESHEET_HTML_TEMPLATES_PLAN.md`.

### Calculation Algorithm
For each unique Subject:
1. **Grouping**: All student grade entries are grouped by their subject and mapped to the relevant weight category. The system matches the `examComponent.shortCode` or `examComponent.componentType` against the categories defined in the `gradebookConfig` (e.g., matching component short code `"HW"` or component type `"ASSIGNMENT"` with the `"HW"` category).
2. **Category Averages**: If a category has multiple grades (for example, 3 homework entries), a simple average of these grades is calculated first.
3. **Weight Application**: The category's percentage score is multiplied by the category's `weightPct` fraction.
4. **Normalized Total**: The sum of the weighted scores is divided by the sum of the weights of the categories that actually have grades. This ensures that if certain grades are not yet recorded (or a component is absent), the student is not unfairly penalized (the calculation scales dynamically to the remaining active weights).

```typescript
// Conceptual example
const weightedSum = sum(CategoryAvg * CategoryWeight);
const weightTotal = sum(CategoryWeightOfActiveCategories);
const finalSubjectAvg = weightedSum / weightTotal;
```

---

## 3. Dynamic Grade Legends (`gradeLegends`)

Grade scales are used to map a numeric score (0 - 100%) to a descriptive letter grade and professional remarks.

### Custom Categories
Grade Legends support context-specific scales to ensure academic flexibility:
- **`CLASS`**: The default scale for overall course/subject grades.
- **`ASSIGNMENT`**: Specifically applied to homework or worksheets.
- **`QUIZ`**: Applied to brief quizzes and reviews.

### Selection and Lookup Flow
When rendering a grade on the frontend or backend, the lookup routine queries the `GradeLegend` and associated `GradeScale` entities matching the active `schoolId`:
1. Find the legend matching the desired category (e.g., `QUIZ`).
2. If not found, fall back to the default `CLASS` category.
3. Match the score within the `minScore` and `maxScore` ranges of the scales:
   ```typescript
   const scale = legend.scales.find(s => score >= s.minScore && score <= s.maxScore);
   return scale.gradeLetter; // e.g., "A+", "B", "F"
   ```
4. If no custom grade legends exist in the database, the system safely falls back to a standardized default scale:
   - `90% - 100%`: `A+`
   - `80% - 89%`: `A`
   - `70% - 79%`: `B`
   - `60% - 69%`: `C`
   - `50% - 59%`: `D`
   - `< 50%`: `F`

---

## 4. Teacher entry (Gradebook)

Teachers enter grades in **`/{slug}/gradebook`** (also via Exams → exam details). See **`docs/TEACHER_GRADEBOOK_PLAN.md`** for draft/submit, autosave, and period multi-column behavior.

### Per-assessment structure (2026-08-05)

Gradebook **activity breakdown** is resolved per calendar **`ExamComponent`**:

- **`gradebookStructureCustom = false`** → live **Settings → Grading → Structure** template (`School.gradebookConfig`)
- **`gradebookStructureCustom = true`** → stored `gradebookStructure` JSON on that assessment

`GradeEntry.structureColumnId` keys scores to a structure column within the parent `examComponentId`.

See **`docs/GENERIC_GRADEBOOK_PLAN.md`** for sync, migration, and verify steps.
