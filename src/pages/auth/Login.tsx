import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

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
      // Eliminamos el navigate('/') de aquí.
      // App.tsx escuchará el evento SIGNED_IN, llenará el authStore, y el useEffect de arriba nos redirigirá de forma segura.
    } catch (error: any) {
      addToast({ message: error.message || 'Error al iniciar sesión', type: 'error' });
      setLoading(false); // Solo quitamos el loading si hay error
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
            <div className="bg-gradient-to-br from-[#0082cc] to-[#e86d11] p-3 rounded-2xl shadow-lg shadow-[#0082cc]/30 flex items-center justify-center overflow-hidden mb-6">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-cover mix-blend-screen" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 font-display">Bienvenido</h1>
            <p className="text-muted-foreground text-sm">Inicia sesión en tu cuenta de Harmony</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

          <p className="text-sm font-medium text-muted-foreground text-center mt-8">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-primary hover:text-indigo-600 transition-colors">
              Regístrate aquí
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
