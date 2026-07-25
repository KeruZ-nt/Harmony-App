import { useState, useEffect, useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useStudentStore } from '../store/studentStore';
import { useToastStore } from '../store/toastStore';
import { ChevronLeft, ChevronRight, Search, CalendarOff, X } from 'lucide-react';
import { DatePicker } from '../components/ui/DatePicker';
import { Select } from '../components/ui/Select';
import type { Session } from '../types';

export default function Schedule() {
  const { activeWorkspace, blockedDays, fetchBlockedDays } = useWorkspaceStore();
  const { sessions, fetchWorkspaceSessions, updateSession, blockDay } = useSessionStore();
  const { fetchStudents } = useStudentStore();
  const { addToast } = useToastStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [blockReason, setBlockReason] = useState('Feriado');
  const [creatingHoliday, setCreatingHoliday] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      fetchStudents(activeWorkspace.id);
      
      // Fetch +/- 1 month around current date to cover week transitions
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 30);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);
      
      fetchWorkspaceSessions(
        activeWorkspace.id,
        start.toISOString(),
        end.toISOString()
      );
      
      fetchBlockedDays(
        activeWorkspace.id,
        start.toISOString(),
        end.toISOString()
      );
    }
  }, [activeWorkspace?.id, currentDate]);

  // Week calculation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const days = [];
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    
    date.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const nextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const term = searchTerm.toLowerCase();
    return sessions.filter(s => {
      const name = `${s.students?.first_name || ''} ${s.students?.last_name || ''}`.toLowerCase();
      return name.includes(term);
    });
  }, [sessions, searchTerm]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData('sessionId', sessionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    
    // Check if target day is blocked
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const isBlocked = blockedDays.some(b => b.date === targetDateStr);
    if (isBlocked) {
      addToast({ message: 'No puedes mover clases a un día bloqueado', type: 'error' });
      return;
    }

    const sessionId = e.dataTransfer.getData('sessionId');
    if (!sessionId) return;

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const currentStart = new Date(session.start_time);
    
    // Check if dropped on the same day
    if (currentStart.getDate() === targetDate.getDate() && currentStart.getMonth() === targetDate.getMonth()) {
      return;
    }

    // Keep the same time, just change the date
    const newStart = new Date(targetDate);
    newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);
    
    const currentEnd = new Date(session.end_time);
    const newEnd = new Date(targetDate);
    newEnd.setHours(currentEnd.getHours(), currentEnd.getMinutes(), 0, 0);

    try {
      await updateSession(session.id, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      });
      addToast({ message: 'Clase reprogramada exitosamente', type: 'success' });
      
      // Refresh to ensure we have the latest sorted data
      if (activeWorkspace) {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - 30);
        const end = new Date(currentDate);
        end.setDate(end.getDate() + 30);
        fetchWorkspaceSessions(activeWorkspace.id, start.toISOString(), end.toISOString());
      }
    } catch (error) {
      addToast({ message: 'Error al reprogramar clase', type: 'error' });
    }
  };

  const handleCreateHoliday = async () => {
    if (!activeWorkspace || !holidayDate) return;
    setCreatingHoliday(true);
    try {
      await blockDay(activeWorkspace.id, holidayDate, blockReason);
      addToast({ message: `Día bloqueado por ${blockReason} exitosamente`, type: 'success' });
      setShowHolidayModal(false);
      setHolidayDate('');
      setBlockReason('Feriado');
      
      // Refresh current view
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 30);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);
      fetchWorkspaceSessions(activeWorkspace.id, start.toISOString(), end.toISOString());
      fetchBlockedDays(activeWorkspace.id, start.toISOString(), end.toISOString());
    } catch (error) {
      addToast({ message: 'Error al bloquear día', type: 'error' });
    } finally {
      setCreatingHoliday(false);
    }
  };

  const TIME_OPTIONS = Array.from({ length: 14 * 2 + 1 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return { label: `${hour.toString().padStart(2, '0')}:${minute}`, value: `${hour.toString().padStart(2, '0')}:${minute}` };
  });

  return (
    <div className="flex flex-col w-full h-full min-h-[500px]">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex glass rounded-2xl shadow-sm border border-border/50 p-1.5">
            <button onClick={prevWeek} className="p-2 hover:bg-muted/80 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={goToday} className="px-5 py-2 text-sm font-bold text-foreground hover:bg-muted/80 rounded-xl transition-colors">
              Hoy
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-muted/80 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <h1 className="text-2xl font-display font-black text-foreground capitalize tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-64 glass border border-border/60 rounded-2xl text-sm focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 shadow-sm transition-all placeholder:text-muted-foreground/70"
            />
          </div>
          <button
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 text-amber-700 hover:to-amber-500/10 rounded-2xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <CalendarOff className="w-4 h-4" />
            Bloquear Día
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 glass border border-border/50 rounded-3xl shadow-md overflow-hidden flex flex-col relative group/cal">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        {/* Header Row */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border/50 bg-foreground/[0.02] relative z-10 backdrop-blur-md">
          <div className="border-r border-border/50"></div>
          {weekDays.map((date, i) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const day = date.toLocaleDateString('es-ES', { weekday: 'short' });
            return (
              <div key={i} className={`px-2 py-2.5 text-center border-r last:border-r-0 border-border/50 transition-colors ${isToday ? 'bg-primary/5' : ''}`}>
                <div className="text-center font-bold text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{day}</div>
                <div className={`text-center font-display font-semibold text-2xl ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 relative bg-muted/50 min-h-[300px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] h-full absolute inset-0">
            
            {/* Time Labels */}
            <div className="border-r border-border relative bg-foreground/[0.02] h-full">
              {Array.from({ length: 15 }).map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-full text-center text-[11px] font-bold text-muted-foreground" 
                  style={{ 
                    top: `${(i / 14) * 100}%`, 
                    transform: i === 0 ? 'translateY(20%)' : i === 14 ? 'translateY(-100%)' : 'translateY(-50%)' 
                  }}
                >
                  {(i + 8).toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {weekDays.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const dateStr = date.toISOString().split('T')[0];
              const blockedDay = blockedDays.find(b => b.date === dateStr);
              const isBlocked = !!blockedDay;

              const daySessions = filteredSessions.filter(s => {
                const sDate = new Date(s.start_time);
                return sDate.getDate() === date.getDate() && sDate.getMonth() === date.getMonth() && sDate.getFullYear() === date.getFullYear();
              });

              return (
                <div
                  key={i}
                  className={`relative border-r last:border-r-0 border-border h-full ${isToday ? 'bg-primary/[0.03]' : ''} ${isBlocked ? 'bg-amber-500/[0.04]' : ''}`}
                  onDragOver={isBlocked ? undefined : handleDragOver}
                  onDrop={isBlocked ? undefined : (e) => handleDrop(e, date)}
                >
                  {isBlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                      <div className="flex items-center gap-4 -rotate-90 opacity-60">
                        <span className="text-2xl font-black uppercase tracking-widest whitespace-nowrap text-amber-500">
                          {blockedDay.reason}
                        </span>
                        <CalendarOff className="w-8 h-8 text-amber-500 rotate-90" />
                      </div>
                    </div>
                  )}

                  {/* Grid Lines */}
                  {Array.from({ length: 14 }).map((_, j) => (
                    <div key={j} className="absolute w-full border-b border-border/50" style={{ top: `${((j + 1) / 14) * 100}%` }}></div>
                  ))}

                  {/* Sessions */}
                  {daySessions.map(session => {
                    const sessionDate = new Date(session.start_time);
                    const hours = sessionDate.getHours();
                    const minutes = sessionDate.getMinutes();
                    // 14 hours total (8:00 to 22:00)
                    const offsetHours = (hours - 8) + (minutes / 60);
                    const topPercentage = (offsetHours / 14) * 100;
                    const heightPercentage = (1 / 14) * 100; // 1 hour duration
                    
                    return (
                      <div
                        key={session.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session.id)}
                        onClick={() => setEditingSession(session)}
                        className="absolute w-full p-0.5 transition-all hover:scale-[1.02] hover:z-20 cursor-pointer"
                        style={{ top: `${topPercentage}%`, height: `${heightPercentage}%`, minHeight: '40px' }}
                      >
                        <div className={`h-full p-2 sm:p-2.5 rounded-xl border shadow-sm flex flex-col justify-center overflow-hidden backdrop-blur-md relative ${
                          session.status === 'Feriado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-900' : 
                          session.status === 'Asistió' ? 'bg-green-500/10 border-green-500/20 text-green-900' : 
                          session.status === 'Falta' ? 'bg-red-500/10 border-red-500/20 text-red-900' : 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 text-primary-foreground'
                        }`}>
                          {session.status !== 'Feriado' && session.status !== 'Asistió' && session.status !== 'Falta' && (
                             <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                          )}
                          <div className="flex items-center justify-between gap-1 h-full relative z-10">
                            <div className={`font-display font-bold text-xs sm:text-sm truncate leading-tight ${
                              session.status === 'Asistió' || session.status === 'Falta' || session.status === 'Feriado' ? '' : 'text-foreground'
                            }`}>
                              {session.students?.first_name} <span className="hidden sm:inline">{session.students?.last_name}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 justify-center">
                              <span className={`text-[10px] font-bold px-1.5 py-1 rounded leading-none ${
                                session.status === 'Programada' ? 'bg-primary/10 text-primary' :
                                session.status === 'Asistió' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                session.status === 'Feriado' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                'bg-muted/80 text-foreground'
                              }`}>
                                {session.status}
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground bg-card/50 px-1 rounded leading-none">
                                {sessionDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Mini-Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border/50 rounded-t-3xl">
              <h3 className="font-bold text-lg">Editar Clase</h3>
              <button onClick={() => setEditingSession(null)} className="p-1.5 hover:bg-foreground/5 rounded-xl transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4 bg-muted">
              <div className="bg-card p-3 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Alumno</p>
                <p className="font-bold">{editingSession.students?.first_name} {editingSession.students?.last_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Fecha</label>
                  <DatePicker
                    value={editingSession.start_time.split('T')[0]}
                    onChange={(newDate) => {
                      const newStart = new Date(editingSession.start_time);
                      const [y,m,d] = newDate.split('-');
                      newStart.setFullYear(Number(y), Number(m)-1, Number(d));
                      
                      const newEnd = new Date(editingSession.end_time);
                      newEnd.setFullYear(Number(y), Number(m)-1, Number(d));
                      
                      setEditingSession({ ...editingSession, start_time: newStart.toISOString(), end_time: newEnd.toISOString() });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Hora</label>
                  <Select
                    value={new Date(editingSession.start_time).toTimeString().slice(0,5)}
                    onChange={(newTime) => {
                      const newStart = new Date(editingSession.start_time);
                      const [h,m] = newTime.split(':');
                      newStart.setHours(Number(h), Number(m), 0, 0);
                      
                      const newEnd = new Date(newStart);
                      newEnd.setHours(newStart.getHours() + 1);
                      
                      setEditingSession({ ...editingSession, start_time: newStart.toISOString(), end_time: newEnd.toISOString() });
                    }}
                    options={TIME_OPTIONS}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Estado</label>
                <Select
                  value={editingSession.status}
                  onChange={(val) => setEditingSession({ ...editingSession, status: val })}
                  options={[
                    { label: 'Programada', value: 'Programada' },
                    { label: 'Asistió', value: 'Asistió' },
                    { label: 'Falta', value: 'Falta' },
                    { label: 'Reprogramada', value: 'Reprogramada' },
                    { label: 'Feriado', value: 'Feriado' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Observación</label>
                <input
                  type="text"
                  value={editingSession.observation || ''}
                  onChange={(e) => setEditingSession({ ...editingSession, observation: e.target.value })}
                  placeholder="Añadir nota..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 shadow-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border/50 bg-card flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await updateSession(editingSession.id, {
                      start_time: editingSession.start_time,
                      end_time: editingSession.end_time,
                      status: editingSession.status,
                      observation: editingSession.observation
                    });
                    addToast({ message: 'Clase actualizada', type: 'success' });
                    setEditingSession(null);
                    
                    // Refresh current view
                    if (activeWorkspace) {
                      const start = new Date(currentDate);
                      start.setDate(start.getDate() - 30);
                      const end = new Date(currentDate);
                      end.setDate(end.getDate() + 30);
                      fetchWorkspaceSessions(activeWorkspace.id, start.toISOString(), end.toISOString());
                    }
                  } catch (e) {
                    addToast({ message: 'Error al actualizar', type: 'error' });
                  }
                }}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Day Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-amber-50 rounded-t-3xl">
              <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-amber-600" />
                Bloquear Día
              </h3>
              <button onClick={() => setShowHolidayModal(false)} className="p-1.5 hover:bg-foreground/5 rounded-xl transition-colors">
                <X className="w-4 h-4 text-amber-900/50" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Selecciona un día y motivo. La columna del calendario se bloqueará y <strong>todas las clases de ese día se desplazarán automáticamente 7 días</strong> hacia el futuro para no perderse.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Motivo</label>
                <Select
                  value={blockReason}
                  onChange={setBlockReason}
                  options={[
                    { label: 'Feriado', value: 'Feriado' },
                    { label: 'Día Reservado (Ocupado)', value: 'Reservado' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Fecha</label>
                <DatePicker
                  value={holidayDate}
                  onChange={setHolidayDate}
                />
              </div>
            </div>
            <div className="p-4 border-t border-border/50 bg-muted flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/80 rounded-xl"
                disabled={creatingHoliday}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateHoliday}
                disabled={!holidayDate || creatingHoliday}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
              >
                {creatingHoliday ? 'Procesando...' : 'Bloquear Día'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
