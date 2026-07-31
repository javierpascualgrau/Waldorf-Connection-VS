/* eslint-disable react/prop-types */
import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { openMarketplaceListingChat } from '@/lib/marketplaceChat';

export default function MakeOfferModal({ listing, userEmail, onClose, onSent }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    setLoading(true);

    const chat = await openMarketplaceListingChat(userEmail, listing);
    if (!chat) {
      setLoading(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('chat_messages').insert([{
      chat_id: chat.id,
      sender_email: userEmail.toLowerCase().trim(),
      content: `Oferta: ${parsedAmount.toFixed(2)} €`,
      message_type: 'offer',
      offer_amount: parsedAmount,
      offer_status: 'pendiente',
    }]);

    if (!error) {
      await supabase.from('chats').update({ last_message_at: nowIso }).eq('id', chat.id);
    }

    setLoading(false);

    if (error) {
      alert('Error al enviar la oferta: ' + error.message);
      return;
    }

    onSent(chat.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-2xl font-semibold">Hacer una oferta</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="text-xs text-muted-foreground mb-1 block">Tu oferta (€) *</label>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 mb-5">
          <span className="text-muted-foreground text-sm flex-shrink-0">€</span>
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={listing.price != null ? String(listing.price) : 'Importe'}
            className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar oferta'}
        </button>
      </div>
    </div>
  );
}
