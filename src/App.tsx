import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react'; 
import ReactGA from 'react-ga4'; 

import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';

import SpaceBackground from './components/SpaceBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Hero from './components/Hero'; 
import Musica from './pages/Musica';
import Tienda from './pages/Tienda';
import Bio from './pages/Bio';
import Conciertos from './pages/Conciertos';
import Booking from './pages/Booking';
import Carrito from './pages/Carrito';

// ACADEMIA
import Clases from './pages/Clases';
import TiendaAcademia from './pages/TiendaAcademia';
import LoginEstudiantes from './pages/LoginEstudiantes';
import Aula from './pages/Aula';

// ADMIN
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import pb from './lib/pocketbase';

// --- COMPONENTE RASTREADOR DE RUTAS ---
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      // react-ga4 maneja internamente si ya fue inicializado
      ReactGA.send({ 
        hitType: "pageview", 
        page: location.pathname + location.search 
      });
    } catch (e) {
      console.warn("GA Send Error:", e);
    }
  }, [location]);

  return null;
};

// Protección para rutas administrativas
const AdminRoute = ({ children }: { children: ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/nardonardonardo" replace />;
};

// Protección para rutas de estudiantes
const StudentRoute = ({ children }: { children: ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/login" replace />;
};

// Controlador de Layout para ocultar Navbar/Footer
const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  
  // Ocultar Navbar/Footer en el Dashboard Admin, Login y Aula
  const isStandalone = 
    location.pathname.startsWith('/nardonardonardo') || 
    location.pathname === '/login' ||
    location.pathname === '/aula' ||
    location.pathname === '/clases' || 
    location.pathname.startsWith('/clases/'); 
  
  return (
    <div className='min-h-screen font-sans flex flex-col bg-transparent text-white relative z-10'>
      {!isStandalone && <Navbar />}
      <main className="flex-grow">{children}</main>
      {!isStandalone && <Footer />}
    </div>
  );
};

function App() {
  
  // --- INICIALIZACIÓN DE GOOGLE ANALYTICS 4 ---
  useEffect(() => {
    try {
      const GA_ID = "G-8a85ba5727"; 
      
      // Verificamos de forma dinámica para evitar el error de TypeScript ts(2367)
      if (GA_ID && !GA_ID.includes("REAL")) {
          ReactGA.initialize(GA_ID);
          console.log("Analytics Initialized");
      }
    } catch (error) {
      console.error("Error inicializando Analytics:", error);
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          <BrowserRouter>
            <RouteTracker />
            
            <SpaceBackground />
            
            <Layout>
              <Routes>
                {/* RUTAS PÚBLICAS */}
                <Route path='/' element={<Hero />} />
                <Route path='/musica' element={<Musica />} />
                <Route path='/tienda' element={<Tienda />} />
                <Route path='/biografia' element={<Bio />} />
                <Route path='/conciertos' element={<Conciertos />} />
                <Route path='/booking' element={<Booking />} />
                <Route path='/carrito' element={<Carrito />} />
                
                {/* RUTAS ACADEMIA */}
                <Route path='/clases' element={<Clases />} />
                <Route path='/clases/material' element={<TiendaAcademia />} />
                <Route path='/login' element={<LoginEstudiantes />} />
                <Route path='/aula' element={<StudentRoute><Aula /></StudentRoute>} />

                {/* RUTAS ADMINISTRATIVAS */}
                <Route path='/nardonardonardo' element={<Login />} />
                <Route path='/nardonardonardo/dashboard' element={
                    <AdminRoute>
                        <Dashboard />
                    </AdminRoute>
                } />

                {/* REDIRECCIONES DE SEGURIDAD */}
                <Route path='/admin' element={<Navigate to="/nardonardonardo" replace />} />
                <Route path='/dashboard' element={<Navigate to="/nardonardonardo/dashboard" replace />} />
                
                {/* CATCH-ALL REDIRECT */}
                <Route path='*' element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;