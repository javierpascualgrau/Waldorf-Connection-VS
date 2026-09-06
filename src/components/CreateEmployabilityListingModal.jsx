/* eslint-disable react/prop-types */
import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const CATEGORIES = [
  { value: 'educacion', label: 'Educación' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'artes', label: 'Artes' },
  { value: 'retiros', label: 'Retiros' },
  { value: 'salud', label: 'Salud' },
];

export default function CreateEmployabilityListingModal({ user, identity, onClose, onCreated, editListing = null }) {
  const [category, setCategory] = useState(editListing?.category || CATEGORIES[0].value);
  const [title, setTitle] = useState(editListing?.title || '');
  const [description, setDescription] = useState(editListing?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);

    // 💡 Esta sección solo admite gente ofreciendo actividades, nunca "busco"
    const listingData = {
      listing_type: 'oferta',
      category,
      title,
      description,
    };

    let error;
    if (editListing) {
      ({ error } = await supabase
        .from('employability_listings')
        .update(listingData)
        .eq('id', editListing.id));
    } else {
      ({ error } = await supabase
        .from('employability_listings')
        .insert([{
          ...listingData,
          author_email: user?.email || '',
          author_name: identity?.name || user?.email?.split('@')[0] || 'Miembro de la comunidad',
          author_avatar: identity?.avatar || null,
        }]));
    }

    setLoading(false);

    if (error) {
      console.error('Error al guardar la oferta:', error);
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
            {editListing ? 'Editar publicación' : 'Nueva publicación'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Clases de euritmia a domicilio"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Añade más detalles..."
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Guardando...' : editListing ? 'Guardar cambios' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}
