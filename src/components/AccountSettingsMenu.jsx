/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import { Settings, Lock, LogOut } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

// Botón de engranaje único que agrupa "Cambiar contraseña" y "Cerrar sesión" en un
// desplegable, reutilizado en los 3 tipos de perfil (individual, colegio, empresa).
export default function AccountSettingsMenu({ userEmail, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          title="Ajustes de cuenta"
        >
          <Settings className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[190px]">
            <button
              onClick={() => { setMenuOpen(false); setPasswordModalOpen(true); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Cambiar contraseña
            </button>
            <button
              onClick={() => { setMenuOpen(false); onLogout(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {passwordModalOpen && (
        <ChangePasswordModal userEmail={userEmail} onClose={() => setPasswordModalOpen(false)} />
      )}
    </>
  );
}
