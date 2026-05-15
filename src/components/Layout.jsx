import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, School, Users, User, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient'; // ¡Cambiado a Supabase!
import CreatePostModal from './CreatePostModal';
import ProfileSearch from './ProfileSearch';

const navItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/colegios', icon: School, label: 'Colegios' },
  { path: '/comunidad', icon: Users, label: 'Comunidad' },
  { path: '/perfil', icon: User, label: 'Mi Perfil' },
];

export default function Layout() {
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      // 1. Pedimos el usuario oficial a Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser(authUser);
        
        // 2. Intentamos buscar su perfil en la tabla de 'profiles'
        // NOTA: Asegúrate de que tu tabla en Supabase se llame 'profiles'
        const { data: profiles } = await supabase
          .from('profiles') 
          .select('*')
          .eq('user_email', authUser.email)
          .single();

        if (profiles) setUserProfile(profiles);
      }
    };

    getSession();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-cormorant font-semibold">W</span>
            </div>
            <span className="font-cormorant text-xl font-semibold text-foreground tracking-wide hidden sm:inline">Waldorf Connect</span>
          </Link>
          <ProfileSearch />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Publicar</span>
          </button>
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
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* El Modal ahora sí recibirá los datos reales */}
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