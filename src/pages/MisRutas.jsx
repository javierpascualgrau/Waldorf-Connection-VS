import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, School, ArrowLeftRight, Calendar, UserPlus } from 'lucide-react';
import { goBack } from '@/lib/navigation';

const TRIP_TYPE_LABELS = { ida: 'Ida', vuelta: 'Vuelta', ambos: 'Ida y vuelta' };

function RouteCard({ route, isAuthor, navigate }) {
  return (
    <div className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-primary/5 text-primary border-primary/10 flex items-center gap-1">
          <ArrowLeftRight className="w-2.5 h-2.5" /> {TRIP_TYPE_LABELS[route.trip_type] || route.trip_type}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
          {route.status === 'cerrado' ? 'Grupo cerrado' : 'Buscando grupo'}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1.5">
        <School className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> {route.school_name}
      </h3>
      <p className="text-[10px] text-muted-foreground">{route.location}</p>

      <div className="pt-2 border-t border-border/50 mt-1 flex flex-col gap-1.5">
        {isAuthor && (
          <button
            onClick={() => navigate(`/rutas/${route.id}/gestionar`)}
            className="w-full flex items-center justify-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-xs font-semibold py-1.5 hover:bg-primary hover:text-white transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" /> Gestionar grupo
          </button>
        )}
        {route.status === 'cerrado' && (
          <button
            onClick={() => navigate(`/rutas/${route.id}/calendario`)}
            className="w-full flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl text-xs font-semibold py-1.5 hover:bg-muted/70 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> Ver calendario
          </button>
        )}
      </div>
    </div>
  );
}

export default function MisRutas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authored, setAuthored] = useState([]);
  const [memberRoutes, setMemberRoutes] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [authoredRes, membershipsRes] = await Promise.all([
        supabase.from('school_routes').select('*').eq('author_id', user.id).order('created_at', { ascending: false }),
        supabase.from('school_route_members').select('route_id, school_routes(*)').eq('member_id', user.id).is('left_at', null),
      ]);

      setAuthored(authoredRes.data || []);
      setMemberRoutes((membershipsRes.data || []).map(m => m.school_routes).filter(Boolean));
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/perfil')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <h1 className="font-cormorant text-3xl font-semibold text-foreground mb-6">Mis rutas escolares</h1>

      {loading ? (
        <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando rutas...</div>
      ) : authored.length === 0 && memberRoutes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-10 bg-card border border-dashed border-border rounded-2xl">
          Todavía no tienes rutas publicadas ni grupos a los que te hayas unido.
        </p>
      ) : (
        <div className="space-y-6">
          {authored.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Rutas que publicaste</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {authored.map(route => <RouteCard key={route.id} route={route} isAuthor navigate={navigate} />)}
              </div>
            </div>
          )}
          {memberRoutes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Grupos a los que perteneces</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memberRoutes.map(route => <RouteCard key={route.id} route={route} isAuthor={false} navigate={navigate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
