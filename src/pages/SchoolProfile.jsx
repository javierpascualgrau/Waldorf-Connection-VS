import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, MapPin, Activity, Image as ImageIcon, Calendar, Clock, Users, GraduationCap, Edit3, Save, Upload, Plus, X, Trash2, UserPlus, UserCheck } from 'lucide-react';
import CreateSchoolEventModal from './CreateSchoolEventModal';

const ETAPAS_DISPONIBLES = ['Infantil', 'Primaria', 'ESO', 'Bachillerato', 'Educación Especial'];

export default function SchoolProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState(null);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newActivity, setNewActivity] = useState('');
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // 💡 NUEVOS ESTADOS: Control de reactividad inmediata para el seguimiento escolar
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const currentSchoolId = id || user?.id;

  const loadEvents = async (schoolId) => {
    if (!schoolId) return;
    const { data: evs } = await supabase
      .from('school_events')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: true });
    setSchoolEvents(evs || []);
  };

  useEffect(() => {
    const loadSchoolData = async () => {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const targetId = id || authUser?.id;

      if (!targetId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('school_profiles')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (error) console.error("Error al leer el perfil del colegio:", error);

      if (data) {
        const schoolData = { 
          ...data, 
          stages: data.stages || [], 
          activities: data.activities || [], 
          images: data.images || [] 
        };
        setSchool(schoolData);
        setEditForm(schoolData);
        await loadEvents(targetId);

        // 💡 SINCRONIZACIÓN AL ARRANCAR: Comprobamos si ya sigues a este colegio en la tabla user_follows
        if (authUser?.email && schoolData.school_email) {
          const myEmailClean = authUser.email.toLowerCase().trim();
          const schEmailClean = schoolData.school_email.toLowerCase().trim();

          const { data: followRecord } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_email', myEmailClean)
            .eq('following_email', schEmailClean)
            .maybeSingle();

          if (followRecord) setFollowing(true);
        }
      }
      setLoading(false);
    };
    loadSchoolData();
  }, [id]);

  const isManager = user && (school?.id === user.id || school?.manager_id === user.id);

  // 💡 ACCIÓN OPTIMISTA ESCOLAR: Cambia de estado visual en el mismo milisegundo que haces clic
  const handleFollow = async () => {
    if (!user?.email || !school?.school_email || followLoading) return;

    const myEmailClean = user.email.toLowerCase().trim();
    const schEmailClean = school.school_email.toLowerCase().trim();

    const previousFollowingState = following;
    setFollowing(!previousFollowingState);

    try {
      if (previousFollowingState) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_email', myEmailClean)
          .eq('following_email', schEmailClean);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert([{ follower_email: myEmailClean, following_email: schEmailClean }]);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error operando seguimiento del centro educativo:", error);
      setFollowing(previousFollowingState); // Reversión de emergencia si falla la red
    }
  };

  const uploadFile = async (event, type) => {
    try {
      if (type === 'avatar') setUploadingAvatar(true);
      if (type === 'cover') setUploadingCover(true);
      if (type === 'gallery') setUploadingGallery(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`; 

      let { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      if (type === 'avatar') setEditForm({ ...editForm, avatar_url: publicUrl });
      if (type === 'cover') setEditForm({ ...editForm, cover_url: publicUrl });
      if (type === 'gallery') {
        setEditForm({ ...editForm, images: [...(editForm.images || []), publicUrl] });
      }

    } catch (error) {
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
      setUploadingGallery(false);
    }
  };

  const handleSave = async () => {
    if (!currentSchoolId) return;
    
    const { error } = await supabase
      .from('school_profiles')
      .update({
        name: editForm.name,
        location: editForm.location,
        description: editForm.description,
        num_students: parseInt(editForm.num_students) || 0,
        stages: editForm.stages,
        activities: editForm.activities,
        images: editForm.images,
        cover_url: editForm.cover_url,
        avatar_url: editForm.avatar_url
      })
      .eq('id', currentSchoolId);
    
    if (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar los cambios.");
    } else {
      setSchool(editForm);
      alert("¡Perfil del colegio actualizado con éxito!");
      setIsEditing(false);
    }
  };

  const toggleStage = (stage) => {
    const currentStages = editForm.stages || [];
    if (currentStages.includes(stage)) {
      setEditForm({ ...editForm, stages: currentStages.filter(s => s !== stage) });
    } else {
      setEditForm({ ...editForm, stages: [...currentStages, stage] });
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-muted-foreground">Cargando perfil educativo...</div>;
  if (!school) return <div className="p-10 text-center text-muted-foreground">Centro no encontrado en el sistema.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-4 px-4 animate-in fade-in duration-300 text-left">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        {isManager && (
          !isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary hover:text-white transition-all">
              <Edit3 className="w-4 h-4" /> Gestionar Perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditForm(school); setIsEditing(false); }} className="flex items-center gap-1.5 bg-muted text-muted-foreground px-4 py-1.5 rounded-xl text-xs font-semibold">Cancelar</button>
              <button onClick={handleSave} className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md"><Save className="w-4 h-4" /> Guardar</button>
            </div>
          )
        )}
      </div>

      {/* CABECERA VISUAL */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm mb-8">
        <div className="h-44 bg-muted relative overflow-hidden group">
          <img src={isEditing ? editForm.cover_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d' : school.cover_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d'} className="w-full h-full object-cover" alt="portada" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        <div className="p-8 relative pt-20">
          <div className="absolute -top-16 left-8 w-32 h-32">
            <img src={isEditing ? editForm.avatar_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d' : school.avatar_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d'} className="w-32 h-32 rounded-3xl border-8 border-card object-cover bg-muted shadow-lg" alt="logo" />
          </div>
          
          {!isEditing ? (
            <>
              {/* 💡 CORREGIDO: Contenedor flex con alineación a los extremos para albergar de forma limpia el botón exclusivo de seguir */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="font-cormorant text-4xl font-semibold text-foreground">{school.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-2"><MapPin className="w-4 h-4 text-primary" /> {school.location}</p>
                </div>

                {/* 🚀 BOTÓN DE SEGUIR INSTITUCIONAL: Visible solo para miembros externos */}
                {!isManager && user?.email && (
                  <button 
                    onClick={handleFollow}
                    className={`flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-full font-semibold transition-colors shadow-sm self-start sm:self-center ${
                      following 
                        ? 'bg-muted text-muted-foreground border border-border' 
                        : 'bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white'
                    }`}
                  >
                    {following ? <><UserCheck className="w-3.5 h-3.5" /><span>Siguiendo</span></> : <><UserPlus className="w-3.5 h-3.5" /><span>Seguir</span></>}
                  </button>
                )}
              </div>
              <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-2xl">{school.description}</p>
            </>
          ) : (
            <div className="space-y-4 mt-2 max-w-xl text-left">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Nombre del Colegio</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 font-cormorant text-2xl font-semibold focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Ubicación</label>
                <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Descripción del Centro</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REJILLA DE DETALLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">Datos del Centro</h2>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Nº de Alumnos</p>
                {!isEditing ? (
                  <p className="text-sm font-semibold">{school.num_students || 0} estudiantes</p>
                ) : (
                  <input type="number" value={editForm.num_students} onChange={e => setEditForm({...editForm, num_students: e.target.value})} className="w-full bg-muted border border-border rounded-lg px-2 py-1 text-sm mt-0.5" />
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" /> Oferta Educativa</p>
              {!isEditing ? (
                <div className="flex flex-wrap gap-1.5">
                  {school.stages?.map((s, i) => <span key={i} className="bg-primary/5 text-primary border border-primary/10 text-[11px] font-medium px-2.5 py-1 rounded-lg">{s}</span>)}
                </div>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {ETAPAS_DISPONIBLES.map(stage => (
                    <label key={stage} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={editForm.stages?.includes(stage)} onChange={() => toggleStage(stage)} className="rounded border-border text-primary focus:ring-primary w-4 h-4" />
                      <span>{stage}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /> Talleres y Proyectos</h2>
            <div className="flex flex-wrap gap-1.5">
              {(!isEditing ? school.activities : editForm.activities)?.map((a, i) => (
                <span key={i} className="bg-muted px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1">
                  {a}
                  {isEditing && <button onClick={() => setEditForm({...editForm, activities: editForm.activities.filter(act => act !== a)})} className="text-destructive font-bold ml-1 hover:text-destructive/80">×</button>}
                </span>
              ))}
            </div>
            {isEditing && (
              <div className="flex gap-2 mt-4">
                <input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="Añadir taller..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-1 text-xs" />
                <button onClick={() => { if(newActivity) { setEditForm({...editForm, activities: [...(editForm.activities || []), newActivity]}); setNewActivity(''); } }} className="bg-primary text-white p-1.5 rounded-xl"><Plus className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DER: GALERÍA Y TABLÓN PROTEGIDO */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Galería de Instalaciones</h2>
              {isEditing && (
                <label className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 hover:bg-primary hover:text-white transition-all">
                  {uploadingGallery ? 'Subiendo...' : <><Upload className="w-3 h-3" /> Subir Foto</>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e, 'gallery')} disabled={uploadingGallery} />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(!isEditing ? school.images : editForm.images)?.map((img, i) => (
                <div key={i} className="relative group rounded-2xl overflow-hidden border border-border h-32 bg-muted">
                  <img src={img} className="h-full w-full object-cover" alt="galeria" />
                  {isEditing && (
                    <button onClick={() => setEditForm({...editForm, images: editForm.images.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-destructive text-white p-1 rounded-full text-xs shadow-sm">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Eventos del Colegio
              </h2>
              {isManager && (
                <button 
                  onClick={() => setShowEventModal(true)} 
                  className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md hover:scale-105 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Publicar Evento
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {schoolEvents.length > 0 ? (
                schoolEvents.map(e => (
                  <div key={e.id} className="p-5 bg-muted/40 border border-border rounded-2xl relative text-left group">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-card border border-border rounded-md text-primary">{e.event_type || 'Evento'}</span>
                      <h3 className="text-lg font-semibold text-foreground pt-1.5">{e.title}</h3>
                      <p className="text-sm text-foreground/70 leading-relaxed pt-1">{e.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground pt-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" /> {e.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary" /> {e.time}</span>
                      </div>
                    </div>
                    
                    {isManager && (
                      <button 
                        onClick={async () => {
                          if (window.confirm("¿Seguro que quieres borrar este evento?")) {
                            await supabase.from('school_events').delete().eq('id', e.id);
                            loadEvents(currentSchoolId);
                          }
                        }} 
                        className="absolute top-4 right-4 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-6 rounded-xl border border-dashed border-border text-center">
                  Este centro educativo no tiene eventos activos en cartelera.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEventModal && (
        <CreateSchoolEventModal 
          onClose={() => setShowEventModal(false)} 
          onCreated={() => {
            setShowEventModal(false);
            loadEvents(currentSchoolId);
          }} 
          defaultSchoolName={school?.name} 
          defaultSchoolId={currentSchoolId}              
        />
      )}
    </div>
  );
}