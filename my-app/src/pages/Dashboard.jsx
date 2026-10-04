import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Each role's dashboard is its own chunk, so a student never downloads the admin code.
const DASHBOARDS = {
  admin: React.lazy(() => import('./AdminDashboard')),
  teacher: React.lazy(() => import('./TeacherDashboard')),
  student: React.lazy(() => import('./StudentDashboard')),
  parent: React.lazy(() => import('./ParentDashboard')),
  staff: React.lazy(() => import('./StaffDashboard')),
};

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-ink-950">
    <div className="w-10 h-10 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" aria-label="Loading" />
  </div>
);

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <Loader />;

  const RoleDashboard = DASHBOARDS[user.role];
  if (!RoleDashboard) return <div>Invalid role</div>;

  return (
    <React.Suspense fallback={<Loader />}>
      <RoleDashboard />
    </React.Suspense>
  );
};

export default Dashboard;
