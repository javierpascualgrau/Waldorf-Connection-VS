import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { X, Upload, Calendar, Clock, MapPin, AlignLeft, Type } from 'lucide-react';

export default function CreateSchoolEventModal({ onClose, onCreated, defaultSchoolName, defaultSchoolId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [mapLink, setMapLink] = useState('');
  
  // Estados para la gestión de la foto del evento
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FUNCIÓN PARA SUBIR LA FOTO DEL EVENTO A SUPABASE (Corregida)
  const handleUploadPhoto = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Guardamos en la carpeta eventos dentro de avatars
      const fileName = `eventos/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setImageUrl(data.publicUrl); // Usamos data.publicUrl en lugar de publicUrlData
    } catch (error) {
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // FUNCIÓN PRINCIPAL DE ENVÍO (Blindada contra cuelgues)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date) {
      alert('Por favor, rellena el título y la fecha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('school_events').insert([{
        title: title,
        description: description,
        date: date,
        time: time,
        location: location,
        map_link: mapLink,
        image_url: imageUrl,
        school_name: defaultSchoolName, // Automático: coge el nombre del perfil
        school_id: defaultSchoolId,     // Automático: coge el ID del perfil
        created_date: new Date().toISOString()
      }]);

      if (error) {
        console.error("Detalle del error de Supabase:", error);
        throw error; // Esto fuerza a que salte al catch y no se quede pillado
      }

      alert('¡Evento publicado con éxito en el tablón!');
      onCreated(); // Cierra el modal y refresca la lista
    } catch (error) {
      console.error('Error al insertar evento:', error);
      alert('Hubo un error al publicar el evento: ' + error.message);
    } finally {
      // ESTO ES CLAVE: Pase lo que pase (éxito o error), quita el estado "Publicando..."
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-left">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Nuevo evento del colegio</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Publicando como: <span className="font-bold text-primary">{defaultSchoolName}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1"><Type className="w-3.5 h-3.5" /> Título del evento *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej: Mercadillo de Primavera" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1"><AlignLeft className="w-3.5 h-3.5" /> Descripción detallada</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explica detalladamente de qué va el evento, talleres disponibles, precios si los hay..." className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none" />
          </div>

          {/* Fecha y Hora en paralelo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5" /> Fecha *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none text-foreground" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5" /> Hora de inicio</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none text-foreground" />
            </div>
          </div>

          {/* Lugar físico */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5" /> Dirección / Ubicación</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Calle de la Escuela, 14, Las Rozas" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>

          {/* Enlace al Mapa */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">Enlace de Google Maps</label>
            <input value={mapLink} onChange={e => setMapLink(e.target.value)} placeholder="Pega el enlace para abrir en GPS (opcional)" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>

          {/* SUBIR IMAGEN ASOCIADA */}
          <div className="pt-2">
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Fotografía promocional</label>
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-border h-32 bg-muted">
                <img src={imageUrl} className="h-full w-full object-cover" alt="Previsualización" />
                <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-destructive text-white p-1 rounded-full text-xs shadow-md">✕</button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{uploading ? 'Subiendo archivo...' : 'Haz clic para adjuntar foto'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-3 border-t border-border mt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || uploading} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold shadow-md flex items-center justify-center">
              {isSubmitting ? 'Publicando...' : 'Publicar Evento'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}