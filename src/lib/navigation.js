// window.history.length cuenta también la carga inicial de la SPA: un valor bajo (<=2)
// normalmente significa que se entró directo por URL, sin navegación previa dentro de la
// app. En ese caso navigate(-1) puede acabar fuera del flujo (o en el catch-all a "/"), así
// que caemos a un fallback en vez de intentar retroceder un historial que no existe.
// `fallback` admite una ruta fija (string) o una función (p.ej. para volver a un estado
// interno de la propia página, como el listado de chats de Hilo.jsx, sin navegar de ruta).
export function goBack(navigate, fallback = '/servicios') {
  if (window.history.length > 2) {
    navigate(-1);
  } else if (typeof fallback === 'function') {
    fallback();
  } else {
    navigate(fallback);
  }
}
