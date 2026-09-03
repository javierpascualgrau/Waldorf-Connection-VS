import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '@/api/supabaseClient';
import { MapPin, Globe, Edit3, Save, Upload, PlusCircle, X, Trash2, Briefcase, GraduationCap, Heart, Link as LinkIcon, FileText, MessageSquare, Loader2, ArrowLeft, UserPlus, UserCheck, Bell, MoreVertical, Pencil, ShoppingBag, Users } from 'lucide-react';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import AccountSettingsMenu from '@/components/AccountSettingsMenu';
import FollowNetwork from '@/components/FollowNetwork';
import { linkify } from '@/lib/linkify';

export default function CompanyProfile() {
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const [company, setCompany] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [profileTab, setProfileTab] = useState('actividad');

  const [companyPosts, setCompanyPosts] = useState([]);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [openOfferMenuId, setOpenOfferMenuId] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);

  const [products, setProducts] = useState([]);
  const [openProductMenuId, setOpenProductMenuId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // 💡 NUEVOS ESTADOS: Control del seguimiento local corporativo
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [notifyEvents, setNotifyEvents] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [bellRinging, setBellRinging] = useState(false);

  const loadOffers = async (companyId) => {
    if (!companyId) return;
    const { data: offs } = await supabase
      .from('company_offers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setOffers(offs || []);
  };

  const loadProducts = async (companyId) => {
    if (!companyId) return;
    const { data: prods } = await supabase
      .from('company_products')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setProducts(prods || []);
  };

  const loadCompanyPosts = async (companyName) => {
    if (!companyName) return;
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('author_name', companyName)
      .order('created_date', { ascending: false });
    setCompanyPosts(posts || []);
  };

  useEffect(() => {
    const loadCompanyData = async () => {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const targetId = id || authUser?.id;

      if (targetId) {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (error) console.error("Error al leer perfil de empresa:", error);

        if (data) {
          setCompany(data);
          setEditForm(data);
          await loadOffers(data.id);
          await loadProducts(data.id);
          await loadCompanyPosts(data.name);

          // 💡 COMPROBACIÓN ANTIDUPLICADOS: Comprobamos de forma híbrida si el usuario ya sigue el prefijo de la empresa
          if (authUser?.email && data.company_email) {
            const myEmailClean = authUser.email.toLowerCase().trim();
            const compEmailClean = data.company_email.toLowerCase().trim();
            const compPrefix = compEmailClean.split('@')[0];

            const { data: follows } = await supabase
              .from('user_follows')
              .select('following_email, notify_events')
              .eq('follower_email', myEmailClean);

            if (follows) {
              const matched = follows.find(f => {
                const fEmail = f.following_email?.toLowerCase().trim() || '';
                return fEmail === compEmailClean || fEmail.split('@')[0] === compPrefix;
              });
              setFollowing(!!matched);
              setNotifyEvents(!!matched?.notify_events);
            }
          }
        }
      }
      setLoading(false);
    };
    loadCompanyData();
  }, [id]);

  const isOwner = user && (company?.id === user.id);

  useEffect(() => {
    if (openOfferMenuId === null) return;
    const handleClick = (e) => {
      if (!e.target.closest('.offer-actions-menu')) setOpenOfferMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openOfferMenuId]);

  useEffect(() => {
    if (openProductMenuId === null) return;
    const handleClick = (e) => {
      if (!e.target.closest('.product-actions-menu')) setOpenProductMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openProductMenuId]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
      window.location.reload(); 
    } catch (error) {
      console.error("Error al cerrar sesión:", error.message);
      alert("No se pudo cerrar sesión correctamente.");
    }
  };

  const handleContactar = async () => {
    if (!user?.email || !company?.company_email) {
      alert("Esta empresa no dispone de un correo de contacto asociado en el sistema.");
      return;
    }
    
    const myEmailClean = user.email.toLowerCase().trim();
    const companyEmailClean = company.company_email.toLowerCase().trim();
    const companyPrefix = companyEmailClean.split('@')[0]; 

    try {
      const { data: existingChats, error: searchError } = await supabase
        .from('chats')
        .select('*')
        .or(`user_1_email.eq.${myEmailClean},user_2_email.eq.${myEmailClean}`);

      if (searchError) throw searchError;

      const duplicateChat = (existingChats || []).find(chat => {
        const u1 = chat.user_1_email?.toLowerCase().trim() || '';
        const u2 = chat.user_2_email?.toLowerCase().trim() || '';
        const other = u1 === myEmailClean ? u2 : u1;
        return other === companyEmailClean || other.split('@')[0] === companyPrefix;
      });

      if (duplicateChat) {
        navigate('/hilo', { state: { activeChatId: duplicateChat.id } });
        return;
      }

      const emails = [myEmailClean, companyEmailClean].sort();
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .upsert(
          { user_1_email: emails[0], user_2_email: emails[1] }, 
          { onConflict: 'user_1_email,user_2_email' }
        )
        .select()
        .single();

      if (createError) throw createError;

      if (newChat) {
        navigate('/hilo', { state: { activeChatId: newChat.id } }); 
      }
    } catch (error) {
      console.error("Error al procesar el enrutamiento de chat único:", error);
      alert("No se pudo conectar con el hilo de la conversación.");
    }
  };

  // 💡 NUEVA ACCIÓN DE SEGUIMIENTO CORPORATIVO: Alterna seguimientos protegiendo desfases de correos
  const handleFollow = async () => {
    if (!user?.email || !company?.company_email || followLoading) return;
    setFollowLoading(true);

    const myEmailClean = user.email.toLowerCase().trim();
    const compEmailClean = company.company_email.toLowerCase().trim();
    const compPrefix = compEmailClean.split('@')[0];

    try {
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_email')
        .eq('follower_email', myEmailClean);

      const existingFollow = (follows || []).find(f => {
        const fEmail = f.following_email?.toLowerCase().trim() || '';
        return fEmail === compEmailClean || fEmail.split('@')[0] === compPrefix;
      });

      if (existingFollow) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_email', myEmailClean)
          .eq('following_email', existingFollow.following_email);

        if (!error) {
          setFollowing(false);
          setNotifyEvents(false); // al dejar de seguir se borra la fila, así que las notificaciones también se apagan
        }
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert([{ follower_email: myEmailClean, following_email: compEmailClean }]);

        if (!error) setFollowing(true);
      }
    } catch (error) {
      console.error("Error al procesar acción de seguimiento corporativo:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  // 💡 Seguir y recibir notificaciones de eventos son cosas independientes: solo se puede
  // activar si ya sigues, y actualiza la misma fila de user_follows en vez de crear una nueva.
  const handleToggleNotifyEvents = async () => {
    if (!user?.email || !company?.company_email || !following || notifyLoading) return;
    setNotifyLoading(true);

    const myEmailClean = user.email.toLowerCase().trim();
    const compEmailClean = company.company_email.toLowerCase().trim();
    const compPrefix = compEmailClean.split('@')[0];
    const previousNotifyEvents = notifyEvents;
    setNotifyEvents(!previousNotifyEvents);

    try {
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_email')
        .eq('follower_email', myEmailClean);

      const existingFollow = (follows || []).find(f => {
        const fEmail = f.following_email?.toLowerCase().trim() || '';
        return fEmail === compEmailClean || fEmail.split('@')[0] === compPrefix;
      });

      if (!existingFollow) throw new Error('No se encontró el seguimiento de esta empresa');

      const { error } = await supabase
        .from('user_follows')
        .update({ notify_events: !previousNotifyEvents })
        .eq('follower_email', myEmailClean)
        .eq('following_email', existingFollow.following_email);

      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando notificaciones de eventos:", error);
      setNotifyEvents(previousNotifyEvents);
    } finally {
      setNotifyLoading(false);
    }
  };

  const uploadFile = async (event, type) => {
    if (!isOwner) return;
    try {
      if (type === 'logo') setUploadingLogo(true);
      if (type === 'banner') setUploadingBanner(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `companies/${user.id}-${type}-${Math.random()}.${fileExt}`; 

      let { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      if (type === 'logo') setEditForm({ ...editForm, logo_url: publicUrl });
      if (type === 'banner') setEditForm({ ...editForm, banner_url: publicUrl });

    } catch (error) {
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setUploadingLogo(false);
      setUploadingBanner(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!isOwner) return;
    const { error } = await supabase
      .from('company_profiles')
      .update({
        name: editForm.name,
        location: editForm.location,
        description: editForm.description,
        waldorf_connection: editForm.waldorf_connection,
        website: editForm.website,
        logo_url: editForm.logo_url,
        banner_url: editForm.banner_url
      })
      .eq('id', company.id);
    
    if (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar los cambios.");
    } else {
      setCompany(editForm);
      alert("¡Perfil de empresa actualizado con éxito!");
      setIsEditing(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!isOwner) return;
    setOpenOfferMenuId(null);
    if (window.confirm("¿Seguro que deseas eliminar esta oferta?")) {
      await supabase.from('company_offers').delete().eq('id', offerId);
      await loadOffers(company.id);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!isOwner) return;
    setOpenProductMenuId(null);
    if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
      await supabase.from('company_products').delete().eq('id', productId);
      await loadProducts(company.id);
    }
  };

  const getIconType = (type) => {
    if (type === 'Prácticas') return <GraduationCap className="w-4 h-4 text-amber-600" />;
    if (type === 'Voluntariado') return <Heart className="w-4 h-4 text-emerald-600" />;
    return <Briefcase className="w-4 h-4 text-blue-600" />;
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-muted-foreground">Cargando ecosistema corporativo...</div>;
  if (!company) return <div className="p-10 text-center text-muted-foreground">Empresa no localizada en el sistema.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-2 px-4 animate-in fade-in duration-300">
      
      {/* HEADER: BOTÓN DE VOLVER (SOLO VISITANTES) */}
      {!isOwner && (
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Volver atrás
          </button>
        </div>
      )}

      {/* CABECERA VISUAL (BANNER Y LOGO) */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm mb-8 text-left">
        <div className="h-44 bg-muted/60 relative overflow-hidden group">
          <img src={isEditing ? editForm.banner_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab' : company.banner_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab'} className="w-full h-full object-cover" alt="portada" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          {isEditing && isOwner && (
            <label className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer backdrop-blur-sm transition-all flex items-center gap-2">
              {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Upload className="w-3 h-3" /> Cambiar Portada</>}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e, 'banner')} disabled={uploadingBanner} />
            </label>
          )}
        </div>

        <div className="p-8 relative pt-20">
          <div className="absolute -top-16 left-8 w-32 h-32">
            <img src={isEditing ? editForm.logo_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3' : company.logo_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'} className="w-32 h-32 rounded-3xl border-8 border-card object-cover bg-muted shadow-lg" alt="logo" />
            {isEditing && isOwner && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                 <span className="text-white text-xs font-bold text-center px-2">{uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}</span>
                 <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e, 'logo')} disabled={uploadingLogo} />
              </label>
            )}
          </div>

          {isOwner && (
            <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Publicar</span>
                  </button>
                  <AccountSettingsMenu userEmail={user?.email} onLogout={handleLogout} />
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    title="Editar perfil"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setEditForm(company); setIsEditing(false); }}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="p-2 rounded-full hover:bg-primary/10 transition-colors text-primary"
                    title="Guardar cambios"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {!isEditing ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="font-cormorant text-4xl font-semibold text-foreground">{company.name}</h1>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                    <p className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {company.location || 'Ubicación no definida'}</p>
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="w-4 h-4" /> Visitar Web</a>
                    )}
                  </div>
                </div>

                {/* 🚀 GRUPO DE BOTONES DE ACCIÓN: Contactar y Seguir alineados simétricamente */}
                {!isOwner && (
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button 
                      onClick={handleContactar}
                      className="flex items-center gap-2 bg-[#3A5F43] text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Contactar
                    </button>

                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-full font-semibold transition-colors shadow-sm ${
                        following
                          ? 'bg-muted text-muted-foreground border border-border'
                          : 'bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white'
                      }`}
                    >
                      {following ? (
                        <><UserCheck className="w-3.5 h-3.5" /><span>Siguiendo</span></>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5" /><span>Seguir</span></>
                      )}
                    </button>

                    {/* 🔔 Notificaciones de eventos: independiente de seguir, solo activable si ya sigues */}
                    <button
                      onClick={(e) => { setBellRinging(true); handleToggleNotifyEvents(e); }}
                      disabled={!following || notifyLoading}
                      title={!following ? 'Sigue primero para activar notificaciones' : notifyEvents ? 'Desactivar notificaciones de eventos' : 'Recibir notificaciones de eventos'}
                      aria-label="Notificaciones de eventos"
                      className={`flex items-center justify-center w-9 h-9 rounded-full border transition-colors shadow-sm ${
                        !following
                          ? 'bg-muted/50 text-muted-foreground/40 border-border cursor-not-allowed'
                          : notifyEvents
                            ? 'bg-primary text-white border-primary'
                            : 'bg-primary/5 text-primary border-primary/10 hover:bg-primary hover:text-white'
                      }`}
                    >
                      <Bell className={`w-3.5 h-3.5 ${bellRinging ? 'bell-ring' : ''}`} onAnimationEnd={() => setBellRinging(false)} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-2xl">{company.description ? linkify(company.description) : 'Sin descripción corporativa.'}</p>
            </>
          ) : (
            <div className="space-y-4 mt-2 max-w-xl text-left">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Nombre de la Empresa</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 focus:outline-none text-xl font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Ubicación</label>
                  <input value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej: Las Rozas, Madrid" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Sitio Web</label>
                  <input value={editForm.website || ''} onChange={e => setEditForm({...editForm, website: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder="Ej: https://miweb.com" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Sobre Nosotros</label>
                <textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTENEDOR DE PESTAÑAS DINÁMICAS */}
      <div className="text-left">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">

            {/* Cabecera de Pestañas */}
            <div className="flex items-center justify-around mb-6 border-b border-border pb-0">
              <button
                onClick={() => setProfileTab('actividad')}
                className={`flex-1 pb-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
                  profileTab === 'actividad' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Actividad
              </button>
              <button
                onClick={() => setProfileTab('productos')}
                className={`flex-1 pb-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
                  profileTab === 'productos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShoppingBag className="w-4 h-4" /> Productos
              </button>
              <button
                onClick={() => setProfileTab('ofertas')}
                className={`flex-1 pb-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
                  profileTab === 'ofertas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" /> Oportunidades
              </button>
              <button
                onClick={() => setProfileTab('red')}
                className={`flex-1 pb-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
                  profileTab === 'red' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" /> Red
              </button>
            </div>

            {/* --- CONTENIDO: PESTAÑA OFERTAS --- */}
            {profileTab === 'ofertas' && (
              <div className="space-y-4">
                {offers.length > 0 ? (
                  offers.map(off => (
                    <div key={off.id} className="p-5 bg-muted/30 border border-border rounded-2xl relative group hover:border-primary/30 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-card border border-border rounded-xl shadow-sm">
                          {getIconType(off.type)}
                        </div>
                        <div className="space-y-1 pr-6 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-card border border-border rounded-md text-muted-foreground">{off.type}</span>
                          <h3 className="text-lg font-semibold text-foreground pt-1">{off.title}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {off.location}</p>
                          <p className="text-sm text-foreground/70 pt-2 leading-relaxed">{off.description}</p>

                          {off.link_apply && (
                            <div className="pt-3">
                              <a href={off.link_apply} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                                <LinkIcon className="w-3 h-3" /> Cómo inscribirse / Más detalles
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {isOwner && (
                        <div className="absolute top-4 right-4 offer-actions-menu">
                          <button
                            onClick={() => setOpenOfferMenuId(openOfferMenuId === off.id ? null : off.id)}
                            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openOfferMenuId === off.id && (
                            <div className="absolute right-0 top-7 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[130px]">
                              <button
                                onClick={() => { setOpenOfferMenuId(null); setEditingOffer(off); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteOffer(off.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-6 rounded-xl border border-dashed border-border text-center">
                    Currently there is no active job, internship or volunteer opportunity.
                  </p>
                )}
              </div>
            )}

            {/* --- CONTENIDO: PESTAÑA PRODUCTOS --- */}
            {profileTab === 'productos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.length > 0 ? (
                  products.map(prod => (
                    <div key={prod.id} className="bg-muted/30 border border-border rounded-2xl overflow-hidden relative group hover:border-primary/30 transition-all">
                      {prod.image_url && (
                        <img src={prod.image_url} alt={prod.title} className="w-full h-36 object-cover" />
                      )}
                      <div className="p-4 space-y-1">
                        <h3 className="text-base font-semibold text-foreground leading-tight pr-6">{prod.title}</h3>
                        {prod.price != null && (
                          <p className="text-sm font-bold text-primary">{Number(prod.price).toFixed(2)} €</p>
                        )}
                        {prod.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{prod.description}</p>
                        )}
                        {prod.link_buy && (
                          <div className="pt-2">
                            <a href={prod.link_buy} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                              <LinkIcon className="w-3 h-3" /> Comprar / Más detalles
                            </a>
                          </div>
                        )}
                      </div>

                      {isOwner && (
                        <div className="absolute top-2 right-2 product-actions-menu">
                          <button
                            onClick={() => setOpenProductMenuId(openProductMenuId === prod.id ? null : prod.id)}
                            className="p-1 rounded-full bg-card/90 hover:bg-muted transition-colors text-muted-foreground shadow-sm"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openProductMenuId === prod.id && (
                            <div className="absolute right-0 top-7 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[130px]">
                              <button
                                onClick={() => { setOpenProductMenuId(null); setEditingProduct(prod); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-6 rounded-xl border border-dashed border-border text-center sm:col-span-2">
                    Esta empresa aún no ha añadido productos a su tienda.
                  </p>
                )}
              </div>
            )}

            {/* --- CONTENIDO: PESTAÑA ACTIVIDAD (POSTS CON FOTO) --- */}
            {profileTab === 'actividad' && (
              <div className="space-y-6">
                {/* Lista de PostCards generadas por la empresa */}
                <div className="space-y-4">
                  {companyPosts.length > 0 ? (
                    companyPosts.map(post => (
                      <PostCard key={post.id} post={post} userEmail={user?.email} likedIds={new Set()} />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-6 rounded-xl border border-dashed border-border text-center">
                      No recent posts available.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* --- CONTENIDO: PESTAÑA RED (SEGUIDORES/SIGUIENDO) --- */}
            {profileTab === 'red' && (
              <FollowNetwork email={company.company_email} />
            )}

          </div>
        </div>
      </div>

      {showCreatePostModal && isOwner && (
        <CreatePostModal
          user={user}
          onClose={() => setShowCreatePostModal(false)}
          onCreated={async () => {
            setShowCreatePostModal(false);
            await loadCompanyPosts(company.name);
            await loadOffers(company.id);
            await loadProducts(company.id);
          }}
        />
      )}

      {editingOffer && (
        <CreatePostModal
          user={user}
          editOffer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onCreated={async () => {
            setEditingOffer(null);
            await loadOffers(company.id);
          }}
        />
      )}

      {editingProduct && (
        <CreatePostModal
          user={user}
          editProduct={editingProduct}
          onClose={() => setEditingProduct(null)}
          onCreated={async () => {
            setEditingProduct(null);
            await loadProducts(company.id);
          }}
        />
      )}
    </div>
  );
}