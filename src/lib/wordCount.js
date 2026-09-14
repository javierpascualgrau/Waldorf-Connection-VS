// Cuenta palabras de forma consistente en los 3 formularios de perfil (personal, empresa,
// colegio) que limitan la bio/descripción a 50 palabras.
export function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

export const MAX_BIO_WORDS = 50;
