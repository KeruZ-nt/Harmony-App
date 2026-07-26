import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Student } from '../types';
import { useWorkspaceStore } from './workspaceStore';

interface StudentState {
  students: Student[];
  loading: boolean;
  fetchStudents: (workspaceId: string) => Promise<void>;
  addStudent: (student: Omit<Student, 'id' | 'created_at' | 'next_payment_date'>, schedules: {day: string, time: string}[]) => Promise<void>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  renewStudent: (id: string, plan: Student['plan'], frequency: Student['frequency'], startDate: string, schedules: {day: string, time: string}[]) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
}

export const useStudentStore = create<StudentState>((set) => ({
  students: [],
  loading: false,

  fetchStudents: async (workspaceId: string) => {
    set({ loading: true });
    try {
      // Silent cleanup of old 'Cesado' students (no await needed for UI blocking)
      supabase.rpc('cleanup_cesados').then(({ error }) => {
        if (error) console.error('Error in cleanup_cesados:', error);
      });

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ students: data as Student[] });
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      set({ loading: false });
    }
  },

  addStudent: async (studentData, schedules) => {
    try {
      // Calcular next_payment_date usando timezone local seguro
      const [year, month, day] = studentData.start_date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day);
      const nextPaymentDate = new Date(year, month - 1, day);
      if (studentData.plan === 'Mensual') nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      else if (studentData.plan === 'Trimestral') nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
      else if (studentData.plan === 'Semestral') nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 6);
      
      const next_payment_date = nextPaymentDate.toISOString().split('T')[0];

      // 0. Buscar si ya existe un perfil con ese correo para vincularlo automáticamente
      let profile_id = undefined;
      if (studentData.contact_email && studentData.contact_email.trim()) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', studentData.contact_email.trim())
          .eq('workspace_id', studentData.workspace_id)
          .single();
          
        if (existingProfile) {
          profile_id = existingProfile.id;
        }
      }

      // 1. Insertar el alumno
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({ ...studentData, next_payment_date, profile_id })
        .select()
        .single();

      if (studentError) throw studentError;

      // 1.5 Crear invitación si tiene email
      if (studentData.contact_email && studentData.contact_email.trim()) {
        await supabase
          .from('workspace_invitations')
          .insert({
            workspace_id: studentData.workspace_id,
            email: studentData.contact_email.trim(),
            role: 'student'
          });
      }

      // 2. Generar las sesiones (1 hora de duración por defecto)
      if (schedules.length > 0) {
        const dayMap: Record<string, number> = {
          'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
          'Jueves': 4, 'Viernes': 5, 'Sábado': 6
        };

        let weeks = 4;
        if (studentData.plan === 'Trimestral') weeks = 12;
        else if (studentData.plan === 'Semestral') weeks = 24;
        
        const targetSessionsCount = weeks * schedules.length;

        const sessionsToInsert = [];
        let currentDate = new Date(startDate);
        let sessionsGeneratedCount = 0;
        
        // Iterar día por día hasta alcanzar la cantidad exacta de clases compradas
        while (sessionsGeneratedCount < targetSessionsCount) {
          const currentDayOfWeek = currentDate.getDay();
          
          // Buscar si el día actual es uno de los días de clase programados
          for (const sched of schedules) {
            if (dayMap[sched.day] === currentDayOfWeek) {
              const currentDateStr = currentDate.toISOString().split('T')[0];
              const blockedDays = useWorkspaceStore.getState().blockedDays;
              const isBlocked = blockedDays.some(b => b.date === currentDateStr);
              
              if (!isBlocked) {
                const [hours, minutes] = sched.time.split(':').map(Number);
                
                const startTime = new Date(currentDate);
              startTime.setHours(hours, minutes, 0, 0);
              
              const endTime = new Date(startTime);
              endTime.setHours(hours + 1); // Asumimos 1 hora por defecto

              sessionsToInsert.push({
                workspace_id: student.workspace_id,
                student_id: student.id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                observation: null,
                status: 'Programada', // explicitly passing default as good practice
                google_event_id: null
              });
              
                sessionsGeneratedCount++;
                if (sessionsGeneratedCount >= targetSessionsCount) break;
              }
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (sessionsToInsert.length > 0) {
          const { error: sessionsError } = await supabase
            .from('sessions')
            .insert(sessionsToInsert);
            
          if (sessionsError) {
            console.error('Error generando sesiones:', sessionsError);
            // Considerar si lanzar el error o solo notificar (el alumno ya se creó)
          }
        }
      }
      
      set((state) => ({
        students: [student as Student, ...state.students]
      }));
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  },

  updateStudent: async (id, updates) => {
    try {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Generar invitación si se actualizó o proporcionó un correo
      if (updates.contact_email && updates.contact_email.trim() && data) {
        await supabase
          .from('workspace_invitations')
          .insert({
            workspace_id: data.workspace_id,
            email: updates.contact_email.trim(),
            role: 'student'
          });
      }

      set((state) => ({
        students: state.students.map((s) => (s.id === id ? (data as Student) : s))
      }));
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  renewStudent: async (id, plan, frequency, startDate, schedules) => {
    try {
      const state = useStudentStore.getState();
      const studentToRenew = state.students.find(s => s.id === id);
      if (!studentToRenew) throw new Error('Alumno no encontrado');

      // Calcular next_payment_date
      const start = new Date(startDate);
      const nextPaymentDate = new Date(start);
      if (plan === 'Mensual') nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      else if (plan === 'Trimestral') nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
      else if (plan === 'Semestral') nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 6);
      
      const next_payment_date = nextPaymentDate.toISOString().split('T')[0];
      const schedule_days = schedules.length > 0 ? schedules.map(s => `${s.day} a las ${s.time}`).join(' y ') : null;

      // 1. Update the student's plan, frequency, start_date and next_payment_date
      const { data: updatedStudent, error: updateError } = await supabase
        .from('students')
        .update({ 
          plan, 
          frequency, 
          start_date: startDate, 
          next_payment_date,
          schedule_days,
          status: 'Activo',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Delete all previous sessions for this student (user prefers not keeping history on renewal)
      const { error: deleteSessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('student_id', id);

      if (deleteSessionsError) {
        console.error('Error eliminando sesiones antiguas:', deleteSessionsError);
      }

      // 3. Generate new sessions
      if (schedules.length > 0) {
        const dayMap: Record<string, number> = {
          'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
          'Jueves': 4, 'Viernes': 5, 'Sábado': 6
        };

        let weeks = 4;
        if (plan === 'Trimestral') weeks = 12;
        else if (plan === 'Semestral') weeks = 24;
        
        const targetSessionsCount = weeks * schedules.length;

        const sessionsToInsert = [];
        let currentDate = new Date(startDate);
        let sessionsGeneratedCount = 0;
        
        while (sessionsGeneratedCount < targetSessionsCount) {
          const currentDayOfWeek = currentDate.getDay();
          
          for (const sched of schedules) {
            if (dayMap[sched.day] === currentDayOfWeek) {
              const currentDateStr = currentDate.toISOString().split('T')[0];
              const blockedDays = useWorkspaceStore.getState().blockedDays;
              const isBlocked = blockedDays.some(b => b.date === currentDateStr);
              
              if (!isBlocked) {
                const [hours, minutes] = sched.time.split(':').map(Number);
                
                const startTime = new Date(currentDate);
              startTime.setHours(hours, minutes, 0, 0);
              
              const endTime = new Date(startTime);
              endTime.setHours(hours + 1);

              sessionsToInsert.push({
                workspace_id: studentToRenew.workspace_id,
                student_id: studentToRenew.id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                observation: null,
                status: 'Programada',
                google_event_id: null
              });
              
              sessionsGeneratedCount++;
              if (sessionsGeneratedCount >= targetSessionsCount) break;
              }
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (sessionsToInsert.length > 0) {
          const { error: sessionsError } = await supabase
            .from('sessions')
            .insert(sessionsToInsert);
            
          if (sessionsError) console.error('Error generando nuevas sesiones de renovación:', sessionsError);
        }
      }

      set((state) => ({
        students: state.students.map((s) => (s.id === id ? (updatedStudent as Student) : s))
      }));
    } catch (error) {
      console.error('Error renewing student:', error);
      throw error;
    }
  },

  deleteStudent: async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        students: state.students.filter((s) => s.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  }
}));
