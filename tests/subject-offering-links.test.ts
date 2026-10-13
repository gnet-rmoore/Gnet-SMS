import assert from "node:assert/strict";
import {
  filterHomeroomClassrooms,
  subjectRoomsForClassGroup,
} from "../src/features/academics-shared/classGroupLinks";

const rooms = [
  { id: "g1", name: "Grade 10-A", subjectId: null, gradeLevelId: "gl10" },
  { id: "g2", name: "Grade 10-B", subjectId: null, gradeLevelId: "gl10" },
  {
    id: "s1",
    name: "Grade 10-A - English",
    subjectId: "sub-en",
    gradeLevelId: "gl10",
    parentClassroomId: "g1",
  },
  {
    id: "s2",
    name: "Grade 10-B - Mathematics",
    subjectId: "sub-math",
    gradeLevelId: "gl10",
    parentClassroomId: null,
  },
];

const homerooms = filterHomeroomClassrooms(rooms);
assert.equal(homerooms.length, 2);
assert.ok(homerooms.every((c) => !c.subjectId));
assert.ok(!homerooms.some((c) => c.name.includes("English") || c.name.includes("Mathematics")));

const forA = subjectRoomsForClassGroup(rooms[0], rooms);
assert.equal(forA.length, 1);
assert.equal(forA[0].id, "s1");

const forB = subjectRoomsForClassGroup(rooms[1], rooms);
assert.equal(forB.length, 1);
assert.equal(forB[0].id, "s2");

console.log("subject-offering-links.test.ts: ok");
