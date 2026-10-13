#!/usr/bin/env python3
"""Phase 6 god-page splitter: api.ts, hooks, component extracts, Page wiring."""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ROOT / "src" / "features"


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)} ({len(content.splitlines())} lines)")


def camel(s: str) -> str:
    parts = s.replace("_", "-").split("-")
    return parts[0] + "".join(p.title() for p in parts[1:])


def pascal(s: str) -> str:
    c = camel(s)
    return c[0].upper() + c[1:]


def extract_slice(lines: list[str], start: int, end: int, strip_cond: bool = True) -> str:
    body = "\n".join(lines[start - 1 : end])
    if strip_cond:
        body = re.sub(r"^\s*\{[^{}\n]+&&\s*\(\s*\n", "", body)
        body = re.sub(r"\n\s*\)\}\s*$", "", body)
    return body


def collect_page_idents(page: str) -> set[str]:
    idents: set[str] = set()
    for m in re.finditer(r"const\s+\[(\w+),\s*(set\w+)\]", page):
        idents.add(m.group(1))
        idents.add(m.group(2))
    for m in re.finditer(
        r"const\s+(handle\w+|fetch\w+|load\w+|open\w+|parse\w+|save\w+|close\w+|toggle\w+|get\w+|is\w+)\s*=",
        page,
    ):
        idents.add(m.group(1))
    for m in re.finditer(r"const\s+\{([^}]+)\}\s*=\s*useAuthStore", page):
        for part in m.group(1).split(","):
            name = part.strip().split(":")[0].strip()
            if name:
                idents.add(name)
    idents.update(
        [
            "format",
            "school",
            "user",
            "accessToken",
            "CATEGORY_COLORS",
            "DEFAULT_BUDGETS",
            "filteredStudents",
            "filteredApplications",
            "stats",
        ]
    )
    return idents


def guess_props(body: str, page_idents: set[str], page: str) -> tuple[list[str], list[str]]:
    used: set[str] = set()
    for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", body):
        w = m.group(1)
        if w in page_idents:
            used.add(w)
        if re.match(r"^[A-Z]", w) and (
            f"<{w}" in body or f"{w} className" in body or f"{w} size" in body
        ):
            used.add(w)
    if "format(" in body:
        used.add("format")

    skip = {
        "true",
        "false",
        "null",
        "undefined",
        "String",
        "Number",
        "Date",
        "JSON",
        "Math",
        "Object",
        "Array",
        "Promise",
        "Error",
        "console",
        "window",
        "localStorage",
        "document",
        "React",
        "div",
        "span",
        "button",
        "form",
        "input",
        "select",
        "option",
        "textarea",
        "label",
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "table",
        "thead",
        "tbody",
        "tr",
        "td",
        "th",
        "ul",
        "li",
        "img",
        "section",
        "nav",
        "main",
        "header",
        "footer",
    }
    props = sorted(w for w in used if w not in skip)

    lucide_m = re.search(r"import\s*\{([^}]+)\}\s*from\s*[\"']lucide-react[\"']", page)
    all_lucide = [x.strip() for x in lucide_m.group(1).split(",")] if lucide_m else []
    lucide_used = [i for i in all_lucide if i and i in body]
    return props, lucide_used


def write_component(
    feature: str,
    name: str,
    start: int,
    end: int,
    strip_cond: bool = True,
) -> dict:
    page_path = FEATURES / feature / "Page.tsx"
    page = page_path.read_text(encoding="utf-8")
    lines = page.splitlines()
    body = extract_slice(lines, start, end, strip_cond=strip_cond)
    page_idents = collect_page_idents(page)
    props, lucide_used = guess_props(body, page_idents, page)

    local = set(lucide_used)
    needs_format = "format(" in body
    needs_motion = "motion." in body
    needs_animate = "AnimatePresence" in body
    if needs_format:
        local.add("format")
    if needs_motion:
        local.add("motion")
    if needs_animate:
        local.add("AnimatePresence")

    prop_names = [p for p in props if p not in local]

    imports = ["import React from \"react\";"]
    if lucide_used:
        imports.append(
            "import {\n  " + ",\n  ".join(lucide_used) + "\n} from \"lucide-react\";"
        )
    if needs_format:
        imports.append("import { format } from \"date-fns\";")
    if needs_motion or needs_animate:
        parts = []
        if needs_motion:
            parts.append("motion")
        if needs_animate:
            parts.append("AnimatePresence")
        imports.append(f"import {{ {', '.join(parts)} }} from \"motion/react\";")

    indented = "\n".join("    " + l if l else "" for l in body.splitlines())
    content = (
        "\n".join(imports)
        + f"""

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
    )
    out = FEATURES / feature / "components" / f"{name}.tsx"
    write_text(out, content)
    return {"name": name, "start": start, "end": end, "props": prop_names}


def write_api(feature: str, fns: list[dict]) -> None:
    lines = [
        'import { api } from "../../services/api";',
        "",
        f"/** Thin API wrappers for the {feature} feature. */",
        f"export const {camel(feature)}Api = {{",
    ]
    for fn in fns:
        args = fn["args"]
        method = fn["method"]
        path_expr = fn["path"]
        name = fn["name"]
        if method == "get":
            lines.append(f"  {name}: ({args}) => api.get({path_expr}),")
        elif method == "delete":
            lines.append(f"  {name}: ({args}) => api.delete({path_expr}),")
        else:
            lines.append(
                f"  {name}: ({args}) => api.{method}({path_expr}, data),"
            )
    lines.append("};")
    lines.append("")
    write_text(FEATURES / feature / "api.ts", "\n".join(lines))


def write_hook(
    feature: str,
    hook_name: str,
    fetches: list[tuple[str, str]],
    non_array: set[str] | None = None,
) -> None:
    non_array = non_array or set()
    api_name = f"{camel(feature)}Api"
    keys = [k for k, _ in fetches]
    fetch_lines = ",\n".join(
        f"        {api_name}.{method}(schoolId)" for _, method in fetches
    )
    return_defaults = []
    for k in keys:
        if k in non_array:
            return_defaults.append(f"    {k}: query.data?.{k} ?? null,")
        else:
            return_defaults.append(f"    {k}: query.data?.{k} ?? [],")

    normalize = []
    for k in keys:
        if k in non_array:
            normalize.append(f"        {k},")
        else:
            normalize.append(
                f"        {k}: Array.isArray({k}) ? {k} : [],"
            )

    content = f"""import {{ useQuery, useQueryClient }} from "@tanstack/react-query";
import {{ useAuthStore }} from "../../../store/authStore";
import {{ {api_name} }} from "../api";

export function {hook_name}() {{
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
{chr(10).join(normalize)}
      }};
    }},
  }});

  const invalidate = () =>
    queryClient.invalidateQueries({{ queryKey: ["{feature}", schoolId] }});

  return {{
    ...query,
{chr(10).join(return_defaults)}
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  }};
}}
"""
    write_text(FEATURES / feature / "hooks" / f"{hook_name}.ts", content)


def replace_range(lines: list[str], start: int, end: int, replacement: list[str]) -> list[str]:
    return lines[: start - 1] + replacement + lines[end:]


def insert_after_imports(lines: list[str], extra: list[str]) -> list[str]:
    last = 0
    for i, l in enumerate(lines):
        if l.startswith("import "):
            last = i
    # skip blank lines after imports
    return lines[: last + 1] + extra + lines[last + 1 :]


def patch_page_extracts(
    feature: str,
    extracts: list[dict],
    hook_name: str | None = None,
    data_keys: list[str] | None = None,
) -> None:
    page_path = FEATURES / feature / "Page.tsx"
    lines = read_lines(page_path)
    src = "\n".join(lines)

    extras: list[str] = []
    if hook_name and hook_name not in src:
        extras.append(f'import {{ {hook_name} }} from "./hooks/{hook_name}";')
    for e in extracts:
        if f'from "./components/{e["name"]}"' not in src:
            extras.append(f'import {{ {e["name"]} }} from "./components/{e["name"]}";')
    if extras:
        lines = insert_after_imports(lines, extras)

    # Replace extracts bottom-up
    for e in sorted(extracts, key=lambda x: -x["start"]):
        # Adjust line numbers if we inserted imports
        offset = len(extras)
        start = e["start"] + offset
        end = e["end"] + offset
        props = e["props"]
        prop_lines = [f"        {p}={{{p}}}" for p in props]
        # Keep outer condition if present in original first line
        orig_first = read_lines(page_path)[e["start"] - 1]  # original without offset
        # Re-read carefully: after import insert, original content shifted
        block_first = lines[start - 1] if start - 1 < len(lines) else ""
        cond_m = re.match(r"^(\s*)\{(.+&&)\s*\(\s*$", block_first)
        if cond_m:
            ind = cond_m.group(1)
            cond = cond_m.group(2)
            replacement = (
                [f"{ind}{{{cond} ("]
                + [f"{ind}  <{e['name']}"]
                + [f"{ind}  {p}" for p in [f"{p}={{{p}}}" for p in props]]
                + [f"{ind}  />", ind + ")}"]
            )
        else:
            ind = "      "
            replacement = (
                [f"{ind}<{e['name']}"]
                + [f"{ind}  {p}={{{p}}}" for p in props]
                + [f"{ind}/>"]
            )
        lines = replace_range(lines, start, end, replacement)

    # Wire hook for primary data if requested
    if hook_name and data_keys:
        text = "\n".join(lines)
        # Insert hook call near top of component after useAuthStore
        if f"{hook_name}()" not in text:
            m = re.search(
                r"(const \{[^}]+\} = useAuthStore\(\);?\n)",
                text,
            )
            if m:
                destructure = ", ".join(data_keys)
                insert = (
                    f"{m.group(1)}"
                    f"  const {{ {destructure}, loading, invalidate: refetchRegistrarData, refetchAll }} = {hook_name}();\n"
                )
                # Use feature-specific name
                insert = insert.replace(
                    "refetchRegistrarData",
                    f"refetch{pascal(feature)}Data",
                )
                text = text[: m.start()] + insert + text[m.end() :]
                lines = text.splitlines()

    page_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"patched {page_path.relative_to(ROOT)}")


# ── Feature configs ──────────────────────────────────────────────

CONFIGS = {
    "registrar": {
        "hook": "useRegistrarQuery",
        "data_keys": ["students", "applications", "gradeLevels", "classrooms"],
        "api": [
            {"name": "fetchStudents", "method": "get", "args": "schoolId: string", "path": "`/api/schools/${schoolId}/students`"},
            {"name": "fetchApplications", "method": "get", "args": "schoolId: string", "path": "`/api/schools/${schoolId}/applications`"},
            {"name": "fetchGradeLevels", "method": "get", "args": "schoolId: string", "path": "`/api/schools/${schoolId}/grade-levels`"},
            {"name": "fetchClassrooms", "method": "get", "args": "schoolId: string", "path": "`/api/schools/${schoolId}/classrooms`"},
            {"name": "fetchClassroomMembers", "method": "get", "args": "classroomId: string", "path": "`/api/classrooms/${classroomId}/members`"},
            {"name": "updateUser", "method": "patch", "args": "userId: string, data: unknown", "path": "`/api/users/${userId}`"},
            {"name": "deleteUser", "method": "delete", "args": "userId: string", "path": "`/api/users/${userId}`"},
            {"name": "updateApplication", "method": "patch", "args": "applicationId: string, data: unknown", "path": "`/api/applications/${applicationId}`"},
            {"name": "createApplication", "method": "post", "args": "schoolId: string, data: unknown", "path": "`/api/schools/${schoolId}/applications`"},
            {"name": "addClassroomMember", "method": "post", "args": "classroomId: string, data: unknown", "path": "`/api/classrooms/${classroomId}/members`"},
            {"name": "removeClassroomMember", "method": "delete", "args": "classroomId: string, userId: string", "path": "`/api/classrooms/${classroomId}/members/${userId}`"},
        ],
        "fetches": [
            ("students", "fetchStudents"),
            ("applications", "fetchApplications"),
            ("gradeLevels", "fetchGradeLevels"),
            ("classrooms", "fetchClassrooms"),
        ],
        "extracts": [
            ("EditStudentModal", 2149, 2294),
            ("ApplicationReviewModal", 2298, 2522),
            ("StudentDossierModal", 2525, 3028),
        ],
    },
}


def scaffold_feature(feature: str, cfg: dict, patch: bool = True) -> None:
    print(f"\n=== {feature} ===")
    write_api(feature, cfg["api"])
    write_hook(
        feature,
        cfg["hook"],
        cfg["fetches"],
        set(cfg.get("non_array", [])),
    )
    extracts_meta = []
    for name, start, end in cfg["extracts"]:
        meta = write_component(feature, name, start, end, strip_cond=True)
        extracts_meta.append(meta)
    if patch:
        patch_page_extracts(
            feature,
            extracts_meta,
            hook_name=cfg["hook"],
            data_keys=cfg["data_keys"],
        )


def main():
    targets = sys.argv[1:] or list(CONFIGS.keys())
    for t in targets:
        if t not in CONFIGS:
            print(f"skip unknown: {t}")
            continue
        scaffold_feature(t, CONFIGS[t], patch=True)


if __name__ == "__main__":
    main()
