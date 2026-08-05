import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, MapPin, Clock, Users, MessageCircle, UserPlus, Check, X as XIcon, School, Trash2 } from 'lucide-react';
import RouteMap from '@/components/RouteMap';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';
import ActionButton from '@/components/ActionButton';
import { goBack } from '@/lib/navigation';

export default function RouteOfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatsAvailable, setSeatsAvailable] = useState(null);
  const [members, setMembers] = useState([]);
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
          .select('member_id, member_name, member_avatar')
          .eq('route_id', id)
          .is('left_at', null);
        const activeMembers = memberRows || [];
        setMembers(activeMembers);
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
    <div className="max-w-3xl mx-auto px-4 pb-24 mt-8 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-8">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:min-h-[70vh]">
        {/* Columna izquierda: mapa + botones de acción, mismo ancho que el mapa */}
        <div className="flex flex-col gap-5 h-full">
          {origin || destinationPoint ? (
            <RouteMap origin={origin} destination={destinationPoint} className="w-full flex-1 min-h-[24rem] rounded-2xl overflow-hidden" />
          ) : (
            <div className="w-full flex-1 min-h-[24rem] rounded-2xl bg-muted/40 border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
              Sin ubicación disponible
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5">
            {isAdmin ? (
              <div className="flex flex-col gap-2.5">
                <ActionButton icon={UserPlus} variant="primary" onClick={() => navigate(`/rutas/${route.id}/gestionar`)}>
                  Gestionar grupo
                </ActionButton>
                <ActionButton icon={Trash2} variant="destructive" onClick={handleDeleteRoute}>
                  Eliminar mi ruta
                </ActionButton>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <ActionButton icon={MessageCircle} variant="muted" className="flex-1" onClick={handleContactar}>
                  Contactar
                </ActionButton>

                {route.status === 'abierto' && !isMember && (
                  joinOpen ? (
                    <div className="flex-1 flex items-center gap-2">
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
                        inputClassName="w-full bg-muted/50 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={handleRequestJoin}
                        disabled={!zonaDraft.trim() || requesting}
                        className="p-3 rounded-full bg-primary text-white disabled:opacity-50 flex-shrink-0"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => { setJoinOpen(false); setZonaDraft(''); setZonaCoords(null); }}
                        className="p-3 rounded-full bg-muted text-muted-foreground flex-shrink-0"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <ActionButton icon={UserPlus} variant="soft" className="flex-1" onClick={() => setJoinOpen(true)} disabled={alreadyRequested}>
                      {alreadyRequested ? 'Solicitud enviada' : 'Solicitar unirse'}
                    </ActionButton>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: perfil + datos + notas */}
        <div className="space-y-5">
          <div
            onClick={() => navigate(`/usuario/${encodeURIComponent(route.author_email)}`)}
            className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-colors group"
          >
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
              {route.author_avatar ? (
                <img src={route.author_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-cormorant font-semibold text-lg">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{route.author_name || 'Miembro de la comunidad'}</p>
              <p className="text-xs text-muted-foreground">
                Ofrece esta ruta
                {route.created_at && ` · Publicado ${formatDistanceToNow(new Date(route.created_at), { addSuffix: true, locale: es })}`}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Descripción</h3>
              {route.notes ? (
                <p className="text-base text-foreground/80 leading-relaxed">{route.notes}</p>
              ) : (
                <p className="text-base text-muted-foreground/60 italic">Sin descripción</p>
              )}
            </div>

            <div className="pt-4 border-t border-border/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <School className="w-4 h-4" /> Colegio
              </h3>
              <p className="text-base font-medium text-foreground">{route.school_name}</p>
              {(route.destination_address || route.location) && (
                <p className="text-sm text-muted-foreground mt-0.5">{route.destination_address}</p>
              )}
            </div>

            <div className="pt-4 border-t border-border/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Zona de origen
              </h3>
              <p className="text-base text-foreground">{route.location}</p>
            </div>

            {(route.salida_time || route.entrada_time) && (
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Horarios
                </h3>
                <p className="text-base text-foreground">
                  {route.salida_time?.slice(0, 5)}{route.salida_time && route.entrada_time ? ' → ' : ''}{route.entrada_time?.slice(0, 5)}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Plazas
                </h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                  route.status === 'abierto'
                    ? 'bg-primary/5 text-primary border-primary/10'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {route.status === 'abierto' ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
              <p className="text-base text-foreground mb-2.5">
                {seatsAvailable != null ? `${seatsAvailable} libres de ${route.seats}` : `${route.seats} totales`}
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: route.seats || 0 }).map((_, i) => {
                  const member = members[i];
                  const memberInitials = member?.member_name?.slice(0, 2).toUpperCase() || 'M';
                  return member ? (
                    <div
                      key={member.member_id}
                      title={member.member_name || 'Miembro'}
                      className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0"
                    >
                      {member.member_avatar ? (
                        <img src={member.member_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-cormorant font-semibold text-xs">{memberInitials}</span>
                      )}
                    </div>
                  ) : (
                    <div
                      key={`empty-${i}`}
                      title="Plaza libre"
                      className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/50 flex-shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
