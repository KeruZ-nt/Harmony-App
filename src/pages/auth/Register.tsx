import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, Building, ArrowRight, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasInvitation, setHasInvitation] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  // Validaciones en tiempo real
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

  // Verificar invitación cuando el email cambia
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
    // Podríamos usar debounce aquí si quisiéramos, pero para simplicidad comprobamos directamente
    if (newEmail.includes('@') && newEmail.includes('.')) {
      checkInvitation(newEmail);
    } else {
      setHasInvitation(false);
      setIsNameLocked(false);
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
      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Ejecutar la función RPC para crear o unirse al Workspace
        // Si tiene invitación, enviamos un nombre ficticio porque la base de datos lo ignorará.
        const { error: rpcError } = await supabase.rpc('handle_user_registration', {
          p_user_id: authData.user.id,
          p_workspace_name: hasInvitation ? 'Invitado' : workspaceName,
          p_full_name: fullName,
          p_email: email
        });

        if (rpcError) throw rpcError;
        
        addToast({ message: 'Cuenta y Academia creadas con éxito. Bienvenido.', type: 'success' });
        navigate('/'); // Redirigir al dashboard
      }
    } catch (error: any) {
      addToast({ message: error.message || 'Error al registrar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 border border-white/20">
          
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-3 rounded-2xl shadow-xl shadow-[#0082cc]/20 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-cover mix-blend-screen" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 font-display">Crear Cuenta</h1>
            <p className="text-muted-foreground text-sm">
              {hasInvitation ? '¡Has sido invitado! Completa tu registro para unirte.' : 'Comienza a gestionar tu academia'}
            </p>
          </div>

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
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            {!hasInvitation && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Nombre de la Academia/Escuela</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                  <input
                    type="text"
                    required={!hasInvitation}
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-card/50 border border-border text-foreground text-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3.5 transition-all outline-none"
                    placeholder="Ej. Escuela Musical Harmony"
                  />
                </div>
              </div>
            )}

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
                <p className="text-xs text-destructive mt-1.5 ml-1">Las contraseñas no coinciden</p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-xs text-green-500 mt-1.5 ml-1">Las contraseñas coinciden</p>
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
                  <span>{hasInvitation ? 'Completar Registro y Unirse' : 'Crear Cuenta y Academia'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-sm font-medium text-muted-foreground text-center mt-8">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-primary hover:text-indigo-600 transition-colors">
              Inicia sesión aquí
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
