import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, School, Users, User, PlusCircle, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient'; 
import CreatePostModal from './CreatePostModal';

const navItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/colegios', icon: School, label: 'Colegios' },
  { path: '/comunidad', icon: Users, label: 'Comunidad' },
  { path: '/hilo', icon: MessageSquare, label: 'Hilo' }, 
  { path: '/perfil', icon: User, label: 'Mi Perfil' }, // Este lo interceptamos abajo
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // LA FUNCIÓN MÁGICA DE REDIRECCIÓN EN RUTAS REALES
  const handleMiPerfilClick = async (e) => {
    if (e) e.preventDefault(); // Evitamos que el enlace actúe de forma estática
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Buscamos si el usuario logueado es manager de algún colegio
      const { data: school } = await supabase
        .from('school_profiles')
        .eq('manager_id', user.id)
        .maybeSingle();

      if (school) {
        // Si es un colegio, lo mandamos a su vista profesional de school_profiles
        navigate(`/colegios/${school.id}`);
      } else {
        // Si es un usuario común, va a la ruta de perfil personal estándar
        navigate('/perfil'); 
      }
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
        
        let profileData = null;

        const { data: profById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        profileData = profById;

        if (!profileData) {
          const { data: profByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_email', authUser.email)
            .maybeSingle();
          profileData = profByEmail;
        }

        if (!profileData) {
          const { data: userProf } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();
          profileData = userProf;
        }

        if (profileData) {
          setUserProfile(profileData);
        }
      }
    };

    getSession();
  }, []);

  const mostrarBotonPublicar = location.pathname === '/' || location.pathname === '/perfil';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-cormorant font-semibold">W</span>
            </div>
            <span className="font-cormorant text-xl font-semibold text-foreground tracking-wide hidden sm:inline">Waldorf Connection</span>
          </Link>
          
          {mostrarBotonPublicar && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0 animate-fade-in"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Publicar</span>
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              const isProfile = path === '/perfil';
              
              const itemStyles = `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`;

              // SI ES EL BOTÓN DE MI PERFIL, INTERCEPTAMOS EL CLICK CON TU FUNCIÓN
              if (isProfile) {
                return (
                  <button key={path} onClick={handleMiPerfilClick} className={itemStyles}>
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                );
              }

              // PARA LOS DEMÁS BOTONES, SIGUE CON EL COMPORTAMIENTO NORMAL
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