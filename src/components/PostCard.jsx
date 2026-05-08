import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MapPin, Calendar, Briefcase, UserPlus, UserCheck, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CreatePostModal from './CreatePostModal';

const ROLE_LABELS = {
  alumno: 'Alumno',
  padre_madre: 'Padre / Madre',
  profesor: 'Profesor',
  exalumno: 'Exalumno',
  colegio: 'Colegio',
  simpatizante: 'Simpatizante',
};

const CATEGORY_LABELS = {
  taller: 'Taller',
  evento_espiritual: 'Evento Espiritual',
  educacion: 'Educación',
  arte: 'Arte',
  carpinteria: 'Carpintería',
  musica: 'Música',
  teatro: 'Teatro',
  naturaleza: 'Naturaleza',
  profesor_particular: 'Profesor Particular',
  asociacion: 'Asociación',
  otro: 'Otro',
};

const CATEGORY_COLORS = {
  taller: 'bg-amber-100 text-amber-800',
  evento_espiritual: 'bg-purple-100 text-purple-800',
  educacion: 'bg-blue-100 text-blue-800',
  arte: 'bg-rose-100 text-rose-800',
  carpinteria: 'bg-orange-100 text-orange-800',
  musica: 'bg-indigo-100 text-indigo-800',
  teatro: 'bg-pink-100 text-pink-800',
  naturaleza: 'bg-green-100 text-green-800',
  profesor_particular: 'bg-cyan-100 text-cyan-800',
  asociacion: 'bg-yellow-100 text-yellow-800',
  otro: 'bg-gray-100 text-gray-700',
};

export default function PostCard({ post, userEmail, likedIds, followingIds = new Set(), onDeleted }) {
  const isLiked = likedIds?.has(post.id);
  const isFollowing = followingIds?.has(post.author_email);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(isLiked);
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const menuRef = useRef();

  const isOwner = userEmail && userEmail === post.author_email;
  const initials = (currentPost.author_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLike = async () => {
    if (loading || !userEmail) return;
    setLoading(true);
    if (liked) {
      const existing = await base44.entities.Like.filter({ user_email: userEmail, target_id: currentPost.id });
      if (existing.length > 0) await base44.entities.Like.delete(existing[0].id);
      await base44.entities.Post.update(currentPost.id, { likes_count: Math.max(0, likesCount - 1) });
      setLikesCount(c => Math.max(0, c - 1));
      setLiked(false);
    } else {
      await base44.entities.Like.create({ user_email: userEmail, target_id: currentPost.id, target_type: 'post' });
      await base44.entities.Post.update(currentPost.id, { likes_count: likesCount + 1 });
      setLikesCount(c => c + 1);
      setLiked(true);
    }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (followLoading || !userEmail || userEmail === currentPost.author_email) return;
    setFollowLoading(true);
    if (following) {
      const existing = await base44.entities.Follow.filter({ follower_email: userEmail, following_email: currentPost.author_email });
      if (existing.length > 0) await base44.entities.Follow.delete(existing[0].id);
      setFollowing(false);
    } else {
      await base44.entities.Follow.create({ follower_email: userEmail, following_email: currentPost.author_email });
      setFollowing(true);
    }
    setFollowLoading(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    await base44.entities.Post.delete(currentPost.id);
    onDeleted?.(currentPost.id);
  };

  return (
    <>
      <div className={`rounded-2xl p-4 hover:shadow-md transition-shadow animate-fade-up ${
        currentPost.author_role === 'colegio'
          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 shadow-sm shadow-primary/10'
          : 'bg-card border border-border'
      }`}>
        {/* Author */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            {currentPost.author_avatar ? (
              <img src={currentPost.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{currentPost.author_name || 'Usuario'}</span>
              {currentPost.author_role && (
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[currentPost.author_role] || currentPost.author_role}</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentPost.created_date ? format(new Date(currentPost.created_date), "d MMM", { locale: es }) : ''}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            {currentPost.is_service_offer && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <Briefcase className="w-3 h-3" /> Servicio
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[currentPost.category] || 'bg-muted text-muted-foreground'}`}>
              {CATEGORY_LABELS[currentPost.category] || currentPost.category}
            </span>
            {/* Owner menu */}
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-7 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[130px]">
                    <button
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed text-foreground/90 mb-3">{currentPost.content}</p>

        {/* Image */}
        {currentPost.image_url && (
          <img src={currentPost.image_url} alt="" className="w-full rounded-xl object-cover max-h-64 mb-3" />
        )}

        {/* Meta */}
        {(currentPost.location || currentPost.event_date) && (
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {currentPost.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {currentPost.location}
              </span>
            )}
            {currentPost.event_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(currentPost.event_date), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
              <span>{likesCount}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{currentPost.comments_count || 0}</span>
            </button>
          </div>
          {userEmail && !isOwner && (
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

      {editOpen && (
        <CreatePostModal
          user={{ email: userEmail }}
          editPost={currentPost}
          onClose={() => setEditOpen(false)}
          onCreated={async () => {
            setEditOpen(false);
            const updated = await base44.entities.Post.filter({ id: currentPost.id });
            if (updated[0]) setCurrentPost(updated[0]);
          }}
        />
      )}
    </>
  );
}