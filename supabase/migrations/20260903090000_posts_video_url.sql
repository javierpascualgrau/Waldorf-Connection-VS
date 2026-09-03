-- Permite adjuntar vídeo (además de imagen) a una publicación. Nullable y sin más
-- restricciones: la validación de duración/tamaño/formato se hace en el cliente antes de
-- subir el archivo al mismo bucket 'posts' que ya se usa para imágenes.
alter table public.posts
  add column video_url text;
