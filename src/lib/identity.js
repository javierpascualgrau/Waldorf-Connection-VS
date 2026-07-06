import { supabase } from '@/api/supabaseClient';

// Resuelve la identidad "real" de una cuenta comprobando, en este orden,
// las 3 tablas de perfil que existen en la app (mismo orden de prioridad
// que ya usa Hilo.jsx para resolver el interlocutor de un chat).
export async function getMemberIdentity(userId) {
  if (!userId) return null;

  const { data: school } = await supabase
    .from('school_profiles').select('*').eq('id', userId).maybeSingle();
  if (school) {
    return { name: school.name, avatar: school.avatar_url, role: 'colegio', email: school.school_email };
  }

  const { data: company } = await supabase
    .from('company_profiles').select('*').eq('id', userId).maybeSingle();
  if (company) {
    return { name: company.name, avatar: company.logo_url, role: 'empresa', email: company.company_email };
  }

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', userId).maybeSingle();
  if (profile) {
    return { name: profile.display_name, avatar: profile.avatar_url, role: profile.role, email: profile.user_email };
  }

  return null;
}
