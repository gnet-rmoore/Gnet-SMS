/**
 * Shared React Query keys and helpers for school features.
 */
export const queryKeys = {
  school: (schoolId: string) => ["school", schoolId] as const,
  students: (schoolId: string) => ["students", schoolId] as const,
  staff: (schoolId: string) => ["staff", schoolId] as const,
  fees: (schoolId: string) => ["fees", schoolId] as const,
  expenses: (schoolId: string) => ["expenses", schoolId] as const,
  payrolls: (schoolId: string) => ["payrolls", schoolId] as const,
  exams: (schoolId: string) => ["exams", schoolId] as const,
  attendance: (schoolId: string) => ["attendance", schoolId] as const,
  classrooms: (schoolId: string) => ["classrooms", schoolId] as const,
  calendarEvents: (schoolId: string) => ["calendar-events", schoolId] as const,
  announcements: (schoolId: string) => ["announcements", schoolId] as const,
  documents: (schoolId: string) => ["documents", schoolId] as const,
  registrar: (schoolId: string) => ["registrar", schoolId] as const,
  curriculum: (schoolId: string) => ["curriculum", schoolId] as const,
  admissions: (schoolId: string) => ["admissions", schoolId] as const,
  maintenance: (schoolId: string) => ["maintenance", schoolId] as const,
  security: (schoolId: string) => ["security", schoolId] as const,
  workOrders: (schoolId: string) => ["work-orders", schoolId] as const,
  dashboard: (schoolId: string) => ["dashboard", schoolId] as const,
  academicCalendar: (schoolId: string) => ["academic-calendar", schoolId] as const,
  settings: (schoolId: string) => ["settings", schoolId] as const,
  staffPortal: (schoolId: string, tab: string) =>
    ["staff-portal", schoolId, tab] as const,
};
