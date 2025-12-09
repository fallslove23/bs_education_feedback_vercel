import { useEffect, lazy, Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "@/components/ProtectedRoute";
import DefaultRedirect from "@/components/DefaultRedirect";


// pages
// Lazy load pages for code splitting and better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const DashboardSurveyResults = lazy(() => import("./pages/DashboardSurveyResults"));
const DashboardCourseReports = lazy(() => import("./pages/DashboardCourseReports"));
const DashboardPolicyManagement = lazy(() => import("./pages/DashboardPolicyManagement"));
const DashboardInstructorManagement = lazy(() => import("./pages/DashboardInstructorManagement"));
const DashboardTemplateManagement = lazy(() => import("./pages/DashboardTemplateManagement"));
const DashboardBackup = lazy(() => import("./pages/DashboardBackup"));
const DashboardMyStats = lazy(() => import("./pages/DashboardMyStats"));
const DashboardEmailLogs = lazy(() => import("./pages/DashboardEmailLogs"));
const DashboardSystemLogs = lazy(() => import("./pages/DashboardSystemLogs"));
const DashboardUserManagement = lazy(() => import("./pages/DashboardUserManagement"));
const DashboardCourseManagement = lazy(() => import("./pages/DashboardCourseManagement"));
const DashboardCourseStatistics = lazy(() => import("./pages/DashboardCourseStatistics"));
const DashboardCumulativeData = lazy(() => import("./pages/DashboardCumulativeData"));
const DashboardInstructorDetails = lazy(() => import("./pages/DashboardInstructorDetails"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const InstructorManagement = lazy(() => import("./pages/InstructorManagement"));
const SurveyManagementV2 = lazy(() => import("./pages/SurveyManagementV2"));
const SurveyBuilder = lazy(() => import("./pages/SurveyBuilder"));
const SurveyParticipate = lazy(() => import("./pages/SurveyParticipate"));
const SurveyParticipateSession = lazy(() => import("./pages/SurveyParticipateSession"));
const SurveyPreview = lazy(() => import("./pages/SurveyPreview"));
const TemplateManagement = lazy(() => import("./pages/TemplateManagement"));
const TemplateBuilder = lazy(() => import("./pages/TemplateBuilder"));
const SurveyResults = lazy(() => import("./pages/SurveyResults"));
const SurveyDetailedAnalysis = lazy(() => import("./pages/SurveyDetailedAnalysis"));
const DeveloperTestScreen = lazy(() => import("./pages/DeveloperTestScreen"));
const ShortUrlRedirect = lazy(() => import("./pages/ShortUrlRedirect"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SurveyComplete = lazy(() => import("./pages/SurveyComplete"));

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fullPath = `${location.pathname}${location.search}${location.hash}`;

    try {
      const stored = window.sessionStorage.getItem("recentPaths");
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      const filtered = parsed.filter((path) => path && path !== fullPath);
      const updated = [fullPath, ...filtered].slice(0, 10);

      window.sessionStorage.setItem("recentPaths", JSON.stringify(updated));
    } catch (storageError) {
      console.error("최근 방문 경로를 저장하지 못했습니다", storageError);
    }
  }, [location.pathname, location.search, location.hash]);

  const routes = (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Index />} />

        <Route path="/auth" element={<Auth />} />

        <Route
          path="/default-redirect"
          element={
            <ProtectedRoute>
              <DefaultRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardOverview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/surveys"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <SurveyManagementV2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/results"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "instructor", "director"]}>
              <DashboardSurveyResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/instructors"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardInstructorManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/courses"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardCourseManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/course-statistics"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "instructor"]}>
              <DashboardCourseStatistics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/cumulative-data"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "director"]}>
              <DashboardCumulativeData />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/templates"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardTemplateManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instructors"
          element={
            <ProtectedRoute>
              <InstructorManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/surveys"
          element={
            <ProtectedRoute>
              <SurveyManagementV2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/survey-management"
          element={
            <ProtectedRoute>
              <SurveyManagementV2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/surveys-v2"
          element={
            <ProtectedRoute>
              <SurveyManagementV2 />
            </ProtectedRoute>
          }
        />

        <Route path="/survey/:surveyId" element={<SurveyParticipate />} />
        <Route path="/survey-session/:surveyId" element={<SurveyParticipateSession />} />
        <Route path="/survey-complete" element={<SurveyComplete />} />

        {/* 짧은 URL 리다이렉트 라우트 */}
        <Route path="/s/:shortCode" element={<ShortUrlRedirect />} />

        <Route
          path="/survey-preview/:surveyId"
          element={
            <ProtectedRoute>
              <SurveyPreview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/survey-builder/:surveyId"
          element={
            <ProtectedRoute>
              <SurveyBuilder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/template-management"
          element={
            <ProtectedRoute>
              <TemplateManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/template-builder/:templateId"
          element={
            <ProtectedRoute>
              <TemplateBuilder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <SurveyResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/survey-results"
          element={
            <ProtectedRoute>
              <SurveyResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/survey-detailed-analysis/:surveyId"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "instructor", "director"]}>
              <SurveyDetailedAnalysis />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/detailed-analysis/:surveyId"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "instructor", "director"]}>
              <SurveyDetailedAnalysis />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "instructor", "director"]}>
              <Index />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/my-stats"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "instructor", "director"]}>
              <DashboardMyStats />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/email-logs"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardEmailLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/system-logs"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardSystemLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardUserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/course-reports"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "director", "instructor"]}>
              <DashboardCourseReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/instructors/:instructorId"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator", "director", "instructor"]}>
              <DashboardInstructorDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/policy-management"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardPolicyManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/backup"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <DashboardBackup />
            </ProtectedRoute>
          }
        />

        <Route
          path="/developer-test"
          element={
            <ProtectedRoute>
              <DeveloperTestScreen />
            </ProtectedRoute>
          }
        />

        <Route path="/access-denied" element={<AccessDenied />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  return routes;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;