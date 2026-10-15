/** Platform guide copy — nested under pages.guide (i18n). */
export const enGuide = {
  eyebrow: "Platform guide",
  loading: "Loading your guide…",
  unavailableTitle: "No guide for this account",
  unavailableBody: "Your role does not have a guided tour yet. Use the sidebar to explore your pages.",
  backDashboard: "Back to dashboard",
  progressLabel: "Progress",
  start: "Start guide",
  continue: "Continue",
  restart: "Restart",
  checklistTitle: "Your checklist",
  openStep: "Open",
  resetStep: "Reset",
  next: "Next",
  back: "Back",
  stepOf: "Step {{current}} of {{total}}",
  skip: "Skip",
  finish: "Finish",
  goThere: "Go there",
  close: "Close",
  dontShowAgain: "Don't show again",
  hub: "Hub",
  continueChip: "{{percent}}% complete — continue learning",
  dashboardBannerTitle: "Learn your role on Gnet SMS",
  dashboardBannerBody: "A customized guide walks you through each module — what it is and how to use it.",
  dashboardBannerCta: "Open guide",
  howToLabel: "How to get started",
  whatItIsLabel: "What this is",
  requiredHint: "Your school requires completing this guide. You can pause, but it will keep offering until finished.",
  completionByRole: "Guide completion by role",
  completionByRoleHint: "Honest counts of active users with a role guide. No personal details.",
  completionUsers: "{{completed}} of {{users}} complete ({{percent}}%)",
  guideRequiredLabel: "Require platform guide",
  guideRequiredHint: "When on, staff and students cannot permanently dismiss the guide until they finish it.",
  under13Note: "Shorter checklist for students under 13.",
  tracks: {
    teacher: {
      title: "Teacher guide",
      subtitle: "Learn My Classes, attendance, gradebook, and your staff portal — step by step.",
    },
    student: {
      title: "Student guide",
      subtitle: "Find your schedule, classes, grades, exams, attendance, and fees.",
    },
    parent: {
      title: "Parent guide",
      subtitle: "Follow your children, grades, attendance, fees, and school updates.",
    },
    staff_registrar: {
      title: "Registrar guide",
      subtitle: "Admissions, students, enrollment, and transcripts.",
    },
    staff_finance: {
      title: "Finance guide",
      subtitle: "Fees, expenses, payroll, and your staff portal.",
    },
    staff_academic_lead: {
      title: "Academic leadership guide",
      subtitle: "Curriculum, classrooms, grade review, exams, and attendance oversight.",
    },
    staff_admin: {
      title: "School admin guide",
      subtitle: "Settings, roles, academic calendar, staff, and school setup checklist.",
    },
    staff_ops_lead: {
      title: "Operations leadership guide",
      subtitle: "Leave approvals, maintenance, and the staff portal.",
    },
    staff_ops_specialist: {
      title: "Campus specialist guide",
      subtitle: "Your hub, honest Limited modules, staff portal, and calendar.",
    },
    staff_care: {
      title: "Care & library guide",
      subtitle: "What is live today, plus calendar, documents, and staff portal.",
    },
    super_admin: {
      title: "Super Admin guide",
      subtitle: "Learn schools, registrations, users, reports, and platform settings.",
    },
  },
  steps: {
    teacher_intro: {
      title: "Welcome, teacher",
      body: "Your sidebar lists only what you need: classes, attendance, grades, and exams. We'll walk through each area.",
      howTo: [
      "Use the left sidebar — it only shows pages for your teacher role.",
      "Open Platform guide anytime from the header Help / Profile menu to replay steps.",
      "Finish School setup is an admin checklist; this guide is how you teach day to day.",
      ],
    },
    teacher_schedule: {
      title: "Your timetable",
      body: "Open My Schedule to see your teaching periods for the week.",
      howTo: [
      "Open My Schedule from the sidebar.",
      "Confirm today’s periods and rooms match what you teach.",
      "If the timetable is empty, ask School Admin to publish schedules and the academic calendar.",
      ],
    },
    teacher_classes: {
      title: "My Classes",
      body: "Stream, classwork, people, and marks live here — open a class to post and review work.",
      howTo: [
      "Open My Classes and pick a class group.",
      "Use Stream for posts, Classwork for assignments, People for roster, and Marks where available.",
      "Banner and class settings are for the class owner / co-teachers.",
      ],
    },
    teacher_attendance: {
      title: "Take roll call",
      body: "Attendance opens a full-page roll call on instructional days. Parents can see published attendance.",
      howTo: [
      "Open Attendance on an instructional day.",
      "Select your class and mark Present / Absent / Late for each student.",
      "Save or publish per school policy so parents can see the record.",
      ],
    },
    teacher_lesson_plans: {
      title: "Lesson plans",
      body: "Draft period plans, submit for approval, and share into the classroom when ready.",
      howTo: [
      "Open Lesson plans and create a plan for a period or week.",
      "Submit for approval when your school requires review.",
      "Share into the classroom when approved so students see materials.",
      ],
    },
    teacher_gradebook: {
      title: "Gradebook",
      body: "Enter marks in the spreadsheet gradebook. Work autosaves as you go.",
      howTo: [
      "Open Gradebook and choose class + subject / period.",
      "Enter scores in the grid — changes autosave.",
      "Use the school’s grade categories (HW, quizzes, exams) as configured in the academic calendar.",
      ],
    },
    teacher_grade_review: {
      title: "Grade review",
      body: "Submit grade batches for academic leads to accept — then families can see published grades.",
      howTo: [
      "When a grading window closes, open Grade review.",
      "Submit your batch for academic leads (Principal / VPI) to accept.",
      "Families only see grades after acceptance / publish — not while drafts sit in gradebook.",
      ],
    },
    teacher_exams: {
      title: "Exams",
      body: "Browse the exam catalog and online exams assigned to your classes.",
      howTo: [
      "Open Exams for the catalog; Online exams for computer-based tests.",
      "Follow Exam paper review if your school requires paper approval before delivery.",
      "Students see assigned online exams when you open them for the class.",
      ],
    },
    teacher_staff_portal: {
      title: "Staff portal",
      body: "Request leave and manage self-service staff tasks from your portal.",
      howTo: [
      "Open Staff Portal for leave requests and self-service tasks.",
      "Submit leave early so approvers (admin / VPA) can act before the date.",
      ],
    },
    teacher_done: {
      title: "You're ready to teach",
      body: "Replay this guide anytime from Profile → Platform guide. Tip: check Announcements for school news.",
      howTo: [
      "Replay any step from Platform guide → Open.",
      "Check Announcements regularly for school-wide news.",
      ],
    },
    student_intro: {
      title: "Welcome to your student account",
      body: "Everything here is about your classes, grades, exams, and fees — nothing school-admin related.",
      howTo: [
      "Your sidebar is limited to student tools — no admin screens.",
      "If something looks empty, it may not be published yet (grades, exams, fees).",
      ],
    },
    student_schedule: {
      title: "Calendar & schedule",
      body: "See school events and your personal timetable under Calendar and My Schedule.",
      howTo: [
      "Open Calendar for school events; My Schedule for your timetable.",
      "Switch days/weeks to plan homework around periods.",
      ],
    },
    student_classes: {
      title: "My Classes",
      body: "Open My Classes for stream posts, classwork, and materials from your teachers.",
      howTo: [
      "Open My Classes and select a class.",
      "Read Stream posts, submit Classwork, and download materials your teachers shared.",
      ],
    },
    student_grades: {
      title: "My Grades",
      body: "Published grades and report cards appear here when your school releases them.",
      howTo: [
      "Open My Grades after teachers and academic leads publish results.",
      "Report cards appear when your school releases them for the period.",
      ],
    },
    student_exams: {
      title: "Exams",
      body: "Find upcoming exams and take online exams when your teacher opens them.",
      howTo: [
      "Open Exams / Online exams for upcoming assessments.",
      "Start an online exam only when your teacher has opened the window.",
      ],
    },
    student_attendance: {
      title: "My Attendance",
      body: "Review your attendance record for instructional days.",
      howTo: [
      "Open My Attendance to review Present / Absent / Late by date.",
      "Ask a parent or teacher if a day looks wrong.",
      ],
    },
    student_fees: {
      title: "Fees",
      body: "View invoices and pay outstanding balances when your school collects fees online.",
      howTo: [
      "Open Fees to see invoices.",
      "Pay online when your school enables checkout; keep QR receipts for verification.",
      ],
    },
    student_done: {
      title: "You're set",
      body: "Come back to Platform guide anytime if you need a refresher.",
      howTo: [
      "Return to Platform guide from Profile if you need a refresher.",
      ],
    },
    parent_intro: {
      title: "Welcome, parent",
      body: "This account follows your linked children — grades, attendance, fees, and school updates.",
      howTo: [
      "This account is tied to your children — switch child when viewing classes or grades.",
      "You will not see teacher gradebook edit tools.",
      ],
    },
    parent_children: {
      title: "My Children",
      body: "Start here to see each linked child. Switch children when viewing classes or grades.",
      howTo: [
      "Open My Children to see linked students.",
      "Select a child before opening Classes, Grades, or Schedule so the right student is in context.",
      ],
    },
    parent_schedule: {
      title: "Child schedule",
      body: "My Schedule shows the timetable for the child you are viewing.",
      howTo: [
      "Open My Schedule with the correct child selected.",
      "Use Calendar for school-wide events that affect pickup and holidays.",
      ],
    },
    parent_grades: {
      title: "Grades & report cards",
      body: "Open Grades to see published results for your child.",
      howTo: [
      "Open Grades for published marks and report cards.",
      "If grades are missing, they may still be in teacher draft or awaiting grade review.",
      ],
    },
    parent_attendance: {
      title: "Attendance",
      body: "Check daily attendance visibility for your children.",
      howTo: [
      "Open Attendance for daily status on instructional days.",
      "Contact the school office for disputed absences.",
      ],
    },
    parent_fees: {
      title: "Fees & receipts",
      body: "Pay school fees and keep QR receipts from the Fees area.",
      howTo: [
      "Open Fees for balances and payment history.",
      "Pay outstanding invoices and save QR receipts for public verify if offered.",
      ],
    },
    parent_comms: {
      title: "News, documents & PTA",
      body: "Announcements, Documents, and PTA keep you connected to campus life.",
      howTo: [
      "Check Announcements for school news.",
      "Use Documents for shared files and PTA for parent association updates when enabled.",
      ],
    },
    parent_done: {
      title: "You're ready",
      body: "Replay this guide from Profile whenever you need it.",
      howTo: [
      "Replay this guide from Profile → Platform guide anytime.",
      ],
    },
    reg_intro: {
      title: "Welcome, registrar",
      body: "Your guide covers admissions through enrollment and transcripts.",
      howTo: [
      "Your track covers the student lifecycle: apply → decide → enroll → records.",
      "School setup (branding, calendar) is a separate Onboarding checklist for admins.",
      ],
    },
    reg_admissions: {
      title: "Admissions pipeline",
      body: "Review applications, waitlist, and decisions in Admissions.",
      howTo: [
      "Open Admissions to see applications and waitlist.",
      "Move applicants through review, approve/reject, and fee-pending states per school policy.",
      "Confirm online registration / public apply settings with School Admin if the apply link is off.",
      ],
    },
    reg_students: {
      title: "Students directory",
      body: "Find enrolled students, edit profiles, and manage credentials.",
      howTo: [
      "Open Students for the enrolled directory.",
      "Edit profiles carefully — credentials and contact data affect parent accounts.",
      ],
    },
    reg_enrollment: {
      title: "Enrollment & placement",
      body: "Place admitted students into class groups from Enrollment.",
      howTo: [
      "Open Enrollment after a student is admitted.",
      "Place them into a grade level and classroom/class group.",
      "If classrooms are empty, ask admin to finish School setup (teachers + class groups).",
      ],
    },
    reg_transcripts: {
      title: "Transcripts & records",
      body: "Issue transcripts and open student records tools.",
      howTo: [
      "Open Transcripts / student records for official documents.",
      "Generate only after grades and periods exist for the academic year.",
      ],
    },
    reg_done: {
      title: "Registrar basics complete",
      body: "You can restart this guide anytime from Platform guide.",
      howTo: [
      "Restart from Platform guide when training new registrars.",
      ],
    },
    fin_intro: {
      title: "Welcome, accountant",
      body: "Fees, expenses, and payroll are your primary finance surfaces.",
      howTo: [
      "Finance pages are Fees, Expenses, and Payroll — plus your Staff Portal.",
      "Templates and billing settings should exist before heavy invoicing (see School setup).",
      ],
    },
    fin_fees: {
      title: "Fees & ledgers",
      body: "Manage templates, invoices, partial payments, and receipts.",
      howTo: [
      "Open Fees → manage fee templates first (types/amounts).",
      "Create or batch-apply invoices to students/classes.",
      "Record partial payments and issue receipts; use void/write-off only with policy.",
      ],
    },
    fin_expenses: {
      title: "Expenses",
      body: "Track campus expenses and budgets.",
      howTo: [
      "Open Expenses to log campus spending.",
      "Attach notes/categories your school uses for audits.",
      ],
    },
    fin_payroll: {
      title: "Payroll",
      body: "Run payroll records and payslips for staff.",
      howTo: [
      "Open Payroll to generate runs and payslips.",
      "Confirm staff roster and attendance rules with admin before a live run.",
      ],
    },
    fin_portal: {
      title: "Staff portal",
      body: "Your own leave and self-service live in Staff Portal.",
      howTo: [
      "Use Staff Portal for your own leave — separate from school fee ledgers.",
      ],
    },
    fin_done: {
      title: "Finance guide complete",
      body: "Replay from Platform guide whenever you need a refresher.",
      howTo: [
      "Replay finance steps from Platform guide as needed.",
      ],
    },
    acad_intro: {
      title: "Welcome, academic lead",
      body: "Oversee curriculum, classrooms, grade review, and exams.",
      howTo: [
      "You oversee curriculum quality, classrooms, grade review, and exams — not day-to-day fee collection.",
      ],
    },
    acad_curriculum: {
      title: "Curriculum",
      body: "Manage subjects and syllabus plans.",
      howTo: [
      "Open Curriculum to add subjects and syllabus structure.",
      "Schools need subjects before subject classrooms and many lesson/exam links work.",
      ],
    },
    acad_classrooms: {
      title: "Classrooms",
      body: "Create class groups as self-contained or departmentalized, then open subject rooms.",
      howTo: [
      "Open Classrooms and create a class group with an organization type.",
      "Self-contained: one primary teacher (optional co-teacher/assistant). Departmentalized: assign specialists when you sync subjects.",
      "Students added to a homeroom also join linked subject rooms.",
      ],
    },
    acad_grade_review: {
      title: "Grade review",
      body: "Accept or reopen teacher grade batches with an audit trail.",
      howTo: [
      "Open Grade review when teachers submit batches.",
      "Accept to publish for families, or reopen with a note when corrections are needed.",
      ],
    },
    acad_exams: {
      title: "Exam paper review",
      body: "Approve teacher exam papers before delivery.",
      howTo: [
      "Open Exam paper review to approve papers before delivery.",
      "Coordinate with the Exams catalog and academic calendar periods.",
      ],
    },
    acad_attendance: {
      title: "Attendance oversight",
      body: "Monitor instructional-day attendance across campus.",
      howTo: [
      "Open Attendance for campus-level visibility on instructional days.",
      "Follow up with teachers when roll call is missing.",
      ],
    },
    acad_done: {
      title: "Academic guide complete",
      body: "Return to Platform guide anytime.",
      howTo: [
      "Return to Platform guide anytime for a refresher.",
      ],
    },
    admin_intro: {
      title: "Welcome, school admin",
      body: "Configure the tenant, roles, calendar, and staff — separate from day-to-day teaching.",
      howTo: [
      "This guide is your admin workflow — School setup checklist is the data checklist (grades, teachers, calendar, fees).",
      "Complete both: setup data first, then this role guide.",
      ],
    },
    admin_settings: {
      title: "School settings",
      body: "Branding, locale, timezone, and school policies live under Settings.",
      howTo: [
      "Open Settings → Appearance for logo and brand color (guides use your brand accents).",
      "Set country, timezone, and locale so dates and language match the campus.",
      "Review security / notification preferences as needed.",
      ],
    },
    admin_roles: {
      title: "Roles & Access",
      body: "Assign roles and customize capabilities per school.",
      howTo: [
      "Open Roles & Access to assign roles and capability toggles.",
      "Prefer least privilege — e.g. Registrar for admissions without full finance.",
      ],
    },
    admin_calendar: {
      title: "Academic calendar",
      body: "Set terms, instructional days, and the year structure.",
      howTo: [
      "Open Settings → Academic calendar.",
      "Create a year pattern with at least one period and exam components.",
      "Gradebook and exams depend on these periods.",
      ],
    },
    admin_staff: {
      title: "Staff directory",
      body: "Invite and manage staff accounts.",
      howTo: [
      "Open Staff to invite teachers and other roles.",
      "Teachers are required before creating classrooms.",
      "Use Bulk import when onboarding large rosters.",
      ],
    },
    admin_onboarding: {
      title: "School setup checklist",
      body: "The Onboarding page is your campus setup checklist — different from this role guide.",
      howTo: [
      "Open Setup (Onboarding) for the required campus checklist.",
      "Mark setup complete only when branding, subjects, teacher, classroom, calendar, and fee templates are done.",
      ],
    },
    admin_done: {
      title: "Admin guide complete",
      body: "Replay from Platform guide when training new admins.",
      howTo: [
      "Share Platform guide with new admins; keep School setup green for Super Admin health.",
      ],
    },
    ops_intro: {
      title: "Welcome, VP Admin",
      body: "Focus on leave, facilities operations, and staff self-service.",
      howTo: [
      "VP Admin focuses on leave and facilities — academic gradebook is owned by teachers/leads.",
      ],
    },
    ops_leave: {
      title: "Leave approvals",
      body: "Review and approve staff leave requests.",
      howTo: [
      "Open Leave approval to review pending staff requests.",
      "Approve or deny with clear notes for payroll/attendance rules.",
      ],
    },
    ops_maintenance: {
      title: "Maintenance & work orders",
      body: "Track facilities work orders and campus ops hubs.",
      howTo: [
      "Open Maintenance / work orders for facilities tickets.",
      "Assign and close work so campus ops stay honest (no fake telemetry).",
      ],
    },
    ops_portal: {
      title: "Staff portal",
      body: "Your personal staff self-service area.",
      howTo: [
      "Use Staff Portal for your own leave and self-service.",
      ],
    },
    ops_done: {
      title: "Operations guide complete",
      body: "Replay anytime from Platform guide.",
      howTo: [
      "Replay from Platform guide when onboarding ops staff.",
      ],
    },
    spec_intro: {
      title: "Welcome to your campus role",
      body: "Specialty roles use a focused hub plus shared calendar and staff portal tools.",
      howTo: [
      "Your specialty hub is role-specific; shared tools are Calendar and Staff Portal.",
      ],
    },
    spec_hub: {
      title: "Your specialty hub",
      body: "Open your role page from the sidebar (transport, security, cafeteria, etc.) when it appears for you.",
      howTo: [
      "Open your specialty page from the sidebar (e.g. Transport, Security, Cafeteria).",
      "Campus specialist modules on Premium plans are API-backed — empty lists mean no records yet.",
      ],
    },
    spec_live_tools: {
      title: "Live campus tools",
      body: "Transport, security, maintenance, and other ops modules are live when your school plan includes them.",
      howTo: [
      "Use your specialty sidebar pages for day-to-day work.",
      "Ask School Admin if a module returns “not enabled on your plan”.",
      ],
    },
    spec_portal: {
      title: "Staff portal",
      body: "Leave and self-service live in Staff Portal for all staff.",
      howTo: [
      "Staff Portal works for leave across specialty roles.",
      ],
    },
    spec_calendar: {
      title: "Calendar",
      body: "School events and instructional days appear on Calendar.",
      howTo: [
      "Use Calendar for instructional days and campus events that affect your area.",
      ],
    },
    spec_done: {
      title: "Specialty guide complete",
      body: "Replay from Platform guide whenever you need it.",
      howTo: [
      "Replay from Platform guide anytime.",
      ],
    },
    care_intro: {
      title: "Welcome",
      body: "Care and library roles use live campus modules plus shared calendar, documents, and staff portal.",
      howTo: [
      "Library, clinic, and counseling pages are live on Premium plans — start from your sidebar.",
      ],
    },
    care_live_tools: {
      title: "Your care modules",
      body: "Catalog loans, clinic visits, counseling sessions, and related inventory are API-backed.",
      howTo: [
      "Use Library, Clinic, or Counseling from the sidebar for daily work.",
      "Students and Documents remain shared tools across care roles.",
      ],
    },
    care_calendar: {
      title: "Calendar",
      body: "Stay aligned with instructional days and campus events.",
      howTo: [
      "Open Calendar for events and instructional days relevant to care schedules.",
      ],
    },
    care_docs: {
      title: "Documents",
      body: "Shared school documents library for staff.",
      howTo: [
      "Open Documents for shared policy files and forms.",
      ],
    },
    care_portal: {
      title: "Staff portal",
      body: "Self-service leave and staff tools.",
      howTo: [
      "Use Staff Portal for leave and staff self-service.",
      ],
    },
    care_done: {
      title: "Guide complete",
      body: "Replay from Platform guide anytime.",
      howTo: [
      "Replay from Platform guide when you need it.",
      ],
    },
    sa_intro: {
      title: "Welcome, Super Admin",
      body: "This guide covers the platform console: schools, registrations, users, reports, and settings.",
      howTo: [
      "Super Admin is platform-wide — not a single school’s gradebook.",
      "Tenant branding applies inside each school after you open that school’s SPA.",
      ],
    },
    sa_schools: {
      title: "Schools",
      body: "Create, open, suspend, and manage tenant schools from the Schools list.",
      howTo: [
      "Open Schools to create, inspect, suspend, or manage plan entitlements.",
      "Use school detail for health, overrides, and operator actions.",
      ],
    },
    sa_registrations: {
      title: "Registrations",
      body: "Review public school applications and approve or request more information.",
      howTo: [
      "Open Registrations for public school applications.",
      "Approve to provision a tenant; request more info when the form is incomplete.",
      ],
    },
    sa_users: {
      title: "Platform users",
      body: "Look up accounts across schools and reset access when needed.",
      howTo: [
      "Open Users / operators to look up accounts and reset access.",
      "Prefer audited resets over sharing passwords.",
      ],
    },
    sa_reports: {
      title: "Reports",
      body: "Platform-level reports and honest operational summaries live here.",
      howTo: [
      "Open Reports for platform summaries — labels stay honest when billing is not connected.",
      ],
    },
    sa_settings: {
      title: "Platform settings",
      body: "Global console preferences for Super Admin.",
      howTo: [
      "Open platform Settings for console preferences.",
      "School-level branding is edited inside each tenant’s Settings, not here.",
      ],
    },
    sa_done: {
      title: "Super Admin guide complete",
      body: "Replay anytime from Platform guide in the header menu.",
      howTo: [
      "Replay from the header Platform guide anytime.",
      ],
    },
  },
} as const;
