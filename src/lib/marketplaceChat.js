import { supabase } from '@/api/supabaseClient';

// Mismo mecanismo de "Contactar" que ya usa el resto de la app (ordenar los dos emails,
// upsert en chats con onConflict user_1_email,user_2_email — solo hay un chat por pareja
// de usuarios en todo el esquema), pero además etiqueta ese chat con el anuncio del que se
// está hablando. Reutilizado desde ListingDetail.jsx, DeliveryMethodChoice.jsx y
// ShippingCheckout.jsx para que "Contactar", "Quedar en persona" y "Chatear con el vendedor"
// abran siempre el mismo hilo contextualizado.
export async function openMarketplaceListingChat(userEmail, listing) {
  if (!userEmail || !listing?.author_email) return null;

  const emails = [userEmail.toLowerCase().trim(), listing.author_email.toLowerCase().trim()].sort();

  const { data } = await supabase
    .from('chats')
    .upsert(
      {
        user_1_email: emails[0],
        user_2_email: emails[1],
        context_type: 'marketplace_listing',
        context_id: listing.id,
      },
      { onConflict: 'user_1_email,user_2_email' }
    )
    .select()
    .single();

  return data;
}
