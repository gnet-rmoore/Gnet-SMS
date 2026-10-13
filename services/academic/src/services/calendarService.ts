import prisma from "../lib/prisma";
import { eachYmd, isWeekendYmd, NON_INSTRUCTION_CATEGORIES } from "../lib/schoolDay";
import { getSchoolLocality } from "../lib/identityClient";
import { getHolidaysForRange, type HolidayDay } from "../lib/holidayProvider";
import { normalizeCountryCode } from "../lib/countryCode";

type CalendarUser = {
  id: string;
  schoolId: string;
  role: string;
};

export type CalendarEventDto = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  category: string;
  location: string;
  priority: string;
  actionLabel?: string;
  actionPath?: string;
  isCustom: boolean;
  /** Markers for informational (non-curriculum) entries, e.g. "holiday" */
  source?: string;
  /** Locality of a system holiday entry: national | regional | international */
  holidayLocality?: string;
  /** True when holiday display is toggled within the calendar UI */
  holidayHidden?: boolean;
};

export type CreateCalendarEventInput = {
  title: string;
  description?: string;
  date: string;
  time?: string;
  category?: string;
  location?: string;
  priority?: string;
};

const WRITE_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "TEACHER",
  "ACCOUNTANT",
  "IT_ADMIN",
]);

function mapCustom(row: {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  category: string;
  location: string;
  priority: string;
}): CalendarEventDto {
  const isAttendance = row.category === "Attendance";
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    category: row.category,
    location: row.location,
    priority: row.priority,
    ...(isAttendance
      ? { actionLabel: "Open attendance", actionPath: "attendance" }
      : {}),
    isCustom: true,
  };
}

function isoDay(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatTimeRange(start?: Date | null, end?: Date | null): string {
  if (!start && !end) return "All Day";
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (start && end) return `${fmt(new Date(start))} – ${fmt(new Date(end))}`;
  if (start) return fmt(new Date(start));
  return "All Day";
}

function toHolidayEvent(h: HolidayDay): CalendarEventDto {
  const localityLabel =
    h.locality === "international"
      ? "International day"
      : h.locality === "regional"
        ? "Regional holiday"
        : "Public holiday";
  return {
    id: `system:holiday:${h.date}:${h.name}`,
    title: h.name,
    description: `${localityLabel} · display only — does not block classes, attendance, or payroll.`,
    date: h.date,
    time: "All Day",
    category: "Holiday",
    location: "",
    priority: "low",
    isCustom: false,
    source: "holiday",
    holidayLocality: h.locality,
  };
}

export const calendarService = {
  canWrite(role: string) {
    return WRITE_ROLES.has(role);
  },

  async getCalendarEvents(
    user: CalendarUser,
    opts?: { from?: string; to?: string; studentId?: string }
  ): Promise<CalendarEventDto[]> {
    const { schoolId } = user;
    const events: CalendarEventDto[] = [];

    const today = new Date();
    const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const defaultTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0));
    const from =
      opts?.from && /^\d{4}-\d{2}-\d{2}$/.test(opts.from)
        ? opts.from
        : defaultFrom.toISOString().slice(0, 10);
    const to =
      opts?.to && /^\d{4}-\d{2}-\d{2}$/.test(opts.to)
        ? opts.to
        : defaultTo.toISOString().slice(0, 10);

    const custom = await prisma.schoolCalendarEvent.findMany({
      where: { schoolId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    custom.forEach((row) => events.push(mapCustom(row)));

    try {
      const pattern = await prisma.academicCalendarPattern.findFirst({
        where: { schoolId, isActive: true },
        include: {
          periods: {
            orderBy: { orderIndex: "asc" },
            include: {
              examComponents: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      });

      for (const period of pattern?.periods ?? []) {
        const start = isoDay(period.startDate);
        const end = isoDay(period.endDate);
        if (start) {
          events.push({
            id: `period-start-${period.id}`,
            title: `${period.label} starts`,
            description: `${period.label} (${period.shortCode}) begins.`,
            date: start,
            time: "All Day",
            category: "Academic",
            location: "",
            priority: "medium",
            actionLabel: "Academic calendar",
            actionPath: "settings/academic-calendar",
            isCustom: false,
          });
        }
        if (end && end !== start) {
          events.push({
            id: `period-end-${period.id}`,
            title: `${period.label} ends`,
            description: `${period.label} (${period.shortCode}) ends.`,
            date: end,
            time: "All Day",
            category: "Academic",
            location: "",
            priority: "medium",
            actionLabel: "Academic calendar",
            actionPath: "settings/academic-calendar",
            isCustom: false,
          });
        }

        for (const component of period.examComponents) {
          if (!component.examStartDate) continue;
          const examDay = isoDay(component.examStartDate);
          if (!examDay) continue;
          const endDay = component.examEndDate ? isoDay(component.examEndDate) : examDay;
          const deadline = component.gradeSubmissionDeadline
            ? new Date(component.gradeSubmissionDeadline).toLocaleDateString()
            : null;
          events.push({
            id: `component-${component.id}`,
            title: `${period.shortCode}: ${component.label}`,
            description: [
              `Planned assessment window from Academic Calendar.`,
              endDay && endDay !== examDay ? `Ends ${endDay}.` : null,
              deadline ? `Grade deadline: ${deadline}.` : null,
            ]
              .filter(Boolean)
              .join(" "),
            date: examDay,
            time: formatTimeRange(component.examStartDate, component.examEndDate),
            category: "Academic",
            location: "",
            priority: "high",
            actionLabel: "Schedule exam",
            actionPath: "exams",
            isCustom: false,
          });

          if (component.gradeSubmissionDeadline) {
            const deadlineDay = isoDay(component.gradeSubmissionDeadline);
            if (deadlineDay && deadlineDay !== examDay) {
              events.push({
                id: `component-deadline-${component.id}`,
                title: `Grades due: ${component.label}`,
                description: `Grade submission deadline for ${period.label} — ${component.label}.`,
                date: deadlineDay,
                time: formatTimeRange(component.gradeSubmissionDeadline, null),
                category: "Academic",
                location: "",
                priority: "medium",
                actionLabel: "Academic calendar",
                actionPath: "settings/academic-calendar",
                isCustom: false,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not query academic calendar for school calendar:", err);
    }

    try {
      const exams = await prisma.exam.findMany({ where: { schoolId } });
      exams.forEach((exam) => {
        const startIso = new Date(exam.startDate).toISOString();
        const endIso = new Date(exam.endDate).toISOString();
        events.push({
          id: `exam-${exam.id}`,
          title: `Exam: ${exam.title}`,
          description: [
            `Scheduled assessment.`,
            `Grade deadline: ${new Date(exam.gradeSubmissionDeadline).toLocaleDateString()}.`,
            `Status: ${exam.status}.`,
            exam.examComponentId ? "Linked to Academic Calendar component." : null,
          ]
            .filter(Boolean)
            .join(" "),
          date: startIso.split("T")[0],
          time: formatTimeRange(startIso, endIso),
          category: "Academic",
          location: "",
          priority: "high",
          actionLabel: "Open exam",
          actionPath: `exams/${exam.id}`,
          isCustom: false,
        });
      });
    } catch (err) {
      console.warn("Could not query exams for calendar:", err);
    }

    try {
      const { scheduleService } = await import("./scheduleService");
      const classEvents = await scheduleService.expandForCalendar(user, from, to, {
        studentId: opts?.studentId,
      });
      classEvents.forEach((ev) => events.push(ev));
    } catch (err) {
      console.warn("Could not expand class schedule for calendar:", err);
    }

    try {
      const locality = await getSchoolLocality(schoolId);
      const countryCode = locality?.country ? normalizeCountryCode(locality.country) : null;
      const enabled = locality?.holidayEnabled !== false && countryCode !== null;
      if (enabled) {
        const types = locality?.holidayTypes && locality.holidayTypes.length
          ? new Set(locality.holidayTypes)
          : null;
        const holidays = getHolidaysForRange({
          country: countryCode as string,
          region: locality?.region,
          from,
          to,
        });
        for (const h of holidays) {
          if (types && !types.has(h.locality) && !types.has(h.type)) {
            continue;
          }
          events.push(toHolidayEvent(h));
        }
        events.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)));
      }
    } catch (err) {
      console.warn("Could not load holidays for calendar:", err);
    }

    return events;
  },

  async createEvent(user: CalendarUser, input: CreateCalendarEventInput) {
    if (!this.canWrite(user.role)) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (!input.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date || "")) {
      const err: any = new Error("Title and a valid date (YYYY-MM-DD) are required");
      err.status = 400;
      throw err;
    }

    const row = await prisma.schoolCalendarEvent.create({
      data: {
        schoolId: user.schoolId,
        title: input.title.trim(),
        description: (input.description || "").trim(),
        date: input.date,
        time: (input.time || "All Day").trim(),
        category: input.category || "Other",
        location: (input.location || "").trim(),
        priority: input.priority || "medium",
        createdById: user.id,
      },
    });
    return mapCustom(row);
  },

  async updateEvent(
    user: CalendarUser,
    eventId: string,
    input: Partial<CreateCalendarEventInput>
  ) {
    if (!this.canWrite(user.role)) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    const existing = await prisma.schoolCalendarEvent.findFirst({
      where: { id: eventId, schoolId: user.schoolId },
    });
    if (!existing) {
      const err: any = new Error("Event not found");
      err.status = 404;
      throw err;
    }

    if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      const err: any = new Error("Invalid date (YYYY-MM-DD)");
      err.status = 400;
      throw err;
    }

    const row = await prisma.schoolCalendarEvent.update({
      where: { id: eventId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.time !== undefined ? { time: input.time.trim() } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.location !== undefined ? { location: input.location.trim() } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
    });
    return mapCustom(row);
  },

  async deleteEvent(user: CalendarUser, eventId: string) {
    if (!this.canWrite(user.role)) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    const existing = await prisma.schoolCalendarEvent.findFirst({
      where: { id: eventId, schoolId: user.schoolId },
    });
    if (!existing) {
      const err: any = new Error("Event not found");
      err.status = 404;
      throw err;
    }

    await prisma.schoolCalendarEvent.delete({ where: { id: eventId } });
    return { ok: true };
  },
  async checkInstructionalDay(schoolId: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const err: any = new Error("date must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    if (isWeekendYmd(date)) {
      return { date, instructional: false, reason: "weekend" as const, title: null as string | null };
    }
    const block = await prisma.schoolCalendarEvent.findFirst({
      where: { schoolId, date, category: { in: [...NON_INSTRUCTION_CATEGORIES] } },
      orderBy: { createdAt: "asc" },
    });
    if (block) {
      return { date, instructional: false, reason: "holiday" as const, title: block.title };
    }
    return { date, instructional: true, reason: null as null, title: null as string | null };
  },

  async getInstructionalDays(schoolId: string, from: string, to: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const err: any = new Error("from and to must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    const days = eachYmd(from, to);
    const blocks = await prisma.schoolCalendarEvent.findMany({
      where: {
        schoolId,
        date: { gte: from, lte: to },
        category: { in: [...NON_INSTRUCTION_CATEGORIES] },
      },
      select: { date: true, title: true, category: true },
    });
    const blockByDate = new Map(blocks.map((b) => [b.date, b]));
    return days.map((date) => {
      if (isWeekendYmd(date)) {
        return { date, instructional: false, reason: "weekend" as const, title: null };
      }
      const block = blockByDate.get(date);
      if (block) {
        return { date, instructional: false, reason: "holiday" as const, title: block.title };
      }
      return { date, instructional: true, reason: null, title: null };
    });
  },

  async upsertAttendanceEvent(input: {
    schoolId: string;
    attendanceId: string;
    classroomName: string;
    date: string;
    presentCount: number;
    absentCount: number;
    createdById?: string;
  }) {
    const sourceKey = `attendance:${input.attendanceId}`;
    const title = `Roll call: ${input.classroomName}`;
    const description = `Present/late ${input.presentCount} · Absent ${input.absentCount}`;
    const existing = await prisma.schoolCalendarEvent.findFirst({
      where: { schoolId: input.schoolId, sourceKey },
    });
    if (existing) {
      const row = await prisma.schoolCalendarEvent.update({
        where: { id: existing.id },
        data: { title, description, date: input.date, category: "Attendance", time: "All Day", priority: "low" },
      });
      return mapCustom(row);
    }
    const row = await prisma.schoolCalendarEvent.create({
      data: {
        schoolId: input.schoolId,
        title,
        description,
        date: input.date,
        time: "All Day",
        category: "Attendance",
        location: "",
        priority: "low",
        createdById: input.createdById || "system",
        sourceKey,
      },
    });
    return mapCustom(row);
  },
};

