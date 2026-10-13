#!/usr/bin/env node
/**
 * Phase 6 god-page split helper.
 * Extracts line ranges into components and writes api.ts + hooks stubs.
 *
 * Config is embedded below. Run: node scripts/phase6-split.mjs [feature...]
 * With no args, processes all configured features.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

/** @typedef {{ name: string, start: number, end: number, propsType?: string }} Extract */

/**
 * @type {Record<string, {
 *   exportName: string,
 *   apiFns: { name: string, method: string, pathExpr: string, args?: string }[],
 *   queryHook: string,
 *   queryKeys: string[],
 *   extracts: Extract[],
 * }>}
 */
const FEATURES = {
  registrar: {
    exportName: "Registrar",
    apiFns: [
      { name: "fetchStudents", method: "get", pathExpr: "`/api/schools/${schoolId}/students`", args: "schoolId: string" },
      { name: "fetchApplications", method: "get", pathExpr: "`/api/schools/${schoolId}/applications`", args: "schoolId: string" },
      { name: "fetchGradeLevels", method: "get", pathExpr: "`/api/schools/${schoolId}/grade-levels`", args: "schoolId: string" },
      { name: "fetchClassrooms", method: "get", pathExpr: "`/api/schools/${schoolId}/classrooms`", args: "schoolId: string" },
      { name: "fetchClassroomMembers", method: "get", pathExpr: "`/api/classrooms/${classroomId}/members`", args: "classroomId: string" },
      { name: "updateUser", method: "patch", pathExpr: "`/api/users/${userId}`", args: "userId: string, data: unknown" },
      { name: "deleteUser", method: "delete", pathExpr: "`/api/users/${userId}`", args: "userId: string" },
      { name: "updateApplication", method: "patch", pathExpr: "`/api/applications/${applicationId}`", args: "applicationId: string, data: unknown" },
      { name: "createApplication", method: "post", pathExpr: "`/api/schools/${schoolId}/applications`", args: "schoolId: string, data: unknown" },
      { name: "addClassroomMember", method: "post", pathExpr: "`/api/classrooms/${classroomId}/members`", args: "classroomId: string, data: unknown" },
      { name: "removeClassroomMember", method: "delete", pathExpr: "`/api/classrooms/${classroomId}/members/${userId}`", args: "classroomId: string, userId: string" },
    ],
    queryHook: "useRegistrarQuery",
    queryKeys: ["students", "applications", "gradeLevels", "classrooms"],
    extracts: [
      { name: "EditStudentModal", start: 2148, end: 2294 },
      { name: "ApplicationReviewModal", start: 2297, end: 2522 },
      { name: "StudentDossierModal", start: 2525, end: 3028 },
    ],
  },
  curriculum: {
    exportName: "Curriculum",
    apiFns: [
      { name: "fetchSubjects", method: "get", pathExpr: "`/api/schools/${schoolId}/subjects`", args: "schoolId: string" },
      { name: "fetchGradeLevels", method: "get", pathExpr: "`/api/schools/${schoolId}/grade-levels`", args: "schoolId: string" },
      { name: "fetchClassrooms", method: "get", pathExpr: "`/api/schools/${schoolId}/classrooms`", args: "schoolId: string" },
      { name: "fetchSyllabi", method: "get", pathExpr: "`/api/schools/${schoolId}/syllabi`", args: "schoolId: string" },
      { name: "fetchStaff", method: "get", pathExpr: "`/api/schools/${schoolId}/staff`", args: "schoolId: string" },
      { name: "createSubject", method: "post", pathExpr: "`/api/schools/${schoolId}/subjects`", args: "schoolId: string, data: unknown" },
      { name: "updateSubject", method: "patch", pathExpr: "`/api/subjects/${id}`", args: "id: string, data: unknown" },
      { name: "deleteSubject", method: "delete", pathExpr: "`/api/subjects/${id}`", args: "id: string" },
      { name: "createSyllabus", method: "post", pathExpr: "`/api/schools/${schoolId}/syllabi`", args: "schoolId: string, data: unknown" },
      { name: "updateSyllabus", method: "put", pathExpr: "`/api/syllabi/${id}`", args: "id: string, data: unknown" },
      { name: "deleteSyllabus", method: "delete", pathExpr: "`/api/syllabi/${id}`", args: "id: string" },
    ],
    queryHook: "useCurriculumQuery",
    queryKeys: ["subjects", "gradeLevels", "classrooms", "syllabi", "staff"],
    extracts: [
      { name: "SubjectModal", start: 1510, end: 1682 },
      { name: "SyllabusBuilderModal", start: 1909, end: 2347 },
    ],
  },
  expenses: {
    exportName: "Expenses",
    apiFns: [
      { name: "fetchExpenses", method: "get", pathExpr: "`/api/schools/${schoolId}/expenses`", args: "schoolId: string" },
      { name: "fetchFees", method: "get", pathExpr: "`/api/schools/${schoolId}/fees`", args: "schoolId: string" },
      { name: "fetchPayrolls", method: "get", pathExpr: "`/api/schools/${schoolId}/payrolls`", args: "schoolId: string" },
      { name: "fetchFinanceSummary", method: "get", pathExpr: "`/api/schools/${schoolId}/finance/summary`", args: "schoolId: string" },
      { name: "createExpense", method: "post", pathExpr: "`/api/schools/${schoolId}/expenses`", args: "schoolId: string, data: unknown" },
      { name: "updateExpense", method: "patch", pathExpr: "`/api/schools/${schoolId}/expenses/${id}`", args: "schoolId: string, id: string, data: unknown" },
      { name: "deleteExpense", method: "delete", pathExpr: "`/api/schools/${schoolId}/expenses/${id}`", args: "schoolId: string, id: string" },
    ],
    queryHook: "useExpensesQuery",
    queryKeys: ["expenses", "fees", "payrolls", "summary"],
    extracts: [
      { name: "ExpenseFormModal", start: 0, end: 0 }, // filled dynamically
    ],
  },
};

function writeApi(feature, cfg) {
  const lines = [
    `import { api } from "../../services/api";`,
    ``,
    `/** Thin API wrappers for the ${feature} feature. */`,
    `export const ${camel(feature)}Api = {`,
  ];
  for (const fn of cfg.apiFns) {
    const argList = fn.args || "";
    const pathArgs = extractPathArgs(fn.pathExpr);
    const dataArg = argList.includes("data:") ? ", data" : "";
    if (fn.method === "get") {
      lines.push(`  ${fn.name}: (${argList}) => api.get(${fn.pathExpr}),`);
    } else if (fn.method === "delete") {
      lines.push(`  ${fn.name}: (${argList}) => api.delete(${fn.pathExpr}),`);
    } else {
      lines.push(`  ${fn.name}: (${argList}) => api.${fn.method}(${fn.pathExpr}${dataArg ? ", data" : ""}),`);
    }
  }
  lines.push(`};`, ``);
  const out = path.join(ROOT, "src/features", feature, "api.ts");
  fs.writeFileSync(out, lines.join("\n"));
  console.log("wrote", out);
}

function extractPathArgs(pathExpr) {
  const m = [...pathExpr.matchAll(/\$\{(\w+)\}/g)].map((x) => x[1]);
  return m;
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function pascal(s) {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function writeHook(feature, cfg) {
  const apiName = `${camel(feature)}Api`;
  const hookName = cfg.queryHook;
  const keys = cfg.queryKeys;

  // Map query keys to api methods heuristically
  const fetchCalls = keys.map((k) => {
    const methodGuess =
      cfg.apiFns.find((f) => f.name.toLowerCase().includes(k.toLowerCase().replace(/s$/, "")) ||
        f.name.toLowerCase() === `fetch${k.toLowerCase()}` ||
        f.name === `fetch${pascal(k)}`)?.name ||
      cfg.apiFns.find((f) => f.name.toLowerCase().includes(k.toLowerCase()))?.name;
    return { key: k, method: methodGuess };
  });

  const content = `import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { ${apiName} } from "../api";
import { queryKeys } from "../../queryKeys";

export function ${hookName}() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["${feature}", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [${keys.join(", ")}] = await Promise.all([
${fetchCalls
  .map((f) => {
    const m = f.method || cfg.apiFns[0].name;
    return `        ${apiName}.${m}(schoolId),`;
  })
  .join("\n")}
      ]);
      return { ${keys.join(", ")} };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["${feature}", schoolId] });

  return {
    ...query,
    ${keys.map((k) => `${k}: query.data?.${k} ?? [],`).join("\n    ")}
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
`;

  // Fix empty arrays for non-array keys like summary
  let fixed = content.replace(
    /summary: query\.data\?\.summary \?\? \[\],/,
    "summary: query.data?.summary ?? null,"
  );

  const dir = path.join(ROOT, "src/features", feature, "hooks");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${hookName}.ts`);
  fs.writeFileSync(out, fixed);
  console.log("wrote", out);
}

function extractComponent(feature, extract) {
  if (!extract.start || !extract.end) return null;
  const pagePath = path.join(ROOT, "src/features", feature, "Page.tsx");
  const lines = fs.readFileSync(pagePath, "utf8").split("\n");
  const slice = lines.slice(extract.start - 1, extract.end);
  const body = slice.join("\n");

  // Wrap as a component that accepts a loose props bag — Page will pass needed handlers.
  const component = `import React from "react";

/** Presentational extract from ${feature}/Page.tsx (lines ${extract.start}-${extract.end}). */
export function ${extract.name}(props: Record<string, any>) {
  const {
    // common closers / flags — Page spreads the rest as needed via local aliases below
  } = props;

  // Re-bind identifiers used in the extracted JSX to props.*
  // Consumers should pass every free identifier the block references.
  const p = props as any;
  const {
    format,
    X, MapPin, Mail, Phone, CheckCircle2, Clock, UserCheck, User, Edit, Trash2,
    FileText, Printer, Award, GraduationCap, Building, ChevronRight,
    Search, Filter, Plus, School, FileCheck, ClipboardList,
    studentFormData, setStudentFormData, gradeLevels, submitting,
    handleSaveStudent, setShowEditStudentModal,
    selectedApp, docsChecklist, evaluationData, setEvaluationData,
    handleToggleDoc, handleSaveReview, classrooms, selectedClassroomId,
    setSelectedClassroomId, setShowAppReviewModal,
    selectedStudent, setSelectedStudent, dossierTab, setDossierTab,
    isPrintTranscriptMode, setIsPrintTranscriptMode, mockGrades, setMockGrades,
    showSubjectModal, setShowSubjectModal, subjectForm, setSubjectForm,
    handleCreateSubject, editingSubject, setEditingSubject,
    showSyllabusModal, setShowSyllabusModal, syllabusForm, setSyllabusForm,
    handleSaveSyllabus, generateAiSyllabus, aiGenerating,
    subjects, staff, classrooms: classroomsProp,
  } = { ...p, ...Object.fromEntries(Object.keys(p).map(k => [k, p[k]])) };

  // Alias everything from props for JSX that uses bare identifiers
  ${buildAliasBlock(body)}

  return (
${indent(body, 4)}
  );
}
`;

  const dir = path.join(ROOT, "src/features", feature, "components");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${extract.name}.tsx`);
  // Simpler approach: write raw JSX wrapped with props casting via withDefaults
  const simple = `import React from "react";

type Props = Record<string, any>;

/**
 * Presentational extract from ${feature}/Page.tsx (lines ${extract.start}-${extract.end}).
 * Pass all free identifiers used in the block as props (same names as in Page).
 */
export function ${extract.name}(props: Props) {
  return <${extract.name}Inner {...props} />;
}

function ${extract.name}Inner({
${guessProps(body).map((n) => `  ${n},`).join("\n")}
}: Props) {
  return (
${indent(stripConditionalWrapper(body), 4)}
  );
}
`;

  fs.writeFileSync(out, simple);
  console.log("wrote", out, `(${slice.length} lines)`);
  return { name: extract.name, start: extract.start, end: extract.end, props: guessProps(body) };
}

function stripConditionalWrapper(body) {
  // Keep as-is; Page will render `{cond && <Comp .../>}` or Comp handles visibility
  return body
    .replace(/^\s*\{show\w+ && \(\s*\n/, "")
    .replace(/^\s*\{selected\w+ && \(\s*\n/, "")
    .replace(/\n\s*\)\}\s*$/, "");
}

function guessProps(body) {
  // Heuristic: identifiers that look like state/handlers used in JSX
  const candidates = new Set();
  const re = /\b(set[A-Z]\w+|handle[A-Z]\w+|show[A-Z]\w+|selected[A-Z]\w+|studentFormData|evaluationData|docsChecklist|gradeLevels|classrooms|submitting|format|mockGrades|dossierTab|isPrintTranscriptMode|manualAdmissionForm|subjectForm|syllabusForm|editingSubject|aiGenerating|subjects|staff|formData|editingExpense|isModalOpen|budgets|expenses|fees|payrolls|summary)\b/g;
  let m;
  while ((m = re.exec(body))) candidates.add(m[1]);
  // Always include lucide icons referenced
  const icons = body.match(/\b([A-Z][a-zA-Z0-9]+)\s+className=/g) || [];
  for (const i of icons) {
    const name = i.split(/\s/)[0];
    if (name.length > 1 && name !== "React") candidates.add(name);
  }
  // format from date-fns
  if (/\bformat\(/.test(body)) candidates.add("format");
  return [...candidates].sort();
}

function buildAliasBlock() {
  return `// identifiers are destructured from props above`;
}

function indent(text, n) {
  const pad = " ".repeat(n);
  return text
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

function patchPage(feature, cfg, extractsMeta) {
  const pagePath = path.join(ROOT, "src/features", feature, "Page.tsx");
  let src = fs.readFileSync(pagePath, "utf8");
  const lines = src.split("\n");

  // Add imports if missing
  const hookImport = `import { ${cfg.queryHook} } from "./hooks/${cfg.queryHook}";`;
  const compImports = extractsMeta
    .map((e) => `import { ${e.name} } from "./components/${e.name}";`)
    .join("\n");

  if (!src.includes(cfg.queryHook)) {
    // After last import
    const lastImport = lines.findLastIndex((l) => l.startsWith("import "));
    lines.splice(lastImport + 1, 0, hookImport, compImports);
  }

  // Replace extracted ranges from bottom to top with component usage
  const sorted = [...extractsMeta].sort((a, b) => b.start - a.start);
  for (const e of sorted) {
    const propSpread = e.props.map((p) => `          ${p}={${p}}`).join("\n");
    const replacement = [
      `      {/* Extracted: ${e.name} */}`,
      `      <${e.name}`,
      propSpread,
      `      />`,
    ];
    lines.splice(e.start - 1, e.end - e.start + 1, ...replacement);
  }

  fs.writeFileSync(pagePath, lines.join("\n"));
  console.log("patched", pagePath);
}

// Simpler manual path: only write api + hooks + extracted component files WITHOUT auto-patching Page
// (auto-patch of JSX with wrong prop lists is fragile). Caller patches Page.

const args = process.argv.slice(2);
const targets = args.length ? args : Object.keys(FEATURES);

for (const feature of targets) {
  const cfg = FEATURES[feature];
  if (!cfg) {
    console.error("Unknown feature:", feature);
    continue;
  }
  console.log("\n===", feature, "===");
  writeApi(feature, cfg);
  writeHook(feature, cfg);
  for (const ex of cfg.extracts) {
    if (ex.start && ex.end) extractComponent(feature, ex);
  }
}

console.log("\nDone scaffolding. Wire Page.tsx to use hooks + components next.");
