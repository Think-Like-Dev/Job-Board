import type { RootState } from '@/store';
import Login from '@pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@pages/dashboard';
import Welcome from '@pages/Welcome';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Jobs from '@/pages/Jobs';
import CreateJob from '@pages/jobs/CreateJob';
import Layout from '@/components/common/Layout';
import { UserRole } from '@/types/auth.types';

const AppRoutes = () => {
  const { isAuthenticated, isInitialized, user } = useSelector(
    (state: RootState) => state.auth,
  );

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Recruiters get the workspace; other internal roles land on the welcome
  // screen until their own pages are built.
  if (user?.role === UserRole.RECRUITER) {
    return (
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/new" element={<CreateJob />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
