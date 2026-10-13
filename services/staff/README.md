# Staff & Workforce

**Owns:** `LeaveRequest`, `StaffTask`, `StaffAttendance`, `Payroll`.

**Replaces:** `staffController`, `payrollController`.

**Notes:** HR-adjacent. Publishes `leave-request.approved` / `leave-request.rejected`. Payroll's strict-transaction needs make this a later extraction.

**Status:** Scaffold only. Logic remains in the monolith.
