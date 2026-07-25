import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface ExpirationNotification {
  id: string;
  type: 'expiration';
  studentId: string;
  studentName: string;
  remainingClasses: number;
}

export interface SystemNotification {
  id: string;
  type: 'system';
  message: string;
  createdAt: string;
}

export type AppNotification = ExpirationNotification | SystemNotification;

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  initialFetchDone: boolean;
  fetchNotifications: (workspaceId: string) => Promise<void>;
  subscribeToWorkspace: (workspaceId: string) => void;
  unsubscribeFromWorkspace: () => void;
  markAsRead: () => void;
}

export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContext();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.8);
  } catch (e) {
    console.error('Audio play error', e);
  }
};

let realtimeSubscription: any = null;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  initialFetchDone: false,

  fetchNotifications: async (workspaceId: string) => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('workspace_id', workspaceId)
        .eq('status', 'Activo');

      if (studentsError) throw studentsError;
      if (!studentsData || studentsData.length === 0) return;

      const activeStudentIds = studentsData.map(s => s.id);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('student_id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'Programada')
        .in('student_id', activeStudentIds);

      if (sessionsError) throw sessionsError;

      const sessionCounts: Record<string, number> = {};
      sessionsData?.forEach(s => {
        sessionCounts[s.student_id] = (sessionCounts[s.student_id] || 0) + 1;
      });

      const expiring: ExpirationNotification[] = [];
      
      studentsData.forEach(student => {
        const count = sessionCounts[student.id] || 0;
        if (count <= 2) {
          expiring.push({
            id: `exp-${student.id}`,
            type: 'expiration',
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            remainingClasses: count
          });
        }
      });

      set(state => {
        const systemNotifs = state.notifications.filter(n => n.type === 'system');
        const allNotifs = [...systemNotifs, ...expiring];
        
        // Calculate diff for unread count
        const currentExpIds = state.notifications.filter(n => n.type === 'expiration').map(n => n.id);
        const newExpNotifs = expiring.filter(n => !currentExpIds.includes(n.id));
        
        if (state.initialFetchDone && newExpNotifs.length > 0) {
          playNotificationSound();
        }
        
        return { 
          notifications: allNotifs,
          unreadCount: state.unreadCount + (state.initialFetchDone ? newExpNotifs.length : 0),
          initialFetchDone: true
        };
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },

  subscribeToWorkspace: (workspaceId: string) => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }

    realtimeSubscription = supabase.channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const newProfile = payload.new;
          if (newProfile.role === 'student') {
            const newNotif: SystemNotification = {
              id: `sys-${newProfile.id}`,
              type: 'system',
              message: `¡El alumno ${newProfile.full_name || 'Nuevo'} se ha registrado!`,
              createdAt: new Date().toISOString()
            };
            set(state => ({
              notifications: [newNotif, ...state.notifications],
              unreadCount: state.unreadCount + 1
            }));
            
            // Reproducir sonido de notificación
            playNotificationSound();
          }
        }
      )
      .subscribe();
  },

  unsubscribeFromWorkspace: () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      realtimeSubscription = null;
    }
  },

  markAsRead: () => {
    set({ unreadCount: 0 });
  }
}));
