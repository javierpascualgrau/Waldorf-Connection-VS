import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '@/api/supabaseClient';
import { MapPin, Building, Globe, Edit3, Save, Upload, Plus, X, Trash2, Briefcase, GraduationCap, Heart, Link as LinkIcon, FileText, MessageSquare, Send, Loader2, Image as ImageIcon, LogOut } from 'lucide-react'; // 💡 Añadido LogOut
import PostCard from '@/components/PostCard'; 

const TIPOS_OFERTA = ['Trabajo', 'Prácticas', 'Voluntariado'];

export default function CompanyProfile() {
  const { id } = useParams(); 
  const navigate = useNavigate(); // 💡 Inicializamos navigate para redirigir tras salir
  const [company, setCompany] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [profileTab, setProfileTab] = useState('ofertas'); 
  
  const [companyPosts, setCompanyPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(''); 
  const [uploadingPostImage, setUploadingPostImage] = useState(false); 
  const [publishingPost, setPublishingPost] = useState(false);
  
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [publishingOffer, setPublishingOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    type: 'Trabajo',
    location: '',
    link_apply: ''
  });

  const loadOffers = async (companyId) => {
    if (!companyId) return;
    const { data: offs } = await supabase
      .from('company_offers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setOffers(offs || []);
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
          await loadCompanyPosts(data.name); 
        }
      }
      setLoading(false);
    };
    loadCompanyData();
  }, [id]);

  const isOwner = user && (company?.id === user.id);

  // 💡 NUEVO: Función para cerrar sesión rápidamente
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

  const handleUploadPostImage = async (e) => {
    if (!isOwner) return;
    try {
      setUploadingPostImage(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `company_posts/${user.id}-${Math.random()}.${fileExt}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setPostImage(data.publicUrl);

    } catch (error) {
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setUploadingPostImage(false);
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

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    if (!newOffer.title || !newOffer.description) {
      alert("Por favor, rellena el título y la descripción.");
      return;
    }

    setPublishingOffer(true);
    const { error } = await supabase
      .from('company_offers')
      .insert({
        company_id: company.id,
        company_name: company.name,
        title: newOffer.title,
        description: newOffer.description,
        type: newOffer.type,
        location: newOffer.location || company.location,
        link_apply: newOffer.link_apply
      });

    if (error) {
      console.error("Error al crear oferta:", error);
      alert("Hubo un error al publicar la vacante.");
    } else {
      alert("¡Oferta publicada con éxito!");
      setShowOfferModal(false);
      setNewOffer({ title: '', description: '', type: 'Trabajo', location: '', link_apply: '' });
      await loadOffers(company.id);
    }
    setPublishingOffer(false);
  };

  const handleDeleteOffer = async (offerId) => {
    if (!isOwner) return;
    if (window.confirm("¿Seguro que deseas eliminar esta oferta?")) {
      await supabase.from('company_offers').delete().eq('id', offerId);
      await loadOffers(company.id);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!isOwner || (!postContent.trim() && !postImage)) return;

    setPublishingPost(true);
    const { error } = await supabase
      .from('posts')
      .insert({
        author_email: user.email, 
        author_name: company.name,
        author_avatar: company.logo_url,
        author_role: 'empresa', 
        content: postContent,
        image_url: postImage, 
        created_date: new Date().toISOString()
      });

    if (error) {
      console.error("Error al publicar en el feed:", error);
      alert("Hubo un error al crear la publicación.");
    } else {
      setPostContent(''); 
      setPostImage(''); 
      await loadCompanyPosts(company.name); 
    }
    setPublishingPost(false);
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
      
      {/* HEADER DE ACCIONES CON BOTÓN DE CERRAR SESIÓN */}
      <div className="flex justify-end mb-4">
        {isOwner && (
          !isEditing ? (
            <div className="flex gap-2">
              {/* 💡 Botón rojo para deslogueo rápido */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-destructive hover:text-white transition-all"
                title="Cerrar sesión de empresa"
              >
                <LogOut className="w-4 h-4" /> Salir
              </button>

              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary hover:text-white transition-all">
                <Edit3 className="w-4 h-4" /> Gestionar Empresa
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditForm(company); setIsEditing(false); }} className="flex items-center gap-1.5 bg-muted text-muted-foreground px-4 py-1.5 rounded-xl text-xs font-semibold">Cancelar</button>
              <button onClick={handleSaveProfile} className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md"><Save className="w-4 h-4" /> Guardar Perfil</button>
            </div>
          )
        )}
      </div>

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
          
          {!isEditing ? (
            <>
              <h1 className="font-cormorant text-4xl font-semibold text-foreground">{company.name}</h1>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <p className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {company.location || 'Ubicación no definida'}</p>
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="w-4 h-4" /> Visitar Web</a>
                )}
              </div>
              <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-2xl">{company.description || 'Sin descripción corporativa.'}</p>
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

      {/* BLOQUE DE CONTENIDOS DIVIDIDO EN DOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        
        {/* CONEXIÓN WALDORF */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
              <Building className="w-4 h-4 text-primary" /> Unión Waldorf
            </h2>
            {!isEditing ? (
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                "{company.waldorf_connection || 'No se ha detallado la conexión con el entorno educativo.'}"
              </p>
            ) : (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">¿Por qué formáis parte del movimiento Waldorf?</label>
                <textarea rows={4} value={editForm.waldorf_connection || ''} onChange={e => setEditForm({...editForm, waldorf_connection: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none resize-none" placeholder="Explica los valores o proyectos que os vinculan..." />
              </div>
            )}
          </div>
        </div>

        {/* CONTENEDOR CENTRAL: PESTAÑAS DINÁMICAS */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm min-h-[400px]">
            
            {/* Cabecera de Pestañas */}
            <div className="flex items-center justify-between mb-6 border-b border-border pb-0">
              <div className="flex gap-6">
                <button
                  onClick={() => setProfileTab('ofertas')}
                  className={`pb-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                    profileTab === 'ofertas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Oportunidades
                </button>
                <button
                  onClick={() => setProfileTab('actividad')}
                  className={`pb-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                    profileTab === 'actividad' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> Actividad
                </button>
              </div>

              {profileTab === 'ofertas' && isOwner && (
                <button 
                  onClick={() => setShowOfferModal(true)} 
                  className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md hover:scale-105 transition-all mb-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Publicar Vacante
                </button>
              )}
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
                        <div className="space-y-1 pr-6">
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
                        <button 
                          onClick={() => handleDeleteOffer(off.id)} 
                          className="absolute top-4 right-4 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar vacante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-6 rounded-xl border border-dashed border-border text-center">
                    Actualmente no hay ninguna oferta de empleo, prácticas o voluntariado activa.
                  </p>
                )}
              </div>
            )}

            {/* --- CONTENIDO: PESTAÑA ACTIVIDAD (POSTS CON FOTO) --- */}
            {profileTab === 'actividad' && (
              <div className="space-y-6">
                
                {isOwner && (
                  <form onSubmit={handleCreatePost} className="p-4 bg-muted/30 border border-border rounded-2xl flex flex-col gap-3 shadow-sm">
                    <textarea
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      placeholder="¿Qué ha pasado hoy en la empresa? Compártelo con la comunidad..."
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[80px]"
                    />

                    {postImage && (
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border mt-1">
                        <img src={postImage} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          type="button" 
                          onClick={() => setPostImage('')} 
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full p-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${uploadingPostImage ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                        {uploadingPostImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        {uploadingPostImage ? 'Subiendo foto...' : 'Añadir foto'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadPostImage} disabled={uploadingPostImage} />
                      </label>

                      <button
                        type="submit"
                        disabled={publishingPost || uploadingPostImage || (!postContent.trim() && !postImage)}
                        className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {publishingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Publicar 
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de PostCards generadas por la empresa */}
                <div className="space-y-4">
                  {companyPosts.length > 0 ? (
                    companyPosts.map(post => (
                      <PostCard key={post.id} post={post} userEmail={user?.email} likedIds={new Set()} />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-6 rounded-xl border border-dashed border-border text-center">
                      Aún no hay publicaciones recientes.
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL INTEGRADO PARA CREAR NUEVA OFERTA */}
      {showOfferModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-cormorant text-2xl font-semibold text-foreground">Publicar Nueva Oportunidad</h3>
              <button onClick={() => setShowOfferModal(false)} className="text-muted-foreground hover:text-foreground p-1 bg-muted rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleCreateOffer} className="p-6 space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Título del Puesto</label>
                <input value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none" placeholder="Ej: Profesor de Carpintería de apoyo" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Oportunidad</label>
                  <select value={newOffer.type} onChange={e => setNewOffer({...newOffer, type: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none outline-none">
                    {TIPOS_OFERTA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Ubicación</label>
                  <input value={newOffer.location} onChange={e => setNewOffer({...newOffer, location: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none" placeholder="Dejar en blanco para usar la habitual" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Descripción de la Oferta</label>
                <textarea rows={4} value={newOffer.description} onChange={e => setNewOffer({...newOffer, description: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" placeholder="Describe los requisitos, horarios, qué buscáis..." />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Enlace de Inscripción o Email de Contacto</label>
                <input value={newOffer.link_apply} onChange={e => setNewOffer({...newOffer, link_apply: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none" placeholder="Ej: https://tuweb.com/empleo o cv@empresa.com" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOfferModal(false)} className="flex-1 py-3 bg-muted rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition-colors">Cancelar</button>
                <button type="submit" disabled={publishingOffer} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {publishingOffer ? 'Publicando...' : 'Publicar Oportunidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}