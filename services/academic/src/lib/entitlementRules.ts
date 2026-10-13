import type { EntitlementRule } from "./entitlements";

export const ACADEMIC_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/calendar/, feature: "calendar" },
  {
    pattern: /^\/api\/schools\/[^/]+\/(subjects|subject-offerings|grade-levels|divisions|syllabi|grade-legends)/,
    feature: "curriculum",
  },
  { pattern: /^\/api\/(subjects|subject-offerings|grade-levels|divisions|syllabi|exam-components|periods)/, feature: "curriculum" },
  { pattern: /^\/api\/schools\/[^/]+\/lesson-plans/, feature: "lesson_plans" },
  { pattern: /^\/api\/lesson-plans/, feature: "lesson_plans" },
  { pattern: /^\/api\/lesson-plan-templates/, feature: "lesson_plans" },
  { pattern: /^\/api\/schools\/[^/]+\/(bell-schedules|timetable)/, feature: "schedules" },
  { pattern: /^\/api\/(bell-schedules|timetable-entries)/, feature: "schedules" },
  { pattern: /^\/api\/schools\/[^/]+\/exams/, feature: "exams" },
  { pattern: /^\/api\/exams/, feature: "exams" },
  { pattern: /^\/api\/schools\/[^/]+\/online-exams/, feature: "online_exams" },
  { pattern: /^\/api\/(online-exams|exam-attempts)/, feature: "online_exams" },
  { pattern: /^\/api\/exam-papers/, feature: "exam_paper" },
  { pattern: /^\/api\/schools\/[^/]+\/gradebook/, feature: "gradebook" },
  { pattern: /^\/api\/schools\/[^/]+\/grades/, feature: "gradebook" },
  { pattern: /^\/api\/(grade-entries|students\/[^/]+\/grades)/, feature: "gradebook" },
  { pattern: /^\/api\/schools\/[^/]+\/grade-review/, feature: "grade_review" },
  { pattern: /^\/api\/schools\/[^/]+\/grade-access/, feature: "grade_review" },
  { pattern: /^\/api\/schools\/[^/]+\/promotion/, feature: "enrollment" },
  { pattern: /^\/api\/schools\/[^/]+\/(academic-years|year-transition)/, feature: "enrollment" },
  { pattern: /^\/api\/schools\/[^/]+\/report-cards/, feature: "report_cards" },
  { pattern: /^\/api\/report-cards/, feature: "report_cards" },
];
