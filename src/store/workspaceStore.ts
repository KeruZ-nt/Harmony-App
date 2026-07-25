import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Workspace, UserRole } from '../types';
import { useAuthStore } from './authStore';

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  activeRole: UserRole | null;
  loading: boolean;
  blockedDays: any[];
  setActiveWorkspace: (workspace: Workspace | null) => void;
  fetchWorkspaces: (userId: string, background?: boolean) => Promise<void>;
  fetchBlockedDays: (workspaceId: string, startDate?: string, endDate?: string) => Promise<void>;
  clearWorkspaces: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  activeRole: null,
  loading: false,
  blockedDays: [],
  setActiveWorkspace: (workspace) => {
    // Role comes from the auth profile in this new schema
    const profile = useAuthStore.getState().profile;
    set({ 
      activeWorkspace: workspace,
      activeRole: profile ? profile.role : null
    });
  },
  fetchWorkspaces: async (userId, background = false) => {
    if (!background) {
      set({ loading: true });
    }
    
    // First get the user's profile to find their workspace_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id, role')
      .eq('id', userId)
      .single();

    if (profile?.workspace_id) {
      // Fetch the workspace details
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', profile.workspace_id)
        .single();
        
      if (workspace) {
        set({ 
          activeWorkspace: workspace as Workspace,
          activeRole: profile.role,
          loading: false 
        });
        return;
      }
    }
    
    set({ activeWorkspace: null, activeRole: null, loading: false, blockedDays: [] });
  },
  fetchBlockedDays: async (workspaceId: string, startDate?: string, endDate?: string) => {
    try {
      let query = supabase
        .from('blocked_days')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (startDate) {
        query = query.gte('date', startDate.split('T')[0]);
      }
      if (endDate) {
        query = query.lte('date', endDate.split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ blockedDays: data || [] });
    } catch (error) {
      console.error('Error fetching blocked days:', error);
    }
  },
  clearWorkspaces: () => {
    set({ activeWorkspace: null, activeRole: null, loading: false, blockedDays: [] });
  }
}));
