import { Link, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { 
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  BookOpen,
  X
} from 'lucide-react';

const adminNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Alumnos', href: '/students', icon: Users },
  { name: 'Horario', href: '/schedule', icon: Calendar },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

const studentNavigation = [
  { name: 'Mi Portal', href: '/student-portal', icon: BookOpen },
];

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (val: boolean) => void;
}

export const Sidebar = ({ isOpen = false, setIsOpen }: SidebarProps) => {
  const { pathname } = useLocation();
  const { activeWorkspace, activeRole } = useWorkspaceStore();

  if (!activeWorkspace) {
    return null;
  }

  const navigation = activeRole === 'student' ? studentNavigation : adminNavigation;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && setIsOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col glass border-r border-border/50 px-4 py-6 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2 pb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-1.5 rounded-xl shadow-lg shadow-[#0082cc]/20 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Harmony App Logo" className="h-6 w-6 object-cover mix-blend-screen" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Harmony App</span>
          </div>
          {setIsOpen && (
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden rounded-lg p-1.5 hover:bg-foreground/5 transition-colors text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen && setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                    : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};
