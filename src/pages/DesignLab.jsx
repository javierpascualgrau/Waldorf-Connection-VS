import { useState } from 'react';
import { Home, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PostCard from '@/components/PostCard';

/*
 * /design-lab — sandbox de diseño, SOLO para desarrollo local.
 * - Registrada en App.jsx detrás de `import.meta.env.DEV`: no existe en el build de producción.
 * - No hay ningún <Link>/nav item que apunte aquí desde la app real; se accede tecleando la URL.
 * - No toca :root ni .dark: los tokens de la paleta viven bajo la clase .design-lab (src/index.css)
 *   y solo afectan a lo que se renderiza dentro de esta página.
 */

const PALETTES = {
  original: {
    label: 'Original',
    swatches: [
      { name: 'Mostaza', hex: '#FFDC5E', role: 'Secondary', className: 'bg-lab-mostaza' },
      { name: 'Amarillo Mikado', hex: '#FFC60A', role: 'Accent', className: 'bg-lab-amarillo' },
      { name: 'Naranja', hex: '#FF7805', role: 'Primary', className: 'bg-lab-naranja' },
      { name: 'Escarlata', hex: '#FF2A00', role: 'Ring / focus', className: 'bg-lab-escarlata' },
      { name: 'Rojo chile', hex: '#E3180D', role: 'Destructive', className: 'bg-lab-rojochile' },
    ],
  },
  pastel: {
    label: 'Pastel',
    swatches: [
      { name: 'Mostaza pastel', hex: '#FFECA6', role: 'Secondary', className: 'bg-lab-mostaza' },
      { name: 'Amarillo pastel', hex: '#FFE078', role: 'Accent', className: 'bg-lab-amarillo' },
      { name: 'Naranja pastel', hex: '#FFB576', role: 'Primary', className: 'bg-lab-naranja' },
      { name: 'Coral pastel', hex: '#FF8A73', role: 'Ring / focus', className: 'bg-lab-escarlata' },
      { name: 'Rosa salmón pastel', hex: '#F0807A', role: 'Destructive', className: 'bg-lab-rojochile' },
    ],
  },
};

const MOCK_POST = {
  id: 999999,
  content: 'Este es un post de ejemplo para probar la paleta de colores del Design Lab. Así se vería una publicación real del feed con estos tokens aplicados 🎨',
  author_name: 'Ana Etxeberria',
  author_role: 'padre_madre',
  category: 'General',
  created_date: new Date().toISOString(),
  likes_count: 12,
  comments_count: 3,
};

function ShowcaseSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignLab() {
  const [palette, setPalette] = useState('pastel');
  const active = PALETTES[palette];

  return (
    <div className="design-lab min-h-screen bg-background text-foreground" data-palette={palette}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h1 className="font-cormorant text-2xl font-semibold">Laboratorio de Diseño</h1>
            <Badge variant="outline" className="ml-auto">solo dev — no producción</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Componentes reales de la app (botón, tarjeta de feed, badge, input, item de navegación)
            renderizados con tokens de color intercambiables. La tipografía no cambia: sigue siendo
            Antropos / Cormorant Garamond.
          </p>

          <div className="inline-flex rounded-full border border-border bg-card p-1 gap-1">
            {Object.entries(PALETTES).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setPalette(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  palette === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        <ShowcaseSection title="Paleta activa">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {active.swatches.map((s) => (
              <div key={s.name} className="rounded-xl border border-border overflow-hidden bg-card">
                <div className={`h-14 ${s.className}`} />
                <div className="p-2">
                  <p className="text-xs font-medium leading-tight">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.hex} · {s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="Botones">
          <div className="flex flex-wrap gap-2">
            <Button>Publicar</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="destructive">Eliminar</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="Input">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="lab-input">Correo electrónico</Label>
            <Input id="lab-input" placeholder="tu@email.com" />
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="Item de navegación">
          <div className="flex gap-6 rounded-2xl border border-border bg-card p-3 w-fit">
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-primary">
              <Home className="w-5 h-5 stroke-[2.5px]" />
              <span className="text-[10px] font-medium">Inicio (activo)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground">
              <Home className="w-5 h-5 stroke-[1.5px]" />
              <span className="text-[10px] font-medium">Inactivo</span>
            </div>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="Tarjeta de feed (PostCard real)">
          <PostCard post={MOCK_POST} />
        </ShowcaseSection>

      </div>
    </div>
  );
}
