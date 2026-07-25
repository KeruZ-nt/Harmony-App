import { useState, useEffect } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useToastStore } from '../../store/toastStore';
import { X, Calendar, Plus, Trash2, CheckCircle2, Circle, FastForward, Rewind, Edit2, Check } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { Select } from '../ui/Select';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Student, Session } from '../../types';

interface StudentSessionsModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestRenew?: () => void;
}

export function StudentSessionsModal({ student, isOpen, onClose, onRequestRenew }: StudentSessionsModalProps) {
  const { sessions, loading, fetchSessionsByStudent, updateSession, deleteSession, addSession, shiftSessionsForward } = useSessionStore();
  const { addToast } = useToastStore();
  const [addingSession, setAddingSession] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [hasPromptedRenewal, setHasPromptedRenewal] = useState(false);
  const pendingSessionsCount = sessions.filter(s => s.status === 'Programada').length;
  const isExpiring = pendingSessionsCount > 0 && pendingSessionsCount <= 2;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (isOpen && student) {
      fetchSessionsByStudent(student.id);
      setHasPromptedRenewal(false);
    }
  }, [isOpen, student, fetchSessionsByStudent]);

  useEffect(() => {
    if (isOpen && !loading && sessions.length > 0 && !hasPromptedRenewal) {
      const allCompleted = sessions.every(s => s.status !== 'Programada');
      if (allCompleted) {
        setHasPromptedRenewal(true);
        setConfirmModal({
          isOpen: true,
          title: 'Periodo Completado',
          message: 'Este alumno ya no tiene clases programadas pendientes. ¿Deseas renovar su periodo ahora?',
          onConfirm: () => {
            if (onRequestRenew) onRequestRenew();
          }
        });
      }
    }
  }, [isOpen, loading, sessions, hasPromptedRenewal, onRequestRenew]);

  if (!isOpen || !student) return null;

  const handleStatusToggle = async (session: Session) => {
    const newStatus = session.status === 'Completada' ? 'Programada' : 'Completada';
    try {
      await updateSession(session.id, { status: newStatus });
    } catch (error) {
      addToast({ message: 'Error al actualizar estado', type: 'error' });
    }
  };

  const handleObservationChange = async (sessionId: string, observation: string) => {
    try {
      await updateSession(sessionId, { observation });
    } catch (error) {
      addToast({ message: 'Error al guardar observación', type: 'error' });
    }
  };

  const handleAddSession = async (dayNum: number, daySessions: Session[]) => {
    setAddingSession(true);
    try {
      let nextDate = new Date();
      if (daySessions.length > 0) {
        // Find the last session for this day to append exactly 1 week after
        const lastSession = daySessions.reduce((latest, current) => {
          return new Date(current.start_time) > new Date(latest.start_time) ? current : latest;
        });
        nextDate = new Date(lastSession.start_time);
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        // Fallback: Just find the next occurrence of this day of the week
        const currentDay = nextDate.getDay();
        const diff = (dayNum - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + (diff === 0 ? 7 : diff));
        nextDate.setHours(16, 0, 0, 0); // Default to 16:00
      }

      const end = new Date(nextDate);
      end.setHours(nextDate.getHours() + 1);
      
      await addSession({
        workspace_id: student.workspace_id,
        student_id: student.id,
        start_time: nextDate.toISOString(),
        end_time: end.toISOString(),
        observation: null,
        status: 'Programada',
        google_event_id: null
      });
      addToast({ message: 'Clase agregada', type: 'success' });
    } catch (error) {
      addToast({ message: 'Error al agregar clase', type: 'error' });
    } finally {
      setAddingSession(false);
    }
  };

  const handleDeleteSession = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar clase?',
      message: 'Esta acción no se puede deshacer. ¿Deseas eliminar esta clase permanentemente?',
      onConfirm: async () => {
        try {
          await deleteSession(id);
          addToast({ message: 'Clase eliminada', type: 'success' });
        } catch (error) {
          addToast({ message: 'Error al eliminar', type: 'error' });
        }
      }
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleDateChange = async (sessionId: string, currentStart: string, currentEnd: string, newDateStr: string) => {
    if (!newDateStr) return;
    try {
      const start = new Date(currentStart);
      const end = new Date(currentEnd);
      
      const [year, month, day] = newDateStr.split('-').map(Number);
      start.setFullYear(year, month - 1, day);
      end.setFullYear(year, month - 1, day);

      await updateSession(sessionId, { 
        start_time: start.toISOString(),
        end_time: end.toISOString()
      });
      addToast({ message: 'Fecha actualizada', type: 'success' });
    } catch (error) {
      addToast({ message: 'Error al actualizar fecha', type: 'error' });
    }
  };

  const handleTimeChange = async (sessionId: string, currentStart: string, currentEnd: string, newTimeStr: string) => {
    if (!newTimeStr) return;
    try {
      const start = new Date(currentStart);
      const end = new Date(currentEnd);
      
      const [hours, minutes] = newTimeStr.split(':').map(Number);
      start.setHours(hours, minutes);
      end.setHours(hours + 1, minutes); // Assuming 1 hour duration by default

      await updateSession(sessionId, { 
        start_time: start.toISOString(),
        end_time: end.toISOString()
      });
      addToast({ message: 'Hora actualizada', type: 'success' });
    } catch (error) {
      addToast({ message: 'Error al actualizar hora', type: 'error' });
    }
  };

  const handleShift = (sessionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desplazar clases (+7 días)',
      message: '¿Deseas desplazar esta clase y TODAS LAS SIGUIENTES por 7 días hacia adelante?',
      onConfirm: async () => {
        try {
          await shiftSessionsForward(student.id, sessionId, 7);
          addToast({ message: 'Clases desplazadas 7 días', type: 'success' });
        } catch (error) {
          addToast({ message: 'Error al desplazar clases', type: 'error' });
        }
      }
    });
  };

  const handleRewind = (sessionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Retroceder clases (-7 días)',
      message: '¿Deseas retroceder esta clase y TODAS LAS SIGUIENTES por 7 días hacia atrás? (Útil para corregir errores)',
      onConfirm: async () => {
        try {
          await shiftSessionsForward(student.id, sessionId, -7);
          addToast({ message: 'Clases retrocedidas 7 días', type: 'success' });
        } catch (error) {
          addToast({ message: 'Error al retroceder clases', type: 'error' });
        }
      }
    });
  };

  const TIME_OPTIONS = Array.from({ length: 14 * 2 + 1 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
    return { label: timeString, value: timeString };
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-card w-[95vw] max-w-7xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between p-6 sm:p-8 border-b border-border/50 bg-card relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm border border-border/50 text-primary">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-sans text-foreground tracking-tight">
                Panel de Asistencia
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-medium text-muted-foreground">Alumno:</span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {student.first_name} {student.last_name}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="relative p-2.5 bg-card/50 hover:bg-card rounded-xl border border-border/50 shadow-sm transition-all text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expiration Banner */}
        {isExpiring && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm font-semibold text-amber-900">
                A este alumno le quedan {pendingSessionsCount} clase(s) para completar su periodo. Es momento de renovar.
              </p>
            </div>
            {onRequestRenew && (
              <button
                onClick={onRequestRenew}
                className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                Renovar Ahora
              </button>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-muted/50 p-6">
          {loading ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              Cargando sesiones...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              No hay clases programadas.
            </div>
          ) : (
            <div className={`grid gap-6 ${Array.from(new Set(sessions.map(s => new Date(s.start_time).getDay()))).length > 1 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'} items-start`}>
              {Array.from(new Set(sessions.map(s => new Date(s.start_time).getDay()))).sort().map(dayNum => {
                const daySessions = sessions.filter(s => new Date(s.start_time).getDay() === dayNum);
                const dayNames = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
                
                return (
                  <div key={dayNum} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-muted/80 px-4 py-3 font-bold text-sm text-foreground border-b border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span>{dayNames[dayNum]}</span>
                        <span className="bg-card px-2 py-0.5 rounded-md text-xs font-medium border border-border/50">{daySessions.length} clases</span>
                      </div>
                      <button
                        onClick={() => handleAddSession(dayNum, daySessions)}
                        disabled={addingSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-primary text-[11px] font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Manual
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted border-b border-border/50 text-[10px] font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-center w-8">Nº</th>
                            <th className="px-2 py-2">Fecha / Hora</th>
                            <th className="px-2 py-2 text-center w-28">Estado</th>
                            <th className="px-2 py-2">Notas</th>
                            <th className="px-2 py-2 text-center w-20"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {daySessions.map((session, index) => (
                            <tr key={session.id} className="hover:bg-muted transition-colors">
                              <td className="px-3 py-2 text-center text-muted-foreground font-medium text-xs">
                                {index + 1}
                              </td>
                              <td className="px-2 py-2">
                                {editingRowId === session.id ? (
                                  <div className="flex flex-col gap-1">
                                    <DatePicker
                                      value={session.start_time.split('T')[0]}
                                      onChange={(newDateStr) => {
                                        if (newDateStr !== session.start_time.split('T')[0]) {
                                          handleDateChange(session.id, session.start_time, session.end_time, newDateStr);
                                        }
                                      }}
                                      placeholder="Fecha"
                                    />
                                    <Select
                                      value={new Date(session.start_time).toTimeString().slice(0,5)}
                                      onChange={(newTimeStr) => {
                                        if (newTimeStr !== new Date(session.start_time).toTimeString().slice(0,5)) {
                                          handleTimeChange(session.id, session.start_time, session.end_time, newTimeStr);
                                        }
                                      }}
                                      options={TIME_OPTIONS}
                                      placeholder="Hora"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="capitalize font-medium text-foreground text-xs">{formatDate(session.start_time)}</span>
                                    <span className="text-muted-foreground text-[11px]">{formatTime(session.start_time)}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => handleStatusToggle(session)}
                                  className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all border ${
                                    session.status === 'Completada' 
                                      ? 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20' 
                                      : 'bg-muted/80 text-muted-foreground border-border/50 hover:bg-slate-200'
                                  }`}
                                >
                                  {session.status === 'Completada' ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                                  {session.status === 'Completada' ? 'Completada' : 'Programada'}
                                </button>
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  defaultValue={session.observation || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== session.observation) {
                                      handleObservationChange(session.id, e.target.value);
                                    }
                                  }}
                                  placeholder="Notas..."
                                  className="w-full bg-transparent border-b border-transparent focus:border-primary/30 outline-none py-1 text-xs text-foreground transition-all placeholder:text-muted-foreground/50"
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  {editingRowId === session.id ? (
                                    <>
                                      <button
                                        onClick={() => setEditingRowId(null)}
                                        className="p-1 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Finalizar edición"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRewind(session.id)}
                                        className="p-1 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                        title="Retroceder esta clase y las siguientes (-7 días)"
                                      >
                                        <Rewind className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleShift(session.id)}
                                        className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Desplazar esta clase y las siguientes (+7 días)"
                                      >
                                        <FastForward className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => setEditingRowId(session.id)}
                                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                      title="Editar fecha y hora"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar clase"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Los cambios en asistencia y observaciones se guardan automáticamente.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
