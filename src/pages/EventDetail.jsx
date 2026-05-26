import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, Calendar, MapPin, Clock, Info } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      const { data, error } = await supabase
        .from('school_events')
        .select('*')
        .eq('id', id)
        .single();

      if (data) setEvent(data);
      setLoading(false);
    };

    fetchEventData();
  }, [id]);

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando detalles del evento...</div>;
  if (!event) return <div className="p-20 text-center text-muted-foreground">El evento que buscas no existe o ha sido eliminado.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      
      {/* Botón de volver */}
      <button onClick={() => navigate('/colegios')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium mb-8">
        <ArrowLeft className="w-4 h-4" /> Volver al Tablón
      </button>

      {/* Cabecera del Evento */}
      <div className="bg-card border border-border rounded-3xl p-8 shadow-sm mb-8">
        <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-primary/20">
          Evento Escolar
        </div>
        <h1 className="font-cormorant text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-tight">
          {event.title}
        </h1>
        
        {/* Datos clave (Fecha, Colegio, Ubicación) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-6 rounded-2xl border border-border/50">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Fecha</p>
              <p className="text-sm font-medium">{event.date || 'Fecha por confirmar'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Organiza</p>
              <p className="text-sm font-medium">{event.school_name || 'Colegio Waldorf'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 md:col-span-2">
             <MapPin className="w-5 h-5 text-primary mt-0.5" />
             <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Lugar</p>
                <p className="text-sm font-medium">{event.location || 'Consultar con el centro'}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Descripción detallada */}
      <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
           <Info className="w-5 h-5 text-primary" /> Detalles del Evento
        </h2>
        <div className="prose prose-sm md:prose-base dark:prose-invert text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {event.description || 'No hay más detalles disponibles para este evento.'}
        </div>
        
        <div className="mt-10 pt-6 border-t border-border flex justify-center">
          <Link to="/colegios" className="bg-primary text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:scale-105 transition-transform">
             Inscribirse / Más información
          </Link>
        </div>
      </div>

    </div>
  );
}