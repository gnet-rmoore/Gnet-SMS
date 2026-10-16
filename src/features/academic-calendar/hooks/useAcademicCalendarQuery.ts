/**
 * Canonical Academic Calendar hook now lives in
 * `academics-shared/calendar/useAcademicCalendar`. This re-export keeps the
 * existing feature imports working while sharing one react-query cache entry.
 */
export {
  useAcademicCalendarQuery,
  invalidateAcademicCalendar,
} from "../../academics-shared/calendar/useAcademicCalendar";
