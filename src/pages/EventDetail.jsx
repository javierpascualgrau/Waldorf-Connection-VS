import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, Calendar, MapPin, Clock, Info, Globe, Image as ImageIcon } from 'lucide-react';

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
      
      {/* BOTÓN DE VOLVER */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      {/* IMAGEN DE CABECERA DEL EVENTO (SI TIENE) */}
      {event.image_url ? (
        <div className="h-64 w-full rounded-3xl overflow-hidden mb-6 border border-border shadow-sm">
          <img src={event.image_url} className="w-full h-full object-cover" alt={event.title} />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl mb-6 border border-dashed border-primary/20 flex items-center justify-center text-primary/40">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BLOQUE IZQUIERDO: DETALLES MIGRATORIOS (HORA, LUGAR, MAPA) */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Información clave</h3>
            
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-xs font-semibold text-foreground">{event.date || 'Por confirmar'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Hora de inicio</p>
                <p className="text-xs font-semibold text-foreground">{event.time || 'Consultar horario'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Organizador</p>
                <p className="text-xs font-semibold text-foreground">{event.school_name || 'Centro Waldorf'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Ubicación</p>
                <p className="text-xs font-medium text-foreground leading-tight mb-2">{event.location || 'En el propio centro'}</p>
                
                {/* ENLACE AL MAPA DE GOOGLE */}
                {event.map_link && (
                  <a 
                    href={event.map_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <Globe className="w-3 h-3" /> Ver mapa en Google
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE DERECHO: TÍTULO Y DESCRIPCIÓN EXTENDIDA */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
            <span className="inline-block bg-primary/10 text-primary px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider mb-3">
              Anuncio Oficial
            </span>
            <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
              {event.title}
            </h1>
            
            <hr className="border-border/60 my-4" />
            
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Acerca de este evento</p>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {event.description || 'No se ha facilitado una descripción larga para este evento todavía.'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}