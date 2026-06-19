import { useState, useEffect } from 'react';
import { Heart, MapPin, Calendar, Clock, ExternalLink, UserCheck, UserPlus } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const EVENT_TYPE_LABELS = {
  mercadillo: 'Mercadillo',
  fiesta_trimestral: 'Fiesta Trimestral',
  obra_teatro: 'Obra de Teatro',
  jornada_puertas_abiertas: 'Puertas Abiertas',
  taller_familias: 'Taller Familias',
  festival: 'Festival',
  excurcion: 'Excursión',
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

/* 💡 CAPTURA: Añadido onFollowToggle a las propiedades recibidas */
export default function SchoolEventCard({ event, userEmail, likedIds, followingIds = new Set(), onFollowToggle }) {
  const isLiked = likedIds?.has(event.id);
  const [likesCount, setLikesCount] = useState(event.likes_count || 0);
  const [liked, setLiked] = useState(isLiked);
  const [loading, setLoading] = useState(false);

  const [schoolEmail, setSchoolEmail] = useState('');
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const initials = (event.school_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const eventDate = event.event_date || event.date;
  const eventTime = event.event_time || event.time;

  useEffect(() => {
    const fetchSchoolEmail = async () => {
      const docEmail = event.school_profiles?.[0]?.school_email || event.school_profile?.[0]?.school_email || event.school_email;
      if (docEmail) {
        setSchoolEmail(docEmail.toLowerCase().trim());
        return;
      }
      if (event.school_id) {
        const { data } = await supabase.from('school_profiles').select('school_email').eq('id', event.school_id).maybeSingle();
        if (data?.school_email) {
          setSchoolEmail(data.school_email.toLowerCase().trim());
        }
      }
    };
    fetchSchoolEmail();
  }, [event]);

  useEffect(() => {
    if (schoolEmail) {
      setFollowing(followingIds?.has(schoolEmail));
    }
  }, [followingIds, schoolEmail]);

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

  const handleFollow = async () => {
    if (followLoading || !userEmail || !schoolEmail) return;
    setFollowLoading(true);

    const follower = userEmail.toLowerCase().trim();

    if (following) {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_email', follower)
        .eq('following_email', schoolEmail);

      if (!error) {
        setFollowing(false);
        // 💡 NOTIFICACIÓN REACTIVA: Avisamos al Feed que hemos dejado de seguir
        if (onFollowToggle) onFollowToggle(schoolEmail, false); 
      }
    } else {
      const { error } = await supabase
        .from('user_follows')
        .insert([{ follower_email: follower, following_email: schoolEmail }]);

      if (!error) {
        setFollowing(true);
        // 💡 NOTIFICACIÓN REACTIVA: Avisamos al Feed que ahora lo seguimos
        if (onFollowToggle) onFollowToggle(schoolEmail, true); 
      }
    }
    setFollowLoading(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left animate-fade-up">
      {event.image_url && (
        <img src={event.image_url} alt="" className="w-full h-48 object-cover" />
      )}

      <div className="p-5">
        
        {/* School info ENLACE AL PERFIL */}
        <Link 
          to={`/colegios/${event.school_id || ''}`} 
          className="flex items-center gap-3 mb-4 group block w-fit"
        >
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:opacity-80 transition-opacity">
            {event.school_logo ? (
              <img src={event.school_logo} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
            )}
          </div>
          
          <div className="group-hover:opacity-80 transition-opacity">
            <p className="text-sm font-semibold text-foreground">
              {event.school_name || 'Colegio Waldorf'}
            </p>
            {event.event_type && (
              <span className={`inline-block mt-0.5 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${EVENT_TYPE_COLORS[event.event_type] || 'bg-muted text-muted-foreground'}`}>
                {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
              </span>
            )}
          </div>
        </Link>

        {/* Title & description */}
        <h3 className="font-cormorant text-xl font-bold mb-2 leading-tight">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{event.description}</p>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
          {eventDate && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="w-4 h-4 text-primary" />
              {format(new Date(eventDate), "d MMM, yyyy", { locale: es })}
            </span>
          )}
          {eventTime && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Clock className="w-4 h-4 text-primary" /> {eventTime}
            </span>
          )}
        </div>

        {/* Location & Map Link */}
        {(event.location || event.map_link) && (
          <div className="mt-3 bg-muted/30 p-2.5 rounded-xl border border-border/50 flex flex-col gap-2">
            {event.location && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" /> 
                <span className="truncate">{event.location}</span>
              </span>
            )}
            
            {event.map_link && event.map_link.startsWith('http') && (
              <a 
                href={event.map_link} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir en Google Maps
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
          <button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
            <span className="font-medium">{likesCount} me gusta</span>
          </button>

          {userEmail && schoolEmail && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                following ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-primary/5'
              }`}
            >
              {following ? (
                <><UserCheck className="w-3 h-3" /><span>Siguiendo</span></>
              ) : (
                <><UserPlus className="w-3 h-3" /><span>Seguir</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}