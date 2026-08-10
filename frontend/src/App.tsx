import { Routes, Route, useLocation } from 'react-router-dom';
import { useDialogResizeFix } from './hooks/useDialogResizeFix';
import { AppLayout } from './components/layout/AppLayout';
import { AppToast } from './components/ui/AppToast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { HomePage } from './pages/home/HomePage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { ProjectSettingsPage } from './pages/projects/ProjectSettingsPage';
import { TestPlansPage } from './pages/test-plans/TestPlansPage';
import { TestPlanDetailPage } from './pages/test-plans/TestPlanDetailPage';
import { TestCasesPage } from './pages/test-cases/TestCasesPage';
import { TestCaseDetailPage } from './pages/test-cases/TestCaseDetailPage';
import { TestSuitesPage } from './pages/test-suites/TestSuitesPage';
import { TestSuiteDetailPage } from './pages/test-suites/TestSuiteDetailPage';
import { TestSuiteItemDetailPage } from './pages/test-suites/TestSuiteItemDetailPage';
import { TestRunResultDetailPage } from './pages/test-runs/TestRunResultDetailPage';
import { TestRunIssuesPage } from './pages/test-runs/TestRunIssuesPage';
import { IssueDetailPage } from './pages/issues/IssueDetailPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { PublicProfilePage } from './pages/profiles/PublicProfilePage';

function App() {
  useDialogResizeFix();
  const location = useLocation();

  return (
    <>
      <AppToast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage key={location.pathname} />} />
            <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
            <Route path="/test-plans" element={<TestPlansPage />} />
            <Route path="/test-plans/:id" element={<TestPlanDetailPage />} />
            <Route path="/test-cases" element={<TestCasesPage />} />
            <Route path="/test-cases/:id" element={<TestCaseDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/test-suites" element={<TestSuitesPage />} />
            <Route path="/test-suites/:suiteId/items/:itemId" element={<TestSuiteItemDetailPage />} />
            <Route path="/test-suites/:id" element={<TestSuiteDetailPage />} />
            <Route path="/test-runs/:id/issues" element={<TestRunIssuesPage />} />
            <Route path="/test-runs/:id" element={<TestRunResultDetailPage />} />
            <Route path="/issues/:id" element={<IssueDetailPage />} />
            <Route path="/:usernameWithAt" element={<PublicProfilePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
