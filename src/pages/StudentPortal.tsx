import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Calendar, Clock, Loader2, Music, CheckCircle2, History, GraduationCap, User, Gift, FileText, Repeat } from 'lucide-react';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  plan: string;
  frequency: string;
  status: string;
  grade_level?: string;
  age?: number;
  birth_date?: string;
  schedule_days?: string;
}

interface SessionData {
  id: string;
  start_time: string;
  end_time: string;
  observation: string;
}

export default function StudentPortal() {
  const { user, profile } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionData[]>([]);
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);

  const student = students.find(s => s.id === selectedStudentId) || null;

  useEffect(() => {
    async function fetchStudents() {
      if (!user || !activeWorkspace) return;
      
      try {
        setLoading(true);
        // Obtener los registros de estudiantes ligados a este perfil
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: true });

        if (studentsError) {
          console.error("Error fetching students", studentsError);
          setLoading(false);
          return;
        }

        setStudents(studentsData || []);
        if (studentsData && studentsData.length > 0) {
          setSelectedStudentId(studentsData[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Fetch portal error:", err);
        setLoading(false);
      }
    }

    fetchStudents();
  }, [user?.id, activeWorkspace?.id]);

  useEffect(() => {
    async function fetchSessions() {
      if (!selectedStudentId) return;
      
      try {
        setLoading(true);
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .eq('student_id', selectedStudentId)
          .order('start_time', { ascending: true });

        if (sessionsError) {
          console.error("Error fetching sessions", sessionsError);
        } else if (sessionsData) {
          const now = new Date();
          const upcoming = sessionsData.filter(s => new Date(s.end_time) > now);
          
          setUpcomingSessions(upcoming);
          setAllSessions([...sessionsData]);
        }
      } catch (err) {
        console.error("Fetch sessions error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [selectedStudentId]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const getDayColorClass = (dateString: string) => {
    const day = new Date(dateString).getDay();
    // Using the exact colorimetry provided: #0082cc, #e86d11, #f4a305, #a5d8f7
    switch (day) {
      case 1: return 'bg-[#0082cc]';
      case 2: return 'bg-[#e86d11]';
      case 3: return 'bg-[#f4a305]';
      case 4: return 'bg-[#a5d8f7]';
      case 5: return 'bg-[#0082cc]';
      case 6: return 'bg-[#e86d11]';
      case 0: return 'bg-[#f4a305]';
      default: return 'bg-[#0082cc]';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      
      {/* Encabezado Espectacular */}
      <div className="mb-4 shrink-0 relative rounded-3xl overflow-hidden glass p-4 sm:p-5 border-0 shadow-xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-md shadow-primary/30 flex items-center justify-center text-white shrink-0">
            <span className="text-2xl font-display font-bold leading-none tracking-tighter uppercase">
              {activeWorkspace?.name?.charAt(0) || profile?.full_name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              ¡Hola, {profile?.full_name?.split(' ')[0] || 'Apoderado'}!
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-lg font-medium">
              Bienvenido a tu portal en <span className="text-primary font-bold">{activeWorkspace?.name}</span>.
            </p>
          </div>
        </div>
        
        {/* Selector de alumnos (solo si hay más de 1) */}
        {students.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border/20 relative z-10 flex flex-wrap gap-2">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  selectedStudentId === s.id 
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105' 
                  : 'bg-white/50 hover:bg-white text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.first_name} {s.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!student ? (
        <div className="glass rounded-3xl p-8 text-center flex flex-col items-center">
          <Music className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-bold text-foreground">Aún no tienes un perfil de estudiante asignado</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            El administrador de la academia necesita vincular tu cuenta con tu perfil de estudiante. Por favor, comunícate con la administración.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1 min-h-0">
          
          {/* COLUMNA IZQUIERDA (Mis Datos, Plan/Frecuencia, Horarios) */}
          <div className="space-y-4 lg:col-span-3">
            
            {/* Mis Datos (Principal) */}
            <div className="glass rounded-3xl p-4 relative overflow-hidden group shadow-sm bg-card/60 border border-border/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0082cc]/5 rounded-full -translate-y-16 translate-x-16 pointer-events-none"></div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#0082cc] relative z-10">
                <User className="w-5 h-5 text-[#0082cc]" /> Mis Datos
              </h2>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary"/> Grado</p>
                  <p className="text-sm font-bold text-foreground tracking-tight truncate">{student.grade_level || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1.5"><User className="w-4 h-4 text-primary"/> Edad</p>
                  <p className="text-base font-medium text-foreground tracking-tight">{student.age ? `${student.age} años` : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1.5"><Gift className="w-4 h-4 text-primary"/> Cumple.</p>
                  <p className="text-sm font-medium text-foreground tracking-tight truncate">
                    {student.birth_date ? `${new Date(student.birth_date).getDate()} de ${new Date(student.birth_date).toLocaleDateString('es-ES', { month: 'short' })}` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan y Frecuencia (Apilados) */}
            <div className="glass rounded-3xl p-4 relative overflow-hidden group shadow-sm bg-card border border-border/50 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-4 h-4 text-[#e86d11]"/> Plan</p>
                  <p className="text-lg font-medium tracking-tight mt-1 text-foreground">{student.plan}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-black shadow-sm ${
                  student.status === 'Activo' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                  student.status === 'Pausa' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                  'bg-destructive/10 text-destructive'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {student.status}
                </span>
              </div>
              <div className="h-px w-full bg-border/50"></div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Repeat className="w-4 h-4 text-[#e86d11]"/> Frecuencia</p>
                <p className="text-base font-medium tracking-tight text-foreground">{student.frequency}</p>
              </div>
            </div>

            {/* Horarios Base */}
            {student.schedule_days && (
              <div className="glass rounded-3xl p-4 relative overflow-hidden group shadow-sm bg-card border border-border/50">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#f4a305]">
                  <Clock className="w-5 h-5 text-[#f4a305]" /> Horarios Base
                </h2>
                <div className="flex flex-col gap-2">
                  {student.schedule_days.split(/y|,|\n/).map((day, i) => {
                    const trimmed = day.trim();
                    if (!trimmed) return null;
                    return (
                      <div key={i} className="flex items-center gap-2.5 bg-muted/30 hover:bg-muted/50 transition-colors p-2 rounded-xl border border-border/50">
                        <div className="w-6 h-6 rounded-lg bg-[#f4a305]/10 flex items-center justify-center shrink-0">
                          <Clock className="w-3 h-3 text-[#f4a305]" />
                        </div>
                        <span className="text-sm font-bold text-foreground capitalize">{trimmed}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA CENTRAL (Clases Restantes, Próximas Clases) */}
          <div className="space-y-4 lg:col-span-4">
            
            {/* Clases Restantes */}
            <div className="glass rounded-3xl p-4 relative overflow-hidden group shadow-sm bg-gradient-to-br from-[#e86d11] to-[#c25a0e] text-white border-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 pointer-events-none"></div>
              <p className="text-xs text-white/90 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 relative z-10"><Calendar className="w-4 h-4 text-white"/> Clases Restantes</p>
              <p className="text-3xl font-display font-black leading-none relative z-10">{upcomingSessions.length}</p>
            </div>

            {/* Próximas Clases (uno debajo del otro) */}
            <div className="glass rounded-3xl p-4 bg-gradient-to-br from-card to-background border border-border/50 shadow-md">
              <h2 className="text-base font-display font-bold mb-3 flex items-center gap-2 text-[#0082cc]">
                <div className="w-7 h-7 rounded-full bg-[#0082cc]/10 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-[#0082cc]" />
                </div>
                Próximas Clases
              </h2>
              
              {upcomingSessions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {upcomingSessions.slice(0, 2).map((session) => (
                    <div key={session.id} className="flex flex-row items-center gap-3 bg-card/50 border border-border rounded-xl p-2.5 transition-all duration-300 hover:bg-card hover:shadow-md">
                      <div className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[55px] shadow-sm text-white ${getDayColorClass(session.start_time)}`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(session.start_time).toLocaleDateString('es-ES', { month: 'short' })}</span>
                        <span className="text-base font-display font-bold leading-none mt-0.5">{new Date(session.start_time).getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {new Date(session.start_time).toLocaleDateString('es-ES', { weekday: 'long' })}
                        </p>
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span className="text-[11px] font-medium">
                            {new Date(session.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                  No tienes clases futuras programadas.
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA (Todas las Sesiones) */}
          <div className="lg:col-span-5 h-full min-h-0">
            <div className="glass rounded-3xl p-4 border border-border/50 h-full flex flex-col">
              <h2 className="text-base font-display font-bold mb-3 flex items-center gap-2 text-[#0082cc]">
                <div className="w-7 h-7 rounded-full bg-[#0082cc]/10 flex items-center justify-center">
                  <History className="w-3.5 h-3.5 text-[#0082cc]" />
                </div>
                Todas las Sesiones
              </h2>
              
              {allSessions.length > 0 ? (
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {allSessions.map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/40 hover:bg-muted/30 hover:border-border transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${new Date(session.end_time) > new Date() ? getDayColorClass(session.start_time) : 'bg-muted-foreground/30'} transition-colors`}></div>
                        <div>
                          <p className="text-sm font-bold text-foreground capitalize">
                            {new Date(session.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(session.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      {session.observation ? (
                        <div className="text-xs text-muted-foreground bg-foreground/5 px-3 py-1.5 rounded-lg max-w-[200px] truncate" title={session.observation}>
                          {session.observation}
                        </div>
                      ) : (
                        new Date(session.end_time) > new Date() && (
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md">Programada</span>
                        )
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground text-sm m-auto">
                  Aún no tienes un historial de clases registradas.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
