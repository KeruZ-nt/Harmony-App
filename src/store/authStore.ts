import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from './workspaceStore';
import type { Profile } from '../types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: User | null) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: async (user) => {
    if (!user) {
      set({ user: null, profile: null, loading: false });
      useWorkspaceStore.getState().clearWorkspaces();
      return;
    }
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    // Use background=true so wsLoading never flips to true on token refresh,
    // which would cause ProtectedRoute to flash the loading spinner.
    await useWorkspaceStore.getState().fetchWorkspaces(user.id, true);
    
    set({ user, profile: profile as Profile | null, loading: false });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
