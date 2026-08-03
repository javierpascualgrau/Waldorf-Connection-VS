import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, MapPin, Tag, Trash2, Pencil, MessageCircle, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import CreateMarketplaceListingModal from '@/components/CreateMarketplaceListingModal';
import MakeOfferModal from '@/components/MakeOfferModal';
import ActionButton from '@/components/ActionButton';
import { goBack } from '@/lib/navigation';
import { openMarketplaceListingChat } from '@/lib/marketplaceChat';

const CATEGORY_LABELS = {
  material_escolar: 'Material escolar',
  ropa_uniforme: 'Ropa / Uniforme',
  instrumentos: 'Instrumentos',
  libros: 'Libros',
  juguetes: 'Juguetes',
  otro: 'Otro',
};

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  const [carouselApi, setCarouselApi] = useState();
  const [currentIndex, setCurrentIndex] = useState(0);

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

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on('select', onSelect);
    return () => carouselApi.off('select', onSelect);
  }, [carouselApi]);

  const handleComprar = () => {
    if (listing.delivery_method === 'mano') {
      handleContactar();
      return;
    }
    if (listing.delivery_method === 'envio') {
      navigate(`/anuncios/${listing.id}/envio`);
      return;
    }
    navigate(`/anuncios/${listing.id}/entrega`);
  };

  const handleContactar = async () => {
    if (!user?.email || !listing) return;
    const chat = await openMarketplaceListingChat(user.email, listing);
    if (chat) {
      navigate('/hilo', { state: { activeChatId: chat.id } });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Quieres eliminar este anuncio?')) return;
    await supabase.from('marketplace_listings').delete().eq('id', listing.id);
    navigate(-1);
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando anuncio...</div>;
  if (!listing) return <div className="p-20 text-center text-muted-foreground">Este anuncio no existe o ha sido eliminado.</div>;

  const isMine = user?.email && listing.author_email?.toLowerCase().trim() === user.email.toLowerCase().trim();
  const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
  const initials = listing.author_name?.slice(0, 2).toUpperCase() || 'W';
  const images = listing.image_urls || [];

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="space-y-6">
        {/* 1. Perfil de quien publica */}
        <div
          onClick={() => navigate(`/usuario/${encodeURIComponent(listing.author_email)}`)}
          className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors group"
        >
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0 group-hover:opacity-80 transition-opacity">
            {listing.author_avatar ? (
              <img src={listing.author_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Publicado por</p>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {listing.author_name || 'Miembro de la comunidad'}
            </p>
          </div>
        </div>

        {/* 2-3. Título, precio y ubicación */}
        <div className="space-y-2">
          <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-foreground leading-tight">
            {listing.title}
          </h1>
          {listing.price != null && (
            <p className="text-3xl font-bold text-primary">{listing.price} €</p>
          )}
          {listing.location && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary/70" /> {listing.location}
            </p>
          )}
        </div>

        {/* 4. Botones de acción — posición provisional, ajustable */}
        <div>
          {isMine ? (
            <div className="flex flex-col gap-2.5">
              <ActionButton icon={Pencil} variant="muted" onClick={() => setShowEditModal(true)}>
                Editar anuncio
              </ActionButton>
              <ActionButton icon={Trash2} variant="destructive" onClick={handleDelete}>
                Eliminar mi anuncio
              </ActionButton>
            </div>
          ) : listing.listing_type === 'vendo' && listing.sold_at ? (
            <div className="text-center text-sm font-semibold text-muted-foreground bg-muted rounded-xl py-2.5">
              Este anuncio ya se ha vendido
            </div>
          ) : listing.listing_type === 'vendo' ? (
            <div className="space-y-2.5">
              <div className="flex gap-2.5">
                <ActionButton icon={MessageCircle} variant="muted" className="flex-1" onClick={handleContactar}>
                  Contactar
                </ActionButton>
                <ActionButton variant="muted" className="flex-1" onClick={() => setShowOfferModal(true)}>
                  Hacer oferta
                </ActionButton>
              </div>
              <ActionButton variant="primary" className="w-full" onClick={handleComprar}>
                Comprar
              </ActionButton>
            </div>
          ) : (
            <ActionButton icon={MessageCircle} variant="primary" className="w-full" onClick={handleContactar}>
              Contactar
            </ActionButton>
          )}
        </div>

        {/* 5. Foto, a todo el ancho de la página */}
        <div>
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-sm bg-muted">
            {images.length > 0 ? (
              <Carousel setApi={setCarouselApi} className="w-full">
                <CarouselContent className="ml-0">
                  {images.map((url, i) => (
                    <CarouselItem key={url + i} className="pl-0">
                      <button onClick={() => setZoomOpen(true)} className="block w-full h-80 sm:h-[28rem]">
                        <img src={url} className="w-full h-full object-cover" alt={listing.title} />
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <div className="h-80 sm:h-[28rem] flex items-center justify-center text-primary/40">
                <ImageIcon className="w-10 h-10" />
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={() => carouselApi?.scrollPrev()}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => carouselApi?.scrollNext()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                  {currentIndex + 1}/{images.length}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-xl border ${
              listing.listing_type === 'vendo'
                ? 'bg-primary/5 text-primary border-primary/10'
                : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            }`}>
              {listing.listing_type}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 bg-muted text-muted-foreground rounded-xl flex items-center gap-1">
              <Tag className="w-3 h-3" /> {categoryLabel}
            </span>
          </div>
        </div>

        {/* 6. Descripción + Características, a todo el ancho debajo de la foto */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
          {listing.description && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Descripción</h2>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          <div className={listing.description ? 'pt-4 border-t border-border/60' : ''}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Características</h2>
            <dl className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd className="font-medium text-foreground">{categoryLabel}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">Tipo de anuncio</dt>
                <dd className="font-medium text-foreground capitalize">{listing.listing_type}</dd>
              </div>
              {listing.delivery_method && (
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Forma de entrega</dt>
                  <dd className="font-medium text-foreground">{listing.delivery_method === 'mano' ? 'En mano' : 'Envío'}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {zoomOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setZoomOpen(false)}
        >
          <button
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={images[currentIndex]}
            alt={listing.title}
            className="max-w-[95vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showEditModal && (
        <CreateMarketplaceListingModal
          user={user}
          editListing={listing}
          onClose={() => setShowEditModal(false)}
          onCreated={async () => {
            setShowEditModal(false);
            const { data } = await supabase
              .from('marketplace_listings')
              .select('*')
              .eq('id', listing.id)
              .maybeSingle();
            if (data) setListing(data);
          }}
        />
      )}

      {showOfferModal && (
        <MakeOfferModal
          listing={listing}
          userEmail={user?.email}
          onClose={() => setShowOfferModal(false)}
          onSent={(chatId) => {
            setShowOfferModal(false);
            navigate('/hilo', { state: { activeChatId: chatId } });
          }}
        />
      )}
    </div>
  );
}
