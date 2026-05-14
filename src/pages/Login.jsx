import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { LogIn, Mail, Lock, Sparkles } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError("Credenciales incorrectas o usuario no encontrado.");
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      alert("¡Revisa tu email para confirmar el registro!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] space-y-8 animate-fade-up">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-cormorant text-4xl font-semibold text-foreground">Waldorf Connect</h1>
          <p className="text-muted-foreground mt-2">Bienvenido a tu comunidad</p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
          <form className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground ml-1 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground ml-1 mb-1 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-xs text-destructive text-center">{error}</p>}

            <div className="pt-2 space-y-3">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Cargando...' : <><LogIn className="w-4 h-4" /> Entrar</>}
              </button>
              
              <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full bg-transparent text-muted-foreground py-2 text-xs font-medium hover:text-foreground transition-colors"
              >
                ¿No tienes cuenta? Regístrate
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          Educación · Comunidad · Espiritualidad
        </p>
      </div>
    </div>
  );
}