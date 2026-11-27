import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  requiresSpecialistTeacher,
  resolveSubjectTeacherId,
} from "../src/features/academics-shared/subjectTeacherAssignment.ts";
import {
  autoProvisionTeacherId,
  requiresDistinctSpecialist,
} from "../services/classroom/src/lib/subjectRoomTeacher.ts";

const selfContained = { id: "g1", organizationType: "SELF_CONTAINED", ownerTeacherId: "t1" };
const departmentalized = {
  id: "g2",
  organizationType: "DEPARTMENTALIZED",
  ownerTeacherId: "t1",
};
const mixed = { id: "g3", organizationType: "MIXED", ownerTeacherId: "t1" };

assert.equal(requiresSpecialistTeacher(selfContained, []), false);
assert.equal(requiresSpecialistTeacher(departmentalized, []), true);
assert.equal(requiresSpecialistTeacher(mixed, []), false);

assert.equal(resolveSubjectTeacherId(selfContained, [], undefined), "t1");
assert.equal(resolveSubjectTeacherId(departmentalized, [], undefined), "");
assert.equal(resolveSubjectTeacherId(mixed, [], undefined), "t1");
assert.equal(resolveSubjectTeacherId(departmentalized, [], "t2"), "t2");

const inferredDepartmentalized = { id: "g4", ownerTeacherId: "t1" };
const subjectRooms = [
  { id: "r1", parentClassroomId: "g4", subjectId: "s1", ownerTeacherId: "t2" },
];
assert.equal(requiresSpecialistTeacher(inferredDepartmentalized, subjectRooms), true);
assert.equal(resolveSubjectTeacherId(inferredDepartmentalized, subjectRooms, undefined), "");
assert.equal(resolveSubjectTeacherId(inferredDepartmentalized, subjectRooms, "t2"), "t2");

const inferredMixed = { id: "g5", organizationType: null, ownerTeacherId: "t1" };
const mixedRooms = [
  { id: "r2", name: "g5 - Math", parentClassroomId: "g5", subjectId: "s1", ownerTeacherId: "t1" },
  { id: "r3", name: "g5 - Science", parentClassroomId: "g5", subjectId: "s2", ownerTeacherId: "t2" },
];
assert.equal(requiresSpecialistTeacher(inferredMixed, mixedRooms), false);
assert.equal(resolveSubjectTeacherId(inferredMixed, mixedRooms, undefined), "t1");

assert.equal(autoProvisionTeacherId("SELF_CONTAINED", "t1", []), "t1");
assert.equal(autoProvisionTeacherId("DEPARTMENTALIZED", "t1", []), null);
assert.equal(autoProvisionTeacherId("MIXED", "t1", []), "t1");
assert.equal(autoProvisionTeacherId(null, "t1", ["t2"]), null);
assert.equal(autoProvisionTeacherId(null, "t1", ["t1", "t2"]), "t1");
assert.equal(requiresDistinctSpecialist("DEPARTMENTALIZED", "t1", []), true);
assert.equal(requiresDistinctSpecialist("MIXED", "t1", []), false);
assert.equal(requiresDistinctSpecialist("SELF_CONTAINED", "t1", []), false);

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const pageActions = source("../src/features/curriculum/hooks/usePageActions.ts");
const curriculumPage = source("../src/features/curriculum/Page.tsx");
const manageModal = source("../src/features/curriculum/components/ManageSubjectsModal.tsx");
const classroomsPage = source("../src/features/classrooms/Page.tsx");
const wizardModal = source("../src/features/classrooms/components/ClassroomWizardModal.tsx");
const classroomService = source("../services/classroom/src/services/classroomService.ts");
const classroomController = source("../services/classroom/src/controllers/classroomController.ts");
const englishCatalog = source("../src/i18n/catalogs/en.ts");

for (const [label, text, forbidden] of [
  [
    "curriculum inline subject creation owner fallback",
    pageActions,
    "teacherId: addSubjectClassTeachers[group.id] || group.ownerTeacherId",
  ],
  [
    "curriculum single-subject assignment owner fallback",
    pageActions,
    "teacherId: classGroup.ownerTeacherId",
  ],
  [
    "curriculum inline form owner prefill",
    curriculumPage,
    'teachersMap[g.id] = g.ownerTeacherId || ""',
  ],
  [
    "manage-subjects arbitrary teacher fallback",
    manageModal,
    "teachers[0]?.id",
  ],
  [
    "wizard subject-to-classes owner fallback",
    classroomsPage,
    "wizardClassTeachers[classId] || classGroup.ownerTeacherId",
  ],
  [
    "wizard class-to-subjects owner fallback",
    classroomsPage,
    "wizardSubjectTeachers[subId] || classGroup.ownerTeacherId",
  ],
  [
    "wizard select-all class groups owner prefill",
    wizardModal,
    "teachersMap[cg.id] = cg.ownerTeacherId;",
  ],
  [
    "wizard select-all subjects owner prefill",
    wizardModal,
    'selectedClassGroup?.ownerTeacherId || ""',
  ],
  [
    "assign-subject modal owner prefill",
    classroomsPage,
    'teacherId: classroom.ownerTeacherId || ""',
  ],
  [
    "backend offering auto-provision owner fallback",
    classroomService,
    "teacherId: cg.ownerTeacherId,",
  ],
  [
    "backend class-group auto-provision owner fallback",
    classroomService,
    "teacherId: classGroup.ownerTeacherId,",
  ],
  [
    "controller current-user owner fallback",
    classroomController,
    "ownerTeacherId || req.user.id",
  ],
] as const) {
  assert.equal(text.includes(forbidden), false, label);
}

assert.equal(classroomService.includes("autoProvisionTeacherId("), true);
assert.equal(classroomService.includes("requiresDistinctSpecialist("), true);
assert.equal(pageActions.includes("roomsSyncedWithSkips"), true);
assert.equal(englishCatalog.includes("roomsSyncedWithSkips:"), true);
assert.equal(englishCatalog.includes("orgMixedHint:"), true);

console.log("All subject teacher assignment tests passed");
