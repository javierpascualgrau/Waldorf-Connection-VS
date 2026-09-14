import { supabase } from '@/api/supabaseClient';

// Alterna qué está destacado en un perfil (personal/empresa/colegio). Al fijar una nueva
// destacada simplemente se sobreescriben estas dos columnas, así que la anterior queda
// automáticamente desmarcada sin ningún paso extra — "solo una destacada a la vez" es gratis.
export async function toggleFeatured({ table, ownerId, itemType, itemId, currentFeaturedId, currentFeaturedType }) {
  const isCurrentlyFeatured = String(currentFeaturedId) === String(itemId) && currentFeaturedType === itemType;

  const { error } = await supabase
    .from(table)
    .update(
      isCurrentlyFeatured
        ? { featured_post_id: null, featured_post_type: null }
        : { featured_post_id: itemId, featured_post_type: itemType }
    )
    .eq('id', ownerId);

  return { error, featured: isCurrentlyFeatured ? null : { featured_post_id: itemId, featured_post_type: itemType } };
}
