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
    // Protección: Solo enviar si GA está inicializado correctamente
    try {
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    } catch (e) {
        console.warn("GA Send Error:", e);
    }
  }, [location]);

  return null;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/nardonardonardo" replace />;
};

const StudentRoute = ({ children }: { children: ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/login" replace />;
};

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  
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
  
  // --- INICIALIZACIÓN SEGURA DE GA4 ---
  useEffect(() => {
    try {
      // Reemplaza "G-TU-ID-REAL" con tu ID real, ej: "G-123456789"
      // Si no tienes ID aún, puedes dejarlo comentado o vacío para que no rompa
      const GA_ID = "G-TU-ID-REAL"; 
      
      if (GA_ID && GA_ID !== "G-TU-ID-REAL" && typeof ReactGA.initialize === 'function') {
          ReactGA.initialize(GA_ID);
          console.log("Analytics Initialized");
      }
    } catch (error) {
      console.error("Error inicializando Analytics:", error);
      // La app sigue funcionando aunque falle Analytics
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
                {/* PUBLICAS */}
                <Route path='/' element={<Hero />} />
                <Route path='/musica' element={<Musica />} />
                <Route path='/tienda' element={<Tienda />} />
                <Route path='/biografia' element={<Bio />} />
                <Route path='/conciertos' element={<Conciertos />} />
                <Route path='/booking' element={<Booking />} />
                <Route path='/carrito' element={<Carrito />} />
                
                {/* ACADEMIA */}
                <Route path='/clases' element={<Clases />} />
                <Route path='/clases/material' element={<TiendaAcademia />} />
                <Route path='/login' element={<LoginEstudiantes />} />
                <Route path='/aula' element={<StudentRoute><Aula /></StudentRoute>} />

                {/* ADMIN */}
                <Route path='/nardonardonardo' element={<Login />} />
                <Route path='/nardonardonardo/dashboard' element={<AdminRoute><Dashboard /></AdminRoute>} />

                {/* CATCH-ALL */}
                <Route path='/admin' element={<Navigate to="/" replace />} />
                <Route path='/dashboard' element={<Navigate to="/" replace />} />
                <Route path='*' element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App;