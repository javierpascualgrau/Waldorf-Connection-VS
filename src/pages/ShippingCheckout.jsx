import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { stripePromise } from '@/lib/stripeClient';
import { computeBreakdown } from '@/lib/pricing';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { goBack } from '@/lib/navigation';
import { openMarketplaceListingChat } from '@/lib/marketplaceChat';

function PaymentStep({ orderId }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/mis-compras` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'No se ha podido procesar el pago.');
      setPaying(false);
      return;
    }

    void orderId;
    navigate('/mis-compras');
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {paying ? 'Procesando...' : 'Confirmar y pagar'}
      </button>
    </form>
  );
}

export default function ShippingCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fulfillmentMethod = location.state?.fulfillmentMethod === 'mano' ? 'mano' : 'envio';
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [acceptedOfferPrice, setAcceptedOfferPrice] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');

  const [clientSecret, setClientSecret] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const { data } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setListing(data);

      // Refleja aquí, solo para mostrar, la misma oferta aceptada que create-payment-intent
      // resuelve server-side (fuente de verdad real) al calcular el cobro de este pedido.
      if (authUser?.email && data?.author_email) {
        const emails = [authUser.email.toLowerCase().trim(), data.author_email.toLowerCase().trim()].sort();
        const { data: chat } = await supabase
          .from('chats')
          .select('context_type, context_id, accepted_offer_price')
          .eq('user_1_email', emails[0])
          .eq('user_2_email', emails[1])
          .maybeSingle();

        if (chat?.context_type === 'marketplace_listing' && chat?.context_id === data.id && chat?.accepted_offer_price != null) {
          setAcceptedOfferPrice(Number(chat.accepted_offer_price));
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleChatWithSeller = async () => {
    if (!user?.email || !listing) return;
    const chat = await openMarketplaceListingChat(user.email, listing);
    if (chat) navigate('/hilo', { state: { activeChatId: chat.id } });
  };

  const handleStartPayment = async (e) => {
    e.preventDefault();
    if (fulfillmentMethod === 'envio' && (!name.trim() || !street.trim() || !city.trim() || !postalCode.trim())) return;
    setSubmitting(true);
    setError('');

    const delivery_address = fulfillmentMethod === 'envio' ? {
      type: 'home',
      name: name.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      province: province.trim(),
      country: 'ES',
    } : null;

    const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
      body: { listing_id: listing.id, delivery_address, fulfillment_method: fulfillmentMethod },
    });

    setSubmitting(false);

    if (fnError || data?.error) {
      setError(data?.error || 'No se ha podido iniciar el pago. Inténtalo de nuevo.');
      return;
    }

    setClientSecret(data.client_secret);
    setOrderId(data.order_id);
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!listing) return <div className="p-20 text-center text-muted-foreground">Este anuncio no existe o ha sido eliminado.</div>;

  const breakdown = computeBreakdown(acceptedOfferPrice ?? listing.price, { incluirEnvio: fulfillmentMethod === 'envio' });

  return (
    <div className="max-w-lg mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <h1 className="font-cormorant text-3xl font-semibold text-foreground mb-1">
        {fulfillmentMethod === 'mano' ? 'Pago protegido' : 'Checkout de envío'}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{listing.title}</p>

      <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{acceptedOfferPrice != null ? 'Artículo (oferta acordada)' : 'Artículo'}</span>
          <span className="text-foreground">{breakdown.item_price.toFixed(2)} €</span>
        </div>
        {fulfillmentMethod === 'envio' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span className="text-foreground">{breakdown.shipping_price.toFixed(2)} €</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Comisión de la plataforma</span>
          <span className="text-foreground">{breakdown.platform_fee.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border/60">
          <span>Total</span>
          <span className="text-primary">{breakdown.total.toFixed(2)} €</span>
        </div>
      </div>

      {!clientSecret ? (
        <form onSubmit={handleStartPayment} className="space-y-3">
          {fulfillmentMethod === 'envio' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nombre y apellidos *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dirección *</label>
                <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Calle y número" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ciudad *</label>
                  <input value={city} onChange={e => setCity(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Código postal *</label>
                  <input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Provincia</label>
                <input value={province} onChange={e => setProvince(e.target.value)} className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </>
          )}

          {fulfillmentMethod === 'mano' && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5">
              No hace falta dirección: quedaréis por chat para el encuentro en persona una vez confirmado el pago.
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting || (fulfillmentMethod === 'envio' && (!name.trim() || !street.trim() || !city.trim() || !postalCode.trim()))}
            className="mt-2 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {submitting ? 'Preparando pago...' : 'Continuar al pago'}
          </button>
        </form>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep orderId={orderId} />
        </Elements>
      )}

      <button
        onClick={handleChatWithSeller}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-3 mt-2"
      >
        <MessageCircle className="w-3.5 h-3.5" /> Chatear con el vendedor
      </button>
    </div>
  );
}
