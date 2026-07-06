import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, MapPin, Tag, Trash2, Pencil, MessageCircle, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import CreateMarketplaceListingModal from '@/components/CreateMarketplaceListingModal';

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

  const handleContactar = async () => {
    if (!user?.email || !listing?.author_email) return;

    const emails = [user.email.toLowerCase().trim(), listing.author_email.toLowerCase().trim()].sort();

    const { data } = await supabase
      .from('chats')
      .upsert({ user_1_email: emails[0], user_2_email: emails[1] }, { onConflict: 'user_1_email,user_2_email' })
      .select()
      .single();

    if (data) {
      navigate('/hilo', { state: { activeChatId: data.id } });
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
    <div className="max-w-5xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* COLUMNA IZQUIERDA: IMAGEN */}
        <div>
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-sm bg-muted">
            {images.length > 0 ? (
              <Carousel setApi={setCarouselApi} className="w-full">
                <CarouselContent className="ml-0">
                  {images.map((url, i) => (
                    <CarouselItem key={url + i} className="pl-0">
                      <button onClick={() => setZoomOpen(true)} className="block w-full h-80 sm:h-96">
                        <img src={url} className="w-full h-full object-cover" alt={listing.title} />
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <div className="h-80 sm:h-96 flex items-center justify-center text-primary/40">
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

        {/* COLUMNA DERECHA: INFO Y CONTACTO */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col h-full">
          <div className="space-y-4 flex-1">
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

            {listing.description && (
              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap pt-4 border-t border-border/60">
                {listing.description}
              </div>
            )}
          </div>

          {/* TARJETA DEL VENDEDOR: siempre visible, misma fuente de datos que el chat/perfil */}
          <div className="pt-4 mt-4 border-t border-border/60 space-y-3">
            <div
              onClick={() => navigate(`/usuario/${encodeURIComponent(listing.author_email)}`)}
              className="flex items-center gap-2.5 cursor-pointer group min-w-0"
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

            {isMine ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl text-sm font-semibold py-2.5 hover:bg-muted/70 transition-all"
                >
                  <Pencil className="w-4 h-4" /> Editar anuncio
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-destructive/80 hover:text-destructive border border-border rounded-xl py-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar mi anuncio
                </button>
              </div>
            ) : (
              <button
                onClick={handleContactar}
                className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold py-2.5 hover:bg-primary/90 transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Contactar
              </button>
            )}
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
    </div>
  );
}
