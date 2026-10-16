import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPageSkeleton } from "./features/landing/components/skeletons";
import { isSchoolLoginAllowed, buildSchoolUnavailableUrl } from "./lib/schoolUnavailable";
import { getPostLoginPath } from "./lib/postLoginPath";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { OfflineGate } from "./components/OfflineGate";

const LandingPage = lazy(() => import("./pages/Landing"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const ModulesPage = lazy(() => import("./pages/Modules"));

const Schools = lazy(() => import("./pages/SuperAdmin/Schools").then((m) => ({ default: m.Schools })));
const SchoolRegistrations = lazy(() =>
  import("./pages/SuperAdmin/SchoolRegistrations").then((m) => ({ default: m.SchoolRegistrations }))
);
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdmin/Dashboard").then((m) => ({ default: m.SuperAdminDashboard })));
const SuperAdminSettings = lazy(() => import("./pages/SuperAdmin/Settings").then((m) => ({ default: m.Settings })));
const SuperAdminUsers = lazy(() => import("./pages/SuperAdmin/Users").then((m) => ({ default: m.Users })));
const SuperAdminReports = lazy(() => import("./pages/SuperAdmin/Reports").then((m) => ({ default: m.Reports })));
const SuperAdminLogs = lazy(() => import("./pages/SuperAdmin/Logs").then((m) => ({ default: m.Logs })));
const SuperAdminHelp = lazy(() => import("./pages/SuperAdmin/Help"));
const SuperAdminHelpDetail = lazy(() => import("./pages/SuperAdmin/HelpDetail"));
const SuperAdminSchoolDetail = lazy(() =>
  import("./pages/SuperAdmin/SchoolDetail").then((m) => ({ default: m.SchoolDetail }))
);
const SuperAdminPlans = lazy(() =>
  import("./pages/SuperAdmin/Plans").then((m) => ({ default: m.Plans }))
);
const SuperAdminOperators = lazy(() =>
  import("./pages/SuperAdmin/Operators").then((m) => ({ default: m.Operators }))
);
const RegisterSchoolPage = lazy(() => import("./pages/RegisterSchool"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const MustChangePasswordPage = lazy(() => import("./pages/MustChangePassword").then((m) => ({ default: m.MustChangePassword })));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmail"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAccept"));
const PublicApplyPage = lazy(() => import("./pages/PublicApply"));
const PublicApplyStatusPage = lazy(() => import("./pages/PublicApplyStatus"));
const PublicReceiptVerifyPage = lazy(() => import("./pages/PublicReceiptVerify"));
const SchoolUnavailablePage = lazy(() => import("./pages/SchoolUnavailable"));
const NotFoundPage = lazy(() => import("./pages/errors/NotFoundPage"));
const ForbiddenPage = lazy(() => import("./pages/errors/ForbiddenPage"));
const ServerErrorPage = lazy(() => import("./pages/errors/ServerErrorPage"));
const OfflinePage = lazy(() => import("./pages/errors/OfflinePage"));
const MockCheckoutPage = lazy(() => import("./pages/MockCheckout"));
const SchoolOnboardingPage = lazy(() => import("./pages/School/Onboarding"));
const PlatformGuidePage = lazy(() => import("./features/platform-guide/Page"));
const SchoolDashboard = lazy(() => import("./pages/School/Dashboard").then((m) => ({ default: m.SchoolDashboard })));
const ClassroomList = lazy(() => import("./pages/School/ClassroomList").then((m) => ({ default: m.ClassroomList })));
const ClassroomFeed = lazy(() => import("./pages/School/ClassroomFeed").then((m) => ({ default: m.ClassroomFeed })));
const AcademicCalendar = lazy(() => import("./pages/School/AcademicCalendar").then((m) => ({ default: m.AcademicCalendar })));
const CalendarPage = lazy(() => import("./pages/School/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const Students = lazy(() => import("./pages/School/Students").then((m) => ({ default: m.Students })));
const SchoolSettings = lazy(() => import("./pages/School/Settings").then((m) => ({ default: m.Settings })));
const Classrooms = lazy(() => import("./pages/School/Classrooms").then((m) => ({ default: m.Classrooms })));
const Exams = lazy(() => import("./pages/School/Exams").then((m) => ({ default: m.Exams })));
const ExamDetails = lazy(() => import("./pages/School/ExamDetails").then((m) => ({ default: m.ExamDetails })));
const OnlineExams = lazy(() => import("./pages/School/OnlineExams").then((m) => ({ default: m.OnlineExams })));
const QuestionBank = lazy(() =>
  import("./pages/School/QuestionBank").then((m) => ({ default: m.QuestionBank }))
);
const OnlineExamAuthor = lazy(() =>
  import("./pages/School/OnlineExamAuthor").then((m) => ({ default: m.OnlineExamAuthor }))
);
const OnlineExamTake = lazy(() =>
  import("./pages/School/OnlineExamTake").then((m) => ({ default: m.OnlineExamTake }))
);
const OnlineExamResults = lazy(() =>
  import("./pages/School/OnlineExamResults").then((m) => ({ default: m.OnlineExamResults }))
);
const OnlineExamPreview = lazy(() =>
  import("./pages/School/OnlineExamPreview").then((m) => ({ default: m.OnlineExamPreview }))
);
const OnlineExamProctor = lazy(() =>
  import("./pages/School/OnlineExamProctor").then((m) => ({ default: m.OnlineExamProctor }))
);
const OnlineExamProctorDetail = lazy(() =>
  import("./pages/School/OnlineExamProctorDetail").then((m) => ({ default: m.OnlineExamProctorDetail }))
);
const ExamPaper = lazy(() =>
  import("./pages/School/ExamPaper").then((m) => ({ default: m.ExamPaper }))
);
const ExamPaperReview = lazy(() =>
  import("./pages/School/ExamPaperReview").then((m) => ({ default: m.ExamPaperReview }))
);
const Gradebook = lazy(() => import("./pages/School/Gradebook").then((m) => ({ default: m.Gradebook })));
const GradeReview = lazy(() => import("./pages/School/GradeReview").then((m) => ({ default: m.GradeReview })));
const GradeEditAccess = lazy(() =>
  import("./pages/School/GradeEditAccess").then((m) => ({ default: m.GradeEditAccess }))
);
const LessonPlans = lazy(() => import("./pages/School/LessonPlans").then((m) => ({ default: m.LessonPlans })));
const ClassSchedulePage = lazy(() =>
  import("./pages/School/ClassSchedulePage").then((m) => ({ default: m.ClassSchedulePage }))
);
const MySchedulePage = lazy(() =>
  import("./pages/School/MySchedulePage").then((m) => ({ default: m.MySchedulePage }))
);
const Attendance = lazy(() => import("./pages/School/Attendance").then((m) => ({ default: m.Attendance })));
const Fees = lazy(() => import("./pages/School/Fees").then((m) => ({ default: m.Fees })));
const StaffManagement = lazy(() => import("./pages/School/StaffManagement").then((m) => ({ default: m.StaffManagement })));
const ApiDocsPage = lazy(() =>
  import("./pages/School/ApiDocsPage").then((m) => ({ default: m.ApiDocsPage }))
);
const RoleAccessPage = lazy(() =>
  import("./pages/School/RoleAccessPage").then((m) => ({ default: m.RoleAccessPage }))
);
const Reports = lazy(() => import("./pages/School/Reports").then((m) => ({ default: m.Reports })));
const Children = lazy(() => import("./pages/School/Children").then((m) => ({ default: m.Children })));
const MyApplications = lazy(() =>
  import("./pages/School/MyApplications").then((m) => ({ default: m.MyApplications }))
);
const MyCampus = lazy(() => import("./pages/School/MyCampus").then((m) => ({ default: m.MyCampus })));
const Expenses = lazy(() => import("./pages/School/Expenses").then((m) => ({ default: m.Expenses })));
const Payroll = lazy(() => import("./pages/School/Payroll").then((m) => ({ default: m.Payroll })));
const Registrar = lazy(() => import("./pages/School/Registrar").then((m) => ({ default: m.Registrar })));
const StudentRecords = lazy(() => import("./pages/School/StudentRecords").then((m) => ({ default: m.StudentRecords })));
const Transcripts = lazy(() => import("./pages/School/Transcripts").then((m) => ({ default: m.Transcripts })));
const Enrollment = lazy(() => import("./pages/School/Enrollment").then((m) => ({ default: m.Enrollment })));
const YearTransition = lazy(() =>
  import("./features/year-transition/Page").then((m) => ({ default: m.YearTransitionPage }))
);
const PromotionStatement = lazy(() =>
  import("./features/promotion-statement/Page").then((m) => ({ default: m.PromotionStatementPage }))
);
const StudentGrades = lazy(() => import("./pages/School/StudentGrades").then((m) => ({ default: m.StudentGrades })));
const GradeSheet = lazy(() => import("./pages/School/GradeSheet").then((m) => ({ default: m.GradeSheet })));
const ReportCard = lazy(() => import("./pages/School/ReportCard").then((m) => ({ default: m.ReportCard })));
const Certificates = lazy(() => import("./pages/School/Certificates"));
const Curriculum = lazy(() => import("./pages/School/Curriculum").then((m) => ({ default: m.Curriculum })));
const BusRoutes = lazy(() => import("./pages/School/BusRoutes").then((m) => ({ default: m.BusRoutes })));
const Maintenance = lazy(() => import("./pages/School/Maintenance").then((m) => ({ default: m.Maintenance })));
const Procurement = lazy(() => import("./pages/School/Procurement").then((m) => ({ default: m.Procurement })));
const Security = lazy(() => import("./pages/School/Security").then((m) => ({ default: m.Security })));
const Drivers = lazy(() => import("./pages/School/Drivers").then((m) => ({ default: m.Drivers })));
const Inventory = lazy(() => import("./pages/School/Inventory").then((m) => ({ default: m.Inventory })));
const WorkOrders = lazy(() => import("./pages/School/WorkOrders").then((m) => ({ default: m.WorkOrders })));
const VehicleMaintenance = lazy(() => import("./pages/School/VehicleMaintenance").then((m) => ({ default: m.VehicleMaintenance })));
const Library = lazy(() => import("./pages/School/Library").then((m) => ({ default: m.Library })));
const Clinic = lazy(() => import("./pages/School/Clinic").then((m) => ({ default: m.Clinic })));
const Counseling = lazy(() => import("./pages/School/Counseling").then((m) => ({ default: m.Counseling })));
const Athletics = lazy(() => import("./pages/School/Athletics").then((m) => ({ default: m.Athletics })));
const Hostel = lazy(() => import("./pages/School/Hostel").then((m) => ({ default: m.Hostel })));
const Cafeteria = lazy(() => import("./pages/School/Cafeteria").then((m) => ({ default: m.Cafeteria })));
const StaffPortal = lazy(() => import("./pages/School/StaffPortal").then((m) => ({ default: m.StaffPortal })));
const StaffTasks = lazy(() => import("./pages/School/StaffTasks").then((m) => ({ default: m.StaffTasks })));
const LeaveApproval = lazy(() => import("./pages/School/LeaveApproval").then((m) => ({ default: m.LeaveApproval })));
const AnnouncementManagement = lazy(() => import("./pages/School/AnnouncementManagement").then((m) => ({ default: m.AnnouncementManagement })));
const DocumentManagement = lazy(() => import("./pages/School/DocumentManagement").then((m) => ({ default: m.DocumentManagement })));
const Notifications = lazy(() => import("./pages/School/Notifications").then((m) => ({ default: m.Notifications })));
const Profile = lazy(() => import("./pages/School/Profile").then((m) => ({ default: m.Profile })));
const Pta = lazy(() => import("./pages/School/Pta").then((m) => ({ default: m.Pta })));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading…</div>
);

const MarketingRouteFallback = ({ variant }: { variant: "home" | "pricing" | "modules" }) => (
  <LandingPageSkeleton variant={variant} />
);

/** Reset scroll on route change; preserve hash anchors on the home page. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

// --- Logout Action Component ---
const LogoutAction = () => {
  const logout = useAuthStore((state) => state.logout);
  React.useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace />;
};

export default function App() {
  const { accessToken, user, school, logout } = useAuthStore();

  React.useEffect(() => {
    if (school && (school.id === "default-school-id" || school.id === "demo-school-id")) {
      logout();
    }
  }, [school, logout]);

  return (
    <Router>
      <ScrollToTop />
      <AppErrorBoundary>
      <OfflineGate>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route 
          path="/login" 
          element={
            accessToken && user ? (
              user.mustChangePassword ? (
                <Navigate to="/change-password-required" replace />
              ) : user.role !== "SUPER_ADMIN" && school && !isSchoolLoginAllowed(school.status) ? (
                <Navigate
                  to={buildSchoolUnavailableUrl({
                    schoolStatus: school.status || "SUSPENDED",
                    schoolName: school.name,
                    schoolSlug: school.slug,
                  })}
                  replace
                />
              ) : (
                <Navigate to={getPostLoginPath(user, school)} replace />
              )
            ) : (
              <Login />
            )
          } 
        />
        <Route
          path="/change-password-required"
          element={
            accessToken && user?.mustChangePassword ? (
              <MustChangePasswordPage />
            ) : accessToken ? (
              <Navigate to={getPostLoginPath(user!, school)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/school-unavailable" element={<SchoolUnavailablePage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/error" element={<ServerErrorPage />} />
        <Route path="/offline" element={<OfflinePage />} />
        <Route path="/register-school" element={<RegisterSchoolPage />} />
        <Route path="/register-school/confirm" element={<RegisterSchoolPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/pricing"
          element={
            <Suspense fallback={<MarketingRouteFallback variant="pricing" />}>
              <PricingPage />
            </Suspense>
          }
        />
        <Route
          path="/modules"
          element={
            <Suspense fallback={<MarketingRouteFallback variant="modules" />}>
              <ModulesPage />
            </Suspense>
          }
        />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/apply/:slug" element={<PublicApplyPage />} />
        <Route path="/apply/:slug/status" element={<PublicApplyStatusPage />} />
        <Route path="/verify/receipt/:code" element={<PublicReceiptVerifyPage />} />
        <Route path="/checkout/mock" element={<MockCheckoutPage />} />
        
        <Route 
          path="/logout" 
          element={<LogoutAction />} 
        />
        
        {/* Super Admin Routes — nested under Layout Outlet so sidebar always mounts */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="schools" element={<Schools />} />
          <Route path="schools/:schoolId" element={<SuperAdminSchoolDetail />} />
          <Route path="registrations" element={<SchoolRegistrations />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="plans" element={<SuperAdminPlans />} />
          <Route path="operators" element={<SuperAdminOperators />} />
          <Route path="reports" element={<SuperAdminReports />} />
          <Route path="logs" element={<SuperAdminLogs />} />
          <Route path="settings" element={<SuperAdminSettings />} />
          <Route path="help" element={<SuperAdminHelp />} />
          <Route path="help/:entryId" element={<SuperAdminHelpDetail />} />
          <Route path="guide" element={<PlatformGuidePage />} />
          <Route path="*" element={<NotFoundPage embedded />} />
        </Route>

        {/* School Routes */}
        <Route 
          path="/:slug/*" 
          element={
            <ProtectedRoute allowedRoles={[
              "SCHOOL_ADMIN", 
              "PRINCIPAL", 
              "TEACHER", 
              "STUDENT", 
              "PARENT", 
              "ACCOUNTANT",
              "REGISTRAR",
              "VPI",
              "VPA",
              "TRANSPORTATION",
              "MAINTENANCE",
              "LIBRARIAN",
              "NURSE",
              "COUNSELOR",
              "SECURITY",
              "IT_ADMIN",
              "PROCUREMENT",
              "ATHLETICS_DIRECTOR",
              "HOSTEL_WARDEN",
              "CAFETERIA_MANAGER"
            ]}>
              <Layout>
                <Routes>
                  {/* Shared Dashboard */}
                  <Route index element={<SchoolDashboard />} />
                  <Route path="dashboard" element={<SchoolDashboard />} />
                  <Route
                    path="onboarding"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL"]}>
                        <SchoolOnboardingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="profile" element={<Profile />} />
                  <Route path="guide" element={<PlatformGuidePage />} />
                  
                  {/* Academic Routes */}
                  <Route
                    path="classroom"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"]}>
                        <ClassroomList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="classroom/:id"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"]}>
                        <ClassroomFeed />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="classrooms"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]}>
                        <Classrooms />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="students" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "VPI", "VPA", "TEACHER", "COUNSELOR"]}>
                        <Students />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="grades" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <StudentGrades />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="grades/:studentId" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <StudentGrades />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="gradesheet/:examId" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <GradeSheet />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="gradesheet/:examId/:studentId" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <GradeSheet />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="report-card/:examId" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <ReportCard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="report-card/:examId/:studentId" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <ReportCard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="exams"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <Exams />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="exams/:examId"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <ExamDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="exams/:examId/online"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <OnlineExamAuthor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="exams/:examId/paper"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <ExamPaper />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="exam-paper-review"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]}>
                        <ExamPaperReview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <OnlineExams />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="question-bank"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <QuestionBank />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/:examId/take"
                    element={
                      <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <OnlineExamTake />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/:examId/take/:attemptId"
                    element={
                      <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <OnlineExamTake />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/:examId/results/:attemptId"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <OnlineExamResults />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/sample/preview"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <OnlineExamPreview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/:examId/preview"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <OnlineExamPreview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/:examId/proctor"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <OnlineExamProctor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="online-exams/:examId/proctor/:attemptId"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <OnlineExamProctorDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="gradebook"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <Gradebook />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="grade-review" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <GradeReview />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="grade-access"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]}>
                        <GradeEditAccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="lesson-plans"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]}>
                        <LessonPlans />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="schedules"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "REGISTRAR"]}>
                        <ClassSchedulePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="my-schedule"
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          "TEACHER",
                          "STUDENT",
                          "PARENT",
                          "VPA",
                          "COUNSELOR",
                          "IT_ADMIN",
                          "SCHOOL_ADMIN",
                          "PRINCIPAL",
                          "VPI",
                          "REGISTRAR",
                        ]}
                      >
                        <MySchedulePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="attendance" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "PARENT", "STUDENT", "HOSTEL_WARDEN"]}>
                        <Attendance />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="curriculum" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]}>
                        <Curriculum />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Finance Routes */}
                  <Route 
                    path="fees" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"]}>
                        <Fees />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="expenses" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "ACCOUNTANT"]}>
                        <Expenses />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="payroll" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "ACCOUNTANT"]}>
                        <Payroll />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Management Routes */}
                  <Route 
                    path="staff" 
                    element={
                      <ProtectedRoute allowedRoles={[
                        "SCHOOL_ADMIN", 
                        "PRINCIPAL", 
                        "VPA", 
                        "VPI", 
                        "SECURITY", 
                        "IT_ADMIN", 
                        "ATHLETICS_DIRECTOR"
                      ]}>
                        <StaffManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="roles"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "IT_ADMIN"]}>
                        <RoleAccessPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="staff-portal" 
                    element={
                      <ProtectedRoute allowedRoles={[
                        "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "REGISTRAR", "VPI", "VPA",
                        "TRANSPORTATION", "MAINTENANCE", "LIBRARIAN", "NURSE", "COUNSELOR", "SECURITY",
                        "IT_ADMIN", "PROCUREMENT", "ATHLETICS_DIRECTOR", "HOSTEL_WARDEN", "CAFETERIA_MANAGER"
                      ]}>
                        <StaffPortal />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="staff-tasks"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "VPI"]}>
                        <StaffTasks />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="leave-approval" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA"]}>
                        <LeaveApproval />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="announcements" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "VPI", "VPA", "PARENT", "STUDENT"]}>
                        <AnnouncementManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="notifications"
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "REGISTRAR",
                          "ACCOUNTANT", "MAINTENANCE", "STUDENT", "PARENT", "IT_ADMIN",
                          "LIBRARIAN", "NURSE", "COUNSELOR", "TRANSPORTATION", "SECURITY",
                          "PROCUREMENT", "ATHLETICS_DIRECTOR", "HOSTEL_WARDEN", "CAFETERIA_MANAGER",
                        ]}
                      >
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="documents"
                    element={
                      <ProtectedRoute allowedRoles={[
                        "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "TEACHER",
                        "STUDENT", "PARENT", "ACCOUNTANT", "IT_ADMIN", "LIBRARIAN", "NURSE", "COUNSELOR"
                      ]}>
                        <DocumentManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="reports" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "IT_ADMIN"]}>
                        <Reports />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="children" 
                    element={
                      <ProtectedRoute allowedRoles={["PARENT"]}>
                        <Children />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="my-applications"
                    element={
                      <ProtectedRoute allowedRoles={["PARENT"]}>
                        <MyApplications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="my-campus"
                    element={
                      <ProtectedRoute allowedRoles={["PARENT", "STUDENT"]}>
                        <MyCampus />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="pta"
                    element={
                      <ProtectedRoute allowedRoles={["PARENT", "SCHOOL_ADMIN", "PRINCIPAL"]}>
                        <Pta />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="admissions" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]}>
                        <Registrar />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="student-records" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]}>
                        <StudentRecords />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="transcripts" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]}>
                        <Transcripts />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="certificates"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "VPI"]}>
                        <Certificates />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="enrollment" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "REGISTRAR"]}>
                        <Enrollment />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="year-transition"
                    element={
                      <ProtectedRoute
                        allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"]}
                      >
                        <YearTransition />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="promotion-statement"
                    element={
                      <ProtectedRoute
                        allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"]}
                      >
                        <PromotionStatement />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="procurement" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "PROCUREMENT"]}>
                        <Procurement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="security" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SECURITY"]}>
                        <Security />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="bus-routes" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "TRANSPORTATION"]}>
                        <BusRoutes />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="drivers" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "TRANSPORTATION"]}>
                        <Drivers />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="vehicle-maintenance" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "TRANSPORTATION"]}>
                        <VehicleMaintenance />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="work-orders" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE"]}>
                        <WorkOrders />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="inventory" 
                    element={
                      <ProtectedRoute allowedRoles={[
                        "SCHOOL_ADMIN", "PRINCIPAL", "VPA", "PROCUREMENT", "LIBRARIAN", "CAFETERIA_MANAGER",
                        "ATHLETICS_DIRECTOR", "NURSE", "HOSTEL_WARDEN", "MAINTENANCE"
                      ]}>
                        <Inventory />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="maintenance" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE"]}>
                        <Maintenance />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="library" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "LIBRARIAN"]}>
                        <Library />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="clinic" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "NURSE"]}>
                        <Clinic />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="counseling" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "COUNSELOR"]}>
                        <Counseling />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="athletics" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "ATHLETICS_DIRECTOR"]}>
                        <Athletics />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="hostel" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "HOSTEL_WARDEN"]}>
                        <Hostel />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="cafeteria" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "CAFETERIA_MANAGER"]}>
                        <Cafeteria />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Settings Routes */}
                  <Route
                    path="calendar"
                    element={
                      <ProtectedRoute allowedRoles={[
                        "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "TEACHER",
                        "STUDENT", "PARENT", "ACCOUNTANT", "IT_ADMIN",
                        "TRANSPORTATION", "MAINTENANCE", "LIBRARIAN", "NURSE", "COUNSELOR",
                        "SECURITY", "PROCUREMENT", "ATHLETICS_DIRECTOR", "HOSTEL_WARDEN", "CAFETERIA_MANAGER",
                      ]}>
                        <CalendarPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="settings/academic-calendar" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"]}>
                        <AcademicCalendar />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="api-docs"
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "IT_ADMIN"]}>
                        <ApiDocsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="settings" 
                    element={
                      <ProtectedRoute allowedRoles={["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL", "REGISTRAR", "ACCOUNTANT"]}>
                        <SchoolSettings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<NotFoundPage embedded />} />
                </Routes>
              </Layout>

            </ProtectedRoute>
          } 
        />

        <Route
          path="/"
          element={
            accessToken ? (
              <Navigate
                to={
                  user?.role === "SUPER_ADMIN"
                    ? "/super-admin"
                    : school?.slug
                      ? `/${school.slug}/dashboard`
                      : "/login"
                }
                replace
              />
            ) : (
              <Suspense fallback={<MarketingRouteFallback variant="home" />}>
                <LandingPage />
              </Suspense>
            )
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </OfflineGate>
      </AppErrorBoundary>
    </Router>
  );
}
