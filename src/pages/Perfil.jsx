import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { User as UserIcon, MapPin, Edit3, Check, X, Camera, Loader2 } from 'lucide-react';
import PostCard from '@/components/PostCard';

const ROLES = [
  { value: 'alumno', label: 'Alumno' },
  { value: 'padre_madre', label: 'Padre / Madre' },
  { value: 'profesor', label: 'Profesor' },
  { value: 'exalumno', label: 'Exalumno' },
  { value: 'colegio', label: 'Colegio' },
  { value: 'simpatizante', label: 'Simpatizante' },
];

const INTERESTS = [
  'Arte', 'Música', 'Teatro', 'Carpintería', 'Naturaleza',
  'Filosofía', 'Euritmia', 'Agricultura biodinámica',
  'Pedagogía', 'Meditación', 'Tejido', 'Cerámica'
];

export default function Perfil() {
  const { user } = useAuth(); 
  const [profile, setProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setForm({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          role: profileData.role || 'simpatizante',
          location: profileData.location || '',
          interests: profileData.interests || [],
          avatar_url: profileData.avatar_url || '',
        });
      } else {
        setForm({
          display_name: user.email.split('@')[0],
          role: 'simpatizante',
          interests: [],
          avatar_url: '',
        });
      }

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('author_email', user.email)
        .order('created_date', { ascending: false });

      setMyPosts(postsData || []);
      setLoading(false);
    };

    loadData();
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error al subir el avatar:", uploadError);
      alert("Error al subir la imagen: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    
    setForm(f => ({ ...f, avatar_url: data.publicUrl }));
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...form,
        updated_at: new Date(),
      });

    if (!error) {
      setProfile({ ...profile, ...form });
      setEditing(false);
    } else {
      console.error("Error al guardar perfil:", error);
      alert("Error al guardar los cambios del perfil.");
    }
    setSaving(false);
  };

  const toggleInterest = (interest) => {
    const current = form.interests || [];
    if (current.includes(interest)) {
      setForm(f => ({ ...f, interests: current.filter(i => i !== interest) }));
    } else {
      setForm(f => ({ ...f, interests: [...current, interest] }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="flex-1 space-y-2 pt-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <UserIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-cormorant text-xl text-muted-foreground">Inicia sesión para ver tu perfil</p>
      </div>
    );
  }

  const displayName = profile?.display_name || user.email.split('@')[0];
  const roleLabel = ROLES.find(r => r.value === (profile?.role || 'simpatizante'))?.label;
  const initials = displayName.slice(0, 2).toUpperCase();
  const currentAvatarUrl = editing ? form.avatar_url : profile?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Profile card */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-5 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4 items-start">
            
            {/* Foto de perfil con botón flotante visible */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center border border-border">
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-cormorant text-2xl font-semibold text-primary">{initials}</span>
                )}
              </div>
              
              {/* Botón flotante en la esquina inferior derecha (SÓLO en modo edición) */}
              {editing && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md hover:bg-primary/90 transition-colors cursor-pointer z-10 flex items-center justify-center border border-card"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div>
              <h2 className="font-cormorant text-2xl font-semibold">{displayName}</h2>
              <span className="text-sm text-primary font-medium">{roleLabel}</span>
              {profile?.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{profile.location}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {profile?.bio && !editing && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{profile.bio}</p>
        )}

        {profile?.interests?.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {profile.interests.map(interest => (
              <span key={interest} className="text-[10px] uppercase tracking-wider bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-full">
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="space-y-4 mt-2 pt-4 border-t border-border">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nombre público</label>
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Biografía</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Cuéntanos un poco sobre ti..."
                className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 outline-none">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Ubicación</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ej: Madrid"
                  className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Intereses</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-all border ${
                      (form.interests || []).includes(interest)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving || uploadingAvatar}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-5 py-3 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mis publicaciones */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-cormorant text-xl font-semibold">Mis publicaciones</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{myPosts.length}</span>
      </div>
      
      {myPosts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Aún no has compartido nada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myPosts.map(post => (
            <PostCard key={post.id} post={post} userEmail={user?.email} likedIds={new Set()} />
          ))}
        </div>
      )}
    </div>
  );
}