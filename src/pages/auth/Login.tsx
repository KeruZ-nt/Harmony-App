import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, Building, ArrowRight, Loader2, CheckCircle2, XCircle, Eye, EyeOff, CalendarCheck, ClipboardList, UsersRound, Clock } from 'lucide-react';
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
          // Permitimos que el apoderado cambie el nombre al suyo propio si lo desea
          setIsNameLocked(false);
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

  const inputClasses = "w-full bg-white border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3.5 transition-all outline-none placeholder:text-muted-foreground/60 shadow-sm";
  const iconClasses = "absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70";
  const labelClasses = "block text-sm font-medium text-foreground mb-1.5 ml-1";

  return (
    <div className="min-h-screen flex w-full bg-[#f8f9fa] relative overflow-hidden text-foreground">
      
      {/* Soft Background Elements for visual interest (very subtle) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[70%] bg-blue-100/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[60%] bg-purple-100/40 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-grid-slate-900/[0.015]"></div>
      </div>

      {/* Left Panel - Information (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 bg-white/40 backdrop-blur-3xl border-r border-border/40 z-10">
        
        <div className="z-10 relative">
          <div className="flex items-center gap-3 font-display text-2xl font-bold mb-16 text-foreground">
            <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-2.5 rounded-xl shadow-lg flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-cover mix-blend-screen" />
            </div>
            Harmony App
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-black mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500">
            La manera más inteligente de gestionar tu academia.
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-md font-medium leading-relaxed">
            Plataforma diseñada para educadores y profesores independientes. Simplifica el registro de alumnos, controla asistencias y organiza tu información en un solo lugar.
          </p>
          <div className="grid grid-cols-2 gap-5 mt-8">
            <div className="group flex flex-col gap-3 p-5 bg-white/70 hover:bg-white/95 rounded-2xl border border-white/60 hover:border-blue-200/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 backdrop-blur-md cursor-default">
              <div className="bg-blue-100/50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <UsersRound className="w-6 h-6 text-[#0082cc]" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Gestión de Alumnos</span>
            </div>
            <div className="group flex flex-col gap-3 p-5 bg-white/70 hover:bg-white/95 rounded-2xl border border-white/60 hover:border-emerald-200/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 backdrop-blur-md cursor-default">
              <div className="bg-emerald-100/50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                <CalendarCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Control de Asistencia</span>
            </div>
            <div className="group flex flex-col gap-3 p-5 bg-white/70 hover:bg-white/95 rounded-2xl border border-white/60 hover:border-orange-200/60 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 backdrop-blur-md cursor-default">
              <div className="bg-orange-100/50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <ClipboardList className="w-6 h-6 text-[#e86d11]" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Historial de Sesiones</span>
            </div>
            <div className="group flex flex-col gap-3 p-5 bg-white/70 hover:bg-white/95 rounded-2xl border border-white/60 hover:border-purple-200/60 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 backdrop-blur-md cursor-default">
              <div className="bg-purple-100/50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Ahorro de Tiempo</span>
            </div>
          </div>

        </div>
      </div>
      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[420px] relative my-auto">
          
          {/* Main Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white relative overflow-hidden">
            
            {/* Mobile Logo */}
            <div className="flex justify-center mb-8 lg:hidden">
              <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-3 rounded-2xl shadow-lg shadow-[#0082cc]/30 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-cover mix-blend-screen" />
              </div>
            </div>
            
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 font-display">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
              </h2>
              <p className="text-slate-500 text-sm sm:text-base font-medium h-5">
                {isLogin 
                  ? 'Inicia sesión en tu cuenta de Harmony' 
                  : hasInvitation 
                    ? '¡Has sido invitado! Completa tu registro.' 
                    : 'Comienza a gestionar tu academia'}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex p-1 bg-slate-100/80 rounded-xl mb-8 border border-border/50 relative z-10">
              <button 
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-white shadow-sm text-slate-900 border border-border/30' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Ingresar
              </button>
              <button 
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-white shadow-sm text-slate-900 border border-border/30' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Registrarse
              </button>
            </div>

            <div className="relative overflow-visible z-10">
              {/* LOGIN FORM */}
              {isLogin && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className={labelClasses}>Correo Electrónico</label>
                      <div className="relative">
                        <Mail className={iconClasses} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={handleEmailChange}
                          className={inputClasses}
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Contraseña</label>
                      <div className="relative">
                        <Lock className={iconClasses} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClasses} pr-11`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#0082cc] hover:from-primary/90 hover:to-[#0082cc]/90 text-white font-medium rounded-2xl text-sm px-5 py-4 transition-all duration-300 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed mt-8 border border-primary/10"
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
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                      <label className={labelClasses}>Correo Electrónico</label>
                      <div className="relative">
                        <Mail className={iconClasses} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={handleEmailChange}
                          className={inputClasses}
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClasses}>Tu Nombre</label>
                        <div className="relative">
                          {isNameLocked ? (
                            <Lock className={iconClasses} />
                          ) : (
                            <User className={iconClasses} />
                          )}
                          <input
                            type="text"
                            required
                            readOnly={isNameLocked}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={`${inputClasses} ${isNameLocked ? 'opacity-80 bg-slate-50 cursor-not-allowed text-slate-500' : ''}`}
                            placeholder="Juan Pérez"
                          />
                        </div>
                      </div>

                      {!hasInvitation && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className={labelClasses}>Academia</label>
                          <div className="relative">
                            <Building className={iconClasses} />
                            <input
                              type="text"
                              required={!hasInvitation}
                              value={workspaceName}
                              onChange={(e) => setWorkspaceName(e.target.value)}
                              className={inputClasses}
                              placeholder="Escuela Musical"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelClasses}>Contraseña</label>
                      <div className="relative">
                        <Lock className={iconClasses} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClasses} pr-11`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Validation Indicators */}
                      <div className="bg-slate-50 border border-border/40 rounded-xl p-3 grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                          <span className={passwordValidations.length ? 'text-slate-800' : 'text-slate-500'}>Mínimo 8 chars</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.uppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                          <span className={passwordValidations.uppercase ? 'text-slate-800' : 'text-slate-500'}>Una Mayúscula</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.lowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                          <span className={passwordValidations.lowercase ? 'text-slate-800' : 'text-slate-500'}>Una Minúscula</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                          <span className={passwordValidations.number ? 'text-slate-800' : 'text-slate-500'}>Un Número</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Confirmar Contraseña</label>
                      <div className="relative">
                        <Lock className={iconClasses} />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full bg-white border text-foreground text-sm rounded-2xl block pl-11 pr-11 p-3.5 transition-all outline-none focus:ring-2 placeholder:text-muted-foreground/60 ${
                            confirmPassword && !passwordsMatch 
                              ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500' 
                              : confirmPassword && passwordsMatch
                              ? 'border-emerald-400 focus:ring-emerald-400/20 focus:border-emerald-500'
                              : 'border-border focus:ring-primary/20 focus:border-primary'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-[11px] sm:text-xs text-red-500 font-medium mt-1.5 ml-1">Las contraseñas no coinciden</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#0082cc] hover:from-primary/90 hover:to-[#0082cc]/90 text-white font-medium rounded-2xl text-sm px-5 py-4 transition-all duration-300 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed mt-8 border border-primary/10"
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
