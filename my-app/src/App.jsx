import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Courses from './pages/public/Courses';
import Faculty from './pages/public/Faculty';
import Results from './pages/public/Results';
import Contact from './pages/public/Contact';
import Gallery from './pages/public/Gallery';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AIFloatingBuddy from './components/AIFloatingBuddy';
import { Toaster } from 'react-hot-toast';
import './App.css';

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/faculty" element={<Faculty />} />
            <Route path="/results" element={<Results />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
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
