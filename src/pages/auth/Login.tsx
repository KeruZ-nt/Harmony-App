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

  const inputClasses = "w-full bg-white/5 border border-white/10 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white/10 block pl-11 p-3.5 transition-all outline-none placeholder:text-slate-500";
  const iconClasses = "absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400";
  const labelClasses = "block text-sm font-medium text-slate-300 mb-1.5 ml-1";

  return (
    <div className="min-h-screen flex w-full bg-slate-950 relative overflow-hidden text-slate-200">
      
      {/* Universal Background gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[70%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
      </div>

      {/* Left Panel - Information (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-slate-950/50 backdrop-blur-sm border-r border-white/5 text-white z-10">
        
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
          <p className="text-slate-400 text-lg xl:text-xl max-w-md">
            Control de asistencia, pagos, alumnos y profesores en un solo lugar. 
            Desarrollado para la excelencia musical.
          </p>
        </div>

        <div className="z-10 relative mt-auto border border-white/10 bg-white/5 backdrop-blur-md p-6 rounded-3xl max-w-md shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-lg`}>
                  M{i}
                </div>
              ))}
            </div>
            <div className="text-sm">
              <p className="font-bold text-white">Únete a cientos de directores</p>
              <p className="text-slate-400">que ya modernizaron su gestión</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-[440px] relative">
          <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden">
            
            {/* Subtle glow inside the card */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            <div className="flex justify-center mb-6 lg:hidden">
              <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-3 rounded-2xl shadow-lg shadow-[#0082cc]/30 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-cover mix-blend-screen" />
              </div>
            </div>
            
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2 font-display">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
              </h2>
              <p className="text-slate-400 text-sm h-5">
                {isLogin 
                  ? 'Inicia sesión en tu cuenta de Harmony' 
                  : hasInvitation 
                    ? '¡Has sido invitado! Completa tu registro.' 
                    : 'Comienza a gestionar tu academia'}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex p-1 bg-black/20 rounded-xl mb-8 border border-white/5 relative z-10">
              <button 
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-white/10 shadow-lg text-white border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Ingresar
              </button>
              <button 
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-white/10 shadow-lg text-white border border-white/10' : 'text-slate-400 hover:text-white'}`}
              >
                Registrarse
              </button>
            </div>

            <div className="relative overflow-visible z-10">
              {/* LOGIN FORM */}
              {isLogin && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <form onSubmit={handleLogin} className="space-y-4">
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
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-medium rounded-2xl text-sm px-5 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-70 disabled:cursor-not-allowed mt-8 border border-indigo-400/20"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className={`${inputClasses} ${isNameLocked ? 'opacity-70 bg-black/20 cursor-not-allowed' : ''}`}
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
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Validation Indicators */}
                      <div className="bg-black/20 border border-white/5 rounded-xl p-3 grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                          <span className={passwordValidations.length ? 'text-slate-200' : 'text-slate-500'}>Mínimo 8 chars</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.uppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                          <span className={passwordValidations.uppercase ? 'text-slate-200' : 'text-slate-500'}>Una Mayúscula</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.lowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                          <span className={passwordValidations.lowercase ? 'text-slate-200' : 'text-slate-500'}>Una Minúscula</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                          {passwordValidations.number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                          <span className={passwordValidations.number ? 'text-slate-200' : 'text-slate-500'}>Un Número</span>
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
                          className={`w-full bg-white/5 border text-white text-sm rounded-2xl block pl-11 pr-11 p-3.5 transition-all outline-none focus:ring-2 placeholder:text-slate-500 ${
                            confirmPassword && !passwordsMatch 
                              ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500' 
                              : confirmPassword && passwordsMatch
                              ? 'border-emerald-500/50 focus:ring-emerald-500/20 focus:border-emerald-500'
                              : 'border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white/10'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-[11px] sm:text-xs text-red-400 mt-1.5 ml-1">Las contraseñas no coinciden</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-medium rounded-2xl text-sm px-5 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-70 disabled:cursor-not-allowed mt-8 border border-indigo-400/20"
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
