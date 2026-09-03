/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { getIdentitiesByEmails } from '@/lib/identity';

const ROLE_LABELS = {
  colegio: 'Colegio',
  empresa: 'Empresa',
  alumno: 'Alumno',
  padre_madre: 'Padre / Madre',
  profesor: 'Profesor',
  exalumno: 'Exalumno',
  simpatizante: 'Simpatizante',
  staff: 'Staff',
};

// Lista de Seguidores/Siguiendo de una identidad (colegio, empresa o persona), resuelta a
// partir de user_follows (que solo guarda emails). Se reutiliza tal cual dentro de una
// pestaña (colegios/empresas, que ya tienen barra de pestañas) o dentro de un modal
// (personas, que no la tienen) — este componente no impone ningún "chrome" propio.
export default function FollowNetwork({ email }) {
  const [subTab, setSubTab] = useState('seguidores');
  const [loading, setLoading] = useState(true);
  const [seguidores, setSeguidores] = useState([]);
  const [siguiendo, setSiguiendo] = useState([]);

  useEffect(() => {
    const load = async () => {
      const cleanEmail = email?.toLowerCase().trim();
      if (!cleanEmail) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const [{ data: followerRows }, { data: followingRows }] = await Promise.all([
        supabase.from('user_follows').select('follower_email').eq('following_email', cleanEmail),
        supabase.from('user_follows').select('following_email').eq('follower_email', cleanEmail),
      ]);

      const followerEmails = (followerRows || []).map(r => r.follower_email);
      const followingEmails = (followingRows || []).map(r => r.following_email);

      const identities = await getIdentitiesByEmails([...followerEmails, ...followingEmails]);

      setSeguidores(followerEmails.map(e => identities.get(e?.toLowerCase().trim()) || { name: e, email: e, link: null }));
      setSiguiendo(followingEmails.map(e => identities.get(e?.toLowerCase().trim()) || { name: e, email: e, link: null }));
      setLoading(false);
    };
    load();
  }, [email]);

  const list = subTab === 'seguidores' ? seguidores : siguiendo;

  return (
    <div>
      <div className="flex gap-1.5 mb-4 bg-muted/50 p-1 rounded-2xl max-w-xs">
        <button
          onClick={() => setSubTab('seguidores')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${subTab === 'seguidores' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Seguidores ({seguidores.length})
        </button>
        <button
          onClick={() => setSubTab('siguiendo')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${subTab === 'siguiendo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Siguiendo ({siguiendo.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          {subTab === 'seguidores' ? 'Todavía no tiene seguidores.' : 'Todavía no sigue a nadie.'}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((entity, i) => {
            const initials = (entity.name || entity.email || '?').slice(0, 2).toUpperCase();
            const content = (
              <>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border flex-shrink-0">
                  {entity.avatar ? (
                    <img src={entity.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{entity.name || entity.email}</p>
                  {entity.role && (
                    <p className="text-[11px] text-muted-foreground capitalize">{ROLE_LABELS[entity.role] || entity.role}</p>
                  )}
                </div>
              </>
            );
            const rowClass = "flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors";
            return entity.link ? (
              <Link key={`${entity.email}-${i}`} to={entity.link} className={rowClass}>
                {content}
              </Link>
            ) : (
              <div key={`${entity.email}-${i}`} className={rowClass}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
