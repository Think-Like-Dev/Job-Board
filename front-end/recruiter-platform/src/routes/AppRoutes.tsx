import { lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/common/Layout';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { PERMISSIONS } from '@/permissions/permissions';
import { usePermissions } from '@/permissions/usePermissions';
import type { RootState } from '@/store';

/**
 * Every page is code-split, so a role only downloads the screens it can open.
 * Gating is by permission (never role) and the API enforces the same strings.
 */
const Login = lazy(() => import('@pages/Login'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@pages/dashboard'));
const Welcome = lazy(() => import('@pages/Welcome'));
const Jobs = lazy(() => import('@/pages/Jobs'));
const CreateJob = lazy(() => import('@pages/jobs/CreateJob'));
const EditJob = lazy(() => import('@pages/jobs/EditJob'));
const Applications = lazy(() => import('@pages/jobs/Applications'));
const Candidates = lazy(() => import('@pages/candidates'));
const CandidateDetail = lazy(() => import('@pages/candidates/detail'));
const Team = lazy(() => import('@pages/team'));
const Sessions = lazy(() => import('@pages/sessions'));
const Onboard = lazy(() => import('@pages/Onboard'));

function RouteFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  );
}

const AppRoutes = () => {
  const { isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth,
  );
  const { can } = usePermissions();

  if (!isInitialized) {
    return <RouteFallback />;
  }

  // The workspace is the set of screens behind `dashboard.read`. Roles without
  // it (hiring managers today, more roles later) land on the welcome screen.
  const hasWorkspace = can(PERMISSIONS.DASHBOARD_READ);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/*
         * Public by design: an invitation or reset link must render even when
         * the visitor already has a session (an admin previewing the page, or
         * someone finishing an invitation in a second tab).
         */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboard/:token" element={<Onboard />} />

        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : hasWorkspace ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route
              path="jobs"
              element={
                <PermissionRoute permission={PERMISSIONS.JOB_READ}>
                  <Jobs />
                </PermissionRoute>
              }
            />
            <Route
              path="jobs/new"
              element={
                <PermissionRoute permission={PERMISSIONS.JOB_CREATE}>
                  <CreateJob />
                </PermissionRoute>
              }
            />
            <Route
              path="jobs/:id/edit"
              element={
                <PermissionRoute permission={PERMISSIONS.JOB_UPDATE}>
                  <EditJob />
                </PermissionRoute>
              }
            />
            <Route
              path="jobs/:id/applications"
              element={
                <PermissionRoute permission={PERMISSIONS.APPLICATION_READ}>
                  <Applications />
                </PermissionRoute>
              }
            />
            <Route
              path="candidates"
              element={
                <PermissionRoute permission={PERMISSIONS.CANDIDATE_READ}>
                  <Candidates />
                </PermissionRoute>
              }
            />
            <Route
              path="candidates/:id"
              element={
                <PermissionRoute permission={PERMISSIONS.CANDIDATE_READ}>
                  <CandidateDetail />
                </PermissionRoute>
              }
            />
            <Route
              path="team"
              element={
                <PermissionRoute permission={PERMISSIONS.USER_READ}>
                  <Team />
                </PermissionRoute>
              }
            />
            <Route
              path="sessions"
              element={
                <PermissionRoute permission={PERMISSIONS.SESSION_READ_SELF}>
                  <Sessions />
                </PermissionRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<Welcome />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
