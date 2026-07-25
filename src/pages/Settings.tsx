import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useToastStore } from '../store/toastStore';
import { Select } from '../components/ui/Select';
import { Settings as SettingsIcon, Users, Mail, Plus, Trash2, Camera, Save } from 'lucide-react';
import type { UserRole } from '../types';

interface Colleague {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  avatar_url?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export default function Settings() {
  const { activeWorkspace, activeRole, setActiveWorkspace } = useWorkspaceStore();
  const { addToast } = useToastStore();
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('colaborador' as any);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setLogoUrl(activeWorkspace.logo_url || null);
      fetchTeam();
      fetchInvitations();
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    // Theme is strictly light mode
  }, []);

  const fetchTeam = async () => {
    if (!activeWorkspace) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, avatar_url')
      .eq('workspace_id', activeWorkspace.id)
      .neq('role', 'student');
    if (data) setColleagues(data as any);
  };

  const fetchInvitations = async () => {
    if (!activeWorkspace) return;
    const { data } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .neq('role', 'student')
      .order('created_at', { ascending: false });
    if (data) setInvitations(data as any);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setSavingName(true);
    
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: workspaceName })
        .eq('id', activeWorkspace.id);
        
      if (error) throw error;
      
      setActiveWorkspace({ ...activeWorkspace, name: workspaceName });
      addToast({ message: 'Nombre actualizado', type: 'success' });
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setSavingName(false);
    }
  };



  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim()) return;
    setInviting(true);
    
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: activeWorkspace.id,
          email: inviteEmail.trim(),
          role: inviteRole
        });
        
      if (error) {
        if (error.code === '23505') throw new Error('Este correo ya tiene una invitación pendiente');
        throw error;
      }
      
      addToast({ message: 'Invitación creada', type: 'success' });
      setInviteEmail('');
      fetchInvitations();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      const { error } = await supabase.from('workspace_invitations').delete().eq('id', id);
      if (error) throw error;
      addToast({ message: 'Invitación eliminada', type: 'success' });
      fetchInvitations();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    }
  };

  if (activeRole !== 'owner' && activeRole !== 'admin') {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative rounded-3xl overflow-hidden glass p-8 border-0 shadow-lg bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 flex items-center justify-center text-white shrink-0">
            <SettingsIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Configuración
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">Administra tu academia y tu equipo de trabajo.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Academia y Tema */}
        <div className="space-y-6 flex flex-col xl:col-span-5">
          {/* Workspace Name */}
          <div className="glass rounded-3xl p-6 sm:p-8 flex flex-col h-full">
            <h2 className="text-xl font-bold mb-6">Información de la Academia</h2>
            <div className="flex flex-col sm:flex-row gap-8 items-center justify-center my-auto">
              {/* Logo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className={`w-28 h-28 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed ${uploadingLogo ? 'opacity-50' : 'group-hover:border-primary/50'} transition-all`}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <SettingsIcon className="w-10 h-10 text-muted-foreground/50" />
                    )}
                    
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-8 h-8 text-white" />
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={async (e) => {
                          try {
                            setUploadingLogo(true);
                            if (!e.target.files || e.target.files.length === 0 || !activeWorkspace) return;
                            const file = e.target.files[0];
                            const fileExt = file.name.split('.').pop();
                            const fileName = `workspace-${activeWorkspace.id}-${Math.random()}.${fileExt}`;
                            
                            const { error: uploadError } = await supabase.storage
                              .from('avatars')
                              .upload(fileName, file, { upsert: true });
                              
                            if (uploadError) throw uploadError;
                            
                            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                            setLogoUrl(data.publicUrl);
                            
                            await supabase
                              .from('workspaces')
                              .update({ logo_url: data.publicUrl })
                              .eq('id', activeWorkspace.id);
                              
                            setActiveWorkspace({ ...activeWorkspace, logo_url: data.publicUrl });
                            addToast({ message: 'Logo actualizado', type: 'success' });
                          } catch (err: any) {
                            addToast({ message: err.message || 'Error', type: 'error' });
                          } finally {
                            setUploadingLogo(false);
                          }
                        }}
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground text-center">Logo de la academia</span>
              </div>
              
              {/* Name Edit */}
              <form onSubmit={handleUpdateName} className="flex-1 flex flex-col gap-4 w-full">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Nombre visible</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-card border border-border dark:border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Nombre de la academia"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingName || !workspaceName.trim()}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 self-start"
                >
                  <Save className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">{savingName ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </form>
            </div>
        </div>
        </div>

        {/* Columna Derecha: Equipo Settings */}
        <div className="glass rounded-3xl p-6 sm:p-8 xl:col-span-7 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Equipo y Colaboradores
          </h2>
          
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Añadir Persona</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-card border border-border dark:border-border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rol</label>
                    <Select
                      value={inviteRole}
                      onChange={(val) => setInviteRole(val as UserRole)}
                      className="w-full"
                      options={[
                        { value: 'colaborador', label: 'Colaborador' },
                        { value: 'admin', label: 'Administrador' },
                        { value: 'student', label: 'Alumno (Solo vista)' }
                      ]}
                    />
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {inviting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-5 h-5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Crear Invitación</span>
                    </>
                  )}
                </button>
              </form>
              <p className="text-xs text-muted-foreground mt-4">
                La persona deberá registrarse usando exactamente ese correo para que se le asigne la academia automáticamente.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Invitaciones Pendientes</h3>
              {invitations.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-300">
                  No hay invitaciones pendientes.
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/50 dark:border-border/50">
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">Rol: {inv.role}</p>
                      </div>
                      <button onClick={() => handleDeleteInvite(inv.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-4">Miembros Actuales</h3>
              <div className="space-y-3">
                {colleagues.map(c => (
                  <div key={c.id} className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border/50 dark:border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden border border-primary/20">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        c.full_name ? c.full_name.substring(0, 2).toUpperCase() : (c.email?.charAt(0).toUpperCase() || '?')
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.full_name || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-[10px] uppercase font-bold px-2 py-1 bg-muted/80 dark:bg-slate-700 rounded-md text-muted-foreground dark:text-slate-300">
                        {c.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
