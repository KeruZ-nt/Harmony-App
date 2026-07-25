import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';

export const ProtectedRoute = () => {
  const { user, profile, loading: authLoading } = useAuthStore();
  const { activeWorkspace, loading: wsLoading } = useWorkspaceStore();
  const location = useLocation();

  if (authLoading || wsLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si no hay workspace, asumo que algo falló o no ha terminado el registro.
  // Por simplicidad, si no hay perfil o workspace, mostramos error o redirigimos
  if (!profile || !activeWorkspace) {
    return <SignOutAndRedirect />;
  }

  const role = profile.role;

  // Lógica de ruteo basado en Rol
  if (role === 'student') {
    // Si es estudiante, permitimos /student-portal y /profile
    if (location.pathname !== '/student-portal' && location.pathname !== '/profile') {
      return <Navigate to="/student-portal" replace />;
    }
  } else {
    // Si es admin/owner y trata de ir al portal de alumno, mandarlo al dashboard
    if (location.pathname === '/student-portal') {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

// Componente auxiliar para desloguear y redirigir
const SignOutAndRedirect = () => {
  useEffect(() => {
    supabase.auth.signOut();
  }, []);
  
  return <Navigate to="/login" replace />;
};
