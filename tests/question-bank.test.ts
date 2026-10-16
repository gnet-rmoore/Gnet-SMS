/**
 * Question bank pure rules (visibility scoping, management, tags).
 * Run: npm run test:question-bank
 */
import {
  bankVisibilityWhere,
  canManageBankItem,
  canViewBankItem,
  normalizeVisibility,
  parseBankTags,
  scopeIds,
  serializeBankTags,
  type BankItemScope,
} from "../services/academic/src/lib/questionBank.ts";
import { createAssert } from "./helpers/assert.ts";

const { assert, summary } = createAssert();

console.log("=========================================");
console.log(" QUESTION BANK RULES");
console.log("=========================================\n");

const SCHOOL = "school-1";
const AUTHOR = "teacher-a";
const OTHER = "teacher-b";

function item(overrides: Partial<BankItemScope> = {}): BankItemScope {
  return {
    schoolId: SCHOOL,
    createdBy: AUTHOR,
    visibility: "SHARED",
    subjectId: null,
    gradeLevelId: null,
    ...overrides,
  };
}

const roomsB = [{ subjectId: "math", gradeLevelId: "g7" }];

// --- visibility: own + tenant + private ---
assert(
  canViewBankItem({ item: item({ createdBy: AUTHOR }), userId: AUTHOR, role: "TEACHER", rooms: [], schoolId: SCHOOL }),
  "author sees own item"
);
assert(
  !canViewBankItem({ item: item({ createdBy: AUTHOR }), userId: OTHER, role: "TEACHER", rooms: [], schoolId: "school-2" }),
  "cross-tenant item is hidden"
);
assert(
  !canViewBankItem({ item: item({ createdBy: AUTHOR, visibility: "PRIVATE" }), userId: OTHER, role: "TEACHER", rooms: roomsB, schoolId: SCHOOL }),
  "private item hidden from other teachers"
);
assert(
  canViewBankItem({ item: item({ createdBy: AUTHOR, visibility: "PRIVATE" }), userId: AUTHOR, role: "TEACHER", rooms: [], schoolId: SCHOOL }),
  "private item visible to author"
);

// --- visibility: untagged shared = school-wide ---
assert(
  canViewBankItem({ item: item(), userId: OTHER, role: "TEACHER", rooms: [], schoolId: SCHOOL }),
  "untagged shared item is school-wide"
);

// --- visibility: subject/grade scoping ---
assert(
  canViewBankItem({ item: item({ subjectId: "math" }), userId: OTHER, role: "TEACHER", rooms: roomsB, schoolId: SCHOOL }),
  "shared item matches teacher subject"
);
assert(
  canViewBankItem({ item: item({ gradeLevelId: "g7" }), userId: OTHER, role: "TEACHER", rooms: roomsB, schoolId: SCHOOL }),
  "shared item matches teacher grade level"
);
assert(
  !canViewBankItem({ item: item({ subjectId: "physics" }), userId: OTHER, role: "TEACHER", rooms: roomsB, schoolId: SCHOOL }),
  "shared item with unrelated subject is hidden"
);
assert(
  !canViewBankItem({ item: item({ gradeLevelId: "g9" }), userId: OTHER, role: "TEACHER", rooms: roomsB, schoolId: SCHOOL }),
  "shared item with unrelated grade is hidden"
);

// --- admins bypass subject/grade scope for shared items ---
assert(
  canViewBankItem({ item: item({ subjectId: "physics" }), userId: OTHER, role: "SCHOOL_ADMIN", rooms: [], schoolId: SCHOOL }),
  "admin sees any shared item"
);
assert(
  !canViewBankItem({ item: item({ visibility: "PRIVATE", subjectId: "physics" }), userId: OTHER, role: "SCHOOL_ADMIN", rooms: [], schoolId: SCHOOL }),
  "admin does not see others' private items"
);

// --- management ---
assert(
  canManageBankItem({ item: item(), userId: AUTHOR, role: "TEACHER", schoolId: SCHOOL }),
  "author can manage own item"
);
assert(
  !canManageBankItem({ item: item(), userId: OTHER, role: "TEACHER", schoolId: SCHOOL }),
  "other teacher cannot manage"
);
assert(
  canManageBankItem({ item: item(), userId: OTHER, role: "PRINCIPAL", schoolId: SCHOOL }),
  "admin can manage any item"
);

// --- where filter ---
{
  const where = bankVisibilityWhere({ userId: OTHER, role: "TEACHER", rooms: roomsB, schoolId: SCHOOL });
  assert(where.schoolId === SCHOOL, "where is school scoped");
  assert(where.OR.some((c: any) => c.createdBy === OTHER), "where includes own items");
  assert(
    where.OR.some((c: any) => c.visibility === "SHARED" && c.subjectId?.in?.includes("math")),
    "where includes matching subject"
  );
  assert(
    where.OR.some((c: any) => c.visibility === "SHARED" && c.gradeLevelId?.in?.includes("g7")),
    "where includes matching grade"
  );
}
{
  const where = bankVisibilityWhere({ userId: OTHER, role: "SCHOOL_ADMIN", rooms: [], schoolId: SCHOOL });
  assert(
    where.OR.length === 2 && where.OR.some((c: any) => c.visibility === "SHARED"),
    "admin where = own + all shared"
  );
}
{
  const where = bankVisibilityWhere({ userId: OTHER, role: "TEACHER", rooms: [], schoolId: SCHOOL });
  assert(
    !where.OR.some((c: any) => c.subjectId && typeof c.subjectId === "object"),
    "no subject-in clause when teacher has no rooms"
  );
}

assert(scopeIds([...roomsB, { subjectId: "math", gradeLevelId: "g7" }]).subjectIds.length === 1, "scopeIds dedupes");

// --- visibility normalization ---
assert(normalizeVisibility("private") === "PRIVATE", "visibility lowercased->PRIVATE");
assert(normalizeVisibility(undefined) === "SHARED", "default visibility SHARED");
assert(normalizeVisibility("bogus") === "SHARED", "unknown visibility falls back to SHARED");

// --- tags ---
assert(parseBankTags(" Algebra, geometry , ALGEBRA ").join("|") === "Algebra|geometry", "tags trimmed/lowercase-deduped");
assert(parseBankTags(["a", "", "b"]).join("|") === "a|b", "array tags cleaned");
assert(serializeBankTags("a, b") === "a,b", "serialize joins with comma");
assert(serializeBankTags([]) === "", "empty serialize");
assert(parseBankTags("x".repeat(60))[0].length === 40, "tag truncated to max length");
{
  const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(",");
  assert(parseBankTags(many).length === 20, "tag count capped");
}

summary("question-bank");
