import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, Handshake, Truck, ShieldCheck, MessageCircle } from 'lucide-react';
import { goBack } from '@/lib/navigation';
import { openMarketplaceListingChat } from '@/lib/marketplaceChat';

export default function DeliveryMethodChoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('method'); // 'method' | 'mano'

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
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleOpenChat = async () => {
    if (!user?.email || !listing) return;
    const chat = await openMarketplaceListingChat(user.email, listing);
    if (chat) navigate('/hilo', { state: { activeChatId: chat.id } });
  };

  const handleBack = () => {
    if (step === 'mano') {
      setStep('method');
      return;
    }
    goBack(navigate, '/servicios');
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!listing) return <div className="p-20 text-center text-muted-foreground">Este anuncio no existe o ha sido eliminado.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={handleBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      {step === 'method' ? (
        <>
          <div className="text-center mb-6 space-y-1">
            <h1 className="font-cormorant text-3xl font-semibold text-foreground">¿Cómo quieres recibirlo?</h1>
            <p className="text-sm text-muted-foreground">{listing.title}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setStep('mano')}
              className="text-left p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <Handshake className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">En mano</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quedar con el vendedor en persona, con o sin pago protegido dentro de la app.
              </p>
            </button>

            <button
              onClick={() => navigate(`/anuncios/${listing.id}/envio`)}
              className="text-left p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <Truck className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Envío</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Checkout con pago protegido: el importe queda retenido hasta que confirmes que has recibido el artículo.
              </p>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mb-6 space-y-1">
            <h1 className="font-cormorant text-3xl font-semibold text-foreground">En mano</h1>
            <p className="text-sm text-muted-foreground">{listing.title}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleOpenChat}
              className="text-left p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <Handshake className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Quedar y pagar en persona</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gratis. Te lleva directo al chat con el vendedor para quedar. No hay pago dentro de la app.
              </p>
            </button>

            <button
              onClick={() => navigate(`/anuncios/${listing.id}/envio`, { state: { fulfillmentMethod: 'mano' } })}
              className="text-left p-6 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <ShieldCheck className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Pagar ahora, protegido</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pagas ya, el importe queda retenido, y quedáis por chat para el encuentro. Se libera al confirmar que lo has recibido.
              </p>
            </button>
          </div>
        </>
      )}

      <button
        onClick={handleOpenChat}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-3 mt-2"
      >
        <MessageCircle className="w-3.5 h-3.5" /> Chatear con el vendedor
      </button>
    </div>
  );
}
