# 🎓 Academics Architecture: Grade Levels vs. Class Groups vs. Subject Classrooms

## 💡 The "Simple English" Analogy

If you are confused about how these fit together, here is a simple real-world analogy:

1. **School Level / Division** *(e.g., Elementary, Junior High, Senior High)*
   * This is the **broad category** of school stage.
   * **Implemented (2026-07-23):** Academic `Division` model + `GradeLevel.divisionId`; Curriculum seed/assign UI; fee templates can scope to a division — see `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`.
2. **Grade Level** *(e.g., Grade 7, Grade 8, Grade 9)*
   * This is the **academic standard/year** within that division. So, *Grade 7* is one of the years inside *Junior High*.
3. **Class Group (The Homeroom)** *(e.g., Grade 7-A, Grade 7-B)*
   * In a large school, you can't put all 150 students of Grade 7 into a single room. So you split them into smaller **Class Groups (sections)** of 30 students. *Grade 7-A* is one physical class group of children who sit together at the start of the day.
4. **Subject Classroom** *(e.g., Grade 7-A Math, Grade 7-A Science)*
   * These are the **individual subjects** that the students of *Grade 7-A* study. Each subject has its own teacher (e.g., Mr. Smith for Math, Ms. Davis for Science).

---

## 🗺️ High-Level Comparison

To quickly understand how these concepts relate, look at this hierarchy:

```
[ School (e.g., Academy of Science) ]
   └── [ Grade Level (e.g., Grade 10) ]   <-- The Academic Standard
          ├── [ Class Group (e.g., 10-A) ]  <-- The Demographic Cohort / Homeroom
          │      ├── [ Subject Classroom (10-A - Mathematics) ]  <-- Where learning/grading occurs
          │      └── [ Subject Classroom (10-A - Chemistry) ]
          └── [ Class Group (e.g., 10-B) ]
                 ├── [ Subject Classroom (10-B - Mathematics) ]
                 └── [ Subject Classroom (10-B - Chemistry) ]
```

---

## 🔍 Detailed Definitions & Workflows

### 1. Grade Level
* **What it is**: An **academic cohort standard or tier** representing a student's current year of study.
* **Database Model**: `GradeLevel`
* **Purpose**: Defines standard tiers for progress tracking, admissions, custom grading scales, and report card legends.
* **Examples**: *Grade 9, Grade 10, Grade 11, Grade 12*.
* **Key Rule**: A school has a fixed set of grade levels. Students belong to exactly one Grade Level at any given time.

### 2. Class Group
* **What it is**: A **demographic division or homeroom** of students of a particular Grade Level.
* **Database Model**: `Classroom` (with `subjectId` set to `null`).
* **Purpose**: Groups students together who share the same schedule, stay in the same room, or belong to the same cohort section. It represents the administrative "home base" for those students and is assigned a main Class Teacher (Homeroom Teacher / Tutor).
* **Examples**: *Class 10-A, Class 10-B, Section Alpha*.
* **Key Rule**: All students in a Class Group belong to the same Grade Level. 

### 3. Subject offering (curriculum) vs subject classroom (teaching)

* **Subject offering** (`SubjectOffering`): links a school-wide **Subject** to a **Grade Level** (e.g. Grade 10 offers Mathematics). No teacher on this row.
* **Subject classroom**: teaching room for one class group × subject, with its own `ownerTeacherId`.
* **Organization type (class group):** `organizationType` on the homeroom — `SELF_CONTAINED` (one primary teacher for most/all subjects; optional co-teacher/assistant), `DEPARTMENTALIZED` (students rotate to specialists; platoon-style), or `MIXED`.
* **Teacher rule:** teacher is always per subject classroom. Self-contained sync defaults each subject room to the class teacher; departmentalized sync requires a specialist per subject.
* **Roster:** students added to a class group are also added to linked subject rooms (`parentClassroomId`).

### 4. Subject-Specific Classroom
* **What it is**: A **specific academic class** created by combining a **Class Group**, a **Subject**, and a **Subject Teacher**.
* **Database Model**: `Classroom` (with `subjectId` pointing to a `Subject`, optional `parentClassroomId` pointing at the homeroom).
* **Purpose**: This is where active learning, announcements, lesson planning, assignments, attendance taking, and grade capturing actually happen for a single subject.
* **Examples**: *10-A - Mathematics* (taught by Mr. Smith), *10-A - Chemistry* (taught by Dr. Jones) — or the same teacher on every subject room under 10-A for a self-contained class.
* **Key Rule**: Students in Class Group *10-A* are members of subject classrooms (copied at create/sync, and kept in sync when the homeroom roster changes).

---

## ⚡ Real-World Flow Example

Here is how an administrator sets up academics in the platform:

1. **Create Grade Levels**: Admin adds `Grade 10` in Curriculum.
2. **Create Class Groups**: Admin creates `Class 10-A` and `Class 10-B` under Grade 10, choosing **self-contained** or **departmentalized / platoon**, plus optional co-teachers and assistants.
3. **Register Students**: Admin registers students and assigns them to a class group (homeroom only — admission/enroll pickers never list subject classrooms). Students fan out to existing subject rooms automatically.
4. **Define Academic Subjects**: Under Curriculum, admin creates subjects like `Mathematics` and `Chemistry`.
5. **Offer subjects to the grade**: On Curriculum → Grade Levels → Manage, tick subjects for Grade 10 (creates `SubjectOffering` rows).
6. **Sync subject classrooms + teachers**:
   * Self-contained: fill / sync with the class teacher (or override one subject → Mixed).
   * Departmentalized: assign a specialist per class group × subject (or fill one specialist across sections).
   * Sync creates `10-A - Mathematics`, `10-B - Mathematics`, etc.
   * Students from each class group are copied into that group's subject rooms.

---

## 📂 Database & Code Structure

In the Prisma database, both Class Groups and Subject Classrooms reside in the `Classroom` table. Their purpose is determined by the presence or absence of the `subjectId` column:

| Attribute | Class Group (Homeroom) | Subject-Specific Classroom |
| :--- | :--- | :--- |
| `name` | e.g., `Class 10-A` | e.g., `Class 10-A - Mathematics` |
| `subjectId` | `null` | References the related `Subject` |
| `gradeLevelId` | References the `GradeLevel` | References the `GradeLevel` |
| `parentClassroomId` | `null` | Homeroom Classroom.id |
| `organizationType` | `SELF_CONTAINED` / `DEPARTMENTALIZED` / `MIXED` | usually null |
| `ownerTeacherId` | Homeroom Teacher | Subject Teacher (per room) |
| **Membership** | Master student cohort | Inherited from class group (create/sync + live fan-out) |
| **Activity Feed** | General announcements | Subject work |
| **Staff roles** | TEACHER, CO_TEACHER, ASSISTANT | Same |

Curriculum offering rows live in Academic `SubjectOffering` (`schoolId`, `subjectId`, `gradeLevelId`) — unique per school/subject/grade.
