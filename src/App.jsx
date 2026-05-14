import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from '@/components/Layout';
import Feed from '@/pages/Feed';
import Colegios from '@/pages/Colegios';
import Comunidad from '@/pages/Comunidad';
import Perfil from '@/pages/Perfil';
import Login from '@/pages/Login'; // Importamos tu nueva puerta de entrada

const AuthenticatedApp = () => {
  const { user, isLoadingAuth } = useAuth();

  // 1. Mientras Supabase comprueba si hay sesión, enseñamos el spinner
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="font-cormorant text-lg font-semibold text-primary">W</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // 2. Si NO hay usuario, solo mostramos la página de Login
  if (!user) {
    return <Login />;
  }

  // 3. Si SÍ hay usuario, mostramos todas las rutas protegidas
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Feed />} />
        <Route path="/colegios" element={<Colegios />} />
        <Route path="/comunidad" element={<Comunidad />} />
        <Route path="/perfil" element={<Perfil />} />
      </Route>
      {/* Si intentan ir a una ruta que no existe, volvemos al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;