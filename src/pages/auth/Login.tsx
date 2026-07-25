import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, Building, ArrowRight, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Shared State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Register-specific State
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasInvitation, setHasInvitation] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);
  
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Validaciones de contraseña (Registro)
  const passwordValidations = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  // Verificar invitación
  const checkInvitation = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return;
    try {
      const { data, error } = await supabase.rpc('check_invitation_details', { p_email: emailToCheck });
      if (!error && data) {
        setHasInvitation(!!data.has_invitation);
        if (data.has_invitation && data.suggested_name) {
          setFullName(data.suggested_name);
          setIsNameLocked(true);
        } else if (!data.has_invitation) {
          setIsNameLocked(false);
        }
      }
    } catch (err) {
      console.error('Error verificando invitación:', err);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (!isLogin) {
      if (newEmail.includes('@') && newEmail.includes('.')) {
        checkInvitation(newEmail);
      } else {
        setHasInvitation(false);
        setIsNameLocked(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      addToast({ message: 'Inicio de sesión exitoso', type: 'success' });
    } catch (error: any) {
      addToast({ message: error.message || 'Error al iniciar sesión', type: 'error' });
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordsMatch) {
      addToast({ message: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }

    if (!isPasswordValid) {
      addToast({ message: 'La contraseña no cumple con los requisitos mínimos.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: rpcError } = await supabase.rpc('handle_user_registration', {
          p_user_id: authData.user.id,
          p_workspace_name: hasInvitation ? 'Invitado' : workspaceName,
          p_full_name: fullName,
          p_email: email
        });

        if (rpcError) throw rpcError;
        
        addToast({ message: 'Cuenta y Academia creadas con éxito. Bienvenido.', type: 'success' });
        navigate('/');
      }
    } catch (error: any) {
      addToast({ message: error.message || 'Error al registrar', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
      {/* Background gradients for mobile */}
      <div className="lg:hidden absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="lg:hidden absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Left Panel - Information (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-900/30 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        </div>

        <div className="z-10 relative">
          <div className="flex items-center gap-3 font-display text-2xl font-bold mb-16">
            <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-2.5 rounded-xl shadow-lg flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-cover mix-blend-screen" />
            </div>
            Harmony App
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-black mb-6 leading-tight">
            La manera más inteligente de gestionar tu academia.
          </h1>
          <p className="text-slate-300 text-lg xl:text-xl max-w-md">
            Control de asistencia, pagos, alumnos y profesores en un solo lugar. 
            Desarrollado para la excelencia musical.
          </p>
        </div>

        <div className="z-10 relative mt-auto border border-white/10 bg-white/5 backdrop-blur-sm p-6 rounded-2xl max-w-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold`}>
                  M{i}
                </div>
              ))}
            </div>
            <div className="text-sm">
              <p className="font-bold">Únete a cientos de directores</p>
              <p className="text-slate-400">que ya modernizaron su gestión</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-[440px] relative">
          <div className="glass rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/20">
            
            <div className="flex justify-center mb-6 lg:hidden">
              <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-3 rounded-2xl shadow-lg shadow-[#0082cc]/30 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-cover mix-blend-screen" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2 font-display">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
              </h2>
              <p className="text-muted-foreground text-sm h-5">
                {isLogin 
                  ? 'Inicia sesión en tu cuenta de Harmony' 
                  : hasInvitation 
                    ? '¡Has sido invitado! Completa tu registro.' 
                    : 'Comienza a gestionar tu academia'}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex p-1 bg-muted/60 rounded-xl mb-8 border border-border/50">
              <button 
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  // Opcional: limpiar campos al cambiar
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Ingresar
              </button>
              <button 
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Registrarse
              </button>
            </div>

            <div className="relative overflow-hidden">
              {/* LOGIN FORM */}
              {isLogin && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={handleEmailChange}
                          className="w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3.5 transition-all outline-none"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 pr-11 p-3.5 transition-all outline-none"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-medium rounded-2xl text-sm px-5 py-4 transition-all duration-300 shadow-lg shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <span>Iniciar Sesión</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* REGISTER FORM */}
              {!isLogin && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={handleEmailChange}
                          className="w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3.5 transition-all outline-none"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Tu Nombre</label>
                        <div className="relative">
                          {isNameLocked ? (
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                          ) : (
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                          )}
                          <input
                            type="text"
                            required
                            readOnly={isNameLocked}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={`w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3.5 transition-all outline-none ${isNameLocked ? 'opacity-80 bg-muted/20 cursor-not-allowed' : ''}`}
                            placeholder="Juan Pérez"
                          />
                        </div>
                      </div>

                      {!hasInvitation && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Academia</label>
                          <div className="relative">
                            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                            <input
                              type="text"
                              required={!hasInvitation}
                              value={workspaceName}
                              onChange={(e) => setWorkspaceName(e.target.value)}
                              className="w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3.5 transition-all outline-none"
                              placeholder="Escuela Musical"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 pr-11 p-3.5 transition-all outline-none"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Validation Indicators */}
                      <div className="bg-card/30 border border-border/50 rounded-xl p-3 grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.length ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                          <span className={passwordValidations.length ? 'text-foreground' : 'text-muted-foreground'}>Mínimo 8 chars</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.uppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                          <span className={passwordValidations.uppercase ? 'text-foreground' : 'text-muted-foreground'}>Una Mayúscula</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.lowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                          <span className={passwordValidations.lowercase ? 'text-foreground' : 'text-muted-foreground'}>Una Minúscula</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.number ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
                          <span className={passwordValidations.number ? 'text-foreground' : 'text-muted-foreground'}>Un Número</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Confirmar Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full bg-card/50 border text-foreground text-sm rounded-2xl block pl-11 pr-11 p-3.5 transition-all outline-none focus:ring-2 ${
                            confirmPassword && !passwordsMatch 
                              ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' 
                              : confirmPassword && passwordsMatch
                              ? 'border-green-500 focus:ring-green-500/20 focus:border-green-500'
                              : 'border-border focus:ring-primary/20 focus:border-primary'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-[11px] sm:text-xs text-destructive mt-1.5 ml-1">Las contraseñas no coinciden</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-medium rounded-2xl text-sm px-5 py-4 transition-all duration-300 shadow-lg shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <span>{hasInvitation ? 'Unirse a la Academia' : 'Crear Cuenta'}</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
