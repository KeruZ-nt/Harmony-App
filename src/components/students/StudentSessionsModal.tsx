import { useState, useEffect } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useToastStore } from '../../store/toastStore';
import { X, Calendar, Plus, Trash2, CheckCircle2, Circle, FastForward, Rewind, Edit2, Check, Save } from 'lucide-react';
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
  const [editingSessionData, setEditingSessionData] = useState<{
    id: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [hasPromptedRenewal, setHasPromptedRenewal] = useState(false);
  
  const [shiftPrompt, setShiftPrompt] = useState<{
    sessionId: string;
    currentStart: string;
    currentEnd: string;
    newStartIso: string;
    newEndIso: string;
  } | null>(null);

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

  const handleAddSession = async () => {
    setAddingSession(true);
    try {
      let nextDate = new Date();
      if (sessions.length > 0) {
        const sortedSessions = [...sessions].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        const lastSession = sortedSessions[sortedSessions.length - 1];
        nextDate = new Date(lastSession.start_time);
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
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

  // These are handled locally now, so we don't need handleDateChange/handleTimeChange anymore

  const confirmShift = async (type: 'Reprogramación' | 'Cambio de Horario') => {
    if (!shiftPrompt) return;
    try {
      if (type === 'Reprogramación') {
        await updateSession(shiftPrompt.sessionId, { 
          start_time: shiftPrompt.newStartIso,
          end_time: shiftPrompt.newEndIso,
          type: 'Reprogramación'
        });
      } else {
        // Shift using Zustand state to avoid Supabase timezone/DST quirks
        const targetTime = new Date(shiftPrompt.currentStart).getTime();
        const targetDay = new Date(shiftPrompt.currentStart).getDay();
        const targetHours = new Date(shiftPrompt.currentStart).getHours();
        const targetMins = new Date(shiftPrompt.currentStart).getMinutes();

        const sessionsToShift = sessions.filter(
          s => s.id !== shiftPrompt.sessionId && 
               new Date(s.start_time).getTime() > targetTime && 
               new Date(s.start_time).getDay() === targetDay &&
               new Date(s.start_time).getHours() === targetHours &&
               new Date(s.start_time).getMinutes() === targetMins
        );

        const newDate = new Date(shiftPrompt.newStartIso);
        const origDate = new Date(shiftPrompt.currentStart);
        const dayDiff = Math.round((newDate.getTime() - origDate.getTime()) / (1000 * 3600 * 24));
        const newHours = newDate.getHours();
        const newMins = newDate.getMinutes();

        const isPause = origDate.getDay() === newDate.getDay();

        const updatePromises = sessionsToShift.map(s => {
          const nextStart = new Date(s.start_time);
          nextStart.setDate(nextStart.getDate() + dayDiff);
          nextStart.setHours(newHours, newMins, 0, 0);
          
          const nextEnd = new Date(s.end_time);
          nextEnd.setDate(nextEnd.getDate() + dayDiff);
          nextEnd.setHours(newHours + 1, newMins, 0, 0);

          return updateSession(s.id, {
            start_time: nextStart.toISOString(),
            end_time: nextEnd.toISOString(),
            type: isPause ? (s.type || 'Regular') : 'Cambio de Horario'
          });
        });

        const currentSession = sessions.find(s => s.id === shiftPrompt.sessionId);
        await updateSession(shiftPrompt.sessionId, { 
          start_time: shiftPrompt.newStartIso,
          end_time: shiftPrompt.newEndIso,
          type: isPause ? (currentSession?.type || 'Regular') : 'Cambio de Horario'
        });
        
        await Promise.all(updatePromises);
      }
      addToast({ message: 'Clase actualizada', type: 'success' });
      await fetchSessionsByStudent(student.id);
    } catch (error) {
      addToast({ message: 'Error al actualizar', type: 'error' });
    } finally {
      setShiftPrompt(null);
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
          setEditingSessionData(null);
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
          setEditingSessionData(null);
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
        <div className="relative overflow-hidden bg-card border-b border-border p-5 sm:px-8 sm:py-6 flex items-start justify-between">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative flex items-center gap-3 sm:gap-5 w-full pr-10 sm:pr-0">
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm border border-border/50 text-primary">
              <Calendar className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h2 className="text-[17px] sm:text-2xl leading-tight font-bold font-sans text-foreground tracking-tight truncate max-w-[200px] sm:max-w-none">
                Panel de Asistencia
              </h2>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1.5">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:inline">Alumno:</span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-sm font-semibold text-primary max-w-full">
                  <span className="truncate">{student.first_name} {student.last_name}</span>
                </span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="absolute top-5 right-5 sm:relative sm:top-0 sm:right-0 p-2.5 bg-card/50 hover:bg-card rounded-xl border border-border/50 shadow-sm transition-all text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-200">
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
            <div className="grid gap-6 grid-cols-1 items-start">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="bg-muted/80 px-4 py-3 font-bold text-sm text-foreground border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span>Todas las clases</span>
                    <span className="bg-card px-2 py-0.5 rounded-md text-xs font-medium border border-border/50">{sessions.length} clases</span>
                  </div>
                  <button
                    onClick={() => handleAddSession()}
                    disabled={addingSession}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-primary text-[11px] font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Manual
                  </button>
                </div>
                <div className="overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-0">
                  <table className="w-full text-sm text-left min-w-[500px] sm:min-w-0">
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
                      {[...sessions]
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map((session, index) => (
                        <tr key={session.id} className="hover:bg-muted transition-colors">
                          <td className="px-3 py-2 text-center text-muted-foreground font-medium text-xs">
                            {index + 1}
                          </td>
                          <td className="px-2 py-2">
                            {editingSessionData?.id === session.id ? (
                              <div className="flex flex-col gap-1">
                                <DatePicker
                                  value={editingSessionData.start_time.split('T')[0]}
                                  onChange={(newDateStr) => {
                                    if (newDateStr) {
                                      const start = new Date(editingSessionData.start_time);
                                      const end = new Date(editingSessionData.end_time);
                                      const [year, month, day] = newDateStr.split('-').map(Number);
                                      start.setFullYear(year, month - 1, day);
                                      end.setFullYear(year, month - 1, day);
                                      setEditingSessionData({ ...editingSessionData, start_time: start.toISOString(), end_time: end.toISOString() });
                                    }
                                  }}
                                  placeholder="Fecha"
                                />
                                <Select
                                  value={new Date(editingSessionData.start_time).toTimeString().slice(0,5)}
                                  onChange={(newTimeStr) => {
                                    if (newTimeStr) {
                                      const start = new Date(editingSessionData.start_time);
                                      const end = new Date(editingSessionData.end_time);
                                      const [hours, minutes] = newTimeStr.split(':').map(Number);
                                      start.setHours(hours, minutes);
                                      end.setHours(hours + 1, minutes);
                                      setEditingSessionData({ ...editingSessionData, start_time: start.toISOString(), end_time: end.toISOString() });
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
                              {editingSessionData?.id === session.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (editingSessionData.start_time !== session.start_time) {
                                        setShiftPrompt({
                                          sessionId: session.id,
                                          currentStart: session.start_time,
                                          currentEnd: session.end_time,
                                          newStartIso: editingSessionData.start_time,
                                          newEndIso: editingSessionData.end_time
                                        });
                                      }
                                      setEditingSessionData(null);
                                    }}
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
                                  onClick={() => setEditingSessionData({ id: session.id, start_time: session.start_time, end_time: session.end_time })}
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
            </div>
          )}
          
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted flex items-center justify-between gap-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground flex-1">
            Los cambios en asistencia y observaciones se guardan automáticamente.
          </p>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-6 sm:py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Save className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline">Guardar y Cerrar</span>
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

      {/* Modal for Shift Type */}
      {shiftPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl flex flex-col p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg text-foreground">Tipo de Modificación</h3>
              <p className="text-sm text-muted-foreground mt-1">¿Cómo deseas aplicar este cambio de fecha u hora?</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => confirmShift('Reprogramación')}
                className="w-full text-left p-4 rounded-xl border border-border hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
              >
                <div className="font-bold text-cyan-700 dark:text-cyan-400 text-sm group-hover:text-cyan-600 mb-1">
                  Reprogramación
                </div>
                <div className="text-xs text-muted-foreground">
                  Solo moverá esta clase en específico a la nueva fecha y hora. Las demás clases no se verán afectadas.
                </div>
              </button>

              <button
                onClick={() => confirmShift('Cambio de Horario')}
                className="w-full text-left p-4 rounded-xl border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
              >
                <div className="font-bold text-purple-700 dark:text-purple-400 text-sm group-hover:text-purple-600 mb-1">
                  Cambio de Horario Definitivo
                </div>
                <div className="text-xs text-muted-foreground">
                  Moverá esta clase y TODAS LAS FUTURAS que caían en el mismo día, respetando la nueva frecuencia.
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShiftPrompt(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-foreground/5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
