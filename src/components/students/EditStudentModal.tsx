import { useState, useEffect } from 'react';
import { useStudentStore } from '../../store/studentStore';
import { useToastStore } from '../../store/toastStore';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { X, User, Phone, Mail, BookOpen, Loader2 } from 'lucide-react';
import type { Student } from '../../types';

interface EditStudentModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
}

export function EditStudentModal({ student, isOpen, onClose }: EditStudentModalProps) {
  const { updateStudent } = useStudentStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    grade_level: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    status: 'Activo' as Student['status'],
  });

  const [birthDate, setBirthDate] = useState('');

  // Populate data when modal opens
  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        grade_level: student.grade_level || '',
        contact_name: student.contact_name || '',
        contact_phone: student.contact_phone || '',
        contact_email: student.contact_email || '',
        status: student.status || 'Activo',
      });
      setBirthDate(student.birth_date || '');
    }
  }, [student, isOpen]);

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
    setLoading(true);
    
    try {
      const isNewlyCesado = formData.status === 'Cesado' && student.status !== 'Cesado';
      const cese_date = isNewlyCesado 
        ? new Date().toISOString() 
        : (formData.status !== 'Cesado' ? null : student.cese_date);

      await updateStudent(student.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        grade_level: formData.grade_level || null,
        birth_date: birthDate || null,
        age: calculateAge(birthDate),
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        status: formData.status,
        cese_date: cese_date
      });

      addToast({ message: 'Alumno actualizado correctamente', type: 'success' });
      onClose();
    } catch (error: any) {
      addToast({ message: error.message || 'Error al actualizar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-sans">Editar Alumno</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sección: Datos Personales */}
            <div>
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-wider">
                <User className="w-4 h-4" /> Datos Personales
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
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Estado del Alumno</label>
                  <Select
                    value={formData.status}
                    onChange={(value) => handleChange({ target: { name: 'status', value } } as any)}
                    options={[
                      { value: 'Activo', label: 'Activo' },
                      { value: 'Pausa', label: 'En Pausa' },
                      { value: 'Cesado', label: 'Cesado' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Contacto */}
            <div className="pt-2 border-t border-border/50">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Phone className="w-4 h-4" /> Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Apoderado/Contacto (Opcional)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      placeholder="Ej. María Pérez"
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono (Opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      onBlur={handlePhoneBlur}
                      placeholder="Ej. +51 999 999 999"
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email (Opcional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Note on Plan/Schedule */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3 mt-4">
              <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Para cambiar el plan, las frecuencias o los horarios de clases, dirígete al Panel de Asistencias (Ver Clases) para generar un nuevo periodo.
              </p>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-muted/50 rounded-b-3xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-foreground/5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            form="edit-student-form"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
