import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, Tag, Trash2, Pencil, MessageCircle, Briefcase } from 'lucide-react';
import CreateEmployabilityListingModal from '@/components/CreateEmployabilityListingModal';

const CATEGORY_LABELS = {
  educacion: 'Educación',
  bienestar: 'Bienestar',
  artes: 'Artes',
  retiros: 'Retiros',
  salud: 'Salud',
};

export default function EmployabilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const { data } = await supabase
        .from('employability_listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      setListing(data);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleContactar = async () => {
    if (!user?.email || !listing?.author_email) return;

    const emails = [user.email.toLowerCase().trim(), listing.author_email.toLowerCase().trim()].sort();

    const { data, error } = await supabase
      .from('chats')
      .upsert({ user_1_email: emails[0], user_2_email: emails[1] }, { onConflict: 'user_1_email,user_2_email' })
      .select()
      .single();

    if (error) {
      alert('No se ha podido abrir el chat: ' + error.message);
      return;
    }
    navigate('/hilo', { state: { activeChatId: data.id } });
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Quieres eliminar esta publicación?')) return;
    await supabase.from('employability_listings').delete().eq('id', listing.id);
    navigate(-1);
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando publicación...</div>;
  if (!listing) return <div className="p-20 text-center text-muted-foreground">Esta publicación no existe o ha sido eliminada.</div>;

  const isMine = user?.email && listing.author_email?.toLowerCase().trim() === user.email.toLowerCase().trim();
  const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
  const initials = listing.author_name?.slice(0, 2).toUpperCase() || 'W';

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* COLUMNA IZQUIERDA: ICONO (sin imágenes en Empleabilidad) */}
        <div>
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-sm bg-muted h-80 sm:h-96 flex items-center justify-center text-primary/40">
            <Briefcase className="w-10 h-10" />
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className="text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 bg-secondary text-secondary-foreground rounded-xl flex items-center gap-1">
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

            {listing.description && (
              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap pt-4 border-t border-border/60">
                {listing.description}
              </div>
            )}
          </div>

          {/* TARJETA DEL AUTOR: siempre visible, misma fuente de datos que el chat/perfil */}
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
                  <Pencil className="w-4 h-4" /> Editar publicación
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-destructive/80 hover:text-destructive border border-border rounded-xl py-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
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

      {showEditModal && (
        <CreateEmployabilityListingModal
          user={user}
          editListing={listing}
          onClose={() => setShowEditModal(false)}
          onCreated={async () => {
            setShowEditModal(false);
            const { data } = await supabase
              .from('employability_listings')
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
