import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import SchoolEventCard from '@/components/SchoolEventCard';
import { Search, PlusCircle, MapPin } from 'lucide-react';
import CreateSchoolEventModal from '@/components/CreateSchoolEventModal';
import { Link } from 'react-router-dom';

const MOCK_COLEGIOS = [
  { id: 'micael', name: 'Escuela Libre Micael', location: 'Las Rozas, Madrid', description: 'El colegio Waldorf más veterano de España.', avatar_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80' },
  { id: 'aravaca', name: 'Waldorf Aravaca', location: 'Aravaca, Madrid', description: 'Educación Waldorf en un entorno familiar.', avatar_url: 'https://images.unsplash.com/photo-1595250924457-39d4442dfc70?auto=format&fit=crop&w=200&q=80' },
  { id: 'artaban', name: 'Escuela Artabán', location: 'Torrelodones, Madrid', description: 'Pedagogía Waldorf en plena sierra madrileña.', avatar_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=200&q=80' }
];

export default function Colegios() {
  const [activeTab, setActiveTab] = useState('directorio'); 
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Nos traemos los datos reales
      const { data: sData } = await supabase.from('schools').select('*');
      const { data: eData } = await supabase.from('school_events').select('*').order('created_date', { ascending: false });
      
      const colegiosReales = sData || [];
      
      // 2. Extraemos los IDs de los colegios que ya están en la base de datos
      const idsReales = colegiosReales.map(escuela => escuela.id);
      
      // 3. Filtramos los de prueba: solo dejamos los que NO están en la base de datos
      const colegiosDePruebaFiltrados = MOCK_COLEGIOS.filter(
        mock => !idsReales.includes(mock.id)
      );

      // 4. Juntamos las dos listas (ahora sin duplicados)
      setSchools([...colegiosReales, ...colegiosDePruebaFiltrados]);
      setEvents(eData || []);
    };
    fetchData();
  }, []);

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || s.location.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || e.school_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 mt-6">
      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="font-cormorant text-5xl font-semibold mb-2 text-foreground">Colegios Waldorf</h1>
        <p className="text-muted-foreground text-lg">Encuentra tu centro y descubre sus actividades</p>
      </div>

      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex justify-center gap-4 mb-8 border-b border-border pb-4">
        <button 
          onClick={() => setActiveTab('directorio')}
          className={`px-8 py-2.5 rounded-full font-medium transition-all ${activeTab === 'directorio' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
        >
          Directorio de Centros
        </button>
        <button 
          onClick={() => setActiveTab('eventos')}
          className={`px-8 py-2.5 rounded-full font-medium transition-all ${activeTab === 'eventos' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
        >
          Tablón de Eventos
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-6 py-3 shadow-sm mb-10 max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          placeholder={activeTab === 'directorio' ? "Buscar colegio o ubicación..." : "Buscar eventos..."}
          className="bg-transparent flex-1 outline-none text-base"
        />
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA */}
      {activeTab === 'directorio' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
          {filteredSchools.map(school => (
            <Link to={`/colegios/${school.id}`} key={school.id} className="group bg-card border border-border rounded-3xl p-6 hover:border-primary/50 transition-all hover:shadow-lg flex flex-col">
              <div className="relative mb-6">
                <img src={school.avatar_url} className="w-24 h-24 rounded-2xl object-cover mx-auto bg-muted shadow-sm group-hover:scale-105 transition-transform" alt={school.name} />
              </div>
              <div className="text-center flex-1 flex flex-col">
                <h3 className="text-xl font-semibold mb-1 text-foreground">{school.name}</h3>
                <p className="text-primary text-sm flex items-center justify-center gap-1 mb-4">
                  <MapPin className="w-3.5 h-3.5" /> {school.location}
                </p>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                  {school.description}
                </p>
                <div className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 py-2.5 rounded-xl border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                  Ver Perfil
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-end mb-4">
             <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:scale-105 transition-transform">
               <PlusCircle className="w-4 h-4" /> Publicar Nuevo Evento
             </button>
          </div>
          {filteredEvents.length > 0 ? (
            filteredEvents.map(event => <SchoolEventCard key={event.id} event={event} />)
          ) : (
            <div className="text-center py-12 bg-card rounded-3xl border border-border">
              <p className="text-muted-foreground">No se han encontrado eventos.</p>
            </div>
          )}
        </div>
      )}

      {showModal && <CreateSchoolEventModal onClose={() => setShowModal(false)} onCreated={() => window.location.reload()} />}
    </div>
  );
}