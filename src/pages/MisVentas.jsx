import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, Download, Loader2, CreditCard } from 'lucide-react';
import { goBack } from '@/lib/navigation';

const STATUS_LABELS = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_envio: 'Pendiente de envío',
  enviado: 'Enviado',
  entregado: 'Entregado',
  confirmado: 'Cobrado',
  cancelado: 'Cancelado',
};

export default function MisVentas() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [ordersRes, profileRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*, marketplace_listings(title, image_urls)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('seller_shipping_profiles').select('onboarding_complete').eq('user_id', user.id).maybeSingle(),
    ]);

    setOrders(ordersRes.data || []);
    setOnboardingComplete(!!profileRes.data?.onboarding_complete);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding-link', {
      body: { return_url: window.location.href },
    });
    setConnectingStripe(false);
    if (error || data?.error) {
      alert(data?.error || 'No se ha podido iniciar la conexión con Stripe.');
      return;
    }
    window.location.href = data.url;
  };

  const handleMarkShipped = async (orderId) => {
    setMarkingId(orderId);
    const { data, error } = await supabase.functions.invoke('mark-shipped', { body: { order_id: orderId } });
    setMarkingId(null);
    if (error || data?.error) {
      alert(data?.error || 'No se ha podido marcar como enviado.');
      return;
    }
    loadOrders();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/perfil')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <h1 className="font-cormorant text-3xl font-semibold text-foreground mb-6">Mis ventas</h1>

      {!loading && !onboardingComplete && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-5 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">Conecta tu cuenta de Stripe</p>
            <p className="text-xs text-muted-foreground">Necesario para poder cobrar tus ventas con envío.</p>
          </div>
          <button
            onClick={handleConnectStripe}
            disabled={connectingStripe}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <CreditCard className="w-3.5 h-3.5" /> {connectingStripe ? 'Conectando...' : 'Conectar con Stripe'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando ventas...</div>
      ) : orders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-10 bg-card border border-dashed border-border rounded-2xl">
          Todavía no tienes ninguna venta con envío.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {order.marketplace_listings?.title || 'Anuncio eliminado'}
                </h3>
                <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md flex-shrink-0">
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Total cobrado: {Number(order.total_amount).toFixed(2)} €</p>

              {order.status === 'pendiente_envio' && (
                <button
                  onClick={() => handleMarkShipped(order.id)}
                  disabled={markingId === order.id}
                  className="w-full flex items-center justify-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-xs font-semibold py-1.5 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                  {markingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {order.fulfillment_method === 'mano' ? 'Marcar como entregado' : 'Marcar como enviado'}
                </button>
              )}

              {order.fulfillment_method === 'envio' && order.packlink_label_url && (
                <a
                  href={order.packlink_label_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl text-xs font-semibold py-1.5 hover:bg-muted/70 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar etiqueta
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
