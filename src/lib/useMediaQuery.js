import { useEffect, useState } from 'react';

// Usado por Hilo.jsx para decidir en JS (no solo por CSS) en qué columna montar el panel
// de conversación, y evitar así tener dos instancias del mismo componente con estado
// compartido (p.ej. un ref) montadas a la vez en móvil y escritorio.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
