import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, Check, X as XIcon, Lock, Calendar } from 'lucide-react';
import { goBack } from '@/lib/navigation';

export default function GestionRuta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [closing, setClosing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const { data: routeData } = await supabase.from('school_routes').select('*').eq('id', id).maybeSingle();
    setRoute(routeData);

    if (routeData) {
      const [membersRes, requestsRes] = await Promise.all([
        supabase.from('school_route_members').select('*').eq('route_id', id).is('left_at', null),
        supabase.from('school_route_requests').select('*').eq('route_id', id).eq('status', 'pendiente'),
      ]);
      setMembers(membersRes.data || []);
      setRequests(requestsRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleRespond = async (request, accept) => {
    setRespondingId(request.id);
    const { data, error } = await supabase.functions.invoke('respond-join-request', {
      body: { request_id: request.id, accept },
    });
    setRespondingId(null);

    if (error || data?.error) {
      alert(data?.error || 'No se ha podido procesar la solicitud.');
      return;
    }
    loadData();
  };

  const handleCloseGroup = async () => {
    if (!window.confirm('¿Cerrar el grupo? Se creará el chat y el calendario de turnos.')) return;
    setClosing(true);
    const { data, error } = await supabase.functions.invoke('close-route-group', { body: { route_id: Number(id) } });
    setClosing(false);

    if (error || data?.error) {
      alert(data?.error || 'No se ha podido cerrar el grupo.');
      return;
    }
    navigate('/hilo', { state: { activeChatId: data.chat_id } });
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!route) return <div className="p-20 text-center text-muted-foreground">Esta ruta no existe.</div>;
  if (!user || route.author_id !== user.id) {
    return <div className="p-20 text-center text-muted-foreground">Solo el autor de la ruta puede gestionarla.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="mb-6">
        <h1 className="font-cormorant text-3xl font-semibold text-foreground">Gestionar ruta</h1>
        <p className="text-sm text-muted-foreground">{route.school_name} — {route.location}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Miembros del grupo ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Todavía no hay miembros confirmados.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map(m => {
              const initials = m.member_name?.slice(0, 2).toUpperCase() || 'W';
              return (
                <div key={m.id} className="flex flex-col items-center gap-1 w-16">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border">
                    {m.member_avatar ? (
                      <img src={m.member_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center truncate w-full">{m.member_name || 'Miembro'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Solicitudes pendientes ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No hay solicitudes pendientes.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(r => {
              const initials = r.requester_name?.slice(0, 2).toUpperCase() || 'W';
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                    {r.requester_avatar ? (
                      <img src={r.requester_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-cormorant font-semibold text-xs">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.requester_name || 'Miembro de la comunidad'}</p>
                    {r.zona && <p className="text-[10px] text-muted-foreground truncate">{r.zona}</p>}
                  </div>
                  <button
                    onClick={() => handleRespond(r, true)}
                    disabled={respondingId === r.id}
                    className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRespond(r, false)}
                    disabled={respondingId === r.id}
                    className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {route.status === 'cerrado' ? (
        <button
          onClick={() => navigate(`/rutas/${id}/calendario`)}
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Calendar className="w-4 h-4" /> Ver calendario de turnos
        </button>
      ) : (
        <button
          onClick={handleCloseGroup}
          disabled={closing}
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          <Lock className="w-4 h-4" /> {closing ? 'Cerrando...' : 'Cerrar grupo'}
        </button>
      )}
    </div>
  );
}
