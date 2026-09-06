import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';
import { Search, MapPin, ShoppingBag, Car, Briefcase, Plus, Trash2, MessageCircle, Tag, School, ArrowLeftRight, Compass } from 'lucide-react';
import CreateMarketplaceListingModal from '@/components/CreateMarketplaceListingModal';
import CreateSchoolRouteModal from '@/components/CreateSchoolRouteModal';
import CreateEmployabilityListingModal from '@/components/CreateEmployabilityListingModal';
import MakeOfferModal from '@/components/MakeOfferModal';
import { openMarketplaceListingChat } from '@/lib/marketplaceChat';

const SERVICIOS_TABS = [
  { id: 'compraventa', label: 'Compraventa', icon: ShoppingBag },
  { id: 'rutas', label: 'Rutas Escolares', icon: Car },
  { id: 'empleo', label: 'Actividades', icon: Briefcase },
];

const CATEGORY_FILTERS = [
  { label: 'Todas', value: 'Todas' },
  { label: 'Material escolar', value: 'material_escolar' },
  { label: 'Ropa / Uniforme', value: 'ropa_uniforme' },
  { label: 'Instrumentos', value: 'instrumentos' },
  { label: 'Libros', value: 'libros' },
  { label: 'Juguetes', value: 'juguetes' },
  { label: 'Otro', value: 'otro' },
];

const TRIP_TYPE_LABELS = {
  ida: 'Ida',
  vuelta: 'Vuelta',
  ambos: 'Ida y vuelta',
};

const EMPLOYABILITY_CATEGORY_FILTERS = [
  { label: 'Todas', value: 'Todas' },
  { label: 'Educación', value: 'educacion' },
  { label: 'Bienestar', value: 'bienestar' },
  { label: 'Artes', value: 'artes' },
  { label: 'Retiros', value: 'retiros' },
  { label: 'Salud', value: 'salud' },
];

export default function Servicios() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('compraventa');

  const [user, setUser] = useState(null);
  const [identity, setIdentity] = useState(null);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [offerListing, setOfferListing] = useState(null);

  const [routes, setRoutes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('Todos');
  const [routeMemberCounts, setRouteMemberCounts] = useState({});

  const [employabilityListings, setEmployabilityListings] = useState([]);
  const [loadingEmployability, setLoadingEmployability] = useState(true);
  const [showCreateEmploymentModal, setShowCreateEmploymentModal] = useState(false);
  const [selectedEmploymentCategory, setSelectedEmploymentCategory] = useState('Todas');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        setIdentity(await getMemberIdentity(authUser.id));
      }

      const { data } = await supabase
        .from('marketplace_listings')
        .select('*')
        .is('sold_at', null)
        .order('created_at', { ascending: false });
      setListings(data || []);

      setLoading(false);

      setLoadingRoutes(true);
      const [routesRes, schoolsRes, activeMembersRes] = await Promise.all([
        supabase.from('school_routes').select('*').order('created_at', { ascending: false }),
        supabase.from('school_profiles').select('id, name').order('name', { ascending: true }),
        supabase.from('school_route_members').select('route_id').is('left_at', null),
      ]);
      setRoutes(routesRes.data || []);
      setSchools(schoolsRes.data || []);

      const counts = {};
      (activeMembersRes.data || []).forEach(m => { counts[m.route_id] = (counts[m.route_id] || 0) + 1; });
      setRouteMemberCounts(counts);

      setLoadingRoutes(false);

      setLoadingEmployability(true);
      const { data: employabilityData } = await supabase
        .from('employability_listings')
        .select('*')
        .order('created_at', { ascending: false });
      setEmployabilityListings(employabilityData || []);
      setLoadingEmployability(false);
    };
    loadData();
  }, []);

  const handleContactar = async (listing) => {
    if (!user?.email || !listing.author_email) return;

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

  // 💡 A diferencia de handleContactar (genérico, usado también en Actividades), este
  // etiqueta el chat con el anuncio (mismo mecanismo que ListingDetail.jsx) para que la otra
  // persona vea de qué anuncio le hablan directamente en Hilo, sin tener que preguntarlo.
  const handleContactarListing = async (listing) => {
    if (!user?.email) return;
    const chat = await openMarketplaceListingChat(user.email, listing);
    if (chat) navigate('/hilo', { state: { activeChatId: chat.id } });
  };

  const handleDelete = async (listing) => {
    if (!window.confirm('¿Quieres eliminar este anuncio?')) return;
    setListings(prev => prev.filter(l => l.id !== listing.id));
    await supabase.from('marketplace_listings').delete().eq('id', listing.id);
  };

  const handleDeleteEmploymentListing = async (listing) => {
    if (!window.confirm('¿Quieres eliminar esta publicación?')) return;
    setEmployabilityListings(prev => prev.filter(l => l.id !== listing.id));
    await supabase.from('employability_listings').delete().eq('id', listing.id);
  };

  const myEmailClean = user?.email?.toLowerCase().trim() || '';

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || l.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredRoutes = routes.filter(r => {
    const matchesSearch = r.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.school_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchoolFilter === 'Todos' || r.school_id === selectedSchoolFilter;
    return matchesSearch && matchesSchool;
  });

  // 💡 Esta pestaña ya solo admite gente ofreciendo actividades (nada de "busco")
  const filteredEmploymentListings = employabilityListings.filter(l => {
    const matchesSearch = l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedEmploymentCategory === 'Todas' || l.category === selectedEmploymentCategory;
    return matchesSearch && l.listing_type === 'oferta' && matchesCategory;
  });

  const selectedEmploymentCategoryLabel = EMPLOYABILITY_CATEGORY_FILTERS.find(c => c.value === selectedEmploymentCategory)?.label;

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-300">

      {/* ENCABEZADO */}
      <div className="text-center my-6 space-y-1">
        <h1 className="font-cormorant text-4xl font-semibold text-foreground tracking-wide">Servicios</h1>
        <p className="text-sm text-muted-foreground">Compraventa, rutas y actividades entre familias Waldorf</p>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div className="flex gap-1.5 mb-6 bg-muted/50 p-1 rounded-2xl max-w-xl mx-auto">
        {SERVICIOS_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSearchQuery(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* COMPRAVENTA */}
      {activeTab === 'compraventa' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Publicar anuncio
            </button>
          </div>

          <div className="relative mb-4 max-w-2xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Buscar por título, descripción o zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/30 border border-border/60 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-6 overflow-x-auto pb-1">
            {CATEGORY_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedCategory(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedCategory === f.value
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground border-border/40 hover:border-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando anuncios...</div>
          ) : filteredListings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-10 bg-card border border-dashed border-border rounded-2xl">
              No hay anuncios que coincidan con tu búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredListings.map(listing => {
                const isMine = myEmailClean && listing.author_email?.toLowerCase().trim() === myEmailClean;
                const categoryLabel = CATEGORY_FILTERS.find(c => c.value === listing.category)?.label || listing.category;
                const initials = listing.author_name?.slice(0, 2).toUpperCase() || 'W';
                return (
                  <div
                    key={listing.id}
                    onClick={() => navigate(`/anuncios/${listing.id}`)}
                    className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2 hover:border-primary/20 hover:shadow-md transition-all animate-in fade-in duration-200 cursor-pointer"
                  >
                    {listing.image_urls?.[0] && (
                      <img src={listing.image_urls[0]} alt="" className="w-full h-36 object-cover rounded-xl" />
                    )}

                    <div
                      onClick={(e) => { e.stopPropagation(); navigate(`/usuario/${encodeURIComponent(listing.author_email)}`); }}
                      className="flex items-center gap-2 group"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0 group-hover:opacity-80 transition-opacity">
                        {listing.author_avatar ? (
                          <img src={listing.author_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary font-cormorant font-semibold text-[10px]">{initials}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                        {listing.author_name || 'Miembro de la comunidad'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {categoryLabel}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground leading-tight">{listing.title}</h3>
                    {listing.description && (
                      <p className="text-xs text-foreground/80 leading-relaxed">{listing.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      {listing.price != null ? (
                        <span className="text-sm font-bold text-primary">{listing.price} €</span>
                      ) : <span />}
                      {listing.location && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary/70" /> {listing.location}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50 mt-1">
                      {isMine ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(listing); }}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-destructive/80 hover:text-destructive py-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar mi anuncio
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleContactarListing(listing); }}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-xs font-semibold py-1.5 hover:bg-primary hover:text-white transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Contactar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOfferListing(listing); }}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold py-1.5 hover:bg-primary/90 transition-all"
                          >
                            Hacer oferta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {offerListing && (
            <MakeOfferModal
              listing={offerListing}
              userEmail={user?.email}
              onClose={() => setOfferListing(null)}
              onSent={(chatId) => {
                setOfferListing(null);
                navigate('/hilo', { state: { activeChatId: chatId } });
              }}
            />
          )}

          {showCreateModal && (
            <CreateMarketplaceListingModal
              user={user}
              identity={identity}
              onClose={() => setShowCreateModal(false)}
              onCreated={async () => {
                setShowCreateModal(false);
                const { data } = await supabase
                  .from('marketplace_listings')
                  .select('*')
                  .is('sold_at', null)
                  .order('created_at', { ascending: false });
                setListings(data || []);
              }}
            />
          )}
        </>
      )}

      {/* RUTAS ESCOLARES */}
      {activeTab === 'rutas' && (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={() => navigate('/rutas/buscar')}
              className="flex items-center gap-1.5 bg-muted text-foreground px-4 py-2 rounded-full text-xs font-medium hover:bg-muted/70 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" /> Buscar ruta
            </button>
            <button
              onClick={() => setShowCreateRouteModal(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Publicar ruta
            </button>
          </div>

          <div className="relative mb-4 max-w-2xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Buscar por colegio, zona o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/30 border border-border/60 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="mb-3 max-w-xs">
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="w-full bg-muted/40 border border-border/40 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              <option value="Todos">Todos los colegios</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {loadingRoutes ? (
            <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando rutas...</div>
          ) : filteredRoutes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-10 bg-card border border-dashed border-border rounded-2xl">
              No hay rutas que coincidan con tu búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRoutes.map(route => {
                const initials = route.author_name?.slice(0, 2).toUpperCase() || 'W';
                const seatsAvailable = (route.seats ?? 0) - (routeMemberCounts[route.id] || 0);
                return (
                  <div
                    key={route.id}
                    onClick={() => navigate(`/rutas/oferta/${route.id}`)}
                    className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2 cursor-pointer hover:border-primary/20 hover:shadow-md transition-all animate-in fade-in duration-200"
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); navigate(`/usuario/${encodeURIComponent(route.author_email)}`); }}
                      className="flex items-center gap-2 group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0 group-hover:opacity-80 transition-opacity">
                        {route.author_avatar ? (
                          <img src={route.author_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary font-cormorant font-semibold text-[10px]">{initials}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                        {route.author_name || 'Miembro de la comunidad'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-primary/5 text-primary border-primary/10 flex items-center gap-1">
                        <ArrowLeftRight className="w-2.5 h-2.5" /> {TRIP_TYPE_LABELS[route.trip_type] || route.trip_type}
                      </span>
                      {route.status === 'abierto' && (
                        <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                          {seatsAvailable > 0 ? `${seatsAvailable} plazas libres` : 'Sin plazas'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> {route.school_name}
                    </h3>

                    {route.location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary/70" /> {route.location}
                      </p>
                    )}

                    {route.notes && (
                      <p className="text-xs text-foreground/80 leading-relaxed">{route.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showCreateRouteModal && (
            <CreateSchoolRouteModal
              user={user}
              identity={identity}
              onClose={() => setShowCreateRouteModal(false)}
              onCreated={async () => {
                setShowCreateRouteModal(false);
                const { data } = await supabase
                  .from('school_routes')
                  .select('*')
                  .order('created_at', { ascending: false });
                setRoutes(data || []);
              }}
            />
          )}
        </>
      )}

      {/* EMPLEABILIDAD */}
      {activeTab === 'empleo' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateEmploymentModal(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Publicar Actividad
            </button>
          </div>

          <div className="relative mb-4 max-w-2xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/30 border border-border/60 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-6 overflow-x-auto pb-1">
            {EMPLOYABILITY_CATEGORY_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedEmploymentCategory(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedEmploymentCategory === f.value
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground border-border/40 hover:border-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loadingEmployability ? (
            <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando publicaciones...</div>
          ) : filteredEmploymentListings.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
              <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-cormorant text-xl text-muted-foreground">
                {selectedEmploymentCategory === 'Todas'
                  ? 'Aún no hay publicaciones aquí'
                  : `Aún no hay publicaciones en ${selectedEmploymentCategoryLabel}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedEmploymentCategory === 'Todas'
                  ? 'Sé el primero en ofrecer una actividad entre familias Waldorf.'
                  : `Sé el primero en ofrecer una actividad en ${selectedEmploymentCategoryLabel.toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredEmploymentListings.map(listing => {
                const isMine = myEmailClean && listing.author_email?.toLowerCase().trim() === myEmailClean;
                const categoryLabel = EMPLOYABILITY_CATEGORY_FILTERS.find(c => c.value === listing.category)?.label || listing.category;
                const initials = listing.author_name?.slice(0, 2).toUpperCase() || 'W';
                return (
                  <div
                    key={listing.id}
                    onClick={() => navigate(`/empleo/${listing.id}`)}
                    className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2 hover:border-primary/20 hover:shadow-md transition-all animate-in fade-in duration-200 cursor-pointer"
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); navigate(`/usuario/${encodeURIComponent(listing.author_email)}`); }}
                      className="flex items-center gap-2 group"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0 group-hover:opacity-80 transition-opacity">
                        {listing.author_avatar ? (
                          <img src={listing.author_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary font-cormorant font-semibold text-[10px]">{initials}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                        {listing.author_name || 'Miembro de la comunidad'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {categoryLabel}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground leading-tight">{listing.title}</h3>
                    {listing.description && (
                      <p className="text-xs text-foreground/80 leading-relaxed">{listing.description}</p>
                    )}

                    <div className="pt-2 border-t border-border/50 mt-1">
                      {isMine ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteEmploymentListing(listing); }}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-destructive/80 hover:text-destructive py-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar mi publicación
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleContactar(listing); }}
                          className="w-full flex items-center justify-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-xs font-semibold py-1.5 hover:bg-primary hover:text-white transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Contactar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showCreateEmploymentModal && (
            <CreateEmployabilityListingModal
              user={user}
              identity={identity}
              onClose={() => setShowCreateEmploymentModal(false)}
              onCreated={async () => {
                setShowCreateEmploymentModal(false);
                const { data } = await supabase
                  .from('employability_listings')
                  .select('*')
                  .order('created_at', { ascending: false });
                setEmployabilityListings(data || []);
              }}
            />
          )}
        </>
      )}

    </div>
  );
}
