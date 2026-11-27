import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const createCalls: any[] = [];
const memberCreateCalls: any[] = [];
const memberDeleteCalls: any[] = [];
const memberUpsertCalls: any[] = [];
const updateCalls: any[] = [];
const findManyCalls: any[] = [];

let existingClassroom: any = null;
let subjectRooms: any[] = [];

const originalFetch = globalThis.fetch;
(globalThis as any).fetch = async (input: any, init?: any) => {
  const url = String(input?.url || input);
  if (url.includes("/api/internal/users/")) {
    return new Response(
      JSON.stringify({
        id: "t1",
        name: "Teacher",
        email: "teacher@example.com",
        role: "TEACHER",
        schoolId: "school-1",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return originalFetch(input, init);
};

const tx = {
  classroom: {
    create: async ({ data }: any) => {
      createCalls.push(data);
      return { id: "classroom-1", ...data };
    },
    findUnique: async () => null,
    findMany: async () => [],
  },
  classroomMember: {
    create: async (args: any) => {
      memberCreateCalls.push(args);
      return args;
    },
    findMany: async () => [],
    upsert: async (args: any) => {
      memberUpsertCalls.push(args);
      return args;
    },
  },
};

const fakePrisma = {
  $transaction: async (callback: any) => callback(tx),
  classroom: {
    create: async (args: any) => tx.classroom.create(args),
    findUnique: async () => existingClassroom,
    findFirst: async () => null,
    findMany: async (args: any) => {
      findManyCalls.push(args);
      return subjectRooms;
    },
    update: async ({ where, data }: any) => {
      updateCalls.push({ where, data });
      return { id: where.id, ...existingClassroom, ...data };
    },
  },
  classroomMember: {
    count: async () => 0,
    create: async (args: any) => {
      memberCreateCalls.push(args);
      return args;
    },
    findMany: async () => [],
    deleteMany: async (args: any) => {
      memberDeleteCalls.push(args);
      return { count: 0 };
    },
    upsert: async (args: any) => {
      memberUpsertCalls.push(args);
      return args;
    },
  },
};

(globalThis as any).classroomPrisma = fakePrisma;

const { classroomService } = await import(
  "../services/classroom/src/services/classroomService.ts"
);

const created = await classroomService.createClassroom({
  name: "Grade 1",
  schoolId: "school-1",
  organizationType: "DEPARTMENTALIZED",
  ownerTeacherId: "legacy-owner",
  teacherIds: ["t2"],
  assistantIds: ["t3"],
  gradeLevelId: null,
});

assert.equal(created.ownerTeacherId, null);
assert.equal(createCalls.length, 1);
assert.equal(createCalls[0].ownerTeacherId, null);
assert.equal(createCalls[0].organizationType, "DEPARTMENTALIZED");
assert.equal(createCalls[0].propagateSupportStaff, false);
assert.equal(memberCreateCalls.length, 0);
assert.equal(memberUpsertCalls.length, 0);

await assert.rejects(
  classroomService.createClassroom({
    name: "Grade 1",
    schoolId: "school-1",
    organizationType: "SELF_CONTAINED",
    gradeLevelId: null,
  }),
  /Owner teacher ID is required/
);

existingClassroom = {
  id: "classroom-2",
  schoolId: "school-1",
  name: "Grade 1",
  subjectId: null,
  ownerTeacherId: "t1",
  organizationType: "DEPARTMENTALIZED",
  gradeLevelId: null,
  propagateSupportStaff: true,
  capacity: null,
  allowOverfill: false,
};

const updated = await classroomService.updateClassroom("classroom-2", {
  organizationType: "DEPARTMENTALIZED",
  ownerTeacherId: null,
});

assert.equal(updated.ownerTeacherId, null);
assert.equal(updateCalls.length, 1);
assert.equal(updateCalls[0].data.ownerTeacherId, null);
assert.equal(updateCalls[0].data.propagateSupportStaff, false);
assert.equal(memberDeleteCalls.length, 1);
assert.deepEqual(memberDeleteCalls[0].where.role.in, ["TEACHER", "CO_TEACHER", "ASSISTANT"]);
assert.equal(memberUpsertCalls.length, 0);

subjectRooms = [{ ownerTeacherId: "specialist-1" }];
existingClassroom = {
  id: "classroom-legacy",
  schoolId: "school-1",
  name: "Grade 1",
  subjectId: null,
  ownerTeacherId: null,
  organizationType: null,
  gradeLevelId: null,
  propagateSupportStaff: true,
  capacity: null,
  allowOverfill: false,
};

const updatedLegacy = await classroomService.updateClassroom("classroom-legacy", {
  name: "Grade 1 Renamed",
});
const legacyPatch = updateCalls[updateCalls.length - 1].data;
assert.equal(updatedLegacy.ownerTeacherId, null);
assert.equal(legacyPatch.ownerTeacherId, null);
assert.equal(legacyPatch.propagateSupportStaff, false);
assert.equal(memberDeleteCalls.length, 2);

existingClassroom = { ...existingClassroom, organizationType: "DEPARTMENTALIZED" };
const switchedToMixed = await classroomService.updateClassroom("classroom-legacy", {
  organizationType: "MIXED",
  ownerTeacherId: "",
});
const mixedPatch = updateCalls[updateCalls.length - 1].data;
assert.equal(switchedToMixed.ownerTeacherId, null);
assert.equal(mixedPatch.ownerTeacherId, null);
assert.equal(mixedPatch.organizationType, "MIXED");
assert.equal(memberDeleteCalls.length, 2);

for (const role of ["TEACHER", "CO_TEACHER", "ASSISTANT"]) {
  await assert.rejects(
    classroomService.addMember("classroom-legacy", "t1", role),
    /do not have homeroom, co-teacher, or assistant staff/
  );
}
existingClassroom = { ...existingClassroom, subjectId: "subject-1" };
assert.equal((await classroomService.addMember("classroom-legacy", "t1", "TEACHER"))?.data.role, "TEACHER");

existingClassroom = {
  id: "classroom-switch",
  schoolId: "school-1",
  name: "Grade 2",
  subjectId: null,
  ownerTeacherId: "t1",
  organizationType: "SELF_CONTAINED",
  gradeLevelId: "grade-2",
  propagateSupportStaff: true,
  capacity: null,
  allowOverfill: false,
};
subjectRooms = [{ ownerTeacherId: "t1" }];
const switchedToDepartmentalized = await classroomService.updateClassroom("classroom-switch", {
  organizationType: "DEPARTMENTALIZED",
  ownerTeacherId: null,
});
assert.equal(switchedToDepartmentalized.ownerTeacherId, null);
const switchPatch = updateCalls[updateCalls.length - 1].data;
assert.equal(switchPatch.organizationType, "DEPARTMENTALIZED");
assert.equal(switchPatch.ownerTeacherId, null);
assert.equal(memberDeleteCalls.length, 3);

await assert.rejects(
  classroomService.updateClassroom("classroom-switch", {
    organizationType: "DEPARTMENTALIZED",
    ownerTeacherId: "t1",
  }),
  /specialist teacher per subject/
);

existingClassroom = {
  id: "classroom-prefix",
  schoolId: "school-1",
  name: "Grade 3",
  subjectId: null,
  ownerTeacherId: null,
  organizationType: null,
  gradeLevelId: "grade-3",
  propagateSupportStaff: true,
  capacity: null,
  allowOverfill: false,
};
subjectRooms = [{ ownerTeacherId: "specialist-2" }];
const updateCountBeforePrefix = updateCalls.length;
await classroomService.updateClassroom("classroom-prefix", { name: "Grade 3 Renamed" });
const prefixQuery = findManyCalls[findManyCalls.length - 1];
assert.deepEqual(prefixQuery.where.OR[1], {
  name: { startsWith: "Grade 3 - " },
  gradeLevelId: "grade-3",
});
assert.equal(updateCalls.length, updateCountBeforePrefix + 1);
assert.equal(updateCalls[updateCalls.length - 1].data.propagateSupportStaff, false);

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const createModal = source("../src/features/classrooms/components/CreateClassroomModal.tsx");
const editModal = source("../src/features/classrooms/components/EditClassroomModal.tsx");
const classroomsPage = source("../src/features/classrooms/Page.tsx");
const classGroupCard = source("../src/features/classrooms/components/ClassGroupCard.tsx");

assert.match(
  createModal,
  /organizationType: "DEPARTMENTALIZED",\s+ownerTeacherId: "",\s+teacherIds: \[\],\s+assistantIds: \[\],/
);
assert.match(editModal, /opt\.value === "DEPARTMENTALIZED"\s+\? \{ ownerTeacherId: "", teacherIds: \[\], assistantIds: \[\] \}/);
assert.equal(
  createModal.includes("{!isDepartmentalized && supportOptions.length > 0 && ("),
  true
);
assert.equal(
  editModal.includes("{!isDepartmentalized && supportOptions.length > 0 && ("),
  true
);
assert.equal(
  classroomsPage.includes('classroomFields.organizationType === "DEPARTMENTALIZED"\n          ? { ownerTeacherId: null }'),
  true
);
assert.equal(
  classroomsPage.includes("...(isDepartmentalizedGroup ? {} : { ownerTeacherId: classroom.ownerTeacherId })"),
  true
);
assert.equal(classGroupCard.includes('{orgType !== "DEPARTMENTALIZED" && (() => {'), true);

console.log("All departmentalized class-group staff tests passed");
