/* eslint-disable react/prop-types */

// Botón de acción compartido (Contactar / Solicitar unirse / Gestionar grupo / Eliminar...)
// para que las pantallas de detalle (RouteOfferDetail.jsx, ListingDetail.jsx) no repitan y
// desincronicen las mismas clases de Tailwind. No es el <Button> genérico de src/components/ui
// (ese sigue el sistema de tamaños de shadcn, sin caller real en la app) — este replica el
// patrón visual redondeado/pill que ya usan estas pantallas.
const VARIANT_STYLES = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 py-3.5 rounded-2xl',
  muted: 'bg-muted text-foreground hover:bg-muted/70 py-3.5 rounded-2xl',
  soft: 'bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-white disabled:hover:bg-primary/5 disabled:hover:text-primary py-3.5 rounded-2xl',
  destructive: 'text-destructive/80 hover:text-destructive py-2',
};

export default function ActionButton({ icon: Icon, children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`flex items-center justify-center gap-2 text-base font-semibold transition-all disabled:opacity-50 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}
