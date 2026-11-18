export type GradeSheetTemplateDefinition = {
  pageSize: "a4" | "legal";
};

const TEMPLATE_DEFINITIONS: Record<string, GradeSheetTemplateDefinition> = {
  TEMPLATE_1: { pageSize: "a4" },
  TEMPLATE_2: { pageSize: "a4" },
  INTL_STANDARD_TERM: { pageSize: "a4" },
  INTL_EXECUTIVE: { pageSize: "a4" },
};

export function resolveGradeSheetTemplateKey(value: unknown): string {
  const key = String(value ?? "TEMPLATE_1")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");
  return Object.prototype.hasOwnProperty.call(TEMPLATE_DEFINITIONS, key)
    ? key
    : "TEMPLATE_1";
}

export function getGradeSheetTemplateDef(value: unknown): GradeSheetTemplateDefinition {
  return TEMPLATE_DEFINITIONS[resolveGradeSheetTemplateKey(value)];
}
