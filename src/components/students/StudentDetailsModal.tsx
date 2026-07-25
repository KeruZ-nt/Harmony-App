import { X, Edit, Trash2, Calendar, Phone, Mail, User, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useStudentStore } from '../../store/studentStore';
import { useToastStore } from '../../store/toastStore';
import { ConfirmModal } from '../ui/ConfirmModal';
import { EditStudentModal } from './EditStudentModal';
import { StudentSessionsModal } from './StudentSessionsModal';
import { RenewStudentModal } from './RenewStudentModal';
import type { Student } from '../../types';

interface StudentDetailsModalProps {
  student: Student | null;
  onClose: () => void;
}

export function StudentDetailsModal({ student, onClose }: StudentDetailsModalProps) {
  const { deleteStudent, updateStudent } = useStudentStore();
  const { addToast } = useToastStore();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCesando, setIsCesando] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const handleDelete = async () => {
    if (!student) return;
    setIsDeleting(true);
    try {
      await deleteStudent(student.id);
      addToast({ message: 'Alumno eliminado correctamente', type: 'success' });
      setShowConfirmDelete(false);
      onClose(); // Cerrar el panel de detalles porque el alumno ya no existe
    } catch (error: any) {
      addToast({ message: error.message || 'Error al eliminar', type: 'error' });
      setIsDeleting(false);
    }
  };

  const handleCese = async () => {
    if (!student) return;
    setIsCesando(true);
    try {
      await updateStudent(student.id, {
        status: 'Cesado',
        cese_date: new Date().toISOString()
      });
      addToast({ message: 'Alumno pasado a Cese', type: 'success' });
    } catch (error: any) {
      addToast({ message: error.message || 'Error al actualizar estado', type: 'error' });
    } finally {
      setIsCesando(false);
    }
  };

  if (!student) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-sans flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Detalles del Alumno
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-3">
              <span className="text-3xl font-bold text-primary">
                {student.first_name[0]}{student.last_name[0]}
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              {student.first_name} {student.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {student.grade_level ? student.grade_level : 'Alumno'} • {student.status}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-border/50 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Plan
              </div>
              <div className="text-sm font-semibold text-foreground">{student.plan}</div>
              <div className="text-xs text-muted-foreground">{student.frequency}</div>
            </div>
            
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-border/50 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Horario
              </div>
              <div className="text-sm font-medium text-foreground space-y-0.5">
                {student.schedule_days ? (
                  student.schedule_days.split(' y ').map((schedule, idx) => (
                    <div key={idx}>{schedule}</div>
                  ))
                ) : (
                  'No asignado'
                )}
              </div>
            </div>
          </div>

          {student.contact_name && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contacto</h4>
              <div className="bg-slate-50/80 rounded-2xl border border-border/50 p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{student.contact_name}</span>
                </div>
                {student.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{student.contact_phone}</span>
                  </div>
                )}
                {student.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{student.contact_email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botón Ver Clases */}
          <div className="pt-2">
            <button 
              onClick={() => setShowSessionsModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Ver Clases y Asistencia
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t border-border/50 bg-slate-50/50 rounded-b-3xl grid ${student.status !== 'Cesado' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-foreground/5 rounded-xl text-sm font-medium transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          
          {student.status !== 'Cesado' && (
            <button
              type="button"
              onClick={handleCese}
              disabled={isCesando}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <User className="w-4 h-4" />
              Pasar a Cese
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar Alumno"
        message={
          <>
            ¿Estás seguro de que deseas eliminar a <strong>{student.first_name} {student.last_name}</strong>?
            <br/><br/>
            Esta acción no se puede deshacer y eliminará también todo su historial de asistencia y pagos.
          </>
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />

      <EditStudentModal
        student={student}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      <StudentSessionsModal
        student={student}
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        onRequestRenew={() => {
          setShowSessionsModal(false);
          setShowRenewModal(true);
        }}
      />

      <RenewStudentModal
        student={student}
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
      />
    </>
  );
}
