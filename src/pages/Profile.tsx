import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { User as UserIcon, Camera, Loader2, Shield, Phone, Mail, Key, X, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useRef, useMemo } from 'react';

export default function Profile() {
  const { profile, setUser } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Validaciones en tiempo real
  const passwordValidations = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);
  const passwordsMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || '');
      setNewEmail(profile.email || '');
    }
  }, [profile]);

  const formatPhone = (val: string) => {
    // Si ya empieza con +, no forzamos nada o dejamos que escriba
    if (val.startsWith('+')) return val;
    
    // Auto-detectar por cantidad de dígitos (ej. Perú = 9 dígitos)
    const digits = val.replace(/\D/g, '');
    if (digits.length === 9) {
      return `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return val;
  };

  const handlePhoneBlur = () => {
    setPhone(formatPhone(phone));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Generate a unique filename using profile id and timestamp to prevent caching issues
      const fileName = `${profile?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      
      // Update the profile immediately
      if (profile) {
        await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', profile.id);
          
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      }

      addToast({ message: 'Avatar actualizado', type: 'success' });
    } catch (error: any) {
      addToast({ message: error.message || 'Error al subir imagen', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      addToast({ message: 'Perfil actualizado correctamente', type: 'success' });
    } catch (error: any) {
      addToast({ message: error.message || 'Error al actualizar perfil', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email || newEmail === profile.email) return;
    
    setSavingEmail(true);
    try {
      // 1. Validar la contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPasswordForEmail
      });

      if (signInError) throw new Error('La contraseña actual es incorrecta.');

      // 2. Cambiar correo en auth
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
      
      if (updateError) throw updateError;

      // 3. Actualizar correo en profiles para que dispare el trigger de sincronización
      await supabase.from('profiles').update({ email: newEmail }).eq('id', profile.id);

      addToast({ message: 'Se ha enviado un enlace de confirmación a ambos correos. Tu perfil se actualizará.', type: 'success' });
      setCurrentPasswordForEmail('');
      setShowEmailModal(false);
    } catch (error: any) {
      addToast({ message: error.message || 'Error al cambiar correo', type: 'error' });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;
    
    if (newPassword !== confirmNewPassword) {
      addToast({ message: 'Las nuevas contraseñas no coinciden', type: 'error' });
      return;
    }

    if (!isPasswordValid) {
      addToast({ message: 'La nueva contraseña no cumple con los requisitos mínimos.', type: 'error' });
      return;
    }

    setSavingPassword(true);
    try {
      // 1. Validar la contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword
      });

      if (signInError) throw new Error('La contraseña actual es incorrecta.');

      // 2. Cambiar contraseña
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (updateError) throw updateError;

      addToast({ message: 'Contraseña actualizada correctamente', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordModal(false);
    } catch (error: any) {
      addToast({ message: error.message || 'Error al cambiar contraseña', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const roleText = profile?.role === 'owner' ? 'Propietario / Administrador' :
                   profile?.role === 'admin' ? 'Administrador' :
                   profile?.role === 'student' ? 'Alumno' : 'Colaborador';

  return (
    <div className="p-4 md:p-6 w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col justify-center">
      
      <div className="relative rounded-3xl overflow-hidden glass p-5 sm:p-6 border-0 shadow-lg bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10 mb-4 shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 flex items-center justify-center text-white shrink-0">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Mi Perfil
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">Gestiona tu información personal y seguridad.</p>
          </div>
        </div>
      </div>

      {/* Información Personal */}
      <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col shadow-md border-0 bg-card/60 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[40px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex items-center gap-6 mb-5 pb-5 border-b border-border/40 relative z-10">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {uploadingAvatar ? (
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-card border-2 border-primary/20 shadow-inner">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-3xl object-cover shadow-lg border-2 border-primary/20 group-hover:opacity-70 transition-opacity" />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-display font-black text-3xl shadow-inner border border-primary/20 shrink-0 group-hover:bg-primary/10 transition-colors">
                {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            
            {!uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden" 
            />
          </div>
          <div className="truncate">
            <h2 className="text-2xl font-bold truncate">{profile?.full_name || 'Usuario'}</h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Shield className="w-4 h-4" />
              <span className="font-medium text-sm truncate">{roleText}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 flex flex-col">
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1">Nombre Completo</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                placeholder="Tu nombre"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                placeholder="Ej. 987654321"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1">Correo Electrónico</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 outline-none transition-all text-sm opacity-70 bg-muted/30"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted transition-all"
              >
                Editar
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
            >
              {saving ? 'Guardando Perfil...' : 'Guardar Información'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full bg-card border border-border text-foreground px-6 py-3.5 rounded-xl font-bold hover:bg-muted transition-all text-sm flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              Cambiar Contraseña
            </button>
          </div>
        </form>
      </div>

      {/* Modal Editar Correo */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Cambiar Correo Electrónico
            </h3>
            
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Nuevo Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Contraseña Actual <span className="text-muted-foreground font-normal">(Para confirmar)</span></label>
                <input
                  type="password"
                  required
                  value={currentPasswordForEmail}
                  onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingEmail || newEmail === profile?.email || !currentPasswordForEmail}
                  className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
                >
                  {savingEmail ? 'Actualizando...' : 'Actualizar Correo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Cambiar Contraseña
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Contraseña Actual</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Repetir Nueva</label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className={`w-full bg-background border rounded-xl px-4 py-3 pr-11 outline-none focus:ring-2 text-sm ${
                        confirmNewPassword && !passwordsMatch 
                          ? 'border-destructive focus:ring-destructive/50' 
                          : confirmNewPassword && passwordsMatch
                          ? 'border-green-500 focus:ring-green-500/50'
                          : 'border-border focus:ring-primary/50'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmNewPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive mt-1.5 ml-1">Las contraseñas no coinciden</p>
                  )}
                  {confirmNewPassword && passwordsMatch && (
                    <p className="text-xs text-green-500 mt-1.5 ml-1">Las contraseñas coinciden</p>
                  )}
                </div>
              </div>

              {/* Validation Indicators */}
              <div className="bg-background border border-border rounded-xl p-3 grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidations.length ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                  <span className={passwordValidations.length ? 'text-foreground' : 'text-muted-foreground'}>Mínimo 8 caracteres</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidations.uppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                  <span className={passwordValidations.uppercase ? 'text-foreground' : 'text-muted-foreground'}>Una Mayúscula</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidations.lowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                  <span className={passwordValidations.lowercase ? 'text-foreground' : 'text-muted-foreground'}>Una Minúscula</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordValidations.number ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                  <span className={passwordValidations.number ? 'text-foreground' : 'text-muted-foreground'}>Un Número</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
                >
                  {savingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
