import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MapPin, Calendar, Briefcase, UserPlus, UserCheck, MoreVertical, Pencil, Trash2, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
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

export default function PostCard({ post, userEmail, likedIds = new Set(), followingIds = new Set(), onDeleted }) {
  const postId = String(post.id); 
  const isLiked = likedIds?.has(postId);
  
  const authorEmailClean = post.author_email?.toLowerCase().trim();
  const isFollowing = followingIds?.has(authorEmailClean);

  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(isLiked);
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const menuRef = useRef();

  // --- NUEVOS ESTADOS PARA COMENTARIOS ---
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    setLiked(likedIds?.has(postId));
  }, [likedIds, postId]);

  useEffect(() => {
    setFollowing(followingIds?.has(authorEmailClean));
  }, [followingIds, authorEmailClean]);

  // Cargar comentarios cuando se expande el panel
  useEffect(() => {
    if (showComments) {
      const loadComments = async () => {
        setLoadingComments(true);
        const { data, error } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', Number(postId))
          .order('created_at', { ascending: true });
        
        if (!error && data) setComments(data);
        setLoadingComments(false);
      };
      loadComments();
    }
  }, [showComments, postId]);

  const isOwner = userEmail && userEmail.toLowerCase().trim() === authorEmailClean;
  const initials = (currentPost.author_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLike = async () => {
    if (loading || !userEmail || !postId) return;
    setLoading(true);
    
    const newCount = liked ? Math.max(0, likesCount - 1) : likesCount + 1;
    const myEmailClean = userEmail.toLowerCase().trim();
    const numericPostId = Number(postId);

    if (liked) {
      const { error: errorDelete } = await supabase
        .from('post_likes')
        .delete()
        .eq('user_email', myEmailClean)
        .eq('post_id', numericPostId);

      if (errorDelete) {
        console.error("❌ Error al quitar el like:", errorDelete);
        setLoading(false);
        return; 
      }

      const { error: errorUpdate } = await supabase
        .from('posts')
        .update({ likes_count: newCount })
        .eq('id', numericPostId);

      if (!errorUpdate) {
        setLikesCount(newCount);
        setLiked(false);
      }
    } else {
      const { error: errorInsert } = await supabase
        .from('post_likes')
        .insert([{ user_email: myEmailClean, post_id: numericPostId }]);

      if (errorInsert) {
        console.error("❌ Error al guardar el like:", errorInsert);
        setLoading(false);
        return; 
      }

      const { error: errorUpdate } = await supabase
        .from('posts')
        .update({ likes_count: newCount })
        .eq('id', numericPostId);

      if (!errorUpdate) {
        setLikesCount(newCount);
        setLiked(true);
      }
    }
    setLoading(false);
  };

  // --- FUNCIÓN PARA SUBIR COMENTARIO ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !userEmail || submittingComment) return;
    setSubmittingComment(true);

    const numericPostId = Number(postId);
    const myEmailClean = userEmail.toLowerCase().trim();

    // 1. Conseguir el nombre del usuario actual desde sus metadatos o perfil público
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentUserName = authUser?.user_metadata?.display_name || 'Miembro de la comunidad';

    // 2. Insertar comentario
    const { data: insertedData, error: errorComment } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: numericPostId,
          user_email: myEmailClean,
          author_name: currentUserName,
          content: newComment.trim()
        }
      ])
      .select()
      .single();

    if (errorComment) {
      console.error("❌ Error al guardar comentario:", errorComment);
      setSubmittingComment(false);
      return;
    }

    // 3. Actualizar el contador en la tabla posts
    const updatedCount = commentsCount + 1;
    const { error: errorUpdate } = await supabase
      .from('posts')
      .update({ comments_count: updatedCount })
      .eq('id', numericPostId);

    if (!errorUpdate) {
      setComments(prev => [...prev, insertedData]);
      setCommentsCount(updatedCount);
      setNewComment('');
    } else {
      console.error("❌ Error al actualizar contador de comentarios:", errorUpdate);
    }
    setSubmittingComment(false);
  };

  const handleFollow = async () => {
    if (followLoading || !userEmail || !post.author_email || isOwner) return;
    setFollowLoading(true);

    const follower = userEmail.toLowerCase().trim();
    const followed = post.author_email.toLowerCase().trim();

    if (following) {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_email', follower)
        .eq('following_email', followed);

      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase
        .from('user_follows')
        .insert([{ follower_email: follower, following_email: followed }]);

      if (!error) setFollowing(true);
    }
    setFollowLoading(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    const confirmar = window.confirm("¿Estás seguro de que quieres eliminar esta publicación?");
    if (!confirmar) return;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', Number(postId));

    if (!error && onDeleted) onDeleted(postId);
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
              {currentPost.created_at ? format(new Date(currentPost.created_at), "d MMM", { locale: es }) : ''}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            {currentPost.is_service_offer && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <Briefcase className="w-3 h-3" /> Servicio
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
              {currentPost.category || 'General'}
            </span>
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
              className={`flex items-center p-1 transition-colors ${liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-rose-500' : ''}`} />
            </button>
            
            {/* 💬 BOTÓN DE COMENTARIOS AHORA CON EVENTO ONCLICK */}
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{commentsCount}</span>
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

        {/* --- 📝 SECCIÓN DESPLEGABLE DE COMENTARIOS --- */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-3 animate-fade-down">
            
            {/* Lista de comentarios cargados */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando respuestas...
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-1 py-1">Aún no hay comentarios. ¡Sé el primero en responder!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/40 rounded-xl p-3 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-foreground/90">{comment.author_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(comment.created_at), "d MMM HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input para añadir nuevo comentario */}
            {userEmail && (
              <form onSubmit={handleAddComment} className="flex gap-2 items-center pt-1">
                <input
                  type="text"
                  placeholder="Escribe una respuesta..."
                  className="flex-1 bg-muted/60 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={300}
                  required
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="bg-primary text-primary-foreground p-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0"
                >
                  {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {editOpen && (
        <CreatePostModal
          user={{ email: userEmail }}
          editPost={currentPost}
          onClose={() => setEditOpen(false)}
          onCreated={async () => {
            setEditOpen(false);
            const { data } = await supabase.from('posts').select('*').eq('id', Number(postId)).single();
            if (data) setCurrentPost(data);
          }}
        />
      )}
    </>
  );
}