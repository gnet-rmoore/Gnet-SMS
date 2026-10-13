export type ApiDocMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiDocEndpoint = {
  method: ApiDocMethod;
  /** Path template; `:schoolId` is replaced at render time. */
  path: string;
  /** i18n key under pages:apiDocs.endpoints.* */
  summaryKey: string;
  /** Whether a read-only school API key may call this route (GET only). */
  apiKeyGet?: boolean;
  /** Default values for other `:param` segments when testing live. */
  pathParams?: Record<string, string>;
  /** Suggested query string for the live console. */
  defaultQuery?: string;
};

export type ApiDocSection = {
  id: string;
  /** i18n key under pages:apiDocs.sections.* */
  titleKey: string;
  descriptionKey: string;
  endpoints: ApiDocEndpoint[];
};

/** Curated school-tenant routes for integrators. */
export const SCHOOL_API_DOC_SECTIONS: ApiDocSection[] = [
  {
    id: "school",
    titleKey: "school.title",
    descriptionKey: "school.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId", summaryKey: "schoolProfile", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/stats", summaryKey: "schoolStats", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/entitlements", summaryKey: "entitlements", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/subscription", summaryKey: "subscription", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/admission-policy", summaryKey: "admissionPolicy", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/api-keys", summaryKey: "apiKeysList", apiKeyGet: false },
      { method: "GET", path: "/api/schools/:schoolId/role-audit", summaryKey: "roleAudit", apiKeyGet: false },
      { method: "GET", path: "/api/schools/:schoolId/role-capabilities", summaryKey: "roleCapabilities", apiKeyGet: false },
    ],
  },
  {
    id: "people",
    titleKey: "people.title",
    descriptionKey: "people.description",
    endpoints: [
      {
        method: "GET",
        path: "/api/schools/:schoolId/students",
        summaryKey: "students",
        apiKeyGet: true,
        defaultQuery: "limit=10&offset=0",
      },
      {
        method: "GET",
        path: "/api/schools/:schoolId/staff",
        summaryKey: "staff",
        apiKeyGet: true,
        defaultQuery: "limit=10&offset=0",
      },
      {
        method: "GET",
        path: "/api/schools/:schoolId/users",
        summaryKey: "users",
        apiKeyGet: false,
        defaultQuery: "limit=10&offset=0",
      },
      { method: "GET", path: "/api/schools/:schoolId/guide-stats", summaryKey: "guideStats", apiKeyGet: false },
    ],
  },
  {
    id: "admissions",
    titleKey: "admissions.title",
    descriptionKey: "admissions.description",
    endpoints: [
      {
        method: "GET",
        path: "/api/schools/:schoolId/applications",
        summaryKey: "applications",
        apiKeyGet: false,
        defaultQuery: "limit=20&offset=0",
      },
      { method: "GET", path: "/api/schools/:schoolId/applications/funnel", summaryKey: "applicationsFunnel", apiKeyGet: false },
    ],
  },
  {
    id: "attendance",
    titleKey: "attendance.title",
    descriptionKey: "attendance.description",
    endpoints: [
      {
        method: "GET",
        path: "/api/schools/:schoolId/attendance",
        summaryKey: "studentAttendance",
        apiKeyGet: true,
        defaultQuery: "date=2026-01-15",
      },
      { method: "GET", path: "/api/schools/:schoolId/attendance/stats", summaryKey: "attendanceStats", apiKeyGet: true },
      {
        method: "GET",
        path: "/api/schools/:schoolId/staff-attendance",
        summaryKey: "staffAttendance",
        apiKeyGet: true,
        defaultQuery: "date=2026-01-15",
      },
      { method: "GET", path: "/api/schools/:schoolId/staff-attendance/summary", summaryKey: "attendanceSummary", apiKeyGet: true },
    ],
  },
  {
    id: "academics",
    titleKey: "academics.title",
    descriptionKey: "academics.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/classrooms", summaryKey: "classrooms", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/classrooms/offering-pairs", summaryKey: "classroomOfferingPairs", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/grade-levels", summaryKey: "gradeLevels", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/divisions", summaryKey: "divisions", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/subjects", summaryKey: "subjects", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/subject-offerings", summaryKey: "subjectOfferings", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/syllabi", summaryKey: "syllabi", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/lesson-plans", summaryKey: "lessonPlans", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/lesson-plan-templates", summaryKey: "lessonPlanTemplates", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/exams", summaryKey: "exams", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/calendar", summaryKey: "calendar", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/calendar/templates", summaryKey: "calendarTemplates", apiKeyGet: true },
      {
        method: "GET",
        path: "/api/schools/:schoolId/calendar/instructional-days",
        summaryKey: "instructionalDays",
        apiKeyGet: true,
      },
      { method: "GET", path: "/api/schools/:schoolId/grade-legends", summaryKey: "gradeLegends", apiKeyGet: true },
    ],
  },
  {
    id: "grades",
    titleKey: "grades.title",
    descriptionKey: "grades.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/grades/pending", summaryKey: "gradesPending", apiKeyGet: true },
      {
        method: "GET",
        path: "/api/schools/:schoolId/gradebook/component-grades",
        summaryKey: "componentGrades",
        apiKeyGet: true,
      },
      {
        method: "GET",
        path: "/api/schools/:schoolId/gradebook/assessment-grades",
        summaryKey: "assessmentGrades",
        apiKeyGet: true,
      },
      { method: "GET", path: "/api/schools/:schoolId/online-exams", summaryKey: "onlineExams", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/exam-papers/pending", summaryKey: "examPapersPending", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/promotion/census", summaryKey: "promotionCensus", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/promotion/runs", summaryKey: "promotionRuns", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/promotion/statement", summaryKey: "promotionStatement", apiKeyGet: true },
      {
        method: "GET",
        path: "/api/exams/:examId",
        summaryKey: "examDetail",
        apiKeyGet: true,
        pathParams: { examId: ":examId" },
      },
      {
        method: "GET",
        path: "/api/exams/:examId/grades",
        summaryKey: "examGrades",
        apiKeyGet: true,
        pathParams: { examId: ":examId" },
      },
    ],
  },
  {
    id: "scheduling",
    titleKey: "scheduling.title",
    descriptionKey: "scheduling.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/bell-schedules", summaryKey: "bellSchedules", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/timetable", summaryKey: "timetable", apiKeyGet: true },
    ],
  },
  {
    id: "finance",
    titleKey: "finance.title",
    descriptionKey: "finance.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/fee-templates", summaryKey: "feeTemplates", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/fees", summaryKey: "fees", apiKeyGet: true, defaultQuery: "limit=10" },
      { method: "GET", path: "/api/schools/:schoolId/fee-billing-settings", summaryKey: "feeBillingSettings", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/fee-payment-txns", summaryKey: "feePaymentTxns", apiKeyGet: true, defaultQuery: "limit=20" },
      { method: "GET", path: "/api/schools/:schoolId/expenses", summaryKey: "expenses", apiKeyGet: true, defaultQuery: "limit=20" },
      { method: "GET", path: "/api/schools/:schoolId/finance/summary", summaryKey: "financeSummary", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/receipts", summaryKey: "receipts", apiKeyGet: true, defaultQuery: "limit=20" },
    ],
  },
  {
    id: "hr",
    titleKey: "hr.title",
    descriptionKey: "hr.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/leave-requests", summaryKey: "leaveRequests", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/leave-balances", summaryKey: "leaveBalances", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/leave-policies", summaryKey: "leavePolicies", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/staff-tasks", summaryKey: "staffTasks", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/payrolls", summaryKey: "payrolls", apiKeyGet: true },
    ],
  },
  {
    id: "campus",
    titleKey: "campus.title",
    descriptionKey: "campus.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/my-campus", summaryKey: "myCampus", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/library/items", summaryKey: "libraryItems", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/library/loans", summaryKey: "libraryLoans", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/clinic/visits", summaryKey: "clinicVisits", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/counseling/sessions", summaryKey: "counselingSessions", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/athletics/teams", summaryKey: "athleticsTeams", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/hostel/buildings", summaryKey: "hostelBuildings", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/hostel/assignments", summaryKey: "hostelAssignments", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/cafeteria/menus", summaryKey: "cafeteriaMenus", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/cafeteria/meal-counts", summaryKey: "cafeteriaMealCounts", apiKeyGet: true },
    ],
  },
  {
    id: "operations",
    titleKey: "operations.title",
    descriptionKey: "operations.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/documents", summaryKey: "documents", apiKeyGet: true, defaultQuery: "limit=10" },
      { method: "GET", path: "/api/schools/:schoolId/announcements", summaryKey: "announcements", apiKeyGet: true, defaultQuery: "limit=10" },
      { method: "GET", path: "/api/schools/:schoolId/notification-preferences", summaryKey: "notificationPreferences", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/pta", summaryKey: "pta", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/pta/meetings", summaryKey: "ptaMeetings", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/pta/campaigns", summaryKey: "ptaCampaigns", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/pta/volunteers", summaryKey: "ptaVolunteers", apiKeyGet: true },
    ],
  },
  {
    id: "logistics",
    titleKey: "logistics.title",
    descriptionKey: "logistics.description",
    endpoints: [
      { method: "GET", path: "/api/schools/:schoolId/security-logs", summaryKey: "securityLogs", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/vehicles", summaryKey: "vehicles", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/transport/routes", summaryKey: "transportRoutes", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/work-orders", summaryKey: "workOrders", apiKeyGet: true },
      { method: "GET", path: "/api/schools/:schoolId/inventory", summaryKey: "inventory", apiKeyGet: true },
    ],
  },
];

export function resolveSchoolApiPath(
  template: string,
  schoolId: string,
  pathParams?: Record<string, string>
): string {
  let path = template.replace(":schoolId", schoolId || ":schoolId");
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`:${key}`, value);
    }
  }
  return path;
}

export function hasUnresolvedPathParams(path: string): boolean {
  return /:[A-Za-z][A-Za-z0-9_]*/.test(path);
}
