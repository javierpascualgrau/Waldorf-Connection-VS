// Detecta URLs en texto plano (http/https o www.) y las devuelve como nodos React,
// alternando texto normal y <a target="_blank">. No es un editor enriquecido: solo
// reconoce el patrón dentro de texto ya guardado como string.
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]'"]+$/;

export function linkify(text) {
  if (!text) return text;

  const parts = text.split(URL_PATTERN);

  return parts.map((part, i) => {
    if (!URL_PATTERN.test(part)) return part;
    URL_PATTERN.lastIndex = 0;

    const trailingMatch = part.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const url = trailing ? part.slice(0, -trailing.length) : part;
    const href = url.startsWith('www.') ? `https://${url}` : url;

    return (
      <span key={i}>
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {url}
        </a>
        {trailing}
      </span>
    );
  });
}
