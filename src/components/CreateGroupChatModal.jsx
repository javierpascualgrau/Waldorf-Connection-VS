/* eslint-disable react/prop-types */
import { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

// Los miembros seleccionables salen de tus hilos 1 a 1 ya existentes (no hay buscador de
// toda la comunidad todavía) — cubre el caso típico de "juntar a varios con los que ya hablo".
export default function CreateGroupChatModal({ contacts, myEmail, onClose, onCreated }) {
  const [groupName, setGroupName] = useState('');
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const toggleContact = (email) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedEmails.size < 2) return;
    setLoading(true);

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert([{ is_group: true, group_name: groupName.trim(), last_message_at: new Date().toISOString() }])
      .select()
      .single();

    if (chatError) {
      setLoading(false);
      alert('No se ha podido crear el grupo: ' + chatError.message);
      return;
    }

    const participantRows = [myEmail, ...selectedEmails].map(email => ({ chat_id: chat.id, user_email: email }));
    const { error: participantsError } = await supabase.from('chat_participants').insert(participantRows);

    setLoading(false);

    if (participantsError) {
      alert('No se ha podido añadir a los participantes: ' + participantsError.message);
      return;
    }

    onCreated(chat.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <h2 className="font-cormorant text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Nuevo grupo
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="flex-shrink-0">
            <label className="text-xs text-muted-foreground mb-1 block">Nombre del grupo *</label>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Ej: Rutas Escuela Libre"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-muted-foreground mb-1 block">
              Participantes {selectedEmails.size > 0 && `(${selectedEmails.size} seleccionados)`}
            </label>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 no-scrollbar">
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                Todavía no tienes conversaciones para añadir a un grupo.
              </p>
            ) : (
              contacts.map(contact => {
                const isSelected = selectedEmails.has(contact.email);
                const initials = contact.name?.slice(0, 2).toUpperCase() || 'U';
                return (
                  <button
                    key={contact.email}
                    onClick={() => toggleContact(contact.email)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-colors text-left ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                      {contact.avatar ? (
                        <img src={contact.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-primary font-semibold text-xs">{initials}</span>
                      )}
                    </div>
                    <span className="text-sm text-foreground flex-1 truncate">{contact.name}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !groupName.trim() || selectedEmails.size < 2}
          className="mt-4 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          {loading ? 'Creando...' : 'Crear grupo'}
        </button>
        {selectedEmails.size === 1 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">Elige al menos 2 personas para formar un grupo.</p>
        )}
      </div>
    </div>
  );
}
