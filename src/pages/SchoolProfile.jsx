import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, MapPin, Activity, Image as ImageIcon, Calendar, Users, GraduationCap, Edit3, Save, X, Plus } from 'lucide-react';
import SchoolEventCard from '@/components/SchoolEventCard';

const ETAPAS_DISPONIBLES = ['Infantil', 'Primaria', 'ESO', 'Bachillerato'];

// Datos extendidos, REALES e ILUSTRATIVOS para la demo de los tres colegios
// Datos actualizados con tus imágenes reales para Artabán y portadas tipo LinkedIn
const MOCK_DETAILS = {
  'micael': {
    id: 'micael',
    name: 'Escuela Libre Micael',
    location: 'Las Rozas, Madrid',
    description: 'Pionera en la pedagogía Waldorf en España (1979). Acompañamos desde Infantil hasta Bachillerato.',
    activities: ['Olimpiadas Griegas', 'Teatro y Coro', 'Huerto Escolar'],
    // Portada simbólica (Naturaleza/Madera)
    cover_url: 'https://images.unsplash.com/photo-1517036224097-4f114c022d4f?q=80&w=1200',
    avatar_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80',
    num_students: 380,
    stages: ['Infantil', 'Primaria', 'Secundaria', 'Bachillerato'],
    manager_id: 'simulado'
  },
  'aravaca': {
    id: 'aravaca',
    name: 'Waldorf Aravaca',
    location: 'Aravaca, Madrid',
    description: 'Un entorno cálido especializado en los primeros septenios.',
    activities: ['Acuarela', 'Euritmia', 'Panadería'],
    // Portada simbólica (Arte/Luz)
    cover_url: 'https://images.unsplash.com/photo-1621360841013-c7683c659ec6?q=80&w=1200',
    avatar_url: 'https://images.unsplash.com/photo-1595250924457-39d4442dfc70?auto=format&fit=crop&w=200&q=80',
    num_students: 250,
    stages: ['Infantil', 'Primaria'],
    manager_id: 'simulado'
  },
  'artaban': {
    id: 'artaban',
    name: 'Escuela Artabán',
    location: 'Torrelodones, Madrid',
    description: 'Centro pionero con más de 20 años de experiencia que une la Pedagogía Waldorf y la Pedagogía Curativa (Educación Especial) en una misma comunidad inclusiva.',
    activities: ['Pedagogía Curativa', 'Artes Textiles y Lana', 'Carpintería', 'Cuidado del Jardín'],
    cover_url: 'https://images.unsplash.com/photo-1563229656-787265a6e873?auto=format&fit=crop&w=800&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=200&q=80',
    images: [
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507676184212-d0330a1523fe?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1616117414603-5e7e00a89d71?auto=format&fit=crop&w=800&q=80'
    ],
    num_students: 180,
    stages: ['Infantil', 'Primaria', 'Secundaria', 'Educación Especial'],
    manager_id: 'simulado'
 
  }
};

export default function SchoolProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState(null);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Estados para el Formulario de Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newActivity, setNewActivity] = useState('');
  const [newImage, setNewImage] = useState('');

  useEffect(() => {
    const loadSchoolData = async () => {
      // 1. Obtener usuario logueado
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      let schoolData = null;
      if (MOCK_DETAILS[id]) {
        schoolData = MOCK_DETAILS[id];
      } else {
        const { data } = await supabase.from('schools').select('*').eq('id', id).single();
        if (data) {
          schoolData = {
            ...data,
            stages: data.stages || [],
            activities: data.activities || [],
            images: data.images || []
          };
        }
      }

      if (schoolData) {
        setSchool(schoolData);
        setEditForm(schoolData); // Inicializar formulario
        
        // Cargar eventos del colegio
        const { data: evs } = await supabase.from('school_events').select('*').ilike('school_name', `%${schoolData.name}%`);
        setSchoolEvents(evs || []);
      }
      setLoading(false);
    };
    loadSchoolData();
  }, [id]);

  // Comprobar si el usuario actual es el dueño/administrador del colegio
  // (Para pruebas, dejamos que si manager_id es 'simulado' o coincide con vuestro id de Supabase, permita editar)
  const isManager = school?.manager_id === 'simulado' || (user && school?.manager_id === user.id);

  const handleSave = async () => {
    setSchool(editForm);
    
    // Si no es un mock, lo guardamos de verdad en Supabase
    if (id !== 'micael' && id !== 'aravaca' && id !== 'artaban') {
      const { error } = await supabase
        .from('schools')
        .update({
          name: editForm.name,
          location: editForm.location,
          description: editForm.description,
          num_students: parseInt(editForm.num_students) || 0,
          stages: editForm.stages,
          activities: editForm.activities,
          images: editForm.images
        })
        .eq('id', id);
      
      if (error) console.error("Error al guardar en base de datos:", error);
    }
    setIsEditing(false);
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
  if (!school) return <div className="p-10 text-center text-muted-foreground">Centro no encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-4 px-4 animate-in fade-in duration-300">
      
      {/* BARRA SUPERIOR CON ACCIONES */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/colegios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Directorio
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

      {/* CABECERA ESTILO LINKEDIN (ESTO ES LO IMPORTANTE) */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm mb-8">
        
        {/* Banner de Portada alargado */}
        <div className="h-44 bg-muted relative overflow-hidden">
          <img 
            src={school.cover_url} 
            className="w-full h-full object-cover" 
            alt="portada" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        {/* Info del Colegio y Logo Superpuesto */}
        <div className="p-8 relative pt-20">
          
          {/* Logo superpuesto a la portada */}
          <div className="absolute -top-16 left-8">
            <img 
              src={school.avatar_url} 
              className="w-32 h-32 rounded-3xl border-8 border-card object-cover bg-muted shadow-lg" 
              alt="logo" 
            />
          </div>
          
          {!isEditing ? (
            <>
              <h1 className="font-cormorant text-4xl font-semibold text-foreground">{school.name}</h1>
              <p className="text-muted-foreground flex items-center gap-1.5 mt-2"><MapPin className="w-4 h-4 text-primary" /> {school.location}</p>
              <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-2xl">{school.description}</p>
            </>
          ) : (
            <div className="space-y-4 mt-2 max-w-xl">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Nombre</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Descripción</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full mt-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DETALLES Y PRODUCTOS (REJILLA MULTICOLUMNA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: DATOS MÉTRICOS Y ETAPAS (PRODUCTOS) */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Tarjeta de Datos Corporativos */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">Datos del Centro</h2>
            
            {/* Alumnos */}
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

            {/* Etapas educativas */}
            <div className="pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" /> Oferta Educativa</p>
              {!isEditing ? (
                <div className="flex flex-wrap gap-1.5">
                  {school.stages?.map((s, i) => (
                    <span key={i} className="bg-primary/5 text-primary border border-primary/10 text-[11px] font-medium px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
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

          {/* Tarjeta de Actividades */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /> Talleres y Proyectos</h2>
            <div className="flex flex-wrap gap-1.5">
              {(!isEditing ? school.activities : editForm.activities)?.map((a, i) => (
                <span key={i} className="bg-muted px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1">
                  {a}
                  {isEditing && (
                    <button onClick={() => setEditForm({...editForm, activities: editForm.activities.filter(act => act !== a)})} className="text-destructive font-bold ml-1 hover:text-destructive/80">×</button>
                  )}
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

        {/* COLUMNA DERECHA: GALERÍA AMPLIADA Y EVENTOS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Galería de Fotos */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-primary" /> Galería de Instalaciones ({(!isEditing ? school.images : editForm.images)?.length || 0})</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(!isEditing ? school.images : editForm.images)?.map((img, i) => (
                <div key={i} className="relative group rounded-2xl overflow-hidden border border-border h-32 bg-muted">
                  <img src={img} className="h-full w-full object-cover" alt="galeria" />
                  {isEditing && (
                    <button onClick={() => setEditForm({...editForm, images: editForm.images.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-destructive text-white p-1 rounded-full text-xs opacity-90 hover:opacity-100 shadow-sm">×</button>
                  )}
                </div>
              ))}
            </div>

            {isEditing && (
              <div className="flex gap-2 mt-4">
                <input value={newImage} onChange={e => setNewImage(e.target.value)} placeholder="Pegar URL de imagen de prueba..." className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs" />
                <button onClick={() => { if(newImage) { setEditForm({...editForm, images: [...(editForm.images || []), newImage]}); setNewImage(''); } }} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir Foto</button>
              </div>
            )}
          </div>

          {/* Eventos Vinculados */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-primary" /> Eventos Anunciados por el Centro</h2>
            <div className="space-y-4">
              {schoolEvents.length > 0 ? (
                schoolEvents.map(e => <SchoolEventCard key={e.id} event={e} />)
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-dashed border-border text-center">Este centro educativo no tiene eventos activos en cartelera.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}