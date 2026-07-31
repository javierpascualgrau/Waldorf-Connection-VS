import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { goBack } from '@/lib/navigation';

const STATUS_LABELS = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_envio: 'Pendiente de envío',
  enviado: 'Enviado',
  entregado: 'Entregado',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

const DELAYED_AFTER_DAYS = 5;

export default function MisCompras() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('*, marketplace_listings(title, image_urls)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const handleConfirm = async (orderId) => {
    if (!window.confirm('¿Confirmas que has recibido el artículo? Se liberará el pago al vendedor.')) return;
    setConfirmingId(orderId);
    const { data, error } = await supabase.functions.invoke('release-payment', { body: { order_id: orderId } });
    setConfirmingId(null);
    if (error || data?.error) {
      alert(data?.error || 'No se ha podido confirmar la recepción.');
      return;
    }
    loadOrders();
  };

  const isDelayed = (order) => {
    if (order.status !== 'pendiente_envio') return false;
    const daysSinceCreated = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated > DELAYED_AFTER_DAYS;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/perfil')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <h1 className="font-cormorant text-3xl font-semibold text-foreground mb-6">Mis compras</h1>

      {loading ? (
        <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando compras...</div>
      ) : orders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-10 bg-card border border-dashed border-border rounded-2xl">
          Todavía no has comprado nada con envío.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {order.marketplace_listings?.title || 'Anuncio eliminado'}
                </h3>
                <div className="flex items-center gap-1.5">
                  {isDelayed(order) && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-700 border-amber-500/20">
                      <AlertTriangle className="w-2.5 h-2.5" /> Envío retrasado
                    </span>
                  )}
                  <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total pagado: {Number(order.total_amount).toFixed(2)} €</p>

              {order.packlink_tracking_url && (
                <a
                  href={order.packlink_tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl text-xs font-semibold py-1.5 hover:bg-muted/70 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver seguimiento del envío
                </a>
              )}

              {['enviado', 'entregado'].includes(order.status) && (
                <button
                  onClick={() => handleConfirm(order.id)}
                  disabled={confirmingId === order.id}
                  className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold py-1.5 hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {confirmingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirmar recepción
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
