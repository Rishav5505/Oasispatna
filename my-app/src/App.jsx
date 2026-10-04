import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Home from './pages/public/Home';
// Home loads eagerly (landing page); everything else is split into its own chunk
const About = React.lazy(() => import('./pages/public/About'));
const Courses = React.lazy(() => import('./pages/public/Courses'));
const Faculty = React.lazy(() => import('./pages/public/Faculty'));
const Results = React.lazy(() => import('./pages/public/Results'));
const Contact = React.lazy(() => import('./pages/public/Contact'));
const Gallery = React.lazy(() => import('./pages/public/Gallery'));
const Admission = React.lazy(() => import('./pages/public/Admission'));
const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
import AIFloatingBuddy from './components/AIFloatingBuddy';
import { Toaster } from 'react-hot-toast';
import './App.css';

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-ink-950">
    <div className="w-10 h-10 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" aria-label="Loading" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { token } = React.useContext(AuthContext);
  return token ? children : <Navigate to="/login" />;
};

// Keeps the public website in light mode; only dashboards honour the dark theme.
const RouteTheme = () => {
  const { pathname } = useLocation();
  const { setForceLight } = useTheme();
  React.useEffect(() => {
    setForceLight(!pathname.startsWith('/dashboard'));
  }, [pathname, setForceLight]);
  return null;
};

function App() {
  return (
    <AuthProvider>
      <div className="overflow-x-hidden w-full min-h-screen">
        <Router>
          <RouteTheme />
          <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/faculty" element={<Faculty />} />
            <Route path="/results" element={<Results />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/admission" element={<Admission />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </React.Suspense>
          <AIFloatingBuddy />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: { fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', borderRadius: '14px', background: '#111', color: '#fff', padding: '12px 16px' },
              success: { iconTheme: { primary: '#f37021', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
