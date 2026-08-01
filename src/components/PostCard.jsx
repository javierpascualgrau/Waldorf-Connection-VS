import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MapPin, Calendar, Briefcase, UserPlus, UserCheck, MoreVertical, Pencil, Trash2, Send, Loader2, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CreatePostModal from './CreatePostModal';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  alumno: 'Alumno',
  padre_madre: 'Padre / Madre',
  profesor: 'Profesor',
  exalumno: 'Exalumno',
  colegio: 'Colegio',
  simpatizante: 'Simpatizante',
  empresa: 'Empresa',
};

export default function PostCard({ post, userEmail, likedIds = new Set(), followingIds = new Set(), onDeleted }) {
  const navigate = useNavigate(); 
  const postId = String(post.id); 
  const isLiked = likedIds?.has(postId);
  
  // Mapeamos los posibles campos de correos e IDs según si es Post o Evento
  const authorEmailClean = post.author_email?.toLowerCase().trim();
  const schoolEmailClean = post.school_email?.toLowerCase().trim();
  const schoolId = post.school_id;
  const lookupEmail = authorEmailClean || schoolEmailClean;

  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(isLiked);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const [lightboxImage, setLightboxImage] = useState(null);
  const menuRef = useRef();

  const [authorProfile, setAuthorProfile] = useState(null);

  // Estados para comentarios
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Control de edición de comentarios
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useEffect(() => {
    setLiked(likedIds?.has(postId));
  }, [likedIds, postId]);

  // 💡 COMPROBACIÓN SINCRONIZADA: Evalúa el botón por email completo o coincidencia por alias/prefijo corporativo
  useEffect(() => {
    if (lookupEmail) {
      const cleanLookup = lookupEmail.toLowerCase().trim();
      const lookupPrefix = cleanLookup.split('@')[0];
      
      const isFollowingUser = Array.from(followingIds || []).some(email => {
        const cleanEmail = email.toLowerCase().trim();
        return cleanEmail === cleanLookup || (currentPost.author_role === 'empresa' && lookupPrefix && cleanEmail.split('@')[0] === lookupPrefix);
      });
      
      setFollowing(isFollowingUser);
    }
  }, [followingIds, lookupEmail, currentPost.author_role]);

  // COMPROBACIÓN MULTITABLA REPARADA: Buscamos en colegios, empresas o perfiles normales
  useEffect(() => {
    const loadAuthorProfile = async () => {
      // Caso A: Si es un Evento directo con school_id
      if (schoolId) {
        const { data: schoolProfile } = await supabase
          .from('school_profiles')
          .select('*')
          .eq('id', schoolId)
          .maybeSingle();

        if (schoolProfile) {
          setAuthorProfile({
            id: schoolProfile.id,
            display_name: schoolProfile.name,
            avatar_url: schoolProfile.avatar_url,
            role: 'colegio',
            user_email: schoolProfile.school_email || schoolEmailClean,
            isSchool: true
          });
          return;
        }
      }

      // SOLUCIÓN DEL EMAIL CRUZADO: Si sabemos que el autor es una empresa, buscamos por su NOMBRE.
      if (currentPost.author_role === 'empresa' && currentPost.author_name) {
        const { data: companyByName } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('name', currentPost.author_name)
          .maybeSingle();

        if (companyByName) {
          setAuthorProfile({
            id: companyByName.id,
            display_name: companyByName.name,
            avatar_url: companyByName.logo_url, 
            role: 'empresa',
            user_email: companyByName.company_email || lookupEmail,
            isCompany: true
          });
          return;
        }
      }

      if (!lookupEmail) return;

      // Caso B: Verificamos si es una Empresa usando la columna company_email
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('*')
        .ilike('company_email', lookupEmail)
        .maybeSingle();

      if (companyProfile) {
        setAuthorProfile({
          id: companyProfile.id,
          display_name: companyProfile.name,
          avatar_url: companyProfile.logo_url, 
          role: 'empresa',
          user_email: lookupEmail,
          isCompany: true
        });
        return;
      }

      // Caso C: Si no es centro ni empresa, buscamos en la tabla profiles genérica
      const { data: normalProfile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('user_email', lookupEmail)
        .maybeSingle();

      if (normalProfile) {
        const { data: companyById } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', normalProfile.id)
          .maybeSingle();

        if (companyById) {
          setAuthorProfile({
            id: companyById.id,
            display_name: companyById.name,
            avatar_url: companyById.logo_url,
            role: 'empresa',
            user_email: lookupEmail,
            isCompany: true
          });
        } else {
          setAuthorProfile(normalProfile);
        }
      } else {
        // Caso D: Probamos de respaldo en colegios por si el post es de cuenta escolar antigua
        const { data: schoolProfile } = await supabase
          .from('school_profiles')
          .select('*')
          .ilike('school_email', lookupEmail)
          .maybeSingle();

        if (schoolProfile) {
          setAuthorProfile({
            id: schoolProfile.id,
            display_name: schoolProfile.name,
            avatar_url: schoolProfile.avatar_url,
            role: 'colegio',
            user_email: lookupEmail,
            isSchool: true
          });
        }
      }
    };
    loadAuthorProfile();
  }, [authorEmailClean, schoolEmailClean, schoolId, lookupEmail, currentPost.author_role, currentPost.author_name]);

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

  const isOwner = userEmail && (
    userEmail.toLowerCase().trim() === authorEmailClean || 
    userEmail.toLowerCase().trim() === schoolEmailClean
  );

  const displayName = authorProfile?.display_name || authorProfile?.full_name || currentPost.author_name || currentPost.school_name || 'Usuario';
  const avatarUrl = authorProfile?.avatar_url || currentPost.author_avatar;
  const displayRole = authorProfile?.role || currentPost.author_role || (schoolId ? 'colegio' : '');
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  // RUTAS DE ORIGEN REPARADAS: Redirección directa al perfil correcto sin pasar por /usuario
  const handleAuthorClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cleanUserEmail = userEmail?.toLowerCase().trim();
    if (cleanUserEmail && (cleanUserEmail === authorEmailClean || cleanUserEmail === schoolEmailClean)) {
      navigate('/perfil');
      return;
    }

    if (authorProfile?.isSchool || displayRole === 'colegio' || schoolId) {
      const targetSchoolId = schoolId || authorProfile?.id;
      if (targetSchoolId) {
        navigate(`/colegios/${targetSchoolId}`);
        return;
      }
    }

    if (authorProfile?.isCompany || displayRole === 'empresa' || currentPost.author_role === 'empresa') {
      let targetCompanyId = authorProfile?.id || currentPost.author_id;
      
      if (!targetCompanyId && currentPost.author_name) {
        const { data: compData } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('name', currentPost.author_name)
          .maybeSingle();
        
        if (compData) {
          targetCompanyId = compData.id;
        }
      }

      if (targetCompanyId) {
        navigate(`/empresas/${targetCompanyId}`);
        return;
      }
    }

    const finalParam = authorProfile?.id || lookupEmail || currentPost.author_email;
    if (finalParam) {
      navigate(`/usuario/${encodeURIComponent(finalParam)}`);
    }
  };

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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !userEmail || submittingComment) return;
    setSubmittingComment(true);

    const numericPostId = Number(postId);
    const myEmailClean = userEmail.toLowerCase().trim();

    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_email', myEmailClean)
      .maybeSingle();

    let currentUserName = profileData?.display_name;
    
    if (!currentUserName) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      currentUserName = authUser?.user_metadata?.display_name || 'Miembro de la comunidad';
    }

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

    const updatedCount = commentsCount + 1;
    const { error: errorUpdate } = await supabase
      .from('posts')
      .update({ comments_count: updatedCount })
      .eq('id', numericPostId);

    if (!errorUpdate) {
      setComments(prev => [...prev, insertedData]);
      setCommentsCount(updatedCount);
      setNewComment('');
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    const confirmar = window.confirm("¿Seguro que quieres borrar este comentario?");
    if (!confirmar) return;

    const numericPostId = Number(postId);

    const { data, error: errorDelete } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', Number(commentId))
      .select();

    if (errorDelete) {
      console.error("❌ Error al eliminar el comentario:", errorDelete);
      return;
    }

    if (!data || data.length === 0) {
      alert("⚠️ ¡Cuidado! Supabase no ha borrado la fila de la base de datos.");
      return;
    }

    const updatedCount = Math.max(0, commentsCount - 1);
    const { error: errorUpdate } = await supabase
      .from('posts')
      .update({ comments_count: updatedCount })
      .eq('id', numericPostId);

    if (!errorUpdate) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentsCount(updatedCount);
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim()) return;

    const { error } = await supabase
      .from('post_comments')
      .update({ content: editingCommentText.trim() })
      .eq('id', commentId);

    if (!error) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editingCommentText.trim() } : c));
      setEditingCommentId(null);
      setEditingCommentText('');
    } else {
      console.error("❌ Error al editar comentario:", error);
    }
  };

  // 💡 ACCIÓN OPTIMISTA INTERCONECTADA: Toggle inmediato libre de lag y a prueba de prefijos de dominio
  const handleFollow = async () => {
    if (followLoading || !userEmail || !lookupEmail || isOwner) return;
    setFollowLoading(true);

    const follower = userEmail.toLowerCase().trim();
    const followed = lookupEmail.toLowerCase().trim();
    const followedPrefix = followed.split('@')[0];

    // 🚀 INTERFAZ INMEDIATA (UI Optimista)
    const previousFollowingState = following;
    setFollowing(!previousFollowingState);

    try {
      if (previousFollowingState) {
        let emailToDelete = followed;
        if (currentPost.author_role === 'empresa') {
          const matchedEmail = Array.from(followingIds || []).find(email => 
            email.toLowerCase().trim() === followed || (followedPrefix && email.toLowerCase().trim().split('@')[0] === followedPrefix)
          );
          if (matchedEmail) emailToDelete = matchedEmail;
        }

        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_email', follower)
          .eq('following_email', emailToDelete);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert([{ follower_email: follower, following_email: followed }]);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error al gestionar seguimiento:", error);
      setFollowing(previousFollowingState); // Reversión táctica si falla
    } finally {
      setFollowLoading(false);
    }
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
      <div className={`rounded-2xl p-4 hover:shadow-md transition-shadow text-left animate-fade-up ${
        displayRole === 'colegio'
          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 shadow-sm shadow-primary/10'
          : 'bg-card border border-border'
      }`}>
        
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div 
            onClick={handleAuthorClick} 
            className="flex items-start gap-3 flex-1 min-w-0 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:opacity-80 transition-opacity overflow-hidden border border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 group-hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-foreground">{displayName}</span>
                {displayRole && (
                  <span className="text-xs text-muted-foreground">{ROLE_LABELS[displayRole] || displayRole}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {currentPost.created_date ? format(new Date(currentPost.created_date), "d MMM", { locale: es }) : ''}
              </span>
            </div>
          </div>

          {/* Opciones */}
          <div className="flex gap-2 items-center flex-shrink-0">
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
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(o => !o);
                  }}
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
          <img
            src={currentPost.image_url}
            alt=""
            onClick={() => setLightboxImage(currentPost.image_url)}
            className="w-full rounded-xl object-cover max-h-64 mb-3 cursor-pointer"
          />
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
              className={`flex items-center p-1 transition-colors ${liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-rose-500' : ''}`} />
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${showComments ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{commentsCount}</span>
            </button>
          </div>
          {userEmail && !isOwner && (
            /* 💡 UNIFICADO: Clases idénticas a Comunidad.jsx (Gris si sigues, verde si no) */
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                following 
                  ? 'bg-muted text-muted-foreground border-border' 
                  : 'bg-primary/5 text-primary border-primary/10 hover:bg-primary hover:text-white'
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

        {/* Sección de comentarios */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-3 animate-fade-down">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando respuestas...
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-1 py-1">Aún no hay comentarios. ¡Sé el primero en responder!</p>
              ) : (
                comments.map((comment) => {
                  const isCommentOwner = userEmail && userEmail.toLowerCase().trim() === comment.user_email?.toLowerCase().trim();
                  const isEditingThis = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="bg-muted/40 rounded-xl p-3 text-xs space-y-1 relative group transition-all text-left">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground/90">{comment.author_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.created_at), "d MMM HH:mm", { locale: es })}
                          </span>
                          
                          {isCommentOwner && !isEditingThis && (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEditComment(comment)}
                                className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isEditingThis ? (
                        <div className="flex gap-2 items-center mt-1 pt-1">
                          <input
                            type="text"
                            className="flex-1 bg-card rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-primary text-foreground border border-border"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            maxLength={300}
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateComment(comment.id)}
                            className="text-primary font-medium hover:underline text-[11px] flex-shrink-0"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="text-muted-foreground hover:underline text-[11px] flex-shrink-0"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Formulario envío */}
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

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}