import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { StudentLayout } from './components/layout/StudentLayout';

// Auth Pages (Assuming these exist or we will adapt them)
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ResetPassword } from './pages/auth/ResetPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Schedule from './pages/Schedule';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import StudentPortal from './pages/StudentPortal';
import Profile from './pages/Profile';

import { ToastContainer } from './components/ui/Toast';

function App() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return (
    <Router>
      <ToastContainer />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          
          {/* Admin Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Student Routes & Shared (Profile) */}
          <Route element={<StudentLayout />}>
            <Route path="/student-portal" element={<StudentPortal />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

        </Route>
      </Routes>
    </Router>
  );
}

export default App;
