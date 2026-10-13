#!/usr/bin/env python3
"""
Extract JSX panels from feature Page.tsx into components/.
Reuses identifier detection from phase6_batch.py.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "src" / "features"

# Import helpers from phase6_batch
sys.path.insert(0, str(ROOT / "scripts"))
from phase6_batch import collect_page_idents  # noqa: E402


def write_component(feature: str, name: str, start: int, end: int) -> dict:
    """Extract `{cond && (` blocks into a presentational component."""
    return extract_one(feature, name, start, end, mode="cond", strip_outer=True)



def find_matching_block_end(lines: list[str], start: int) -> int:
    """
    Given 1-indexed start of `{cond && (` or `{cond ? (`, find the end line
    of the matching closing `)}` at the same brace depth.
    """
    # Walk from start, track paren/brace depth in a simple way for JSX wrappers
    text = "\n".join(lines[start - 1 :])
    # We only need to match the outer `{ ... }` that starts on the first line
    depth = 0
    i = 0
    started = False
    for li, line in enumerate(lines[start - 1 :], start=start):
        for ch in line:
            if ch == "{":
                depth += 1
                started = True
            elif ch == "}":
                depth -= 1
                if started and depth == 0:
                    return li
    raise RuntimeError(f"Unbalanced block starting at {start}")


def find_ternary_branch_end(lines: list[str], start: int) -> int:
    """
    For `{cond ? (` at start, find the last line of this branch before
    `) :` at the same nesting level (the branch's closing paren line).
    Returns the line index of `) : ...` (inclusive) or the final `)}`.
    """
    # Simpler: find next line that matches `) :` or `)}` at indent similar to start
    start_indent = len(lines[start - 1]) - len(lines[start - 1].lstrip())
    # The opening `( after ?` - track paren depth from that
    depth = 0
    seen_open = False
    for li, line in enumerate(lines[start - 1 :], start=start):
        for idx, ch in enumerate(line):
            if ch == "(":
                depth += 1
                seen_open = True
            elif ch == ")":
                depth -= 1
                if seen_open and depth == 0:
                    # This closes the branch's paren. Line may be `) : foo` or `)}`
                    return li
    raise RuntimeError(f"Unbalanced ternary at {start}")


def patch_extracts(feature: str, extracts: list[dict]) -> int:
    page_path = FEATURES / feature / "Page.tsx"
    lines = page_path.read_text(encoding="utf-8").splitlines()
    src = "\n".join(lines)

    extras = []
    for e in extracts:
        if f'from "./components/{e["name"]}"' not in src:
            extras.append(f'import {{ {e["name"]} }} from "./components/{e["name"]}";')
    if extras:
        last = max(i for i, l in enumerate(lines) if l.startswith("import "))
        lines = lines[: last + 1] + extras + lines[last + 1 :]
        for e in extracts:
            e["start"] += len(extras)
            e["end"] += len(extras)

    for e in sorted(extracts, key=lambda x: -x["start"]):
        start, end = e["start"], e["end"]
        first = lines[start - 1]
        props = e["props"]
        mode = e.get("mode", "cond")  # cond | replace | ternary-keep

        if mode == "replace":
            # Replace entire range with component call (no outer condition)
            ind = re.match(r"^(\s*)", first).group(1)
            replacement = (
                [f"{ind}<{e['name']}"]
                + [f"{ind}  {p}={{{p}}}" for p in props]
                + [f"{ind}/>"]
            )
        elif mode == "ternary-branch":
            # Keep `{cond ? (` and `) :` / closing, replace inner body only
            # start is the `{cond ? (` line, end is the `) :` or closing line
            ind = re.match(r"^(\s*)", first).group(1)
            # Keep first line, replace middle, keep last line
            last_line = lines[end - 1]
            replacement = (
                [first]
                + [f"{ind}  <{e['name']}"]
                + [f"{ind}    {p}={{{p}}}" for p in props]
                + [f"{ind}  />", last_line]
            )
        else:
            # Standard `{cond && (` ... `)}`
            cond_m = re.match(r"^(\s*)\{(.+&&)\s*\(\s*$", first)
            if not cond_m:
                # Try with comment line before — if start is comment, use next
                raise RuntimeError(f"{feature}/{e['name']}: expected cond at {start}: {first!r}")
            ind = cond_m.group(1)
            cond = cond_m.group(2)
            replacement = (
                [f"{ind}{{{cond} ("]
                + [f"{ind}  <{e['name']}"]
                + [f"{ind}    {p}={{{p}}}" for p in props]
                + [f"{ind}  />", ind + ")}"]
            )
        lines = lines[: start - 1] + replacement + lines[end:]

    page_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(lines)


def extract_one(feature: str, name: str, start: int, end: int, *, mode: str = "cond", strip_outer: bool = True) -> dict:
    """Write component from line range, return extract meta with props."""
    page_path = FEATURES / feature / "Page.tsx"
    page = page_path.read_text(encoding="utf-8")
    lines = page.splitlines()
    body_lines = lines[start - 1 : end]

    if mode == "ternary-branch":
        body = "\n".join(body_lines[1:-1])
    else:
        body = "\n".join(body_lines)
        if strip_outer:
            body = re.sub(r"^\s*\{.+\s*&&\s*\(\s*\n", "", body, count=1)
            body = re.sub(r"\n\s*\)\}\s*$", "", body)

    page_idents = collect_page_idents(page)
    # Also treat simple const bindings as page idents
    for m in re.finditer(r"^\s*const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=", page, re.M):
        page_idents.add(m.group(1))

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
        "Fragment", "key", "map", "filter", "length", "toLocaleString", "toFixed",
        "includes", "replace", "split", "join", "push", "slice", "find", "some",
        "every", "reduce", "sort", "toLowerCase", "toUpperCase", "trim",
        "AnimatePresence", "motion", "Link",
    }
    props = sorted(w for w in used if w not in skip)

    lucide_m = re.search(r"import\s*\{([^}]+)\}\s*from\s*[\"']lucide-react[\"']", page)
    all_lucide = [x.strip() for x in lucide_m.group(1).split(",")] if lucide_m else []
    lucide_used = [i for i in all_lucide if i and re.search(rf"\b{re.escape(i)}\b", body)]

    needs_format = "format(" in body or "formatSafe(" in body
    needs_format_safe = "formatSafe(" in body
    needs_motion = "motion." in body
    needs_animate = "AnimatePresence" in body
    needs_recharts = bool(
        re.search(
            r"\b(ResponsiveContainer|BarChart|PieChart|AreaChart|LineChart|XAxis|YAxis|CartesianGrid|Tooltip|Legend|Area|Bar|Line|Cell|Pie)\b",
            body,
        )
    )
    needs_link = bool(re.search(r"\bLink\b", body)) and "react-router" in page

    local = set(lucide_used)
    if needs_format and not needs_format_safe:
        local.add("format")
    if needs_motion:
        local.add("motion")
    if needs_animate:
        local.add("AnimatePresence")
    if needs_link:
        local.add("Link")

    if needs_recharts:
        rc = re.search(r'import\s*\{([^}]+)\}\s*from\s*[\"\']recharts[\"\']', page)
        if rc:
            local |= {x.strip() for x in rc.group(1).split(",") if x.strip()}

    # Local component imports already in feature/components
    for m in re.finditer(r'import\s*\{\s*(\w+)\s*\}\s*from\s*[\"\']\./components/', page):
        if m.group(1) in body:
            local.add(m.group(1))

    prop_names = [p for p in props if p not in local]

    imports = ['import React from "react";']
    if lucide_used:
        imports.append("import {\n  " + ",\n  ".join(lucide_used) + '\n} from "lucide-react";')
    if needs_format_safe:
        # staff-portal style
        if (FEATURES / feature / "utils" / "dateHelpers.ts").exists():
            imports.append('import { formatSafe } from "../utils/dateHelpers";')
        elif "formatSafe" in page:
            imports.append('import { formatSafe } from "../utils/dateHelpers";')
        prop_names = [p for p in prop_names if p != "formatSafe"]
        local.add("formatSafe")
    elif needs_format:
        imports.append('import { format } from "date-fns";')
    if needs_motion or needs_animate:
        parts = []
        if needs_motion:
            parts.append("motion")
        if needs_animate:
            parts.append("AnimatePresence")
        imports.append(f'import {{ {", ".join(parts)} }} from "motion/react";')
    if needs_recharts:
        rc = re.search(r'import\s*\{([^}]+)\}\s*from\s*[\"\']recharts[\"\']', page)
        if rc:
            used_rc = [x.strip() for x in rc.group(1).split(",") if x.strip() and x.strip() in body]
            if used_rc:
                imports.append("import {\n  " + ",\n  ".join(used_rc) + '\n} from "recharts";')
    if needs_link:
        imports.append('import { Link } from "react-router-dom";')

    # Import sibling components referenced in body
    for m in re.finditer(r'import\s*\{\s*(\w+)\s*\}\s*from\s*[\"\'](\./components/\w+)[\"\']', page):
        cname, cpath = m.group(1), m.group(2)
        if cname in body and cname != name:
            imports.append(f'import {{ {cname} }} from "{cpath}";')
            prop_names = [p for p in prop_names if p != cname]

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
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content if content.endswith("\n") else content + "\n", encoding="utf-8")
    print(f"  wrote {out.relative_to(ROOT)} ({len(content.splitlines())} lines)")
    return {"name": name, "start": start, "end": end, "props": prop_names, "mode": mode}


def resolve_cond_block(lines: list[str], comment_substr: str) -> tuple[int, int]:
    """Find `{/* comment */}` then the following `{cond && (` block start/end."""
    comment_line = None
    for i, l in enumerate(lines, 1):
        if comment_substr in l and "{/*" in l:
            comment_line = i
            break
    if comment_line is None:
        raise RuntimeError(f"Comment not found: {comment_substr}")
    # Find next `{... && (` within a few lines
    start = None
    for i in range(comment_line, min(comment_line + 5, len(lines) + 1)):
        if re.match(r"^\s*\{.+\s*&&\s*\(\s*$", lines[i - 1]):
            start = i
            break
    if start is None:
        raise RuntimeError(f"No cond after comment {comment_substr}")
    end = find_matching_block_end(lines, start)
    return start, end


def main():
    plan: list[tuple[str, list[tuple]]] = []

    # --- expenses: 4 tabs still inline ---
    lines = (FEATURES / "expenses" / "Page.tsx").read_text().splitlines()
    exp_extracts = []
    for comment, name in [
        ("TAB 1: EXECUTIVE OVERVIEW", "OverviewTab"),
        ("TAB 2: BUDGETS MANAGER", "BudgetsTab"),
        ("TAB 3: ADVANCED ANALYTICS", "AnalyticsTab"),
        ("TAB 4: UNIFIED TRANSACTIONS LEDGER", "TransactionsTab"),
    ]:
        s, e = resolve_cond_block(lines, comment)
        print(f"expenses {name}: {s}-{e} ({e-s+1} lines)")
        exp_extracts.append((name, s, e, "cond"))
    plan.append(("expenses", exp_extracts))

    # --- fees ---
    lines = (FEATURES / "fees" / "Page.tsx").read_text().splitlines()
    fee_extracts = []
    for comment, name in [
        ("TAB 1: EXECUTIVE ANALYTICS DASHBOARD", "OverviewTab"),
        ("TAB 2: MASTER LEDGER & INVOICES", "LedgerTab"),
        ("TAB 3: PRICING STRUCTURES & FEE TEMPLATES", "TemplatesTab"),
    ]:
        s, e = resolve_cond_block(lines, comment)
        print(f"fees {name}: {s}-{e} ({e-s+1} lines)")
        fee_extracts.append((name, s, e, "cond"))
    plan.append(("fees", fee_extracts))

    # --- maintenance ---
    lines = (FEATURES / "maintenance" / "Page.tsx").read_text().splitlines()
    m_extracts = []
    for comment, name in [
        ("--- DASHBOARD TAB ---", "DashboardTab"),
        ("--- WORK ORDERS TAB ---", "WorkOrdersTab"),
        ("--- PREVENTATIVE SCHEDULES TAB ---", "PreventativeTab"),
        ("--- ASSET HEALTH TAB ---", "AssetTrackingTab"),
        ("--- MATERIALS & INVENTORY TAB ---", "InventoryTab"),
    ]:
        s, e = resolve_cond_block(lines, comment)
        print(f"maintenance {name}: {s}-{e} ({e-s+1} lines)")
        m_extracts.append((name, s, e, "cond"))
    plan.append(("maintenance", m_extracts))

    # --- payroll ---
    lines = (FEATURES / "payroll" / "Page.tsx").read_text().splitlines()
    # records tab
    for i, l in enumerate(lines, 1):
        if l.strip() == '{activeTab === "records" && (':
            s = i
            e = find_matching_block_end(lines, s)
            print(f"payroll RecordsTab: {s}-{e}")
            break
    for i, l in enumerate(lines, 1):
        if l.strip() == '{activeTab === "integrations" && (':
            s2 = i
            e2 = find_matching_block_end(lines, s2)
            print(f"payroll IntegrationsTab: {s2}-{e2}")
            break
    # detail drawer - find DETAIL comment then AnimatePresence block or the conditional
    detail_start = None
    for i, l in enumerate(lines, 1):
        if "DETAIL / INTERACTIVE PAYSLIP" in l:
            # next non-empty meaningful: <AnimatePresence> then conditional
            for j in range(i + 1, i + 5):
                if "isDetailModalOpen" in lines[j - 1]:
                    detail_start = j
                    break
            break
    # The detail is inside AnimatePresence with IIFE - extract from AnimatePresence wrapper
    for i, l in enumerate(lines, 1):
        if "DETAIL / INTERACTIVE PAYSLIP" in l:
            # Extract from AnimatePresence opening to closing
            # Find <AnimatePresence> after comment
            for j in range(i + 1, i + 4):
                if "AnimatePresence" in lines[j - 1]:
                    # find matching close
                    depth = 0
                    for k in range(j, len(lines) + 1):
                        if "<AnimatePresence" in lines[k - 1]:
                            depth += 1
                        if "</AnimatePresence>" in lines[k - 1]:
                            depth -= 1
                            if depth == 0:
                                print(f"payroll PayslipDrawer: {j}-{k}")
                                plan.append(
                                    (
                                        "payroll",
                                        [
                                            ("RecordsTab", s, e, "cond"),
                                            ("IntegrationsTab", s2, e2, "cond"),
                                            ("PayslipDrawer", j, k, "replace", False),
                                        ],
                                    )
                                )
                                break
                    break
            break

    # --- staff-portal ---
    lines = (FEATURES / "staff-portal" / "Page.tsx").read_text().splitlines()
    sp = []
    for comment, name in [
        ("TAB: TASKS", "TasksTab"),
        ("TAB: DOCUMENTS", "DocumentsTab"),
    ]:
        s, e = resolve_cond_block(lines, comment)
        print(f"staff-portal {name}: {s}-{e}")
        sp.append((name, s, e, "cond"))
    plan.append(("staff-portal", sp))

    # --- academic-calendar ---
    lines = (FEATURES / "academic-calendar" / "Page.tsx").read_text().splitlines()
    ac = []
    for i, l in enumerate(lines, 1):
        if '{mode === "VIEW" && activeCalendar && (' in l:
            s, e = i, find_matching_block_end(lines, i)
            print(f"academic-calendar CalendarOverview: {s}-{e}")
            ac.append(("CalendarOverview", s, e, "cond"))
            break
    for i, l in enumerate(lines, 1):
        if l.strip() == "{step === 1 && (":
            s, e = i, find_matching_block_end(lines, i)
            print(f"academic-calendar SetupStep1Templates: {s}-{e}")
            ac.append(("SetupStep1Templates", s, e, "cond"))
            break
    for i, l in enumerate(lines, 1):
        if l.strip().startswith("{step === 4 && config && ("):
            s, e = i, find_matching_block_end(lines, i)
            print(f"academic-calendar SetupStep4Review: {s}-{e}")
            ac.append(("SetupStep4Review", s, e, "cond"))
            break
    plan.append(("academic-calendar", ac))

    # --- classrooms ---
    lines = (FEATURES / "classrooms" / "Page.tsx").read_text().splitlines()
    cl = []
    # concept guide AnimatePresence block
    for i, l in enumerate(lines, 1):
        if "Interactive Academics Concept Guide" in l:
            # next AnimatePresence
            for j in range(i, i + 3):
                if "AnimatePresence" in lines[j - 1]:
                    depth = 0
                    for k in range(j, len(lines) + 1):
                        if "<AnimatePresence" in lines[k - 1]:
                            depth += 1
                        if "</AnimatePresence>" in lines[k - 1]:
                            depth -= 1
                            if depth == 0:
                                print(f"classrooms ConceptGuide: {j}-{k}")
                                cl.append(("ConceptGuide", j, k, "replace", False))
                                break
                    break
            break
    # standalone subjects section
    for i, l in enumerate(lines, 1):
        if "{standaloneSubjectsToDisplay.length > 0 && (" in l:
            s, e = i, find_matching_block_end(lines, i)
            print(f"classrooms StandaloneSubjectsSection: {s}-{e}")
            cl.append(("StandaloneSubjectsSection", s, e, "cond"))
            break
    plan.append(("classrooms", cl))

    # --- calendar-page: big chunks ---
    lines = (FEATURES / "calendar-page" / "Page.tsx").read_text().splitlines()
    cp = []
    # Header banner through filters: 897 to before Main Grid
    header_s = None
    main_s = None
    for i, l in enumerate(lines, 1):
        if "Header and Quick Stats Banner" in l:
            header_s = i  # comment - start from next sibling content; include comment in replace?
        if "Main Grid Layout" in l:
            main_s = i
    if header_s and main_s:
        # replace from header comment through line before main grid comment
        print(f"calendar-page HeaderAndFilters: {header_s}-{main_s-1}")
        cp.append(("HeaderAndFilters", header_s, main_s - 1, "replace", False))
    # Extract from Main Grid to before modals
    modal_s = None
    for i, l in enumerate(lines, 1):
        if "Modal - Event Details" in l:
            modal_s = i
            break
    if main_s and modal_s:
        print(f"calendar-page CalendarMainGrid: {main_s}-{modal_s-1}")
        cp.append(("CalendarMainGrid", main_s, modal_s - 1, "replace", False))
    plan.append(("calendar-page", cp))

    # --- curriculum: concept guide + entire view ternary as one panel ---
    lines = (FEATURES / "curriculum" / "Page.tsx").read_text().splitlines()
    cur = []
    for i, l in enumerate(lines, 1):
        if "Interactive Academics Concept Guide" in l:
            for j in range(i, i + 3):
                if "AnimatePresence" in lines[j - 1]:
                    depth = 0
                    for k in range(j, len(lines) + 1):
                        if "<AnimatePresence" in lines[k - 1]:
                            depth += 1
                        if "</AnimatePresence>" in lines[k - 1]:
                            depth -= 1
                            if depth == 0:
                                print(f"curriculum ConceptGuide: {j}-{k}")
                                cur.append(("ConceptGuide", j, k, "replace", False))
                                break
                    break
            break
    for i, l in enumerate(lines, 1):
        if '{activeView === "SYLLABI" ? (' in l:
            outer_end = find_matching_block_end(lines, i)
            print(f"curriculum CurriculumViews: {i}-{outer_end} ({outer_end - i + 1} lines)")
            # Keep full ternary inside the component (no strip)
            cur.append(("CurriculumViews", i, outer_end, "replace", False))
            break
    plan.append(("curriculum", cur))

    # Execute extractionsions one feature at a time (line numbers are from current file)
    for feature, items in plan:
        print(f"\n>>> Extracting {feature} ({len(items)} components)")
        metas = []
        for item in items:
            if len(item) == 4:
                name, s, e, mode = item
                strip = True
            else:
                name, s, e, mode, strip = item
            if mode == "cond":
                meta = write_component(feature, name, s, e)
                meta["mode"] = "cond"
            else:
                meta = extract_one(feature, name, s, e, mode=mode, strip_outer=strip)
            metas.append(meta)
            print(f"  prepared {name} props={len(meta['props'])} mode={mode}")

        new_count = patch_extracts(feature, metas)
        print(f"  => {feature}/Page.tsx now {new_count} lines")


if __name__ == "__main__":
    main()
