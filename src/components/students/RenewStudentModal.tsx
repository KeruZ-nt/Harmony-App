import { useState, useEffect } from 'react';
import { useStudentStore } from '../../store/studentStore';
import { useToastStore } from '../../store/toastStore';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { X, Calendar, Loader2 } from 'lucide-react';
import type { Student, PlanType, FrequencyType } from '../../types';

interface RenewStudentModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

export function RenewStudentModal({ student, isOpen, onClose }: RenewStudentModalProps) {
  const { renewStudent } = useStudentStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plan: 'Mensual' as PlanType,
    frequency: '1 vez por semana' as FrequencyType,
  });

  const [selectedSchedules, setSelectedSchedules] = useState<{day: string, time: string}[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Pre-fill data when modal opens
  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        plan: student.plan || 'Mensual',
        frequency: student.frequency || '1 vez por semana',
      });
      
      // Parse existing schedule_days if possible
      if (student.schedule_days) {
        const parsed = student.schedule_days.split(' y ').map(s => {
          const [day, time] = s.split(' a las ');
          return { day, time };
        }).filter(s => s.day && s.time);
        setSelectedSchedules(parsed);
      } else {
        setSelectedSchedules([]);
      }
    }
  }, [student, isOpen]);

  // Auto-calculate optimal start date when schedules change
  useEffect(() => {
    if (selectedSchedules.length > 0) {
      const dayMap: Record<string, number> = {
        'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
        'Jueves': 4, 'Viernes': 5, 'Sábado': 6
      };
      
      const now = new Date();
      let closestDate = new Date(now);
      closestDate.setDate(now.getDate() + 30); // Initialize far in the future
      
      const currentDayOfWeek = now.getDay();
      
      selectedSchedules.forEach(sched => {
        const targetDay = dayMap[sched.day];
        let daysUntil = targetDay - currentDayOfWeek;
        if (daysUntil < 0) {
          daysUntil += 7; // Next week
        }
        
        const candidateDate = new Date(now);
        candidateDate.setDate(now.getDate() + daysUntil);
        
        if (candidateDate < closestDate) {
          closestDate = candidateDate;
        }
      });
      
      setStartDate(`${closestDate.getFullYear()}-${String(closestDate.getMonth() + 1).padStart(2, '0')}-${String(closestDate.getDate()).padStart(2, '0')}`);
    }
  }, [selectedSchedules]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.frequency === '1 vez por semana' && selectedSchedules.length !== 1) {
      addToast({ message: 'Debes seleccionar exactamente 1 día y horario de clase.', type: 'error' });
      return;
    }
    
    if (formData.frequency === '2 veces por semana' && selectedSchedules.length !== 2) {
      addToast({ message: 'Debes seleccionar exactamente 2 días y horarios de clase.', type: 'error' });
      return;
    }

    setLoading(true);
    
    try {
      await renewStudent(student.id, formData.plan, formData.frequency, startDate, selectedSchedules);
      addToast({ message: '¡Periodo renovado exitosamente! Las nuevas clases han sido generadas.', type: 'success' });
      onClose();
    } catch (error: any) {
      addToast({ message: error.message || 'Error al renovar periodo', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFrequencyChange = (newFreq: string) => {
    setFormData(prev => ({ ...prev, frequency: newFreq as FrequencyType }));
    if (newFreq === '1 vez por semana' && selectedSchedules.length > 1) {
      setSelectedSchedules(prev => [prev[0]]);
    }
  };

  const handleScheduleChange = (index: number, field: 'day' | 'time', value: string) => {
    setSelectedSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      return newSchedules;
    });
  };

  const addSchedule = () => {
    if (formData.frequency === '1 vez por semana' && selectedSchedules.length >= 1) return;
    if (formData.frequency === '2 veces por semana' && selectedSchedules.length >= 2) return;
    setSelectedSchedules(prev => [...prev, { day: 'Lunes', time: '16:00' }]);
  };

  const removeSchedule = (index: number) => {
    setSelectedSchedules(prev => prev.filter((_, i) => i !== index));
  };

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const TIMES = Array.from({ length: 14 * 2 + 1 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-blue-50/50">
          <div>
            <h2 className="text-xl font-bold font-sans text-blue-900">Renovar Periodo</h2>
            <p className="text-sm text-blue-700/70">
              Renovando a: <span className="font-semibold text-blue-800">{student.first_name} {student.last_name}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-muted/50">
          <form id="renew-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Plan y Horarios de Renovación
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Plan</label>
                  <Select
                    value={formData.plan}
                    onChange={(val) => setFormData(prev => ({ ...prev, plan: val as PlanType }))}
                    options={[
                      { label: 'Mensual', value: 'Mensual' },
                      { label: 'Trimestral', value: 'Trimestral' },
                      { label: 'Semestral', value: 'Semestral' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Frecuencia</label>
                  <Select
                    value={formData.frequency}
                    onChange={handleFrequencyChange}
                    options={[
                      { label: '1 vez por semana', value: '1 vez por semana' },
                      { label: '2 veces por semana', value: '2 veces por semana' }
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-foreground">
                    Días y Horarios
                  </label>
                  {((formData.frequency === '1 vez por semana' && selectedSchedules.length < 1) ||
                    (formData.frequency === '2 veces por semana' && selectedSchedules.length < 2)) && (
                    <button
                      type="button"
                      onClick={addSchedule}
                      className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                      + Agregar horario
                    </button>
                  )}
                </div>

                {selectedSchedules.map((schedule, index) => (
                  <div key={index} className="flex items-end gap-3 animate-in slide-in-from-top-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-foreground mb-1">Día</label>
                      <Select
                        value={schedule.day}
                        onChange={(val) => handleScheduleChange(index, 'day', val)}
                        options={DAYS.map(d => ({ label: d, value: d }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-foreground mb-1">Hora</label>
                      <Select
                        value={schedule.time}
                        onChange={(val) => handleScheduleChange(index, 'time', val)}
                        options={TIMES.map(t => ({ label: t, value: t }))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSchedule(index)}
                      className="p-2.5 mb-[1px] text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar horario">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-foreground mb-1">El nuevo periodo iniciará el:</label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                />
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Las nuevas clases se generarán automáticamente hacia adelante a partir de esta fecha, respetando los días seleccionados.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted/80 rounded-xl transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="renew-form"
            disabled={loading || selectedSchedules.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generar Nuevas Clases
          </button>
        </div>
      </div>
    </div>
  );
}
