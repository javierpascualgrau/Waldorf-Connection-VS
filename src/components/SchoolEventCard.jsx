import { useState } from 'react';
import { Heart, MapPin, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom'; // INYECTADO: Para poder viajar al perfil del colegio

const EVENT_TYPE_LABELS = {
  mercadillo: 'Mercadillo',
  fiesta_trimestral: 'Fiesta Trimestral',
  obra_teatro: 'Obra de Teatro',
  jornada_puertas_abiertas: 'Puertas Abiertas',
  taller_familias: 'Taller Familias',
  festival: 'Festival',
  excursion: 'Excursión',
  charla: 'Charla',
  otro: 'Otro',
};

const EVENT_TYPE_COLORS = {
  mercadillo: 'bg-amber-100 text-amber-800',
  fiesta_trimestral: 'bg-purple-100 text-purple-800',
  obra_teatro: 'bg-rose-100 text-rose-800',
  jornada_puertas_abiertas: 'bg-blue-100 text-blue-800',
  taller_familias: 'bg-orange-100 text-orange-800',
  festival: 'bg-yellow-100 text-yellow-800',
  excursion: 'bg-green-100 text-green-800',
  charla: 'bg-indigo-100 text-indigo-800',
  otro: 'bg-gray-100 text-gray-700',
};

export default function SchoolEventCard({ event, userEmail, likedIds }) {
  const isLiked = likedIds?.has(event.id);
  const [likesCount, setLikesCount] = useState(event.likes_count || 0);
  const [liked, setLiked] = useState(isLiked);
  const [loading, setLoading] = useState(false);

  const initials = (event.school_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Seguro para que la fecha y hora funcionen sin importar si la columna se llama 'date' o 'event_date'
  const eventDate = event.event_date || event.date;
  const eventTime = event.event_time || event.time;

  const handleLike = async () => {
    if (loading || !userEmail) return;
    setLoading(true);
    
    const newCount = liked ? Math.max(0, likesCount - 1) : likesCount + 1;
    
    const { error } = await supabase
      .from('school_events')
      .update({ likes_count: newCount })
      .eq('id', event.id);

    if (!error) {
      setLikesCount(newCount);
      setLiked(!liked);
    } else {
      console.error("Error al dar like al evento:", error);
    }
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow animate-fade-up">
      {/* Image */}
      {event.image_url && (
        <img src={event.image_url} alt="" className="w-full h-40 object-cover" />
      )}

      <div className="p-4">
        
        {/* School info - AHORA ES UN ENLACE QUE TE LLEVA AL PERFIL */}
        <Link 
          to={`/colegios/${event.school_id || ''}`} 
          className="flex items-center gap-3 mb-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
            {event.school_logo ? (
              <img src={event.school_logo} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-primary font-cormorant font-semibold text-xs">{initials}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium group-hover:text-primary group-hover:underline transition-all">
              {event.school_name || 'Colegio Waldorf'}
            </p>
            {event.event_type && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPE_COLORS[event.event_type] || 'bg-muted text-muted-foreground'}`}>
                {EVENT_TYPE_LABELS[event.event_type] || event.event_type || 'Evento'}
              </span>
            )}
          </div>
        </Link>

        {/* Title & description */}
        <h3 className="font-cormorant text-xl font-semibold mb-1">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{event.description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 mb-3">
          {eventDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {format(new Date(eventDate), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
          )}
          {eventTime && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" /> {eventTime}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {event.location}
            </span>
          )}
        </div>

        {/* Like */}
        <div className="pt-2 border-t border-border/50">
          <button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
            <span>{likesCount} me gusta</span>
          </button>
        </div>
      </div>
    </div>
  );
}