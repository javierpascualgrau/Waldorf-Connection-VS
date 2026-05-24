import { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const ROLE_LABELS = {
  alumno: 'Alumno',
  padre_madre: 'Padre / Madre',
  profesor: 'Profesor',
  exalumno: 'Exalumno',
  colegio: 'Colegio',
  simpatizante: 'Simpatizante',
};

export default function ProfileSearch({ onSearch }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    
    // Si nos pasan onSearch (estamos en Comunidad), no hacemos la búsqueda del desplegable
    if (!onSearch) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        const { data: all, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) {
          console.error('Error fetching user profiles:', error);
          setLoading(false);
          return;
        }
        const q = query.toLowerCase();
        const filtered = all.filter(p =>
          p.display_name?.toLowerCase().includes(q) ||
          p.role?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.school_name?.toLowerCase().includes(q)
        );
        setResults(filtered.slice(0, 6));
        setOpen(true);
        setLoading(false);
      }, 300);
    }
  }, [query, onSearch]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearch) onSearch(val);
  };

  const clear = () => { 
    setQuery(''); 
    setResults([]); 
    setOpen(false); 
    if (onSearch) onSearch('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Barra de búsqueda adaptada al tamaño principal */}
      <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && !onSearch && setOpen(true)}
          placeholder="Buscar personas en la comunidad..."
          className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground min-w-0"
        />
        {query && (
          <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Menú desplegable de resultados (solo visible si no usamos onSearch) */}
      {open && !onSearch && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Sin resultados para "{query}"</div>
          ) : (
            <ul>
              {results.map((profile) => {
                const initials = (profile.display_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <li key={profile.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile.display_name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {profile.role && (
                          <span className="text-xs text-primary">{ROLE_LABELS[profile.role] || profile.role}</span>
                        )}
                        {profile.location && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />{profile.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}