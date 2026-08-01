import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';

interface SessionState {
  sessions: Session[];
  loading: boolean;
  fetchSessionsByStudent: (studentId: string) => Promise<void>;
  fetchWorkspaceSessions: (workspaceId: string, startDate?: string, endDate?: string) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  addSession: (session: Omit<Session, 'id' | 'created_at'>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  shiftSessionsForward: (studentId: string, fromSessionId: string, daysToShift: number) => Promise<void>;
  bulkShiftSchedule: (studentId: string, originalStartIso: string, newStartIso: string, newEndIso: string) => Promise<void>;
  blockDay: (workspaceId: string, dateStr: string, reason: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  loading: false,

  fetchSessionsByStudent: async (studentId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      set({ sessions: data as Session[] });
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchWorkspaceSessions: async (workspaceId: string, startDate?: string, endDate?: string) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          students (
            first_name,
            last_name,
            plan,
            status
          )
        `)
        .eq('workspace_id', workspaceId);

      if (startDate) {
        query = query.gte('start_time', startDate);
      }
      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;
      set({ sessions: data as Session[] });
    } catch (error) {
      console.error('Error fetching workspace sessions:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateSession: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? (data as Session) : s))
      }));
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  addSession: async (sessionData) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        sessions: [...state.sessions, data as Session].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      }));
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  },

  deleteSession: async (id) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  shiftSessionsForward: async (studentId, fromSessionId, daysToShift) => {
    try {
      const state = useSessionStore.getState();
      const targetSession = state.sessions.find(s => s.id === fromSessionId);
      if (!targetSession) throw new Error('Session not found');

      const targetTime = new Date(targetSession.start_time).getTime();
      const targetDay = new Date(targetSession.start_time).getDay();
      
      const sessionsToShift = state.sessions.filter(
        s => new Date(s.start_time).getTime() >= targetTime && new Date(s.start_time).getDay() === targetDay
      );

      // We'll update them one by one in Supabase for simplicity, 
      // or we can use an RPC, but doing it in parallel is fine for small numbers.
      const updatePromises = sessionsToShift.map(s => {
        const newStart = new Date(s.start_time);
        newStart.setDate(newStart.getDate() + daysToShift);
        
        const newEnd = new Date(s.end_time);
        newEnd.setDate(newEnd.getDate() + daysToShift);

        return supabase
          .from('sessions')
          .update({ 
            start_time: newStart.toISOString(), 
            end_time: newEnd.toISOString() 
          })
          .eq('id', s.id);
      });

      await Promise.all(updatePromises);
      
      // Reload sessions to get the fresh sorted order
      await state.fetchSessionsByStudent(studentId);
      
    } catch (error) {
      console.error('Error shifting sessions:', error);
      throw error;
    }
  },

  bulkShiftSchedule: async (studentId: string, originalStartIso: string, newStartIso: string, newEndIso: string) => {
    try {
      const origDate = new Date(originalStartIso);
      const newDate = new Date(newStartIso);
      const newEnd = new Date(newEndIso);

      const oldDay = origDate.getDay();
      const oldHours = origDate.getHours();
      const oldMins = origDate.getMinutes();

      const newHours = newDate.getHours();
      const newMins = newDate.getMinutes();
      const endHours = newEnd.getHours();
      const endMins = newEnd.getMinutes();

      // Buscamos todas las futuras de ese mismo día y misma hora
      const { data: futureSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'Programada')
        .gt('start_time', originalStartIso); // Mayores estricto (la actual ya la modificamos)

      if (!futureSessions) return;

      const sessionsToShift = futureSessions.filter(s => {
        const d = new Date(s.start_time);
        return d.getDay() === oldDay && d.getHours() === oldHours && d.getMinutes() === oldMins;
      });

      // Calculamos la diferencia exacta en días entre la original y la nueva (ignorando las horas)
      const origDateOnly = new Date(origDate.getFullYear(), origDate.getMonth(), origDate.getDate());
      const newDateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
      const dayDiff = Math.round((newDateOnly.getTime() - origDateOnly.getTime()) / (1000 * 3600 * 24));

      const promises = sessionsToShift.map(async (s) => {
        const nextStart = new Date(s.start_time);
        nextStart.setDate(nextStart.getDate() + dayDiff);
        nextStart.setHours(newHours, newMins, 0, 0);

        const nextEnd = new Date(s.end_time);
        nextEnd.setDate(nextEnd.getDate() + dayDiff);
        nextEnd.setHours(endHours, endMins, 0, 0);

        return supabase.from('sessions').update({
          start_time: nextStart.toISOString(),
          end_time: nextEnd.toISOString(),
          type: 'Cambio de Horario'
        }).eq('id', s.id);
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulkShiftSchedule:', error);
      throw error;
    }
  },

  blockDay: async (workspaceId: string, dateStr: string, reason: string) => {
    set({ loading: true });
    try {
      // 1. Insert into blocked_days table
      const { error: blockError } = await supabase
        .from('blocked_days')
        .insert({
          workspace_id: workspaceId,
          date: dateStr,
          reason: reason
        });
        
      if (blockError) {
        // If it already exists, that's fine, we might just be re-running the shift, but usually we throw
        if (blockError.code !== '23505') { // unique violation
          throw blockError;
        }
      }

      // 2. We need to shift ALL sessions for this day AND future sessions of the SAME day of the week
      const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
      
      // Fetch all sessions on this exact day first to know WHICH students are affected
      const endOfDay = new Date(`${dateStr}T23:59:59`).toISOString();
      const { data: sessionsOnDay, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      if (fetchError) throw fetchError;
      
      // If no sessions on this day, we just blocked the day visually and we are done.
      if (!sessionsOnDay || sessionsOnDay.length === 0) {
        set({ loading: false });
        return; 
      }

      // 3. For each affected student, shift all sessions from today onwards (same day of week) by 7 days
      const studentIds = Array.from(new Set(sessionsOnDay.map(s => s.student_id)));

      for (const studentId of studentIds) {
        // Fetch all sessions for this student starting FROM THE BLOCKED DAY
        const { data: futureSessions } = await supabase
          .from('sessions')
          .select('*')
          .eq('student_id', studentId)
          .gte('start_time', startOfDay);

        if (futureSessions) {
          const holidayDayOfWeek = new Date(`${dateStr}T12:00:00`).getDay();
          
          const sessionsToShift = futureSessions.filter(
            s => new Date(s.start_time).getDay() === holidayDayOfWeek
          );

          // IMPORTANT: We shift the sessions backward so we don't cause overlaps? 
          // No, pushing forward is safe if we don't have unique constraints on time, but we just update them.
          const shiftPromises = sessionsToShift.map(async s => {
            const newStart = new Date(s.start_time);
            newStart.setDate(newStart.getDate() + 7);
            
            const newEnd = new Date(s.end_time);
            newEnd.setDate(newEnd.getDate() + 7);

            const { error } = await supabase
              .from('sessions')
              .update({ 
                start_time: newStart.toISOString(), 
                end_time: newEnd.toISOString() 
              })
              .eq('id', s.id);
            if (error) throw error;
          });

          await Promise.all(shiftPromises);
        }
      }

    } catch (error) {
      console.error('Error blocking day:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));
