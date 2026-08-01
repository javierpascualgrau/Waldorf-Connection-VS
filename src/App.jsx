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
import EmployabilityDetail from './pages/EmployabilityDetail';
import DeliveryMethodChoice from './pages/DeliveryMethodChoice';
import ShippingCheckout from './pages/ShippingCheckout';
import MisVentas from './pages/MisVentas';
import MisCompras from './pages/MisCompras';
import BuscarRuta from './pages/BuscarRuta';
import GestionRuta from './pages/GestionRuta';
import GrupoRutaCalendario from './pages/GrupoRutaCalendario';
import MisRutas from './pages/MisRutas';

// 💡 IMPORTAMOS EL COMPONENTE DE EMPRESAS
import CompanyProfile from './pages/CompanyProfile';

// 🎨 Sandbox de diseño — solo dev, ver import.meta.env.DEV más abajo
import DesignLab from '@/pages/DesignLab';

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
      <Route path="/anuncios/:id/entrega" element={<DeliveryMethodChoice />} />
      <Route path="/anuncios/:id/envio" element={<ShippingCheckout />} />
      <Route path="/mis-ventas" element={<MisVentas />} />
      <Route path="/mis-compras" element={<MisCompras />} />
      <Route path="/empleo/:id" element={<EmployabilityDetail />} />
      <Route path="/rutas/buscar" element={<BuscarRuta />} />
      <Route path="/rutas/:id/gestionar" element={<GestionRuta />} />
      <Route path="/rutas/:id/calendario" element={<GrupoRutaCalendario />} />
      <Route path="/mis-rutas" element={<MisRutas />} />
      
      {/* 💡 AÑADIMOS LA RUTA PARA CARGAR EL PERFIL DE LAS EMPRESAS */}
      <Route path="/empresas/:id" element={<CompanyProfile />} />
      
      <Route path="/hilo" element={<Hilo />} />
      <Route path="/hilo/:chatId" element={<Hilo />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/usuario/:id" element={<PerfilPublico />} />
    </Route>

    {/* 🎨 /design-lab: sandbox visual, fuera de Layout a propósito (sin nav real ni datos reales).
        import.meta.env.DEV hace que Vite la elimine del bundle en `npm run build`. */}
    {import.meta.env.DEV && (
      <Route path="/design-lab" element={<DesignLab />} />
    )}

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