# ERP Features & Future Extensions Guide

This guide describes each functional module of the School ERP system, detailing how it works today and highlighting opportunities for future development.

---

## 📚 1. Core Academics & Grading

### Academic Calendar (`AcademicCalendar.tsx`)
- **How it works**: Displays scheduled school events, terms, holiday schedules, parent-teacher conferences, and exam dates on an interactive calendar interface.
- **Future Extension**: Integrate automatic email/SMS notifications for parents when new calendar events are created, and support export to Google Calendar or iCal.

### Classrooms & Feed (`Classrooms.tsx`, `ClassroomList.tsx`, `ClassroomFeed.tsx`)
- **How it works**: Models physical or virtual classrooms, tracks student assignments, and provides an active dashboard feed for teachers to post announcements, resource attachments, and updates for specific classes.
- **Architectural Distinction**:
  - **Grade Level**: Represents the overall academic stage or standard (e.g., *Grade 10*).
  - **Class Group**: Represents the core demographic cohort / homeroom section of students (e.g., *Class 10-A*), with an **organization type**: self-contained, departmentalized/platoon, or mixed.
  - **Subject Classroom**: Created when linking a specific **Subject** to a **Class Group** (e.g., *Class 10-A - Mathematics*).
  - **Roster inheritance**: Students added to a class group are also added to linked subject rooms (`parentClassroomId`). Creating/syncing subject rooms copies the current cohort; use **Sync roster** to repair older rooms.
  - **Staffing**: Primary teacher plus optional co-teachers and assistants per room.
- **Future Extension**: Add live chat/discussions per class feed and support collaborative whiteboards or online assignments submissions.

### Curriculum & Lesson Planning (`Curriculum.tsx`)
- **How it works**: Enables academic administrators and department heads to draft course outlines, manage syllabi, define learning standards, and map textbook contents to dynamic lesson timelines.
- **Future Extension**: Allow teachers to upload lesson plans and attach them to specific calendar slots, complete with peer reviews from senior advisors.

### Exams, Grading & Report Cards (`Exams.tsx`, `GradeSheet.tsx`, `ReportCard.tsx`, `StudentGrades.tsx`)
- **How it works**:
  - Admin/Teachers define an **Exam** block (e.g. Fall Semesters).
  - Multiple **ExamComponents** (Homework, Quizzes, Classwork, Midterms, Finals) can be attached, mapping to the school's dynamic `gradebookConfig` weights.
  - Grades can be entered raw, after which weighted averages are computed dynamically on both backend engines and frontend print-ready templates.
  - Grade Legends map numeric scores into custom letter grades and remarks.
- **Future Extension**: Incorporate student rank tracking, auto-generation of progress charts, and bulk-release controls to restrict parent access to report cards until school fees are cleared.

---

## 🧑‍🎓 2. Student Life & Services

### Admissions & Enrollment (`Admissions.tsx`, `Enrollment.tsx`, `admissionService.ts`, `admissionRoutes.ts`)
- **How it works**:
  - **Multi-Stage Pipeline**: Manages the end-to-end prospective student lifecycle across four distinct phases: *Application Submitted*, *Dossier Evaluation & Review*, *Admissions Decision*, and *System Enrollment*.
  - **Role-Based Workflows**:
    - **Registrar**: Initiates new registrations, captures student/parent particulars, tracks school history, and ticks off the interactive **Document Verification Checklist** (Certified Birth Certificate, Academic Transcripts, Parent ID copy, and Medical Records).
    - **Principal / Administrator**: Exclusive access to the **Principal Evaluation & Assessment** panel to score entrance exams (0-100), issue interview star-ratings (1-5 stars), write academic remarks, and authorize decisions (Approve/Reject).
  - **Durable Persistence**: Leverages a full-stack Prisma-backed schema where dynamic JSON payloads (document checklists and evaluations) are synchronized and persisted in the DB (`documents` and `notes` fields).
  - **Automated System Enrollment**: Once an application is approved, the Principal/Admin can enroll the student with a single click, automatically provisioning their official student account in the school ledger with default credentials (`student123`).
- **Future Extension**: Build a fully customized external portal for prospective families to track their application status live and pay admission deposit fees.

### Attendance Tracker (`Attendance.tsx`)
- **How it works**: Provides teachers with a rapid student list view to mark daily attendance statuses (Present, Absent, Late, Excused) with simple check toggles.
- **Future Extension**: Integrations with RFID tap-cards or biometric hardware at the school entrance to automatically register daily student arrivals.

### Clinic & Health Services (`Clinic.tsx`)
- **How it works**: Logs student clinic visits, tracks allergy lists, vaccine compliance statuses, ongoing medication logs, and logs incidents with action reports.
- **Future Extension**: Automated emergency SMS notifications to parents when their child is admitted to the clinic or administered medication.

### Student Records & Counseling (`StudentRecords.tsx`, `Counseling.tsx`)
- **How it works**: Stores student records, disciplinary history, counselor case logs, intervention plans, and confidential check-ins.
- **Future Extension**: Secure, role-based encryption for sensitive counselor logs ensuring that only certified counselors can read detailed student session notes.

### Hostel & Library (`Hostel.tsx`, `Library.tsx`)
- **How it works**:
  - **Hostel**: Tracks dormitory buildings, room assignments, occupant details, and room vacancy rates.
  - **Library**: Tracks cataloged books, book issue statuses, borrow histories, and outstanding late return fee warnings.
- **Future Extension**: Add a digital e-book library hub and room-request change pipelines for students.

---

## 💰 3. Financial & Operational Administration

### School Fees & Invoices (`Fees.tsx`)
- **How it works**: Manages school term fees, records custom payment transactions, tracks outstanding balances, and outputs downloadable, print-friendly PDF receipts.
- **Future Extension**: Direct online payment gateways (such as Stripe or local bank APIs) embedded right into the student and parent portals.

### Staff & Payroll (`StaffManagement.tsx`, `StaffPortal.tsx`, `Payroll.tsx`)
- **How it works**:
  - **Staff Management**: Keeps comprehensive dossiers on faculty and staff (contact information, contract types, departments).
  - **Payroll**: Computes base salaries, deducts taxes, calculates bonuses, and generates downloadable salary slips.
- **Future Extension**: Direct automated ACH bank payouts and visual holiday/overtime request approvals.

### Procurement & Inventory (`Procurement.tsx`, `Inventory.tsx`)
- **How it works**:
  - **Inventory**: Tracks school assets, classroom supplies, laboratory kits, and books in stock, raising warnings on low quantities.
  - **Procurement**: Coordinates purchase requests and tracks orders through vendor pipelines.
- **Future Extension**: Integration of barcode/QR scanning to automatically audit inventory counts using a mobile phone camera.

---

## 🚌 4. Logistics, Transportation & Security

### Bus Routes, Transportation & Vehicle Maintenance (`BusRoutes.tsx`, `Transportation.tsx`, `VehicleMaintenance.tsx`, `Drivers.tsx`)
- **How it works**:
  - **Transportation**: Manages bus routes, designated stops, driver assignments, and vehicle capacity.
  - **Vehicle Maintenance**: Tracks service logs, registration renewals, tire changes, fuel tracking, and preventative diagnostics.
- **Future Extension**: Live GPS location tracking for school buses, enabling parents to view their child's transit on an interactive map.

### Security, Maintenance & Work Orders (`Security.tsx`, `Maintenance.tsx`, `WorkOrders.tsx`)
- **How it works**:
  - **Security**: Logs visitor entries, vehicle license plates, visitor passes, and campus guard rotations.
  - **Maintenance**: Supports lodging facilities work orders, assigning technicians, and tracking progress status (Pending/In Progress/Completed).
- **Future Extension**: AI-assisted route planning for facilities maintenance and automated campus guard check-point checklists.
