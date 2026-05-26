import { useState } from 'react';
import { X, MapPin, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/api/supabaseClient'; // 💡 MIGRADO: Importamos vuestro cliente de Supabase real

const EVENT_TYPES = [
  { value: 'mercadillo', label: 'Mercadillo' },
  { value: 'fiesta_trimestral', label: 'Fiesta Trimestral' },
  { value: 'obra_teatro', label: 'Obra de Teatro' },
  { value: 'jornada_puertas_abiertas', label: 'Puertas Abiertas' },
  { value: 'taller_familias', label: 'Taller Familias' },
  { value: 'festival', label: 'Festival' },
  { value: 'excursion', label: 'Excursión' },
  { value: 'charla', label: 'Charla' },
  { value: 'otro', label: 'Otro' },
];

export default function CreateSchoolEventModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({
    school_name: '',
    title: '',
    description: '',
    event_type: 'mercadillo',
    event_date: '',
    event_time: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.school_name || !form.title || !form.event_date) return;
    setLoading(true);
    
    // 💡 MIGRADO: Guardamos directamente en la tabla de Supabase school_events
    const { error } = await supabase
      .from('school_events')
      .insert([
        {
          ...form,
          school_email: user?.email || '',
          likes_count: 0,
          is_public: true,
        },
      ]);

    setLoading(false);

    if (!error) {
      onCreated();
    } else {
      console.error("Error al crear evento del colegio:", error);
      alert("Hubo un error al publicar el evento en la base de datos.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-2xl font-semibold">Nuevo evento del colegio</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nombre del colegio *</label>
            <input value={form.school_name} onChange={e => set('school_name', e.target.value)}
              placeholder="Ej: Colegio Waldorf El Roble"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título del evento *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ej: Mercadillo de Navidad 2026"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe el evento..."
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de evento</label>
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                className="bg-transparent text-sm flex-1 focus:outline-none text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input type="time" value={form.event_time} onChange={e => set('event_time', e.target.value)}
                className="bg-transparent text-sm flex-1 focus:outline-none text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="Dirección o lugar del evento"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !form.school_name || !form.title || !form.event_date}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Publicando...' : 'Publicar evento'}
        </button>
      </div>
    </div>
  );
}