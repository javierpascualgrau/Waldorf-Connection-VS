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

// Igual que getMemberIdentity, pero resuelve por email en vez de por id — necesario para
// tablas como user_follows que solo guardan emails (follower_email/following_email), nunca
// uuids. Añade además `link`, la ruta de perfil a la que navegar para esa identidad.
export async function getIdentitiesByEmails(emails) {
  const cleanEmails = [...new Set((emails || []).map(e => e?.toLowerCase().trim()).filter(Boolean))];
  const result = new Map();
  if (cleanEmails.length === 0) return result;

  const [{ data: schools }, { data: companies }, { data: profiles }] = await Promise.all([
    supabase.from('school_profiles').select('id, name, avatar_url, school_email').in('school_email', cleanEmails),
    supabase.from('company_profiles').select('id, name, logo_url, company_email').in('company_email', cleanEmails),
    supabase.from('profiles').select('id, display_name, avatar_url, role, user_email').in('user_email', cleanEmails),
  ]);

  (profiles || []).forEach(p => {
    const email = p.user_email?.toLowerCase().trim();
    if (!email) return;
    result.set(email, { name: p.display_name, avatar: p.avatar_url, role: p.role, email, link: `/usuario/${encodeURIComponent(email)}` });
  });
  (companies || []).forEach(c => {
    const email = c.company_email?.toLowerCase().trim();
    if (!email) return;
    result.set(email, { name: c.name, avatar: c.logo_url, role: 'empresa', email, link: `/empresas/${c.id}` });
  });
  // Colegios tienen prioridad más alta, igual que en getMemberIdentity: se resuelven últimos
  // para poder sobrescribir cualquier coincidencia previa del mismo email.
  (schools || []).forEach(s => {
    const email = s.school_email?.toLowerCase().trim();
    if (!email) return;
    result.set(email, { name: s.name, avatar: s.avatar_url, role: 'colegio', email, link: `/colegios/${s.id}` });
  });

  return result;
}
