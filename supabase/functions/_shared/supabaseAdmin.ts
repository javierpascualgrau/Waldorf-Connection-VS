import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cliente con la service role key: ignora RLS a propósito. Solo se usa dentro de
// Edge Functions (nunca en el cliente) para escribir en `orders`/`seller_shipping_profiles`.
export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Verifica el JWT del usuario que hace la request (el mismo que ya usa el cliente con
// supabase.auth) y devuelve su identidad real. Nunca confiar en un email que venga en el body.
export async function getCallerUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const jwt = authHeader.replace("Bearer ", "");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}
