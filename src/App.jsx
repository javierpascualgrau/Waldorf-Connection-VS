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
import Servicios from '@/pages/Servicios';
import Perfil from '@/pages/Perfil';
import Login from '@/pages/Login';
import PerfilPublico from '@/pages/PerfilPublico';
import SchoolProfile from './pages/SchoolProfile';
import Hilo from '@/pages/Hilo'; 
import EventDetail from './pages/EventDetail';
import ListingDetail from './pages/ListingDetail';

// 💡 IMPORTAMOS EL COMPONENTE DE EMPRESAS
import CompanyProfile from './pages/CompanyProfile'; 

const AuthenticatedApp = () => {
  const { user, isLoadingAuth } = useAuth();

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

  if (!user) {
    return <Login />;
  }

 return (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Feed />} />
      <Route path="/colegios" element={<Colegios />} />
      <Route path="/colegios/:id" element={<SchoolProfile />} />
      <Route path="/comunidad" element={<Comunidad />} />
      <Route path="/servicios" element={<Servicios />} />
      <Route path="/eventos/:id" element={<EventDetail />} />
      <Route path="/anuncios/:id" element={<ListingDetail />} />
      
      {/* 💡 AÑADIMOS LA RUTA PARA CARGAR EL PERFIL DE LAS EMPRESAS */}
      <Route path="/empresas/:id" element={<CompanyProfile />} />
      
      <Route path="/hilo" element={<Hilo />} /> 
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/usuario/:id" element={<PerfilPublico />} />
    </Route>
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