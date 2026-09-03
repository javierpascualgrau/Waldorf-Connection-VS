/* eslint-disable react/prop-types */
import { X } from 'lucide-react';
import FollowNetwork from './FollowNetwork';

// Envoltorio modal de FollowNetwork para perfiles que no tienen barra de pestañas propia
// (personas) — colegios y empresas ya tienen pestañas y montan FollowNetwork directamente ahí.
export default function FollowNetworkModal({ email, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-2xl font-semibold">Red</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <FollowNetwork email={email} />
      </div>
    </div>
  );
}
