import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, MapPin, Activity, Image as ImageIcon, Calendar } from 'lucide-react';
import SchoolEventCard from '@/components/SchoolEventCard';

// Datos extendidos para tus pruebas de los 3 colegios
const MOCK_DETAILS = {
  'micael': {
    name: 'Escuela Libre Micael',
    location: 'Las Rozas, Madrid',
    description: 'Fundada en 1979, es el centro Waldorf más antiguo de España. Cuenta con jardín de infancia, primaria, secundaria y bachillerato en un entorno natural único.',
    activities: ['Talla de madera', 'Coro', 'Huerto escolar', 'Teatro'],
    images: ['https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=600', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600'],
    avatar_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80'
  },
  'aravaca': {
    name: 'Waldorf Aravaca',
    location: 'Aravaca, Madrid',
    description: 'Un espacio cálido y familiar donde se respira el respeto a la infancia. Especializados en los primeros septenios.',
    activities: ['Acuarela', 'Euritmia', 'Panadería'],
    images: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600'],
    avatar_url: 'https://images.unsplash.com/photo-1595250924457-39d4442dfc70?auto=format&fit=crop&w=200&q=80'
  },
  'artaban': {
    name: 'Escuela Artabán',
    location: 'Torrelodones, Madrid',
    description: 'Situada en la sierra de Madrid, Artabán destaca por su fuerte comunidad de padres y su enfoque en el arte como herramienta de aprendizaje.',
    activities: ['Música', 'Artesanía', 'Senderismo'],
    images: ['https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=600'],
    avatar_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=200&q=80'
  }
};

export default function SchoolProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchool = async () => {
      // 1. Miramos si es uno de nuestros mocks
      if (MOCK_DETAILS[id]) {
        setSchool(MOCK_DETAILS[id]);
      } else {
        // 2. Si no, buscamos en la base de datos real
        const { data } = await supabase.from('schools').select('*').eq('id', id).single();
        if (data) setSchool(data);
      }

      // 3. Cargar eventos de este colegio
      const schoolName = MOCK_DETAILS[id]?.name || "";
      const { data: evs } = await supabase.from('school_events').select('*').ilike('school_name', `%${schoolName}%`);
      setSchoolEvents(evs || []);
      
      setLoading(false);
    };
    loadSchool();
  }, [id]);

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando perfil...</div>;
  if (!school) return <div className="p-10 text-center">Colegio no encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-6 px-4">
      <button onClick={() => navigate('/colegios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Volver al directorio
      </button>

      {/* CABECERA ESTILO LINKEDIN */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm mb-8">
        <div className="h-44 bg-gradient-to-r from-primary/20 to-primary/5 relative">
        </div>
        <div className="p-8 relative pt-16">
          <img src={school.avatar_url} className="w-32 h-32 rounded-3xl border-8 border-card absolute -top-16 left-8 object-cover bg-muted shadow-sm" alt="logo" />
          <h1 className="font-cormorant text-4xl font-semibold mt-2">{school.name}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-2"><MapPin className="w-4 h-4 text-primary" /> {school.location}</p>
          <p className="mt-6 text-lg text-foreground/80 leading-relaxed">{school.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /> Actividades</h2>
            <div className="flex flex-wrap gap-2">
              {school.activities?.map((a, i) => (
                <span key={i} className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/20">{a}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-primary" /> Galería</h2>
            <div className="grid grid-cols-2 gap-3">
              {school.images?.map((img, i) => (
                <img key={i} src={img} className="rounded-2xl h-48 w-full object-cover border border-border" alt="galeria" />
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-primary" /> Eventos del Colegio</h2>
            <div className="space-y-4">
              {schoolEvents.length > 0 ? (
                schoolEvents.map(e => <SchoolEventCard key={e.id} event={e} />)
              ) : (
                <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-xl border border-border/50 text-center">No hay eventos próximos publicados.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}