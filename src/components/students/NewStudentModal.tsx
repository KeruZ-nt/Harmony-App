import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useStudentStore } from '../../store/studentStore';
import { useToastStore } from '../../store/toastStore';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { X, User, Phone, Mail, Calendar, BookOpen, Loader2 } from 'lucide-react';
import type { PlanType, FrequencyType } from '../../types';

interface NewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewStudentModal({ isOpen, onClose }: NewStudentModalProps) {
  const { activeWorkspace } = useWorkspaceStore();
  const { addStudent } = useStudentStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    schedule_days: '',
    grade_level: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    plan: 'Mensual' as PlanType,
    frequency: '1 vez por semana' as FrequencyType,
  });
  const [selectedSchedules, setSelectedSchedules] = useState<{day: string, time: string}[]>([]);
  
  // State for Date of Birth
  const [birthDate, setBirthDate] = useState('');

  // States for Start Date
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [isStartDateManuallySet, setIsStartDateManuallySet] = useState(false);

  useEffect(() => {
    // Calcular el próximo día de clase basado en los seleccionados
    // Only auto-calculate if the user hasn't manually set a date yet,
    // or if the date hasn't been initialized.
    if (selectedSchedules.length > 0 && !isStartDateManuallySet) {
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

  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatPhone = (val: string) => {
    if (val.startsWith('+')) return val;
    const digits = val.replace(/\D/g, '');
    if (digits.length === 9) {
      return `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return val;
  };

  const handlePhoneBlur = () => {
    setFormData(prev => ({ ...prev, contact_phone: formatPhone(prev.contact_phone) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

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
      await addStudent({
        workspace_id: activeWorkspace.id,
        profile_id: null, // No auth user linked yet
        first_name: formData.first_name,
        last_name: formData.last_name,
        schedule_days: selectedSchedules.length > 0 ? selectedSchedules.map(s => `${s.day} a las ${s.time}`).join(' y ') : null,
        grade_level: formData.grade_level || null,
        birth_date: birthDate || null,
        age: calculateAge(birthDate),
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        plan: formData.plan,
        frequency: formData.frequency,
        status: 'Activo',
        start_date: startDate,
        cese_date: null,
      }, selectedSchedules);

      addToast({ message: 'Alumno registrado correctamente', type: 'success' });
      resetForm();
      onClose();
    } catch (error: any) {
      addToast({ message: error.message || 'Error al guardar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      schedule_days: '',
      grade_level: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      plan: 'Mensual' as PlanType,
      frequency: '1 vez por semana' as FrequencyType,
    });
    setSelectedSchedules([]);
    setBirthDate('');
    
    const d = new Date();
    setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setIsStartDateManuallySet(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFrequencyChange = (newFreq: string) => {
    setFormData(prev => ({ ...prev, frequency: newFreq as FrequencyType }));
    
    if (newFreq === '1 vez por semana' && selectedSchedules.length > 1) {
      setSelectedSchedules([selectedSchedules[0]]);
    }
  };

  const toggleDay = (day: string) => {
    const maxDays = formData.frequency === '1 vez por semana' ? 1 : 2;
    
    if (selectedSchedules.some(s => s.day === day)) {
      setSelectedSchedules(prev => prev.filter(s => s.day !== day));
    } else {
      if (selectedSchedules.length < maxDays) {
        setSelectedSchedules(prev => [...prev, { day, time: '16:00' }]);
      } else if (maxDays === 1) {
        // Si es 1 día y elige otro, reemplazamos el actual
        setSelectedSchedules([{ day, time: '16:00' }]);
      }
    }
  };

  const updateTime = (day: string, time: string) => {
    setSelectedSchedules(prev => prev.map(s => s.day === day ? { ...s, time } : s));
  };

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const TIME_OPTIONS = Array.from({ length: 14 * 2 + 1 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8; // Desde 8 AM hasta las 22:00
    const minute = i % 2 === 0 ? '00' : '30';
    const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
    return { label: timeString, value: timeString };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-sans">Registrar Nuevo Alumno</h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="new-student-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sección: Datos Personales */}
            <div>
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-wider">
                <User className="w-4 h-4" /> Datos del Alumno
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nombres *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Apellidos *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="hidden">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Días de Clases</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="schedule_days"
                      value={formData.schedule_days}
                      onChange={handleChange}
                      placeholder="Ej. Lunes y Miércoles"
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha de Nacimiento (Opcional)</label>
                  <DatePicker
                    value={birthDate}
                    onChange={setBirthDate}
                    placeholder="Ej. 15/08/2000"
                  />
                  {birthDate && (
                    <p className="text-xs text-primary mt-1.5 ml-1 font-medium">
                      Edad calculada: {calculateAge(birthDate)} años
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nivel/Grado (Opcional)</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="grade_level"
                      value={formData.grade_level}
                      onChange={handleChange}
                      placeholder="Ej. Básico 1"
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-border/50" />

            {/* Sección: Plan y Frecuencia */}
            <div>
              <h3 className="text-sm font-bold text-[#e86d11] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Calendar className="w-4 h-4" /> Modalidad y Plan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Plan *</label>
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Frecuencia *</label>
                  <Select
                    value={formData.frequency}
                    onChange={handleFrequencyChange}
                    options={[
                      { label: '1 vez por semana', value: '1 vez por semana' },
                      { label: '2 veces por semana', value: '2 veces por semana' }
                    ]}
                  />
                </div>
                <div className="md:col-span-2 mt-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Selecciona {formData.frequency === '1 vez por semana' ? 'el día' : 'los días'} de clase ({selectedSchedules.length}/{formData.frequency === '1 vez por semana' ? 1 : 2})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => {
                      const isSelected = selectedSchedules.some(s => s.day === day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            isSelected 
                              ? 'bg-[#e86d11] text-white shadow-md shadow-[#e86d11]/20 border border-transparent' 
                              : 'bg-card border border-border text-muted-foreground hover:bg-foreground/5'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2 mt-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha de Inicio del Periodo *</label>
                  <div className="sm:w-[calc(50%-0.5rem)]">
                    <DatePicker
                      value={startDate}
                      onChange={(newDate) => {
                        setStartDate(newDate);
                        setIsStartDateManuallySet(true);
                      }}
                      placeholder="Ej. 24/07/2026"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                    La fecha de inicio se calcula sola, pero puedes cambiarla.
                  </p>
                </div>

                {/* Configurador de Horas */}
                {selectedSchedules.length > 0 && (
                  <div className="md:col-span-2 space-y-3 bg-muted border border-border/50 rounded-2xl p-4 mt-2 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Horario Asignado</h4>
                    {selectedSchedules.map((schedule) => (
                      <div key={schedule.day} className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-foreground min-w-[80px]">{schedule.day}</span>
                        <div className="w-32">
                          <Select
                            value={schedule.time}
                            onChange={(val) => updateTime(schedule.day, val)}
                            options={TIME_OPTIONS}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <hr className="border-border/50" />

            {/* Sección: Datos de Contacto */}
            <div>
              <h3 className="text-sm font-bold text-[#f4a305] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Phone className="w-4 h-4" /> Datos de Contacto (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Apoderado/Contacto</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      onBlur={handlePhoneBlur}
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-muted/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-foreground/5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-student-form"
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md shadow-primary/20 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Alumno
          </button>
        </div>
      </div>
    </div>
  );
}
