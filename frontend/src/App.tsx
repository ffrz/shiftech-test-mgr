import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { HomePage } from './pages/home/HomePage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { ProjectSettingsPage } from './pages/projects/ProjectSettingsPage';
import { TestPlansPage } from './pages/test-plans/TestPlansPage';
import { TestPlanDetailPage } from './pages/test-plans/TestPlanDetailPage';
import { TestCasesPage } from './pages/test-cases/TestCasesPage';
import { TestCaseDetailPage } from './pages/test-cases/TestCaseDetailPage';
import { TestRunResultDetailPage } from './pages/test-runs/TestRunResultDetailPage';
import { TestRunIssuesPage } from './pages/test-runs/TestRunIssuesPage';
import { IssueDetailPage } from './pages/issues/IssueDetailPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { UserDetailPage } from './pages/users/UserDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
          <Route path="/test-plans" element={<TestPlansPage />} />
          <Route path="/test-plans/:id" element={<TestPlanDetailPage />} />
          <Route path="/test-cases" element={<TestCasesPage />} />
          <Route path="/test-cases/:id" element={<TestCaseDetailPage />} />
          <Route path="/test-runs/:id" element={<TestRunResultDetailPage />} />
          <Route path="/test-runs/:runId/results/:resultId" element={<TestRunResultDetailPage />} />
          <Route path="/test-runs/:id/issues" element={<TestRunIssuesPage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
