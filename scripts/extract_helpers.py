#!/usr/bin/env python3
"""Move large helper blocks out of Page.tsx into utils/ to get under 800 lines."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "src" / "features"


def extract_fn_block(lines: list[str], start_pred, end_after_depth0=True) -> tuple[int, int]:
    """Return 1-indexed inclusive [start, end] for a function starting where start_pred matches."""
    start = None
    for i, l in enumerate(lines, 1):
        if start_pred(l):
            start = i
            break
    if start is None:
        raise RuntimeError("start not found")
    depth = 0
    started = False
    for i in range(start - 1, len(lines)):
        for ch in lines[i]:
            if ch == "{":
                depth += 1
                started = True
            elif ch == "}":
                depth -= 1
        if started and depth == 0:
            return start, i + 1
    raise RuntimeError("end not found")


def move_calendar_preseeded():
    feature = "calendar-page"
    page_path = FEATURES / feature / "Page.tsx"
    lines = page_path.read_text().splitlines()

    # Also move getRelativeDateString since preseeded depends on it
    s1, e1 = extract_fn_block(lines, lambda l: "const getRelativeDateString = useCallback" in l)
    s2, e2 = extract_fn_block(lines, lambda l: "const getPreseededEventsForRole = useCallback" in l)
    print(f"calendar getRelativeDateString {s1}-{e1}, getPreseeded {s2}-{e2}")

    # Build utils file as plain functions (not useCallback)
    rel_body = "\n".join(lines[s1 - 1 : e1])
    pre_body = "\n".join(lines[s2 - 1 : e2])

    # Transform useCallback wrappers into plain exported functions
    # getRelativeDateString
    rel_fn = '''export function getRelativeDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}
'''
    # For preseeded - take body inside useCallback((role) => { ... }, deps)
    # Extract from `const getPreseededEventsForRole = useCallback((role: string): CalendarEvent[] => {`
    # to the closing `}, [getRelativeDateString]);`
    inner_lines = lines[s2:e2 - 1]  # skip first and last line
    # first line of inner is already the function body start after => {
    # Actually s2 line is the const declaration; body starts next line
    # e2 is `}, [getRelativeDateString]);` 
    body_lines = lines[s2 : e2 - 1]  # exclusive of closing
    body = "\n".join(body_lines)

    # Need CalendarEvent type - check page for interface
    page = page_path.read_text()
    type_m = re.search(r"(type|interface)\s+CalendarEvent\s*[={][^;]+;?", page, re.S)
    # Usually defined inline or imported
    type_block = ""
    for i, l in enumerate(lines):
        if "interface CalendarEvent" in l or "type CalendarEvent" in l:
            # grab until closing
            if "interface" in l:
                depth = 0
                started = False
                chunk = []
                for j in range(i, len(lines)):
                    chunk.append(lines[j])
                    for ch in lines[j]:
                        if ch == "{":
                            depth += 1
                            started = True
                        elif ch == "}":
                            depth -= 1
                    if started and depth == 0:
                        type_block = "\n".join(chunk) + "\n\n"
                        break
            break

    utils = f'''/** Role-based preseeded calendar events (extracted from Page.tsx). */
{type_block}{rel_fn}
export function getPreseededEventsForRole(role: string): CalendarEvent[] {{
{body}
}}
'''
    # Fix indentation of body - it has extra 2 spaces from being inside component
    # body lines are indented with 4 spaces typically for component body; function body wants 2
    utils_path = FEATURES / feature / "utils" / "preseededEvents.ts"
    utils_path.parent.mkdir(parents=True, exist_ok=True)

    # Cleaner approach: keep bodies as-is with their indentation stripped by 2 spaces
    def dedent(text: str, n: int = 2) -> str:
        out = []
        for line in text.splitlines():
            if line.startswith(" " * n):
                out.append(line[n:])
            else:
                out.append(line)
        return "\n".join(out)

    body_dedented = dedent(body, 2)
    utils = f'''/** Role-based preseeded calendar events (extracted from Page.tsx). */
{type_block}{rel_fn}
export function getPreseededEventsForRole(role: string): CalendarEvent[] {{
{body_dedented}
}}
'''
    utils_path.write_text(utils + "\n", encoding="utf-8")
    print(f"wrote {utils_path} ({len(utils.splitlines())} lines)")

    # Replace in Page: remove both functions, add import, use plain calls
    # Remove from s1 to e2 (they should be contiguous with maybe blank line)
    assert s1 < s2
    new_lines = lines[: s1 - 1] + lines[e2:]
    text = "\n".join(new_lines)
    # Add import
    if "preseededEvents" not in text:
        last_imp = max(i for i, l in enumerate(new_lines) if l.startswith("import "))
        new_lines = (
            new_lines[: last_imp + 1]
            + ['import { getRelativeDateString, getPreseededEventsForRole } from "./utils/preseededEvents";']
            + new_lines[last_imp + 1 :]
        )
        text = "\n".join(new_lines)

    # Remove useCallback from dependency if only used for these - leave as is
    # Calls are already getPreseededEventsForRole(user.role) and getRelativeDateString(...)
    page_path.write_text(text + "\n", encoding="utf-8")
    print(f"calendar-page Page now {len(text.splitlines())} lines")


def move_expenses_helpers():
    feature = "expenses"
    page_path = FEATURES / feature / "Page.tsx"
    lines = page_path.read_text().splitlines()

    # Move from getUnifiedTransactions through end of handleDownloadPLReport
    s, _ = extract_fn_block(lines, lambda l: "const getUnifiedTransactions = " in l)
    # Find handleDownloadPLReport end
    _, e = extract_fn_block(lines, lambda l: "const handleDownloadPLReport = " in l)
    print(f"expenses helpers {s}-{e} ({e-s+1} lines)")

    block = lines[s - 1 : e]
    # These helpers close over: expenses, budgets, fees, forecastModel, CATEGORY_COLORS, school, etc.
    # Better to keep them as functions that take params OR move to a hook.
    # Simplest for line count: move to utils as functions accepting needed data.

    # Actually many close over component state - converting is error-prone.
    # Instead extract as a custom hook useExpensesDerived that takes deps.

    # Pragmatic: move PDF/PL report handlers only (pure-ish) and the calculation fns
    # by wrapping in exported functions with explicit args - too heavy.

    # Alternative for expenses: extract Header+Tabs into component (~120 lines)
    # and TransactionDetails is already out. Header is 656-780ish.

    # Extract header+tabs as ExpensesChrome
    return  # handle separately


def extract_jsx_range(feature: str, name: str, start: int, end: int, mode: str = "replace"):
    """Reuse extract_panels.extract_one + patch."""
    import sys
    sys.path.insert(0, str(ROOT / "scripts"))
    from extract_panels import extract_one, patch_extracts

    meta = extract_one(feature, name, start, end, mode=mode, strip_outer=False)
    patch_extracts(feature, [meta])
    page = FEATURES / feature / "Page.tsx"
    print(f"{feature} after {name}: {len(page.read_text().splitlines())} lines")


def main():
    move_calendar_preseeded()

    # expenses: header + tabs menu (before tab panels)
    lines = (FEATURES / "expenses" / "Page.tsx").read_text().splitlines()
    header_s = next(i for i, l in enumerate(lines, 1) if "Upper Navigation Header" in l)
    tab1 = next(i for i, l in enumerate(lines, 1) if "TAB 1: EXECUTIVE OVERVIEW" in l)
    print(f"expenses chrome {header_s}-{tab1-1}")
    extract_jsx_range("expenses", "ExpensesChrome", header_s, tab1 - 1, "replace")

    # fees: header + tabs
    lines = (FEATURES / "fees" / "Page.tsx").read_text().splitlines()
    header_s = next(i for i, l in enumerate(lines, 1) if "Header Banner" in l)
    tab1 = next(i for i, l in enumerate(lines, 1) if "TAB 1: EXECUTIVE ANALYTICS" in l)
    print(f"fees chrome {header_s}-{tab1-1}")
    extract_jsx_range("fees", "FeesChrome", header_s, tab1 - 1, "replace")

    # curriculum: page header + view tabs (before CurriculumViews)
    lines = (FEATURES / "curriculum" / "Page.tsx").read_text().splitlines()
    # find return's first header section - from return+1 to before ConceptGuide or CurriculumViews
    ret = next(i for i, l in enumerate(lines, 1) if l.strip() == "return (" and i > 100)
    concept = next((i for i, l in enumerate(lines, 1) if "Interactive Academics Concept Guide" in l), None)
    views = next(i for i, l in enumerate(lines, 1) if "<CurriculumViews" in l)
    # Extract from after return's opening div content: find first content after `<div`
    # Extract header buttons + view switcher up to CurriculumViews
    # Find line with view switcher start - the flex border-b with SYLLABI
    tab_bar = next(i for i, l in enumerate(lines, 1) if 'setActiveView("SYLLABI")' in l)
    # go up to containing div
    start = tab_bar
    while start > ret and "flex" not in lines[start - 1]:
        start -= 1
    # include a bit more - the header with title
    header_start = next(i for i, l in enumerate(lines, 1) if "Manage Curriculum" in l or "Curriculum" in l and "text-2xl" in l or "text-3xl" in l)
    # safer: from line after outer div open
    for i in range(ret, ret + 5):
        if "<div" in lines[i - 1]:
            chrome_start = i + 1
            break
    else:
        chrome_start = ret + 1
    # end before concept guide comment or ConceptGuide component
    if concept:
        chrome_end = concept - 1
    else:
        chrome_end = views - 1
    # Actually include view tabs which are after concept guide
    # Structure: header, concept, view tabs, CurriculumViews
    # Extract view tabs only (between concept end and CurriculumViews)
    concept_end = next(i for i, l in enumerate(lines, 1) if "<ConceptGuide" in l or "ConceptGuide" in l and "showConceptGuide" in l)
    # find end of ConceptGuide usage
    for i in range(concept_end, len(lines)):
        if "/>" in lines[i] and i >= concept_end:
            # might be self-closing on same or few lines
            pass
    # Find the view tab bar div
    tab_start = next(i for i, l in enumerate(lines, 1) if 'setActiveView("SYLLABI")' in l)
    # walk up to the wrapping div
    while tab_start > 1 and not re.match(r"\s*<div", lines[tab_start - 1]):
        tab_start -= 1
    tab_end = views - 1
    print(f"curriculum ViewTabs {tab_start}-{tab_end}")
    extract_jsx_range("curriculum", "ViewTabs", tab_start, tab_end, "replace")

    # Also extract curriculum page header (title + buttons) before concept
    lines = (FEATURES / "curriculum" / "Page.tsx").read_text().splitlines()
    ret = next(i for i, l in enumerate(lines, 1) if l.strip() == "return (" and i > 100)
    for i in range(ret, ret + 5):
        if "<div" in lines[i - 1]:
            hs = i + 1
            break
    concept = next(i for i, l in enumerate(lines, 1) if "Interactive Academics Concept Guide" in l or "<ConceptGuide" in l)
    # header ends before concept
    he = concept - 1
    # skip blank lines at end
    while he > hs and not lines[he - 1].strip():
        he -= 1
    print(f"curriculum PageHeader {hs}-{he}")
    extract_jsx_range("curriculum", "PageHeader", hs, he, "replace")

    # registrar: extract header bar
    lines = (FEATURES / "registrar" / "Page.tsx").read_text().splitlines()
    hs = next(i for i, l in enumerate(lines, 1) if "Dashboard Top Header bar" in l)
    # through success/error messages until WORKSPACE
    ws = next(i for i, l in enumerate(lines, 1) if "WORKSPACE CONTENT AREA" in l)
    print(f"registrar RegistrarChrome {hs}-{ws-1}")
    extract_jsx_range("registrar", "RegistrarChrome", hs, ws - 1, "replace")

    # Print finals
    for f in ["curriculum", "expenses", "fees", "calendar-page", "registrar", "maintenance", "academic-calendar", "payroll", "classrooms", "staff-portal"]:
        n = len((FEATURES / f / "Page.tsx").read_text().splitlines())
        print(f"  {f}: {n}")


if __name__ == "__main__":
    main()
