import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useStudentStore } from '../store/studentStore';
import { NewStudentModal } from '../components/students/NewStudentModal';
import { StudentDetailsModal } from '../components/students/StudentDetailsModal';
import { Search, Plus, Calendar, BookOpen, Users } from 'lucide-react';
import { Select } from '../components/ui/Select';
import type { Student } from '../types';

export default function Students() {
  const { activeWorkspace } = useWorkspaceStore();
  const { students, fetchStudents, loading } = useStudentStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (activeWorkspace) {
      fetchStudents(activeWorkspace.id);
    }
  }, [activeWorkspace?.id, fetchStudents]);

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
           (student.schedule_days?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || 
      (statusFilter === 'Inactivo' && (student.status === 'Pausa' || student.status === 'Cesado')) ||
      student.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  const getStatusBadge = (status: Student['status']) => {
    switch (status) {
      case 'Activo':
        return <span className="px-2.5 py-1 text-xs font-medium bg-[#0082cc]/10 text-[#0082cc] border border-[#0082cc]/20 rounded-full">Activo</span>;
      case 'Pausa':
        return <span className="px-2.5 py-1 text-xs font-medium bg-[#f4a305]/10 text-[#f4a305] border border-[#f4a305]/20 rounded-full">Pausa</span>;
      case 'Cesado':
        return <span className="px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20 rounded-full">Cesado</span>;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      
      {/* Header Section Espectacular */}
      <div className="relative rounded-3xl overflow-hidden glass p-8 border-0 shadow-lg bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-md shadow-primary/30 flex items-center justify-center text-white shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Directorio de Alumnos
              </h1>
              <p className="text-muted-foreground mt-1 text-xs font-medium">
                Gestiona tus estudiantes, planes y horarios.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary/90 hover:to-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/40"
          >
            <Plus className="w-4 h-4" />
            Nuevo Alumno
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass rounded-3xl p-5 flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between border-border/50 shadow-sm relative group z-20">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -translate-y-1/2"></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1 relative z-30">
          <div className="relative w-full sm:max-w-md group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre o días..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 backdrop-blur-sm border border-border/60 hover:border-border rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all shadow-sm"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            className="w-full sm:w-44 z-20"
            options={[
              { value: "Todos", label: "Todos los estados" },
              { value: "Activo", label: "Activos" },
              { value: "Inactivo", label: "Inactivos" },
            ]}
          />
          <Select
            value={sortOrder}
            onChange={(value) => setSortOrder(value)}
            className="w-full sm:w-44 z-20"
            options={[
              { value: "asc", label: "Orden A-Z" },
              { value: "desc", label: "Orden Z-A" },
            ]}
          />
        </div>
        
        <div className="shrink-0 flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 px-5 py-2 rounded-xl border border-primary/10 shadow-sm self-end lg:self-auto relative z-10">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Total</span>
          <span className="text-xl font-display font-black text-primary leading-none">{filteredStudents.length}</span>
        </div>
      </div>

      {/* Table Area */}
      <div className="glass rounded-3xl border border-border/50 flex-1 overflow-hidden flex flex-col shadow-md">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/40 border-b border-border/50">
              <tr>
                <th className="px-6 py-5">Alumno</th>
                <th className="px-6 py-5">Días y Horarios</th>
                <th className="px-6 py-5">Plan y Frecuencia</th>
                <th className="px-6 py-5">Contacto</th>
                <th className="px-6 py-5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                      Cargando alumnos...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-2">
                        <Users className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold text-lg text-foreground">No hay alumnos</p>
                      <p className="text-sm">No se encontraron alumnos con los filtros actuales.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => setSelectedStudent(student)}
                    className="hover:bg-primary/[0.02] transition-colors duration-200 cursor-pointer group/row"
                  >
                    <td className="px-6 py-4">
                      <div className="font-display font-bold text-base text-foreground group-hover/row:text-primary transition-colors">{student.first_name} {student.last_name}</div>
                      {student.grade_level && <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">{student.grade_level}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {student.schedule_days ? (
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          {student.schedule_days.split(' y ').map((schedule, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span>{schedule}</span>
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#e86d11] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {student.plan}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{student.frequency}</div>
                    </td>
                    <td className="px-6 py-4">
                      {student.contact_name ? (
                        <div>
                          <div className="text-sm font-medium">{student.contact_name}</div>
                          {student.contact_phone && <div className="text-xs text-muted-foreground mt-0.5">{student.contact_phone}</div>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(student.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <StudentDetailsModal 
        student={students.find(s => s.id === selectedStudent?.id) || null} 
        onClose={() => setSelectedStudent(null)} 
      />
    </div>
  );
}
