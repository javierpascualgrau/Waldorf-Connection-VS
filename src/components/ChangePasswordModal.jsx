import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { X, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChangePasswordModal({ userEmail, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 1. Validaciones básicas en el cliente
    if (newPassword !== confirmPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // 2. Verificar contraseña actual re-autenticando en segundo plano
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (authError) {
        setError('La contraseña actual es incorrecta.');
        setLoading(false);
        return;
      }

      // 3. Si la actual es correcta, actualizamos a la nueva contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Error al actualizar la contraseña.');
      } else {
        setSuccess('¡Contraseña cambiada con éxito! 🚀');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Cerramos el modal automáticamente tras 2 segundos para que vean el éxito
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-xl relative animate-scale-up">
        
        {/* Botón cerrar */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="font-cormorant text-2xl font-bold text-foreground">Ajustes de Cuenta</h2>
        </div>
        
        <p className="text-xs text-muted-foreground mb-4">
          Cambia la contraseña de acceso para tu cuenta asociada a <span className="font-medium text-foreground">{userEmail}</span>.
        </p>

        {/* Mensajes de feedback */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2 mb-4 border border-destructive/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs flex items-center gap-2 mb-4 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña Actual</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-muted/40 border border-border/70 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              disabled={loading || success}
            />
          </div>

          <div className="border-t border-border/40 pt-3 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-muted/40 border border-border/70 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                disabled={loading || success}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-muted/40 border border-border/70 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm min-w-[120px] justify-center"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar cambios'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}