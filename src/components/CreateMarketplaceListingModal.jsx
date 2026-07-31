/* eslint-disable react/prop-types */
import { useState, useRef } from 'react';
import { X, MapPin, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

const CATEGORIES = [
  { value: 'material_escolar', label: 'Material escolar' },
  { value: 'ropa_uniforme', label: 'Ropa / Uniforme' },
  { value: 'instrumentos', label: 'Instrumentos' },
  { value: 'libros', label: 'Libros' },
  { value: 'juguetes', label: 'Juguetes' },
  { value: 'otro', label: 'Otro' },
];

export default function CreateMarketplaceListingModal({ user, identity, onClose, onCreated, editListing = null }) {
  const [listingType, setListingType] = useState(editListing?.listing_type || 'vendo');
  const [category, setCategory] = useState(editListing?.category || CATEGORIES[0].value);
  const [title, setTitle] = useState(editListing?.title || '');
  const [description, setDescription] = useState(editListing?.description || '');
  const [price, setPrice] = useState(editListing?.price != null ? String(editListing.price) : '');
  const [location, setLocation] = useState(editListing?.location || '');
  const [imageUrls, setImageUrls] = useState(editListing?.image_urls || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error al subir la imagen:', uploadError);
      alert('Hubo un error al subir la imagen.');
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from('posts').getPublicUrl(fileName);
    setImageUrls(prev => [...prev, data.publicUrl]);
    setUploadingImage(false);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);

    const listingData = {
      listing_type: listingType,
      category,
      title,
      description,
      price: listingType === 'vendo' && price ? parseFloat(price) : null,
      location,
      image_urls: imageUrls,
    };

    let error;
    if (editListing) {
      ({ error } = await supabase
        .from('marketplace_listings')
        .update(listingData)
        .eq('id', editListing.id));
    } else {
      ({ error } = await supabase
        .from('marketplace_listings')
        .insert([{
          ...listingData,
          author_id: user?.id || null,
          author_email: user?.email || '',
          author_name: identity?.name || user?.email?.split('@')[0] || 'Miembro de la comunidad',
          author_avatar: identity?.avatar || null,
        }]));
    }

    setLoading(false);

    if (error) {
      console.error('Error al guardar el anuncio:', error);
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
            {editListing ? 'Editar anuncio' : 'Nuevo anuncio'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setListingType('vendo')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                listingType === 'vendo' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent'
              }`}
            >
              Vendo
            </button>
            <button
              onClick={() => setListingType('busco')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                listingType === 'busco' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent'
              }`}
            >
              Busco
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={listingType === 'vendo' ? 'Ej: Vendo flauta de madera' : 'Ej: Busco leotardos talla 6'}
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

          <div className="mt-1">
            <label className="text-xs text-muted-foreground mb-1 block">Fotos</label>
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {imageUrls.map((url, i) => (
                  <div key={url + i} className="relative group rounded-xl overflow-hidden border border-border h-20 bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current.click()}
              disabled={uploadingImage}
              className="w-full flex items-center gap-2 justify-center py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploadingImage ? 'Subiendo...' : 'Añadir foto (opcional)'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
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

          <div className="grid grid-cols-2 gap-2">
            {listingType === 'vendo' && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                <span className="text-muted-foreground text-sm flex-shrink-0">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Precio (opcional)"
                  className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
            <div className={`flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 ${listingType !== 'vendo' ? 'col-span-2' : ''}`}>
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Zona (ej: Majadahonda)"
                className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || uploadingImage}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Guardando...' : editListing ? 'Guardar cambios' : 'Publicar anuncio'}
        </button>
      </div>
    </div>
  );
}
