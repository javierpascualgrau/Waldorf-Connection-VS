/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, ImagePlus, Loader2, Link as LinkIcon, Tag, Video } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';

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

const EVENT_CATEGORIES = ['Puertas Abiertas', 'Taller', 'Charla', 'Fiesta', 'Mercadillo', 'Otro'];
const OFFER_TYPES = ['Trabajo', 'Prácticas', 'Voluntariado'];

const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutos
const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024; // 300MB
const ACCEPTED_VIDEO_TYPES = ['video/mp4'];

// Lee la duración real del archivo de vídeo en el navegador (metadata) sin necesidad de
// subirlo primero — así se puede rechazar un vídeo demasiado largo antes de gastar ancho
// de banda subiéndolo al bucket.
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('No se pudo leer el archivo de vídeo.'));
    };
    video.src = URL.createObjectURL(file);
  });
}

export default function CreatePostModal({ user, userProfile, onClose, onCreated, editPost = null, editEvent = null, editOffer = null, editProduct = null, initialType = 'daily' }) {
  const [postType, setPostType] = useState(editPost ? 'daily' : editEvent ? 'event' : editOffer ? 'offer' : editProduct ? 'product' : initialType);
  const [identity, setIdentity] = useState(null);

  const [content, setContent] = useState(editPost?.content || editEvent?.description || editOffer?.description || editProduct?.description || '');
  const [title, setTitle] = useState(editEvent?.title || editOffer?.title || editProduct?.title || '');
  const [category, setCategory] = useState(editPost?.category || 'otro');
  const [eventCategory, setEventCategory] = useState(
    editEvent ? (EVENT_CATEGORIES.find(c => c.toLowerCase() === editEvent.event_type) || 'Otro') : 'Taller'
  );
  const [offerType, setOfferType] = useState(editOffer?.type || 'Trabajo');
  const [linkApply, setLinkApply] = useState(editOffer?.link_apply || '');
  const [price, setPrice] = useState(editProduct?.price ?? '');
  const [linkBuy, setLinkBuy] = useState(editProduct?.link_buy || '');
  const [location, setLocation] = useState(editPost?.location || editEvent?.location || editOffer?.location || '');
  const [eventDate, setEventDate] = useState(editPost?.event_date?.split('T')[0] || editEvent?.date || editEvent?.event_date || '');
  const [eventTime, setEventTime] = useState(editEvent?.time || editEvent?.event_time || '');
  const [isService, setIsService] = useState(editPost?.is_service_offer || false);
  const [imageUrl, setImageUrl] = useState(editPost?.image_url || editEvent?.image_url || editProduct?.image_url || '');
  const [imagePreview, setImagePreview] = useState(editPost?.image_url || editEvent?.image_url || editProduct?.image_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [videoUrl, setVideoUrl] = useState(editPost?.video_url || '');
  const [videoPreview, setVideoPreview] = useState(editPost?.video_url || '');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const videoFileRef = useRef();

  // 💡 Resolvemos la identidad real (colegio/empresa/perfil) al abrir el modal
  // para saber si hay que ofrecer el selector Día a día/Actividad + Evento futuro/Oportunidad/Producto
  useEffect(() => {
    if (!user?.id) return;
    getMemberIdentity(user.id).then(setIdentity);
  }, [user?.id]);

  const isSchool = identity?.role === 'colegio';
  const isCompany = identity?.role === 'empresa';
  const isEvent = postType === 'event';
  const isOffer = postType === 'offer';
  const isProduct = postType === 'product';

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoUrl('');
    setVideoPreview('');
    setUploadingImage(true);
    setImagePreview(URL.createObjectURL(file));

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error al subir la imagen:", uploadError);
      alert("Hubo un error al subir la imagen.");
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from('posts').getPublicUrl(fileName);
    setImageUrl(data.publicUrl);
    setUploadingImage(false);
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      alert('El vídeo debe estar en formato MP4 (H.264).');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      alert('El vídeo no puede superar los 300MB.');
      return;
    }

    let duration;
    try {
      duration = await readVideoDuration(file);
    } catch (err) {
      console.error('Error al leer la duración del vídeo:', err);
      alert('No se pudo leer el archivo de vídeo. Prueba con otro archivo.');
      return;
    }
    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      alert('El vídeo no puede durar más de 5 minutos.');
      return;
    }

    setImageUrl('');
    setImagePreview('');
    setUploadingVideo(true);
    setVideoPreview(URL.createObjectURL(file));

    const fileName = `${Math.random()}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error al subir el vídeo:', uploadError);
      alert('Hubo un error al subir el vídeo.');
      setUploadingVideo(false);
      return;
    }

    const { data } = supabase.storage.from('posts').getPublicUrl(fileName);
    setVideoUrl(data.publicUrl);
    setUploadingVideo(false);
  };

  const isValid = isEvent ? (title.trim() && eventDate) : isOffer ? (title.trim() && content.trim()) : isProduct ? title.trim() : content.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);

    // 1. Buscamos la identidad real (colegio/empresa/perfil) en tiempo real justo antes de
    // guardar para evitar datos obsoletos
    let freshIdentity = userProfile;
    if (user?.id) {
      const idn = await getMemberIdentity(user.id);
      if (idn) freshIdentity = idn;
    }

    if (isEvent) {
      const eventData = {
        title: title.trim(),
        description: content,
        event_type: eventCategory.toLowerCase(),
        date: eventDate,
        event_date: eventDate,
        time: eventTime || null,
        event_time: eventTime || null,
        location,
        image_url: imageUrl || null,
      };

      // Colegio o empresa dueño del evento (excluyentes, ver events_owner_check en la
      // base de datos). school_email/company_email se guardan aquí porque el trigger de
      // notificación a seguidores (user_follows) los necesita para saber a quién avisar.
      const ownerData = isCompany
        ? { company_name: freshIdentity?.name, company_id: user?.id, company_email: freshIdentity?.email, company_logo: freshIdentity?.avatar }
        : { school_name: freshIdentity?.name, school_id: user?.id, school_email: freshIdentity?.email, school_logo: freshIdentity?.avatar };

      const { error } = editEvent
        ? await supabase.from('events').update(eventData).eq('id', editEvent.id)
        : await supabase.from('events').insert([{
            ...eventData,
            ...ownerData,
            created_date: new Date().toISOString(),
          }]);

      setLoading(false);
      if (error) {
        console.error("Error al publicar el evento:", error);
        alert("Error al publicar el evento: " + error.message);
        return;
      }
      onCreated();
      return;
    }

    if (isOffer) {
      const offerData = {
        title: title.trim(),
        description: content,
        type: offerType,
        location: location || null,
        link_apply: linkApply || null,
      };

      const { error } = editOffer
        ? await supabase.from('company_offers').update(offerData).eq('id', editOffer.id)
        : await supabase.from('company_offers').insert([{
            ...offerData,
            company_id: user?.id,
            company_name: freshIdentity?.name,
          }]);

      setLoading(false);
      if (error) {
        console.error("Error al publicar la oportunidad:", error);
        alert("Error al publicar la oportunidad: " + error.message);
        return;
      }
      onCreated();
      return;
    }

    if (isProduct) {
      const productData = {
        title: title.trim(),
        description: content,
        price: price === '' ? null : Number(price),
        image_url: imageUrl || null,
        link_buy: linkBuy || null,
      };

      const { error } = editProduct
        ? await supabase.from('company_products').update(productData).eq('id', editProduct.id)
        : await supabase.from('company_products').insert([{
            ...productData,
            company_id: user?.id,
            company_name: freshIdentity?.name,
          }]);

      setLoading(false);
      if (error) {
        console.error("Error al publicar el producto:", error);
        alert("Error al publicar el producto: " + error.message);
        return;
      }
      onCreated();
      return;
    }

    const finalName = freshIdentity?.name ||
                     user?.user_metadata?.full_name ||
                     user?.user_metadata?.display_name ||
                     user?.email?.split('@')[0] ||
                     'Miembro de la comunidad';

    // 2. Empaquetamos los datos incluyendo el avatar fresquito
    const postData = {
      content,
      category,
      location,
      event_date: eventDate || null,
      is_service_offer: isService,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
      author_name: finalName,
      author_role: freshIdentity?.role || 'Comunidad',
      author_avatar: freshIdentity?.avatar || null, // Sincronización total del avatar
      type: 'daily',
    };

    if (editPost) {
      // ACTUALIZAR POST EXISTENTE (Ahora también le inyectará tu foto)
      const { error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', editPost.id);

      if (error) {
        console.error("Error al actualizar en Supabase:", error);
        alert("Bloqueo de seguridad: Supabase no te ha dejado editar este post.");
        setLoading(false);
        return;
      }
    } else {
      // CREAR POST NUEVO
      const { error } = await supabase
        .from('posts')
        .insert([{
          ...postData,
          author_email: user?.email || '',
          likes_count: 0,
          comments_count: 0,
          author_id: user?.id
        }]);

      if (error) {
        console.error("Error al guardar en base de datos:", error);
        alert("Error al publicar: " + error.message);
        setLoading(false);
        return;
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
            {editPost ? 'Editar publicación' : editEvent ? 'Editar evento' : editOffer ? 'Editar Oportunidad' : editProduct ? 'Editar Producto' : isEvent ? 'Nuevo evento' : isOffer ? 'Nueva Oportunidad' : isProduct ? 'Nuevo Producto' : 'Nueva publicación'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {(isSchool || isCompany) && !editPost && !editEvent && !editOffer && !editProduct && (
          <div className="flex gap-1.5 mb-4 bg-muted/50 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setPostType('daily')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${postType === 'daily' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {isCompany ? 'Actividad' : 'Día a día'}
            </button>
            {isCompany ? (
              <>
                <button
                  type="button"
                  onClick={() => setPostType('product')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${isProduct ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Producto
                </button>
                <button
                  type="button"
                  onClick={() => setPostType('offer')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${isOffer ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Oportunidad
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPostType('event')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${isEvent ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Evento futuro
              </button>
            )}
          </div>
        )}

        {(isEvent || isOffer || isProduct) && (
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">{isEvent ? 'Título del evento' : isOffer ? 'Título del puesto' : 'Nombre del producto'}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isEvent ? 'Ej: Mercadillo de Primavera' : isOffer ? 'Ej: Profesor de Carpintería de apoyo' : 'Ej: Vela de soja artesanal'}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={isEvent ? 'Describe el evento...' : isOffer ? 'Describe el puesto, requisitos, horario...' : isProduct ? 'Describe el producto...' : '¿Qué quieres compartir con la comunidad Waldorf?'}
          className="w-full bg-muted/50 rounded-2xl p-4 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />

        {!isOffer && (
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
            ) : videoPreview ? (
              <div className="relative">
                <video src={videoPreview} controls className="w-full rounded-xl max-h-48 bg-black" />
                {uploadingVideo && (
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => { setVideoPreview(''); setVideoUrl(''); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className={`grid gap-2 ${!isEvent && !isProduct ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 justify-center py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  Añadir imagen
                </button>
                {!isEvent && !isProduct && (
                  <button
                    onClick={() => videoFileRef.current.click()}
                    className="flex items-center gap-2 justify-center py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Añadir vídeo
                  </button>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <input ref={videoFileRef} type="file" accept="video/mp4" className="hidden" onChange={handleVideoChange} />
          </div>
        )}

        {!isProduct && (
          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">{isEvent ? 'Tipo de evento' : isOffer ? 'Tipo de oportunidad' : 'Categoría'}</label>
            <select
              value={isEvent ? eventCategory : isOffer ? offerType : category}
              onChange={e => isEvent ? setEventCategory(e.target.value) : isOffer ? setOfferType(e.target.value) : setCategory(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(isEvent ? EVENT_CATEGORIES.map(c => ({ value: c, label: c })) : isOffer ? OFFER_TYPES.map(c => ({ value: c, label: c })) : CATEGORIES).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        {isProduct && (
          <div className="mt-3 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Precio en € (opcional)"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        <div className={`mt-3 grid gap-2 ${(isOffer || isProduct) ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Lugar (opcional)"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          {!isOffer && !isProduct && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="bg-transparent text-sm flex-1 focus:outline-none text-muted-foreground"
              />
            </div>
          )}
        </div>

        {isProduct && (
          <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={linkBuy}
              onChange={e => setLinkBuy(e.target.value)}
              placeholder="Enlace de compra (opcional)"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {isOffer && (
          <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={linkApply}
              onChange={e => setLinkApply(e.target.value)}
              placeholder="Enlace de inscripción o email de contacto"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {isEvent && (
          <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="time"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
              className="bg-transparent text-sm flex-1 focus:outline-none text-muted-foreground"
            />
          </div>
        )}

        {!isEvent && !isOffer && !isProduct && (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setIsService(!isService)}
              className={`w-10 h-5 rounded-full transition-colors ${isService ? 'bg-primary' : 'bg-muted'} relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isService ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-muted-foreground">Ofrezco un servicio o taller</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || uploadingImage || uploadingVideo || !isValid}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Guardando...' : (editPost || editEvent || editOffer || editProduct) ? 'Guardar cambios' : isEvent ? 'Publicar Evento' : isOffer ? 'Publicar Oportunidad' : isProduct ? 'Publicar Producto' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}
