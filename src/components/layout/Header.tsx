import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { User, LogOut, Menu, Bell, Check, Users } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { usePortalStore } from '../../store/portalStore';


interface HeaderProps {
  hideLogo?: boolean;
  onMenuClick?: () => void;
}

export const Header = ({ hideLogo = false, onMenuClick }: HeaderProps) => {
  const { profile, signOut } = useAuthStore();
  const { activeWorkspace, activeRole, clearWorkspaces } = useWorkspaceStore();
  const { portalStudents, selectedStudentId, setSelectedStudentId } = usePortalStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, fetchNotifications, subscribeToWorkspace, unsubscribeFromWorkspace, markAsRead } = useNotificationStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      fetchNotifications(activeWorkspace.id);
      subscribeToWorkspace(activeWorkspace.id);
    }
    return () => {
      unsubscribeFromWorkspace();
    };
  }, [activeWorkspace?.id, fetchNotifications, subscribeToWorkspace, unsubscribeFromWorkspace]);

  const handleSignOut = async () => {
    clearWorkspaces();
    await signOut();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-background/60 backdrop-blur-xl border-b border-border/50 px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="lg:hidden rounded-lg p-2 hover:bg-foreground/5 text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        
        {!hideLogo && (
          <Link to={pathname === '/workspaces' ? '/workspaces' : '/'} className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-1.5 rounded-xl shadow-lg shadow-[#0082cc]/20 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Current Logo" className="h-6 w-6 object-cover mix-blend-screen" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block text-foreground">Harmony App</span>
          </Link>
        )}

        {/* Removed Workspace Name display as requested */}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Notifications */}
        {activeWorkspace && (activeRole === 'admin' || activeRole === 'owner') && pathname !== '/workspaces' && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen) markAsRead();
              }}
              className="relative p-2 rounded-full hover:bg-foreground/5 transition-colors"
            >
              <Bell className={`w-5 h-5 text-muted-foreground origin-top ${unreadCount > 0 ? 'animate-ring text-primary' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-background px-1 animate-in zoom-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-card/95 backdrop-blur-2xl border border-border text-popover-foreground shadow-2xl outline-none animate-in fade-in zoom-in-95 z-50">
                <div className="px-4 py-3 border-b border-border/50 flex justify-between items-center">
                  <p className="text-sm font-bold">Notificaciones</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay notificaciones nuevas.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="px-4 py-3 border-b border-border/50 hover:bg-foreground/5 transition-colors">
                        {notif.type === 'expiration' ? (
                          <>
                            <p className="text-sm font-medium">⚠️ {notif.studentName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notif.remainingClasses === 0 
                                ? 'Ha completado todas sus clases.' 
                                : `Le quedan ${notif.remainingClasses} clases programadas.`}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-primary">👋 {notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Hace un momento
                            </p>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Vertical Separator */}
      {(activeRole === 'owner' || activeRole === 'admin') && (
        <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>
      )}

      {/* User Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 rounded-full border border-transparent p-1 transition-colors hover:bg-muted"
        >
          <div className="flex flex-col items-end hidden sm:flex gap-1">
            <span className="text-sm font-medium leading-none">{profile?.full_name || 'Usuario'}</span>
            {pathname !== '/workspaces' && pathname !== '/profile' && activeRole && (
              <span className="text-xs text-muted-foreground capitalize">
                {activeRole === 'owner' || activeRole === 'admin' ? 'Administrador' : activeRole === 'student' ? 'Estudiante' : 'Colaborador'}
              </span>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted border">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{getInitials(profile?.full_name || undefined)}</span>
            )}
          </div>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-card/95 backdrop-blur-2xl border border-border text-popover-foreground shadow-2xl outline-none animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-sm font-medium leading-none">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{profile?.email}</p>
            <div className="p-1">
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <User className="h-4 w-4" />
                Mi Perfil
              </Link>
            </div>
            
            {/* Student Switcher in Dropdown */}
            {activeRole === 'student' && portalStudents.length > 1 && (
              <div className="border-t border-border/50 p-2">
                <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider mb-1">
                  Cambiar Alumno
                </p>
                <div className="space-y-1">
                  {portalStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        selectedStudentId === s.id 
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 opacity-70" />
                        <span className="truncate">{s.first_name}</span>
                      </div>
                      {selectedStudentId === s.id && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t p-1">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
};
