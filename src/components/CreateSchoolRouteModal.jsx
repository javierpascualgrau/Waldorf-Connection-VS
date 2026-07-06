/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const TRIP_TYPES = [
  { value: 'ida', label: 'Ida' },
  { value: 'vuelta', label: 'Vuelta' },
  { value: 'ambos', label: 'Ida y vuelta' },
];

export default function CreateSchoolRouteModal({ user, identity, onClose, onCreated, editRoute = null }) {
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(editRoute?.school_id || '');
  const [tripType, setTripType] = useState(editRoute?.trip_type || 'ambos');
  const [location, setLocation] = useState(editRoute?.location || '');
  const [notes, setNotes] = useState(editRoute?.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSchools = async () => {
      const { data } = await supabase.from('school_profiles').select('id, name').order('name', { ascending: true });
      setSchools(data || []);
      if (!editRoute && data?.length && !schoolId) setSchoolId(data[0].id);
    };
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!schoolId) return;
    setLoading(true);

    const selectedSchool = schools.find(s => s.id === schoolId);
    const routeData = {
      school_id: schoolId,
      school_name: selectedSchool?.name || editRoute?.school_name || '',
      trip_type: tripType,
      location,
      notes,
    };

    let error;
    if (editRoute) {
      ({ error } = await supabase
        .from('school_routes')
        .update(routeData)
        .eq('id', editRoute.id));
    } else {
      ({ error } = await supabase
        .from('school_routes')
        .insert([{
          ...routeData,
          author_email: user?.email || '',
          author_name: identity?.name || user?.email?.split('@')[0] || 'Miembro de la comunidad',
          author_avatar: identity?.avatar || null,
        }]));
    }

    setLoading(false);

    if (error) {
      console.error('Error al guardar la ruta:', error);
      alert('Error al guardar: ' + error.message);
      return;
    }

    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-2xl font-semibold">
            {editRoute ? 'Editar ruta escolar' : 'Nueva ruta escolar'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Colegio *</label>
            <select
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trayecto que ofreces</label>
            <div className="flex gap-2">
              {TRIP_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTripType(t.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    tripType === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Zona donde vives (ej: Majadahonda)"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas (horarios, días, coche...)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Todos los días a las 8:30, tengo sitio para 2 niños más"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !schoolId}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Guardando...' : editRoute ? 'Guardar cambios' : 'Publicar ruta'}
        </button>
      </div>
    </div>
  );
}
