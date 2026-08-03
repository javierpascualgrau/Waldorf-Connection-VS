import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';
import { ArrowLeft, MapPin, Clock, Users, MessageCircle, UserPlus, Check, X as XIcon, School, Trash2 } from 'lucide-react';
import RouteMap from '@/components/RouteMap';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';
import { goBack } from '@/lib/navigation';

export default function RouteOfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatsAvailable, setSeatsAvailable] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [zonaDraft, setZonaDraft] = useState('');
  const [zonaCoords, setZonaCoords] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requestedNow, setRequestedNow] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) setIdentity(await getMemberIdentity(authUser.id));

      const { data: routeData } = await supabase.from('school_routes').select('*').eq('id', id).maybeSingle();
      setRoute(routeData);

      if (routeData) {
        const { data: memberRows } = await supabase
          .from('school_route_members')
          .select('member_id')
          .eq('route_id', id)
          .is('left_at', null);
        const activeMembers = memberRows || [];
        setSeatsAvailable((routeData.seats ?? 0) - activeMembers.length);

        if (authUser) {
          setIsMember(activeMembers.some(m => m.member_id === authUser.id));
          const { data: pending } = await supabase
            .from('school_route_requests')
            .select('id')
            .eq('route_id', id)
            .eq('requester_id', authUser.id)
            .eq('status', 'pendiente')
            .maybeSingle();
          setHasPendingRequest(!!pending);
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleContactar = async () => {
    if (!user?.email || !route.author_email) return;
    const emails = [user.email.toLowerCase().trim(), route.author_email.toLowerCase().trim()].sort();

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

  const handleDeleteRoute = async () => {
    if (!window.confirm('¿Quieres eliminar esta ruta?')) return;
    await supabase.from('school_routes').delete().eq('id', route.id);
    navigate('/servicios');
  };

  const handleRequestJoin = async () => {
    if (!zonaDraft.trim()) return;
    setRequesting(true);
    const { data, error } = await supabase.functions.invoke('request-join-route', {
      body: {
        route_id: route.id,
        zona: zonaDraft.trim(),
        zona_lat: zonaCoords?.lat ?? null,
        zona_lng: zonaCoords?.lng ?? null,
        requester_name: identity?.name,
        requester_avatar: identity?.avatar,
      },
    });
    setRequesting(false);

    if (error || data?.error) {
      alert(data?.error || 'No se ha podido enviar la solicitud.');
      return;
    }
    setRequestedNow(true);
    setJoinOpen(false);
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!route) return <div className="p-20 text-center text-muted-foreground">Esta oferta de ruta no existe.</div>;

  const isAdmin = !!user && route.author_id === user.id;
  const initials = route.author_name?.slice(0, 2).toUpperCase() || 'W';
  const origin = route.origin_lat != null && route.origin_lng != null ? { lat: route.origin_lat, lng: route.origin_lng } : null;
  const destinationPoint = route.destination_lat != null && route.destination_lng != null ? { lat: route.destination_lat, lng: route.destination_lng } : null;
  const alreadyRequested = hasPendingRequest || requestedNow;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna izquierda: solo el mapa, estirado a la altura de la columna derecha */}
        <div className="h-full">
          {origin || destinationPoint ? (
            <RouteMap origin={origin} destination={destinationPoint} className="w-full h-full min-h-[16rem] rounded-2xl overflow-hidden" />
          ) : (
            <div className="w-full h-full min-h-[16rem] rounded-2xl bg-muted/40 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Sin ubicación disponible
            </div>
          )}
        </div>

        {/* Columna derecha: perfil + datos + notas */}
        <div className="space-y-4">
          <div
            onClick={() => navigate(`/usuario/${encodeURIComponent(route.author_email)}`)}
            className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
              {route.author_avatar ? (
                <img src={route.author_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{route.author_name || 'Miembro de la comunidad'}</p>
              <p className="text-[10px] text-muted-foreground">Ofrece esta ruta</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" /> Colegio
              </h3>
              <p className="text-sm font-medium text-foreground">{route.school_name}</p>
              {(route.destination_address || route.location) && (
                <p className="text-xs text-muted-foreground mt-0.5">{route.destination_address}</p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Zona de origen
              </h3>
              <p className="text-sm text-foreground">{route.location}</p>
            </div>

            {(route.salida_time || route.entrada_time) && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Horarios
                </h3>
                <p className="text-sm text-foreground">
                  {route.salida_time?.slice(0, 5)}{route.salida_time && route.entrada_time ? ' → ' : ''}{route.entrada_time?.slice(0, 5)}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Plazas
              </h3>
              <p className="text-sm text-foreground">
                {seatsAvailable != null ? `${seatsAvailable} libres de ${route.seats}` : `${route.seats} totales`}
              </p>
            </div>

            {route.notes && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notas del conductor</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{route.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción, a todo el ancho */}
      <div className="mt-6 bg-card border border-border rounded-2xl p-4">
        {isAdmin ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate(`/rutas/${route.id}/gestionar`)}
              className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Gestionar grupo
            </button>
            <button
              onClick={handleDeleteRoute}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-destructive/80 hover:text-destructive py-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Eliminar mi ruta
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleContactar}
              className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl text-sm font-semibold py-2.5 hover:bg-muted/70 transition-all"
            >
              <MessageCircle className="w-4 h-4" /> Contactar
            </button>

            {route.status === 'abierto' && !isMember && (
              joinOpen ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <AddressAutocompleteInput
                    autoFocus
                    value={zonaDraft}
                    onChange={(text) => { setZonaDraft(text); setZonaCoords(null); }}
                    onSelect={({ address, lat, lng }) => { setZonaDraft(address); setZonaCoords({ lat, lng }); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && zonaDraft.trim()) handleRequestJoin();
                      if (e.key === 'Escape') { setJoinOpen(false); setZonaDraft(''); setZonaCoords(null); }
                    }}
                    placeholder="¿En qué zona vives?"
                    className="flex-1 min-w-0"
                    inputClassName="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleRequestJoin}
                    disabled={!zonaDraft.trim() || requesting}
                    className="p-2.5 rounded-full bg-primary text-white disabled:opacity-50 flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setJoinOpen(false); setZonaDraft(''); setZonaCoords(null); }}
                    className="p-2.5 rounded-full bg-muted text-muted-foreground flex-shrink-0"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setJoinOpen(true)}
                  disabled={alreadyRequested}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-sm font-semibold py-2.5 hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-primary/5 disabled:hover:text-primary"
                >
                  <UserPlus className="w-4 h-4" />
                  {alreadyRequested ? 'Solicitud enviada' : 'Solicitar unirse'}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
