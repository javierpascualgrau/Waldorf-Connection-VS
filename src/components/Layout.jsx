import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, School, Users, User, PlusCircle, MessageSquare, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';
import CreatePostModal from './CreatePostModal';

const navItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/colegios', icon: School, label: 'Colegios' },
  { path: '/comunidad', icon: Users, label: 'Comunidad' },
  { path: '/servicios', icon: ShoppingBag, label: 'Servicios' },
  { path: '/perfil', icon: User, label: 'Mi Perfil' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [schoolId, setSchoolId] = useState(null); // 💡 NUEVO: Guardamos el ID del colegio si el usuario lo es

  const handleMiPerfilClick = async (e) => {
    if (e) e.preventDefault(); 
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: school } = await supabase
        .from('school_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (school) {
        navigate(`/colegios/${school.id}`);
        return;
      }

      const { data: company } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (company) {
        navigate('/perfil');
        return;
      }

      navigate('/perfil'); 
    } catch (error) {
      console.error("Error al redireccionar perfil:", error);
      navigate('/login');
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser(authUser);

        const identity = await getMemberIdentity(authUser.id);

        // 💡 El id del colegio es el propio uid de la cuenta cuando la identidad resuelta es un colegio
        if (identity?.role === 'colegio') {
          setSchoolId(authUser.id);
        }

        if (identity) {
          setUserProfile(identity);
        }
      }
    };

    getSession();
  }, []);

  // 💡 También se muestra en el perfil propio del colegio (misma cabecera, mismo botón)
  const mostrarBotonPublicar = location.pathname === '/' || location.pathname === '/perfil' || (schoolId && location.pathname === `/colegios/${schoolId}`);
  const mostrarBotonHilo = location.pathname === '/';
  // Mensajes necesita más ancho que el resto de páginas para el layout de dos columnas
  // en escritorio (lista de hilos + conversación) — excepción puntual al max-w-2xl del resto.
  const isMessagesRoute = location.pathname.startsWith('/hilo');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-cormorant font-semibold">W</span>
            </div>
            <span className="font-cormorant text-xl font-semibold text-foreground tracking-wide hidden sm:inline">Waldorf Live</span>
          </Link>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {mostrarBotonHilo && (
              <Link
                to="/hilo"
                className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors animate-fade-in"
                aria-label="Hilo"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
            )}

            {mostrarBotonPublicar && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors animate-fade-in"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Publicar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 mx-auto w-full px-4 py-4 pb-24 ${isMessagesRoute ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isProfile = path === '/perfil';
              const isColegios = path === '/colegios';
              
              // 💡 REGLAS DE ILUMINACIÓN INTELIGENTE:
              let isActive = location.pathname === path;

              if (isProfile) {
                // "Mi Perfil" se ilumina en su ruta base o si estás viendo TU perfil de colegio
                isActive = location.pathname === '/perfil' || (schoolId && location.pathname === `/colegios/${schoolId}`);
              } else if (isColegios) {
                // "Colegios" se ilumina si empieza por /colegios pero NO es tu propia página
                const isOwnSchoolPage = schoolId && location.pathname === `/colegios/${schoolId}`;
                isActive = location.pathname.startsWith('/colegios') && !isOwnSchoolPage;
              }
              
              const itemStyles = `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`;

              if (isProfile) {
                return (
                  <button key={path} onClick={handleMiPerfilClick} className={itemStyles}>
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                );
              }

              return (
                <Link key={path} to={path} className={itemStyles}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {showCreateModal && (
        <CreatePostModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}