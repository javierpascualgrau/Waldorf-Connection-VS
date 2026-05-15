/* eslint-disable react/prop-types */
import { useState, useRef } from 'react';
import { X, MapPin, Calendar, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const CATEGORIES = [
  { value: 'taller', label: 'Taller' },
  { value: 'evento_espiritual', label: 'Evento Espiritual' },
  { value: 'educacion', label: 'Educación' },
  { value: 'arte', label: 'Arte' },
  { value: 'carpinteria', label: 'Carpintería' },
  { value: 'musica', label: 'Música' },
  { value: 'teatro', label: 'Teatro' },
  { value: 'naturaleza', label: 'Naturaleza' },
  { value: 'profesor_particular', label: 'Profesor Particular' },
  { value: 'asociacion', label: 'Asociación' },
  { value: 'otro', label: 'Otro' },
];

export default function CreatePostModal({ user, userProfile, onClose, onCreated, editPost = null }) {
  const [content, setContent] = useState(editPost?.content || '');
  const [category, setCategory] = useState(editPost?.category || 'otro');
  const [location, setLocation] = useState(editPost?.location || '');
  const [eventDate, setEventDate] = useState(editPost?.event_date?.split('T')[0] || '');
  const [isService, setIsService] = useState(editPost?.is_service_offer || false);
  const [imageUrl, setImageUrl] = useState(editPost?.image_url || '');
  const [imagePreview, setImagePreview] = useState(editPost?.image_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    setImagePreview(URL.createObjectURL(file));

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error al subir la imagen:", uploadError);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from('posts').getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setUploadingImage(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);

    const postData = {
      content,
      category,
      location,
      event_date: eventDate || null,
      is_service_offer: isService,
      image_url: imageUrl || null,
    };

    // Lógica para el nombre: 1. Perfil, 2. Nombre de Auth, 3. Nickname del email, 4. "Miembro"
    const finalName = userProfile?.display_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'Miembro de la comunidad';

    if (editPost) {
      const { error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', editPost.id);
        
      if (error) console.error("Error al actualizar:", error);
    } else {
      const { error } = await supabase
        .from('posts')
        .insert([{
          ...postData,
          author_email: user?.email || '',
          author_name: finalName,
          author_role: userProfile?.role || 'Comunidad',
          likes_count: 0,
          comments_count: 0,
          author_id: user?.id 
        }]);

      if (error) {
        console.error("Error al guardar en base de datos:", error);
      }
    }

    setLoading(false);
    onCreated(); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-2xl font-semibold">
            {editPost ? 'Editar publicación' : 'Nueva publicación'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="¿Qué quieres compartir con la comunidad Waldorf?"
          className="w-full bg-muted/50 rounded-2xl p-4 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />

        <div className="mt-3">
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="" className="w-full rounded-xl object-cover max-h-48" />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              <button
                onClick={() => { setImagePreview(''); setImageUrl(''); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current.click()}
              className="w-full flex items-center gap-2 justify-center py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Añadir imagen
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        <div className="mt-3">
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

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Lugar (opcional)"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="bg-transparent text-sm flex-1 focus:outline-none text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setIsService(!isService)}
            className={`w-10 h-5 rounded-full transition-colors ${isService ? 'bg-primary' : 'bg-muted'} relative`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isService ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-muted-foreground">Ofrezco un servicio o taller</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim() || uploadingImage}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Guardando...' : editPost ? 'Guardar cambios' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}