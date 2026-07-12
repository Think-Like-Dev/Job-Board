import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage/LandingPage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import ApplicationsPage from '../pages/ApplicationsPage/ApplicationsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/jobs/:jobId" element={<LandingPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/applications" element={<ApplicationsPage />} />
    </Routes>
  );
}
