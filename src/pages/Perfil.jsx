import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, MapPin, Link2, Edit3, Check, X } from 'lucide-react';
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      if (u) {
        const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
        const existing = profiles[0] || null;
        setProfile(existing);
        setForm({
          display_name: existing?.display_name || u.full_name || '',
          bio: existing?.bio || '',
          role: existing?.role || 'simpatizante',
          location: existing?.location || '',
          school_name: existing?.school_name || '',
          website: existing?.website || '',
          interests: existing?.interests || [],
        });
        const posts = await base44.entities.Post.filter({ author_email: u.email });
        setMyPosts(posts);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, form);
    } else {
      await base44.entities.UserProfile.create({ ...form, user_email: user.email });
    }
    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    setProfile(profiles[0]);
    setEditing(false);
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
      <div className="space-y-4 animate-pulse">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="flex-1 space-y-2 pt-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
          <div className="h-3 bg-muted rounded w-full mb-2" />
          <div className="h-3 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-cormorant text-xl text-muted-foreground">Inicia sesión para ver tu perfil</p>
      </div>
    );
  }

  const displayName = profile?.display_name || user.full_name || 'Usuario';
  const roleLabel = ROLES.find(r => r.value === (profile?.role || 'simpatizante'))?.label;
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      {/* Profile card */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4 items-start">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="font-cormorant text-2xl font-semibold text-primary">{initials}</span>
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
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{profile.bio}</p>
        )}

        {profile?.interests?.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.interests.map(interest => (
              <span key={interest} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{interest}</span>
            ))}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="space-y-3 mt-2 pt-4 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sobre mí</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Cuéntanos quién eres..."
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Soy...</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ubicación</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Ciudad, país"
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Intereses</label>
              <div className="flex flex-wrap gap-1.5">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
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
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* My posts */}
      <h3 className="font-cormorant text-xl font-semibold mb-3">Mis publicaciones</h3>
      {myPosts.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground">Aún no has publicado nada</p>
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