import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SchoolEventCard from '@/components/SchoolEventCard';
import { Search, PlusCircle, School } from 'lucide-react';
import CreateSchoolEventModal from '@/components/CreateSchoolEventModal';

const EVENT_TYPES = [
  { value: 'todos', label: 'Todos' },
  { value: 'mercadillo', label: 'Mercadillo' },
  { value: 'fiesta_trimestral', label: 'Fiestas' },
  { value: 'obra_teatro', label: 'Teatro' },
  { value: 'jornada_puertas_abiertas', label: 'Puertas Abiertas' },
  { value: 'taller_familias', label: 'Talleres' },
  { value: 'festival', label: 'Festival' },
];

export default function Colegios() {
  const [events, setEvents] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const u = await base44.auth.me().catch(() => null);
    setUser(u);
    const eventsData = await base44.entities.SchoolEvent.list('-event_date', 50);
    if (u) {
      const likes = await base44.entities.Like.filter({ user_email: u.email });
      setLikedIds(new Set(likes.map(l => l.target_id)));
    }
    setEvents(eventsData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter(e => {
    const matchType = filter === 'todos' || e.event_type === filter;
    const matchSearch = !search || e.school_name?.toLowerCase().includes(search.toLowerCase()) || e.title?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-cormorant text-3xl font-semibold">Colegios Waldorf</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo evento
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Eventos de colegios Waldorf de toda España</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5 mb-4">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar colegio o evento..."
          className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {EVENT_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === t.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Events */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
              <div className="h-40 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <School className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-cormorant text-xl text-muted-foreground">No hay eventos disponibles</p>
          <p className="text-sm text-muted-foreground mt-1">Los colegios publicarán sus eventos aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(event => (
            <SchoolEventCard
              key={event.id}
              event={event}
              userEmail={user?.email}
              likedIds={likedIds}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSchoolEventModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); load(); }}
        />
      )}
    </div>
  );
}