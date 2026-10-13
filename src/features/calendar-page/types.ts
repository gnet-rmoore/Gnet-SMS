export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string;
  category:
    | "Academic"
    | "Sports"
    | "Administrative"
    | "Operations"
    | "Health"
    | "Finance"
    | "Counseling"
    | "Holiday"
    | "Non-Instruction"
    | "Attendance"
    | "Class"
    | "Other";
  location: string;
  priority: "high" | "medium" | "low";
  actionLabel?: string;
  actionPath?: string;
  isCustom?: boolean;
}
