#!/usr/bin/env python3
"""
Batch Phase 6 splits for remaining school features.
Creates api.ts, hooks/useXxxQuery.ts, extracts 2+ components, patches Page.tsx.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "src" / "features"

# ── shared helpers (subset of phase6_split) ──────────────────────

def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not content.endswith("\n"):
        content += "\n"
    path.write_text(content, encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)} ({len(content.splitlines())} lines)")


def camel(s: str) -> str:
    parts = s.replace("_", "-").split("-")
    return parts[0] + "".join(p.title() for p in parts[1:])


def pascal(s: str) -> str:
    c = camel(s)
    return c[0].upper() + c[1:]


def collect_page_idents(page: str) -> set[str]:
    idents: set[str] = set()
    for m in re.finditer(r"const\s+\[(\w+),\s*(set\w+)\]", page):
        idents.add(m.group(1))
        idents.add(m.group(2))
    for m in re.finditer(
        r"const\s+(handle\w+|fetch\w+|load\w+|open\w+|parse\w+|save\w+|close\w+|toggle\w+|get\w+|is\w+|can\w+)\s*=",
        page,
    ):
        idents.add(m.group(1))
    for m in re.finditer(r"const\s+\{([^}]+)\}\s*=\s*useAuthStore", page):
        for part in m.group(1).split(","):
            name = part.strip().split(":")[0].strip()
            if name:
                idents.add(name)
    idents.update(["format", "school", "user", "accessToken", "CATEGORY_COLORS", "DEFAULT_BUDGETS"])
    return idents


def write_component(feature: str, name: str, start: int, end: int) -> dict:
    page_path = FEATURES / feature / "Page.tsx"
    page = page_path.read_text(encoding="utf-8")
    lines = page.splitlines()
    body = "\n".join(lines[start - 1 : end])
    # strip outer {cond && ( ... )}
    body = re.sub(r"^\s*\{[^{}\n]+&&\s*\(\s*\n", "", body)
    body = re.sub(r"\n\s*\)\}\s*$", "", body)

    page_idents = collect_page_idents(page)
    used: set[str] = set()
    for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", body):
        w = m.group(1)
        if w in page_idents:
            used.add(w)
        if re.match(r"^[A-Z]", w) and (f"<{w}" in body or f"{w} className" in body):
            used.add(w)
    if "format(" in body:
        used.add("format")

    skip = {
        "true", "false", "null", "undefined", "String", "Number", "Date", "JSON",
        "Math", "Object", "Array", "Promise", "Error", "console", "window",
        "localStorage", "document", "React", "A", "B", "C", "D", "F", "Print",
        "div", "span", "button", "form", "input", "select", "option", "textarea",
        "label", "p", "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr",
        "td", "th", "ul", "li", "img", "section", "nav", "main", "header", "footer",
        "isChecked", "isOverdue", "isExpanded", "isEditing", "isAdmin", "isStudent",
        "isPrincipal", "isFinanceAdmin", "isAccountantOrAdmin", "isAdminOrAccountant",
        "isSecurityOnly", "isVpa", "isEligibleToCreateEvents", "canManage", "canCreate",
        "subjectGradeLevelId", "stats", "toast", "flashActive", "useCamera",
        "enrollError", "notification", "previewTemplate", "previewPhoto",
    }
    props = sorted(w for w in used if w not in skip)

    lucide_m = re.search(r"import\s*\{([^}]+)\}\s*from\s*[\"']lucide-react[\"']", page)
    all_lucide = [x.strip() for x in lucide_m.group(1).split(",")] if lucide_m else []
    lucide_used = [i for i in all_lucide if i and re.search(rf"\b{re.escape(i)}\b", body)]

    local = set(lucide_used)
    needs_format = "format(" in body
    needs_motion = "motion." in body
    needs_animate = "AnimatePresence" in body
    # recharts?
    needs_recharts = bool(re.search(r"\b(ResponsiveContainer|BarChart|PieChart|AreaChart|LineChart|XAxis|YAxis)\b", body))
    if needs_format:
        local.add("format")
    if needs_motion:
        local.add("motion")
    if needs_animate:
        local.add("AnimatePresence")

    prop_names = [p for p in props if p not in local]

    imports = ['import React from "react";']
    if lucide_used:
        imports.append("import {\n  " + ",\n  ".join(lucide_used) + '\n} from "lucide-react";')
    if needs_format:
        imports.append('import { format } from "date-fns";')
    if needs_motion or needs_animate:
        parts = []
        if needs_motion:
            parts.append("motion")
        if needs_animate:
            parts.append("AnimatePresence")
        imports.append(f'import {{ {", ".join(parts)} }} from "motion/react";')
    if needs_recharts:
        # copy recharts import from page if present
        rc = re.search(r'import\s*\{([^}]+)\}\s*from\s*[\"\']recharts[\"\']', page)
        if rc:
            imports.append(f"import {{{rc.group(1)}}} from \"recharts\";")

    indented = "\n".join(("    " + l) if l else "" for l in body.splitlines())
    content = "\n".join(imports) + f"""

export type {name}Props = {{
{chr(10).join(f'  {p}?: any;' for p in prop_names)}
  [key: string]: any;
}};

/** Presentational extract from Page.tsx lines {start}-{end}. */
export function {name}({{
{chr(10).join(f'  {p},' for p in prop_names)}
}}: {name}Props) {{
  return (
{indented}
  );
}}
"""
    out = FEATURES / feature / "components" / f"{name}.tsx"
    write_text(out, content)
    return {"name": name, "start": start, "end": end, "props": prop_names, "cond": None}


def find_cond(lines: list[str], start: int) -> str | None:
    """Return the condition expression for `{cond && (` at start (1-indexed)."""
    line = lines[start - 1]
    m = re.match(r"^\s*\{(.+&&)\s*\(\s*$", line)
    return m.group(1).strip() if m else None


def patch_page(feature: str, extracts: list[dict], hook_name: str, data_bind: dict | None) -> int:
    """Replace extract ranges and optionally wire the query hook. Returns new line count."""
    page_path = FEATURES / feature / "Page.tsx"
    lines = page_path.read_text(encoding="utf-8").splitlines()
    src = "\n".join(lines)

    extras = []
    if hook_name and f'from "./hooks/{hook_name}"' not in src:
        extras.append(f'import {{ {hook_name} }} from "./hooks/{hook_name}";')
    api_name = f"{camel(feature)}Api"
    if f'from "./api"' not in src and (FEATURES / feature / "api.ts").exists():
        extras.append(f'import {{ {api_name} }} from "./api";')
    for e in extracts:
        if f'from "./components/{e["name"]}"' not in src:
            extras.append(f'import {{ {e["name"]} }} from "./components/{e["name"]}";')

    if extras:
        last = max(i for i, l in enumerate(lines) if l.startswith("import "))
        lines = lines[: last + 1] + extras + lines[last + 1 :]
        for e in extracts:
            e["start"] += len(extras)
            e["end"] += len(extras)

    # Replace bottom-up
    for e in sorted(extracts, key=lambda x: -x["start"]):
        start, end = e["start"], e["end"]
        first = lines[start - 1]
        cond_m = re.match(r"^(\s*)\{(.+&&)\s*\(\s*$", first)
        ind = cond_m.group(1) if cond_m else "      "
        props = e["props"]
        if cond_m:
            cond = cond_m.group(2)
            replacement = (
                [f"{ind}{{{cond} ("]
                + [f"{ind}  <{e['name']}"]
                + [f"{ind}    {p}={{{p}}}" for p in props]
                + [f"{ind}  />", ind + ")}"]
            )
        else:
            replacement = (
                [f"{ind}<{e['name']}"]
                + [f"{ind}  {p}={{{p}}}" for p in props]
                + [f"{ind}/>"]
            )
        lines = lines[: start - 1] + replacement + lines[end:]

    text = "\n".join(lines)

    # Wire hook if data_bind provided: { remove_states: [...], fetch_marker replacements }
    if data_bind and hook_name:
        keys = data_bind["keys"]
        loading_key = data_bind.get("loading", "loading")
        auth_pat = r"(const \{[^}]+\} = useAuthStore\([^;]*\);)"
        if f"{hook_name}()" not in text:
            hook_insert = (
                f"\\1\n  const {{\n"
                + "".join(f"    {k},\n" for k in keys)
                + f"    {loading_key},\n"
                + f"    invalidate: refetch{pascal(feature)},\n"
                + f"  }} = {hook_name}();"
            )
            text2, n = re.subn(auth_pat, hook_insert, text, count=1)
            if n:
                text = text2
                print(f"  wired {hook_name}")
            else:
                # try useAuthStore without destructuring on same pattern variants
                print(f"  WARN: could not wire hook after useAuthStore")

        # Remove data useStates listed
        for state_name in data_bind.get("remove_states", []):
            text = re.sub(
                rf"\n\s*const \[{state_name}, set{pascal(state_name)}\] = useState[^;]+;\n",
                "\n",
                text,
                count=1,
            )
        if data_bind.get("remove_loading"):
            text = re.sub(
                r"\n\s*const \[loading, setLoading\] = useState\([^)]*\);\n",
                "\n",
                text,
                count=1,
            )

        # Replace fetch function body if provided
        if data_bind.get("replace_fetch"):
            old, new = data_bind["replace_fetch"]
            if old in text:
                text = text.replace(old, new, 1)
                print("  replaced fetch block")
            else:
                # soft: add alias
                if "const fetchData =" not in text and data_bind.get("fetch_alias"):
                    pass
                print("  WARN: fetch block not found; adding invalidate alias")
                if f"refetch{pascal(feature)}" in text and "const fetchData" in text:
                    # replace calls later
                    text = re.sub(
                        r"const fetchData = async \(\) => \{.*?\n  \};",
                        f"const fetchData = () => {{ refetch{pascal(feature)}(); }};",
                        text,
                        count=1,
                        flags=re.S,
                    )

    page_path.write_text(text + "\n", encoding="utf-8")
    return len(text.splitlines())


def write_api_simple(feature: str, methods: list[tuple]) -> None:
    """methods: list of (name, method, args, path_template_with_schoolId)"""
    lines = [
        'import { api } from "../../services/api";',
        "",
        f"/** Thin API wrappers for the {feature} feature. */",
        f"export const {camel(feature)}Api = {{",
    ]
    for name, method, args, path in methods:
        if method in ("get", "delete"):
            lines.append(f"  {name}: ({args}) => api.{method}({path}),")
        else:
            lines.append(f"  {name}: ({args}) => api.{method}({path}, data),")
    lines.append("};")
    lines.append("")
    write_text(FEATURES / feature / "api.ts", "\n".join(lines))


def write_hook_simple(feature: str, hook: str, fetches: list[tuple], non_array: set[str] | None = None):
    non_array = non_array or set()
    api_name = f"{camel(feature)}Api"
    keys = [k for k, _ in fetches]
    fetch_lines = ",\n".join(f"        {api_name}.{m}(schoolId)" for _, m in fetches)
    norms = []
    rets = []
    for k in keys:
        if k in non_array:
            norms.append(f"        {k},")
            rets.append(f"    {k}: query.data?.{k} ?? null,")
        else:
            norms.append(f"        {k}: Array.isArray({k}) ? {k} : [],")
            rets.append(f"    {k}: query.data?.{k} ?? [],")
    content = f"""import {{ useQuery, useQueryClient }} from "@tanstack/react-query";
import {{ useAuthStore }} from "../../../store/authStore";
import {{ {api_name} }} from "../api";

export function {hook}() {{
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({{
    queryKey: ["{feature}", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {{
      if (!schoolId) throw new Error("Missing school");
      const [{", ".join(keys)}] = await Promise.all([
{fetch_lines},
      ]);
      return {{
{chr(10).join(norms)}
      }};
    }},
  }});

  const invalidate = () =>
    queryClient.invalidateQueries({{ queryKey: ["{feature}", schoolId] }});

  return {{
    ...query,
{chr(10).join(rets)}
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  }};
}}
"""
    write_text(FEATURES / feature / "hooks" / f"{hook}.ts", content)


# ── Feature definitions ──────────────────────────────────────────
# extracts: (ComponentName, start, end)  — inclusive 1-indexed, including `{cond && (` line

BATCH = {
    "curriculum": {
        "hook": "useCurriculumQuery",
        "api": [
            ("fetchSubjects", "get", "schoolId: string", "`/api/schools/${schoolId}/subjects`"),
            ("fetchGradeLevels", "get", "schoolId: string", "`/api/schools/${schoolId}/grade-levels`"),
            ("fetchClassrooms", "get", "schoolId: string", "`/api/schools/${schoolId}/classrooms`"),
            ("fetchSyllabi", "get", "schoolId: string", "`/api/schools/${schoolId}/syllabi`"),
            ("fetchStaff", "get", "schoolId: string", "`/api/schools/${schoolId}/staff`"),
            ("createSubject", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/subjects`"),
            ("createSyllabus", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/syllabi`"),
            ("deleteSubject", "delete", "id: string", "`/api/subjects/${id}`"),
            ("deleteSyllabus", "delete", "id: string", "`/api/syllabi/${id}`"),
        ],
        "fetches": [("subjects", "fetchSubjects"), ("gradeLevels", "fetchGradeLevels"), ("classrooms", "fetchClassrooms"), ("syllabi", "fetchSyllabi"), ("staff", "fetchStaff")],
        "extracts": [("SyllabusBuilderModal", 1909, 2344), ("SubjectModal", 1510, 1680)],
        "data_keys": ["subjects", "gradeLevels", "classrooms", "syllabi", "staff"],
        "remove_states": ["subjects", "gradeLevels", "classrooms", "syllabi", "staff"],
    },
    "expenses": {
        "hook": "useExpensesQuery",
        "api": [
            ("fetchExpenses", "get", "schoolId: string", "`/api/schools/${schoolId}/expenses`"),
            ("fetchFees", "get", "schoolId: string", "`/api/schools/${schoolId}/fees`"),
            ("fetchPayrolls", "get", "schoolId: string", "`/api/schools/${schoolId}/payrolls`"),
            ("fetchFinanceSummary", "get", "schoolId: string", "`/api/schools/${schoolId}/finance/summary`"),
            ("createExpense", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/expenses`"),
            ("updateExpense", "patch", "schoolId: string, id: string, data: unknown", "`/api/schools/${schoolId}/expenses/${id}`"),
            ("deleteExpense", "delete", "schoolId: string, id: string", "`/api/schools/${schoolId}/expenses/${id}`"),
        ],
        "fetches": [("expenses", "fetchExpenses"), ("fees", "fetchFees"), ("payrolls", "fetchPayrolls"), ("summary", "fetchFinanceSummary")],
        "non_array": {"summary"},
        "extracts": [("ExpenseFormModal", 1714, 1848), ("BudgetFormModal", 1853, 1962)],
        "data_keys": ["expenses", "fees", "payrolls", "summary"],
        "remove_states": ["expenses", "fees", "payrolls", "summary"],
    },
    "fees": {
        "hook": "useFeesQuery",
        "api": [
            ("fetchFees", "get", "schoolId: string", "`/api/schools/${schoolId}/fees`"),
            ("fetchMyFees", "get", "", "`/api/my-fees`"),
            ("fetchStudents", "get", "schoolId: string", "`/api/schools/${schoolId}/students`"),
            ("createFee", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/fees`"),
            ("collectFee", "post", "schoolId: string, feeId: string, data: unknown", "`/api/schools/${schoolId}/fees/${feeId}/collect`"),
            ("remindFee", "post", "feeId: string, data: unknown", "`/api/fees/${feeId}/remind`"),
            ("payFee", "post", "feeId: string, data: unknown", "`/api/fees/${feeId}/pay`"),
        ],
        "fetches": [("fees", "fetchFees"), ("students", "fetchStudents")],
        "extracts": [("InvoiceModal", 1501, 1627), ("TemplateModal", 1630, 1714)],
        "data_keys": ["fees", "students"],
        "remove_states": ["fees", "students"],
    },
    "settings": {
        "hook": "useSettingsQuery",
        "api": [
            ("fetchSchool", "get", "schoolId: string", "`/api/schools/${schoolId}`"),
            ("updateSchool", "patch", "schoolId: string, data: unknown", "`/api/schools/${schoolId}`"),
            ("fetchGradeLegends", "get", "schoolId: string", "`/api/schools/${schoolId}/grade-legends`"),
            ("createGradeLegend", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/grade-legends`"),
            ("updateGradeLegend", "patch", "schoolId: string, id: string, data: unknown", "`/api/schools/${schoolId}/grade-legends/${id}`"),
            ("deleteGradeLegend", "delete", "schoolId: string, id: string", "`/api/schools/${schoolId}/grade-legends/${id}`"),
        ],
        "fetches": [("schoolData", "fetchSchool"), ("gradeLegends", "fetchGradeLegends")],
        "non_array": {"schoolData"},
        "extracts": [("GradeLegendModal", 1710, 1865), ("TemplatePreviewModal", 1870, 1922)],
        "data_keys": ["schoolData", "gradeLegends"],
        "remove_states": [],
        "skip_state_removal": True,
    },
    "classrooms": {
        "hook": "useClassroomsQuery",
        "api": [
            ("fetchClassrooms", "get", "schoolId: string", "`/api/schools/${schoolId}/classrooms`"),
            ("fetchGradeLevels", "get", "schoolId: string", "`/api/schools/${schoolId}/grade-levels`"),
            ("fetchStaff", "get", "schoolId: string", "`/api/schools/${schoolId}/staff`"),
            ("fetchStudents", "get", "schoolId: string", "`/api/schools/${schoolId}/students`"),
            ("fetchSubjects", "get", "schoolId: string", "`/api/schools/${schoolId}/subjects`"),
            ("createClassroom", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/classrooms`"),
            ("updateClassroom", "patch", "id: string, data: unknown", "`/api/classrooms/${id}`"),
            ("deleteClassroom", "delete", "id: string", "`/api/classrooms/${id}`"),
        ],
        "fetches": [("classrooms", "fetchClassrooms"), ("gradeLevels", "fetchGradeLevels"), ("staff", "fetchStaff"), ("students", "fetchStudents"), ("subjects", "fetchSubjects")],
        "extracts": [("ClassroomWizardModal", 1051, 1377), ("CreateClassroomModal", 662, 773)],
        "data_keys": ["classrooms", "gradeLevels", "staff", "students", "subjects"],
        "remove_states": ["classrooms", "gradeLevels", "staff", "students", "subjects"],
    },
    "maintenance": {
        "hook": "useMaintenanceQuery",
        "api": [
            ("fetchWorkOrders", "get", "schoolId: string", "`/api/schools/${schoolId}/work-orders`"),
            ("fetchInventory", "get", "schoolId: string", "`/api/schools/${schoolId}/inventory`"),
            ("fetchStaff", "get", "schoolId: string", "`/api/schools/${schoolId}/staff`"),
            ("createWorkOrder", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/work-orders`"),
            ("updateWorkOrder", "patch", "id: string, data: unknown", "`/api/work-orders/${id}`"),
            ("createInventory", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/inventory`"),
            ("updateInventory", "patch", "id: string, data: unknown", "`/api/inventory/${id}`"),
        ],
        "fetches": [("workOrders", "fetchWorkOrders"), ("inventory", "fetchInventory"), ("staff", "fetchStaff")],
        "extracts": [("WorkOrderModal", 1222, 1311), ("InventoryModal", 1409, 1512)],
        "data_keys": ["workOrders", "inventory", "staff"],
        "remove_states": ["workOrders", "inventory", "staff"],
    },
    "calendar-page": {
        "hook": "useCalendarPageQuery",
        "api": [
            ("fetchEvents", "get", "schoolId: string", "`/api/calendar/events?schoolId=${schoolId}`"),
            ("createEvent", "post", "data: unknown", "`/api/calendar/events`"),
            ("updateEvent", "patch", "id: string, data: unknown", "`/api/calendar/events/${id}`"),
            ("deleteEvent", "delete", "id: string", "`/api/calendar/events/${id}`"),
        ],
        "fetches": [("events", "fetchEvents")],
        "extracts": [("AddEventModal", 1294, 1427), ("EventDetailsModal", 1194, 1289)],
        "data_keys": ["events"],
        "remove_states": [],
        "skip_state_removal": True,
    },
    "payroll": {
        "hook": "usePayrollQuery",
        "api": [
            ("fetchPayrolls", "get", "schoolId: string", "`/api/schools/${schoolId}/payrolls`"),
            ("fetchStaff", "get", "schoolId: string", "`/api/schools/${schoolId}/staff`"),
            ("createPayroll", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/payrolls`"),
            ("updatePayroll", "patch", "id: string, data: unknown", "`/api/payrolls/${id}`"),
            ("deletePayroll", "delete", "id: string", "`/api/payrolls/${id}`"),
        ],
        "fetches": [("payrolls", "fetchPayrolls"), ("staff", "fetchStaff")],
        "extracts": [("CreatePayrollModal", 736, 923), ("EditPayrollModal", 928, 1095)],
        "data_keys": ["payrolls", "staff"],
        "remove_states": ["payrolls", "staff"],
    },
    "admissions": {
        "hook": "useAdmissionsQuery",
        "api": [
            ("fetchApplications", "get", "schoolId: string", "`/api/schools/${schoolId}/applications`"),
            ("fetchGradeLevels", "get", "schoolId: string", "`/api/schools/${schoolId}/grade-levels`"),
            ("createApplication", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/applications`"),
            ("updateApplication", "patch", "id: string, data: unknown", "`/api/applications/${id}`"),
            ("deleteApplication", "delete", "id: string", "`/api/applications/${id}`"),
        ],
        "fetches": [("applications", "fetchApplications"), ("gradeLevels", "fetchGradeLevels")],
        "extracts": [("NewApplicationModal", 858, 1212)],
        "data_keys": ["applications", "gradeLevels"],
        "remove_states": ["applications", "gradeLevels"],
        # need 2nd component - extract table section by comment later
    },
    "student-records": {
        "hook": "useStudentRecordsQuery",
        "api": [
            ("fetchStudents", "get", "schoolId: string", "`/api/schools/${schoolId}/students`"),
            ("updateUser", "patch", "id: string, data: unknown", "`/api/users/${id}`"),
            ("deleteUser", "delete", "id: string", "`/api/users/${id}`"),
        ],
        "fetches": [("students", "fetchStudents")],
        "extracts": [("StudentDetailPanel", 637, 977), ("AddRecordModal", 982, 1210)],
        "data_keys": ["students"],
        "remove_states": ["students"],
    },
    "attendance": {
        "hook": "useAttendanceQuery",
        "api": [
            ("fetchAttendance", "get", "schoolId: string", "`/api/schools/${schoolId}/attendance`"),
            ("fetchAttendanceStats", "get", "schoolId: string", "`/api/schools/${schoolId}/attendance/stats`"),
            ("fetchClassrooms", "get", "", "`/api/classrooms`"),
            ("fetchClassroomMembers", "get", "classroomId: string", "`/api/classrooms/${classroomId}/members`"),
            ("updateAttendance", "patch", "id: string, data: unknown", "`/api/attendance/${id}`"),
            ("createAttendance", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/attendance`"),
        ],
        "fetches": [("attendance", "fetchAttendance"), ("stats", "fetchAttendanceStats")],
        "non_array": {"stats"},
        "extracts": [("TakeAttendanceModal", 516, 816)],
        "data_keys": ["attendance", "stats"],
        "remove_states": ["attendance"],
        "skip_state_removal": True,
    },
    "work-orders": {
        "hook": "useWorkOrdersQuery",
        "api": [
            ("fetchWorkOrders", "get", "schoolId: string", "`/api/schools/${schoolId}/work-orders`"),
            ("fetchStaff", "get", "schoolId: string", "`/api/schools/${schoolId}/staff`"),
            ("createWorkOrder", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/work-orders`"),
            ("updateWorkOrder", "patch", "id: string, data: unknown", "`/api/work-orders/${id}`"),
        ],
        "fetches": [("workOrders", "fetchWorkOrders"), ("staff", "fetchStaff")],
        "extracts": [("WorkOrderDetailPanel", 655, 817), ("CreateWorkOrderModal", 537, 650)],
        "data_keys": ["workOrders", "staff"],
        "remove_states": ["workOrders", "staff"],
    },
    "students": {
        "hook": "useStudentsQuery",
        "api": [
            ("fetchStudents", "get", "schoolId: string", "`/api/schools/${schoolId}/students`"),
            ("fetchClassrooms", "get", "schoolId: string", "`/api/schools/${schoolId}/classrooms`"),
            ("fetchGradeLevels", "get", "schoolId: string", "`/api/schools/${schoolId}/grade-levels`"),
            ("updateUser", "patch", "id: string, data: unknown", "`/api/users/${id}`"),
            ("deleteUser", "delete", "id: string", "`/api/users/${id}`"),
            ("addClassroomMember", "post", "classroomId: string, data: unknown", "`/api/classrooms/${classroomId}/members`"),
        ],
        "fetches": [("students", "fetchStudents"), ("classrooms", "fetchClassrooms"), ("gradeLevels", "fetchGradeLevels")],
        "extracts": [("EnrollStudentModal", 417, 559), ("EditStudentModal", 637, 768)],
        "data_keys": ["students", "classrooms", "gradeLevels"],
        "remove_states": ["students", "classrooms", "gradeLevels"],
    },
    "security": {
        "hook": "useSecurityQuery",
        "api": [
            ("fetchSecurityLogs", "get", "schoolId: string", "`/api/schools/${schoolId}/security-logs`"),
            ("createSecurityLog", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/security-logs`"),
        ],
        "fetches": [("logs", "fetchSecurityLogs")],
        "extracts": [("SecurityLogModal", 764, 864), ("VisitorPassModal", 867, 980)],
        "data_keys": ["logs"],
        "remove_states": [],
        "skip_state_removal": True,
    },
    "exam-details": {
        "hook": "useExamDetailsQuery",
        "api": [
            ("fetchExam", "get", "examId: string", "`/api/exams/${examId}`"),
            ("fetchGrades", "get", "examId: string", "`/api/exams/${examId}/grades`"),
            ("fetchSubmissionsSummary", "get", "examId: string", "`/api/exams/${examId}/submissions-summary`"),
            ("fetchTeacherClassrooms", "get", "examId: string", "`/api/exams/${examId}/teacher-classrooms`"),
            ("processResults", "post", "examId: string, data: unknown", "`/api/exams/${examId}/process-results`"),
            ("releaseGrades", "post", "examId: string, data: unknown", "`/api/exams/${examId}/release-grades`"),
            ("updateGradeEntry", "patch", "id: string, data: unknown", "`/api/grade-entries/${id}`"),
        ],
        "fetches": [],  # special: examId based — custom hook below
        "extracts": [("ResultsModal", 788, 904), ("HistoryModal", 702, 785)],
        "custom_hook": True,
        "data_keys": [],
        "skip_state_removal": True,
    },
    "dashboard": {
        "hook": "useDashboardQuery",
        "api": [
            ("fetchStats", "get", "schoolId: string", "`/api/schools/${schoolId}/stats`"),
            ("fetchFinanceSummary", "get", "schoolId: string", "`/api/schools/${schoolId}/finance/summary`"),
        ],
        "fetches": [("stats", "fetchStats"), ("summary", "fetchFinanceSummary")],
        "non_array": {"stats", "summary"},
        "extracts": [("HelpGuidePanel", 459, 514)],
        "data_keys": ["stats", "summary"],
        "skip_state_removal": True,
        # need 2nd component — extract a section by line range without cond
    },
    "academic-calendar": {
        "hook": "useAcademicCalendarQuery",
        "api": [
            ("fetchCalendar", "get", "schoolId: string", "`/api/schools/${schoolId}/calendar`"),
            ("fetchTemplates", "get", "schoolId: string", "`/api/schools/${schoolId}/calendar/templates`"),
            ("saveCalendar", "post", "schoolId: string, data: unknown", "`/api/schools/${schoolId}/calendar`"),
            ("updatePeriod", "patch", "id: string, data: unknown", "`/api/periods/${id}`"),
            ("createExamComponent", "post", "periodId: string, data: unknown", "`/api/periods/${periodId}/exam-components`"),
            ("updateExamComponent", "patch", "id: string, data: unknown", "`/api/exam-components/${id}`"),
            ("deleteExamComponent", "delete", "id: string", "`/api/exam-components/${id}`"),
        ],
        "fetches": [("calendar", "fetchCalendar"), ("templates", "fetchTemplates")],
        "non_array": {"calendar"},
        "extracts": [],  # will add section extracts
        "data_keys": ["calendar", "templates"],
        "skip_state_removal": True,
    },
}


def write_exam_details_hook():
    content = '''import { useQuery, useQueryClient } from "@tanstack/react-query";
import { examDetailsApi } from "../api";

export function useExamDetailsQuery(examId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["exam-details", examId],
    enabled: Boolean(examId),
    queryFn: async () => {
      if (!examId) throw new Error("Missing exam");
      const [exam, grades, submissionsSummary, teacherClassrooms] = await Promise.all([
        examDetailsApi.fetchExam(examId),
        examDetailsApi.fetchGrades(examId),
        examDetailsApi.fetchSubmissionsSummary(examId),
        examDetailsApi.fetchTeacherClassrooms(examId),
      ]);
      return { exam, grades: Array.isArray(grades) ? grades : [], submissionsSummary, teacherClassrooms };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["exam-details", examId] });

  return {
    ...query,
    exam: query.data?.exam ?? null,
    grades: query.data?.grades ?? [],
    submissionsSummary: query.data?.submissionsSummary ?? null,
    teacherClassrooms: query.data?.teacherClassrooms ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
'''
    write_text(FEATURES / "exam-details" / "hooks" / "useExamDetailsQuery.ts", content)


def write_staff_portal():
    """staff-portal uses staffService — wrap it in api.ts + hook."""
    api = '''import { staffService } from "../../services/staffService";

/** Thin wrappers around staffService for the staff-portal feature. */
export const staffPortalApi = {
  getStaffAttendance: (schoolId: string) => staffService.getStaffAttendance(schoolId),
  getLeaveRequests: (schoolId: string, userId: string) => staffService.getLeaveRequests(schoolId, userId),
  getTasks: (schoolId: string, userId: string) => staffService.getTasks(schoolId, userId),
  getAnnouncements: (schoolId: string, role: string) => staffService.getAnnouncements(schoolId, role),
  getDocuments: (schoolId: string, role: string) => staffService.getDocuments(schoolId, role),
  getUserPayrolls: (userId: string) => staffService.getUserPayrolls(userId),
  markAttendance: (...args: Parameters<typeof staffService.markAttendance>) =>
    staffService.markAttendance(...args),
};
'''
    write_text(FEATURES / "staff-portal" / "api.ts", api)
    hook = '''import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { staffPortalApi } from "../api";

export function useStaffPortalQuery(activeTab: string) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["staff-portal", schoolId, user?.id, activeTab],
    enabled: Boolean(schoolId && user?.id),
    queryFn: async () => {
      if (!schoolId || !user?.id) throw new Error("Missing school/user");
      if (activeTab === "attendance") {
        const attendance = await staffPortalApi.getStaffAttendance(schoolId);
        return { attendance: Array.isArray(attendance) ? attendance : [], leaves: [], tasks: [], announcements: [], documents: [], payrolls: [] };
      }
      if (activeTab === "leave") {
        const leaves = await staffPortalApi.getLeaveRequests(schoolId, user.id);
        return { attendance: [], leaves: Array.isArray(leaves) ? leaves : [], tasks: [], announcements: [], documents: [], payrolls: [] };
      }
      if (activeTab === "tasks") {
        const tasks = await staffPortalApi.getTasks(schoolId, user.id);
        return { attendance: [], leaves: [], tasks: Array.isArray(tasks) ? tasks : [], announcements: [], documents: [], payrolls: [] };
      }
      if (activeTab === "announcements") {
        const announcements = await staffPortalApi.getAnnouncements(schoolId, user.role);
        return { attendance: [], leaves: [], tasks: [], announcements: Array.isArray(announcements) ? announcements : [], documents: [], payrolls: [] };
      }
      if (activeTab === "documents") {
        const documents = await staffPortalApi.getDocuments(schoolId, user.role);
        return { attendance: [], leaves: [], tasks: [], announcements: [], documents: Array.isArray(documents) ? documents : [], payrolls: [] };
      }
      if (activeTab === "payroll") {
        const payrolls = await staffPortalApi.getUserPayrolls(user.id);
        return { attendance: [], leaves: [], tasks: [], announcements: [], documents: [], payrolls: Array.isArray(payrolls) ? payrolls : [] };
      }
      return { attendance: [], leaves: [], tasks: [], announcements: [], documents: [], payrolls: [] };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["staff-portal", schoolId, user?.id] });

  return {
    ...query,
    attendance: query.data?.attendance ?? [],
    leaves: query.data?.leaves ?? [],
    tasks: query.data?.tasks ?? [],
    announcements: query.data?.announcements ?? [],
    documents: query.data?.documents ?? [],
    payrolls: query.data?.payrolls ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
'''
    write_text(FEATURES / "staff-portal" / "hooks" / "useStaffPortalQuery.ts", hook)
    # extracts
    extracts = []
    for name, start, end in [
        ("LeaveRequestModal", 1645, 1736),
        ("ClockConfirmModal", 1783, 1850),  # may need adjust
    ]:
        # verify end
        page_lines = (FEATURES / "staff-portal" / "Page.tsx").read_text().splitlines()
        if end > len(page_lines):
            end = len(page_lines)
        extracts.append(write_component("staff-portal", name, start, end))
    # Fix clock modal end - find properly
    return extracts


def find_block_end(lines, start_1idx):
    i = start_1idx - 1
    m = re.match(r"^(\s*)\{", lines[i])
    if not m:
        return None
    indent = len(m.group(1))
    for j in range(i + 1, len(lines)):
        if lines[j] == (" " * indent) + ")}":
            return j + 1
    return None


def process_feature(feature: str, cfg: dict):
    print(f"\n=== {feature} ===")
    write_api_simple(feature, cfg["api"])
    if cfg.get("custom_hook") and feature == "exam-details":
        write_exam_details_hook()
    elif cfg.get("fetches"):
        write_hook_simple(feature, cfg["hook"], cfg["fetches"], set(cfg.get("non_array", [])))
    elif not cfg.get("custom_hook"):
        # empty fetches — still write a minimal hook
        write_hook_simple(feature, cfg["hook"], cfg["api"][:1] and [] or [], set())

    extracts = []
    page_lines = (FEATURES / feature / "Page.tsx").read_text().splitlines()
    for name, start, end in cfg.get("extracts", []):
        # verify end exists; if comment-based without exact )}, use find
        if end > len(page_lines):
            end = find_block_end(page_lines, start) or end
        extracts.append(write_component(feature, name, start, end))

    # Ensure at least 2 extracts — if only 1, try to find another large block
    if len(extracts) < 2:
        # find largest unused blocks
        print(f"  need more extracts (have {len(extracts)})")

    data_bind = None
    if not cfg.get("skip_hook_wire") and cfg.get("data_keys") is not None and not cfg.get("custom_hook"):
        data_bind = {
            "keys": cfg.get("data_keys", []),
            "remove_states": [] if cfg.get("skip_state_removal") else cfg.get("remove_states", []),
            "remove_loading": not cfg.get("skip_state_removal"),
        }

    n = patch_page(feature, extracts, cfg["hook"], data_bind)
    print(f"  Page.tsx now {n} lines")
    return n


def main():
    results = {}
    # staff portal special
    print("\n=== staff-portal ===")
    write_staff_portal()
    # find clock modal end
    lines = (FEATURES / "staff-portal" / "Page.tsx").read_text().splitlines()
    # Leave already extracted; find Confirm dialog
    start = next((i + 1 for i, l in enumerate(lines) if "Clock-in / Clock-out Confirmation Modal" in l), None)
    extracts = []
    if start:
        # next {cond && (
        cond_line = next((i + 1 for i in range(start - 1, min(start + 5, len(lines))) if re.match(r"^\s*\{\w+ && \(", lines[i])), None)
        if not cond_line:
            cond_line = next((i + 1 for i in range(start, len(lines)) if "confirmDialog" in lines[i] and "&&" in lines[i]), None)
        if cond_line:
            end = find_block_end(lines, cond_line)
            if end:
                extracts.append(write_component("staff-portal", "ClockConfirmModal", cond_line, end))
    leave_start = next((i + 1 for i, l in enumerate(lines) if re.match(r"^\s*\{showLeaveModal && \(", l)), None)
    if leave_start:
        end = find_block_end(lines, leave_start)
        if end:
            extracts.append(write_component("staff-portal", "LeaveRequestModal", leave_start, end))
    n = patch_page("staff-portal", extracts, "useStaffPortalQuery", None)
    results["staff-portal"] = n
    print(f"  Page.tsx now {n} lines")

    # Fix fees fetchMyFees empty args
    for feature, cfg in BATCH.items():
        # Fix API methods with empty args
        fixed_api = []
        for name, method, args, path in cfg["api"]:
            if not args:
                if method == "get":
                    args = ""  # will generate `(): =>` — fix
                    # use noop param
                    args = "_?: void"
                else:
                    args = "data: unknown"
            # fix path for methods needing id in updateExpense etc — already in path
            # special: updateExpense has schoolId, id — path uses both; data arg needed
            if method in ("post", "patch", "put") and "data" not in args:
                args = args + ", data: unknown" if args else "data: unknown"
            fixed_api.append((name, method, args, path))
        cfg["api"] = fixed_api

        # admissions needs 2nd extract — ApplicationsTable from comment
        if feature == "admissions" and len(cfg["extracts"]) < 2:
            # extract status filter + table chunk roughly 418-850
            cfg["extracts"].append(("ApplicationsTableSection", 418, 850))

        if feature == "dashboard" and len(cfg["extracts"]) < 2:
            # extract a large presentational chunk - Stats row or similar
            # find showHelpGuide already; add a section from early return content
            cfg["extracts"].append(("DashboardStatsSection", 320, 450))

        if feature == "academic-calendar" and not cfg["extracts"]:
            # extract large sections by finding major return chunks
            # Periods list / template picker — scan for large JSX
            plines = (FEATURES / feature / "Page.tsx").read_text().splitlines()
            # extract from first major card sections
            cfg["extracts"] = [
                ("CalendarPeriodsPanel", 600, 900),
                ("CalendarTemplatesPanel", 200, 450),
            ]
            # clamp
            for i, (nm, s, e) in enumerate(cfg["extracts"]):
                e = min(e, len(plines) - 5)
                cfg["extracts"][i] = (nm, s, e)

        if feature == "attendance" and len(cfg["extracts"]) < 2:
            # roll call view modal
            plines = (FEATURES / feature / "Page.tsx").read_text().splitlines()
            start = next((i + 1 for i, l in enumerate(plines) if "DETAILED ROLL CALL" in l), None)
            if start:
                cond = next((i + 1 for i in range(start, min(start + 5, len(plines))) if "&&" in plines[i] and plines[i].strip().startswith("{")), None)
                if cond:
                    end = find_block_end(plines, cond)
                    if end:
                        cfg["extracts"].append(("RollCallModal", cond, end))

        if feature == "fees":
            # fix fetchMyFees
            pass

        try:
            results[feature] = process_feature(feature, cfg)
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            results[feature] = -1

    print("\n===== SUMMARY =====")
    for k, v in results.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
