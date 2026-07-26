import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { supabase } from '../lib/supabase';
import { Users, Calendar, Clock, UserPlus, Activity, UserMinus, UsersRound, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Student } from '../types';

export default function Dashboard() {
  const { profile } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [sessionsToday, setSessionsToday] = useState<any[]>([]);
  const [classesWeekCount, setClassesWeekCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('created_at', { ascending: false });

        if (studentsError) throw studentsError;
        setStudents((studentsData as Student[]) || []);

        // 2. Fetch Sessions for Today & Week
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*, students(first_name, last_name, plan)')
          .eq('workspace_id', activeWorkspace.id)
          .gte('start_time', today.toISOString())
          .lt('start_time', nextWeek.toISOString())
          .order('start_time', { ascending: true });

        if (sessionsError) throw sessionsError;

        const allSessions = (sessionsData as any[]) || [];
        
        // Filtrar las de hoy
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const todaySessions = allSessions.filter(s => {
          const sessionDate = new Date(s.start_time);
          return sessionDate >= today && sessionDate < tomorrow;
        });

        setSessionsToday(todaySessions);
        setClassesWeekCount(allSessions.length);

        // 3. Fetch Recent Activity
        let activities: any[] = [];
      
        // Agregar las sesiones de hoy (hasta 5)
        todaySessions.slice(0, 5).forEach(session => {
          activities.push({
            id: 's-' + session.id,
            type: 'session',
            title: `Clase con ${session.students?.first_name}`,
            updated_at: session.start_time
          });
        });
  
        // Agregar los alumnos creados o actualizados recientemente
        if (studentsData && studentsData.length > 0) {
          const recentStudents = [...studentsData].sort((a, b) => 
            new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
          ).slice(0, 5);
          
          recentStudents.forEach(student => {
            const createdTime = new Date(student.created_at).getTime();
            const updatedTime = new Date(student.updated_at || student.created_at).getTime();
            // Considerar "Nuevo alumno" si se creó en los últimos 2 segundos en comparación con su actualización
            const isNew = (updatedTime - createdTime) < 2000; 

            activities.push({
              id: 'st-' + student.id + (isNew ? '-new' : '-upd'),
              type: isNew ? 'student_new' : 'student_update',
              title: isNew ? `Nuevo alumno: ${student.first_name}` : `Alumno actualizado: ${student.first_name} a ${student.status}`,
              updated_at: student.updated_at || student.created_at,
            });
          });
        }
  
        activities.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        // Quitar duplicados por id si hubiera y limitar a 5
        const uniqueActivities = activities.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        setRecentActivity(uniqueActivities.slice(0, 5));

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeWorkspace?.id]);

  const activosCount = students.filter(s => s.status === 'Activo').length;
  const inactivosCount = students.filter(s => s.status === 'Pausa' || s.status === 'Cesado').length;

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000); // minutos
    if (diff < 60) return `Hace ${diff} minuto(s)`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hace ${hours} hora(s)`;
    return `Hace ${Math.floor(hours / 24)} día(s)`;
  };

  const getChartData = () => {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Mes Anterior
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const prevMonthName = prevMonthDate.toLocaleDateString('es-ES', { month: 'short' });
    const currentMonthName = currentMonthDate.toLocaleDateString('es-ES', { month: 'short' });

    let prevActivos = 0;
    let prevInactivos = 0;

    students.forEach(s => {
      const created = new Date(s.created_at);
      const cese = s.cese_date ? new Date(s.cese_date) : null;
      
      // Si estuvo registrado antes del inicio del mes actual (existía el mes pasado)
      if (created < currentMonthDate) {
        // Estuvo inactivo/cesado durante el mes anterior?
        if (cese && cese < currentMonthDate) {
          prevInactivos++;
        } else {
          prevActivos++;
        }
      }
    });

    return [
      {
        name: prevMonthName.charAt(0).toUpperCase() + prevMonthName.slice(1),
        Activos: prevActivos,
        Inactivos: prevInactivos,
      },
      {
        name: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1),
        Activos: activosCount,
        Inactivos: inactivosCount,
      }
    ];
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section Espectacular */}
      <div className="mb-8 relative rounded-3xl overflow-hidden glass p-8 sm:p-10 border-0 shadow-xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-md shadow-primary/30 flex items-center justify-center text-white shrink-0 overflow-hidden">
            {activeWorkspace?.logo_url ? (
              <img src={activeWorkspace.logo_url} alt="Logo de academia" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-display font-bold leading-none tracking-tighter uppercase">
                {activeWorkspace?.name?.charAt(0) || profile?.full_name?.charAt(0) || 'A'}
              </span>
            )}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Bienvenido a <span className="text-primary font-bold">{activeWorkspace?.name || 'Harmony App'}</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-lg font-medium">
              Hola {profile?.full_name?.split(' ')[0]}, aquí tienes un resumen del estado de tu academia hoy.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards - Showcasing the Palette */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Card 1 - Primary Blue (Total Alumnos) */}
        <div className="glass rounded-3xl p-6 relative overflow-hidden group shadow-sm border-l-4 border-l-primary border-y-border/50 border-r-border/50 bg-card hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
              <UsersRound className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Alumnos</p>
              <h3 className="text-3xl font-display font-black mt-1 text-foreground tracking-tighter">{loading ? '-' : students.length}</h3>
            </div>
          </div>
        </div>

        {/* Card 2 - Success/Green Accent (Activos) */}
        <div className="glass rounded-3xl p-6 relative overflow-hidden group shadow-sm border-l-4 border-l-green-500 border-y-border/50 border-r-border/50 bg-card hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-green-500/20 rounded-2xl">
              <Users className="w-6 h-6 text-green-600 opacity-90" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Activos</p>
              <h3 className="text-3xl font-display font-black mt-1 text-foreground tracking-tighter">{loading ? '-' : activosCount}</h3>
            </div>
          </div>
        </div>

        {/* Card 3 - Orange (Inactivos) */}
        <div className="glass rounded-3xl p-6 relative overflow-hidden group shadow-sm border-l-4 border-l-secondary border-y-border/50 border-r-border/50 bg-card hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-secondary/10 rounded-2xl">
              <UserMinus className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Inactivos</p>
              <h3 className="text-3xl font-display font-black mt-1 text-foreground tracking-tighter">{loading ? '-' : inactivosCount}</h3>
            </div>
          </div>
        </div>

        {/* Card 4 - Yellow Accent (Clases Hoy) */}
        <div className="glass rounded-3xl p-6 relative overflow-hidden group shadow-sm border-l-4 border-l-accent border-y-border/50 border-r-border/50 bg-card hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-accent/10 rounded-2xl">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Clases Hoy</p>
              <h3 className="text-3xl font-display font-black mt-1 text-foreground tracking-tighter">{loading ? '-' : sessionsToday.length}</h3>
            </div>
          </div>
        </div>

        {/* Card 5 - Purple Accent (Clases Semanal) */}
        <div className="glass rounded-3xl p-6 relative overflow-hidden group shadow-sm border-l-4 border-l-purple-500 border-y-border/50 border-r-border/50 bg-card hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-purple-500/10 rounded-2xl">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Clases Sem.</p>
              <h3 className="text-3xl font-display font-black mt-1 text-foreground tracking-tighter">{loading ? '-' : classesWeekCount}</h3>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Comparative Chart */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/50 h-[460px] flex flex-col shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>
          <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            Crecimiento
          </h3>
          
          <div className="flex-1 w-full relative z-10 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-muted-foreground font-medium" dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-muted-foreground font-medium" />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '1rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '12px', padding: '10px 14px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="Activos" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Bar dataKey="Inactivos" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agenda Diaria */}
        <div className="glass rounded-3xl p-6 sm:p-8 h-[460px] flex flex-col border border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/10 transition-colors duration-700"></div>
          <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-secondary" />
            </div>
            Agenda Diaria <span className="text-muted-foreground font-medium text-base ml-2">({new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })})</span>
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 relative z-10 custom-scrollbar">
            {loading ? (
              <div className="text-center flex h-full items-center justify-center text-muted-foreground">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted"></div>
                  <div className="w-32 h-4 rounded bg-muted"></div>
                </div>
              </div>
            ) : sessionsToday.length === 0 ? (
              <div className="text-center flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <div className="w-20 h-20 bg-secondary/5 rounded-full flex items-center justify-center shadow-[0_0_40px_-10px_var(--color-secondary)] border border-secondary/20">
                  <Calendar className="w-8 h-8 text-secondary/60" />
                </div>
                <p className="font-medium text-muted-foreground">No hay clases programadas para hoy.</p>
              </div>
            ) : (
              sessionsToday.map((session, i) => (
                <div key={session.id || i} className="flex items-center gap-5 p-4 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20 transition-all group/item cursor-default">
                  <div className="px-4 py-3 bg-gradient-to-b from-primary/10 to-primary/5 text-primary border border-primary/10 rounded-xl text-sm font-black min-w-[90px] text-center shadow-sm group-hover/item:shadow-primary/20 transition-all">
                    {formatTime(session.start_time)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold font-display text-lg text-foreground capitalize">
                      {session.students?.first_name} {session.students?.last_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-muted/80 text-muted-foreground rounded-md">
                        {session.students?.plan}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-primary/5 text-primary rounded-md">
                        {session.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/50 h-[460px] flex flex-col shadow-sm">
          <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-accent" />
            </div>
            Actividad Reciente
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Cargando...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 min-h-[200px]">
                <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center shadow-[0_0_40px_-10px_var(--color-accent)] border border-accent/20">
                  <Activity className="w-8 h-8 text-accent/60" />
                </div>
                <p className="font-medium text-muted-foreground">No hay actividad reciente.</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 pb-5 border-b border-border/40 last:border-0 last:pb-0 group/act">
                  <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform group-hover/act:scale-125 ${activity.type.startsWith('student') ? 'bg-primary shadow-primary/30' : 'bg-secondary shadow-secondary/30'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground leading-snug">{activity.title}</p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{getTimeAgo(activity.updated_at)}</p>
                  </div>
                  {activity.type === 'student_new' ? (
                    <UserPlus className="w-4 h-4 text-muted-foreground/30 mt-1" />
                  ) : activity.type === 'student_update' ? (
                    <UsersRound className="w-4 h-4 text-muted-foreground/30 mt-1" />
                  ) : (
                    <Calendar className="w-4 h-4 text-muted-foreground/30 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
