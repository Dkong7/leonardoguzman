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

import Bio from './pages/Bio';

import Booking from './pages/Booking';
import Carrito from './pages/Carrito';

// ACADEMIA
import Clases from './pages/Clases';
import TiendaAcademia from './pages/TiendaAcademia';
import LoginEstudiantes from './pages/LoginEstudiantes';
import Aula from './pages/Aula';
import GuitarTracker from './pages/GuitarTracker';

// ADMIN
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import pb from './lib/pocketbase';

const GA = (ReactGA as any).default || ReactGA;

// --- COMPONENTE RASTREADOR DE RUTAS ---
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      // Google Analytics 4
      GA.send({ 
        hitType: "pageview", 
        page: location.pathname + location.search 
      });

      // Internal Pocketbase Analytics
      if (!location.pathname.startsWith('/nardonardonardo')) {
         
         const fetchGeoAndSave = async () => {
             let country = "Desconocido";
             let country_code = "";
             let city = "Desconocido";
             
             try {
                 const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
                 if (res.ok) {
                     const data = await res.json();
                     country = data.country || country;
                     country_code = data.country_code || country_code;
                     city = data.city || city;
                 }
             } catch (e) {}

             // Parse OS from user agent
             let os = "Desconocido";
             const ua = navigator.userAgent;
             if (ua.indexOf("Win") !== -1) os = "Windows";
             if (ua.indexOf("Mac") !== -1) os = "MacOS";
             if (ua.indexOf("Linux") !== -1) os = "Linux";
             if (ua.indexOf("Android") !== -1) os = "Android";
             if (ua.indexOf("like Mac") !== -1) os = "iOS";

             pb.collection('pageviews').create({
                path: location.pathname,
                referrer: document.referrer || 'Directo',
                user_agent: navigator.userAgent,
                country,
                country_code,
                city,
                os
             }).catch(() => {});
         };

         fetchGeoAndSave();
      }
    } catch (e) {
      console.warn('Analytics Error:', e);
    }
  }, [location]);

  return null;
};
const AdminRoute = ({ children }: { children: ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/nardonardonardo" replace />;
};

// ProtecciÃ³n para rutas de estudiantes
const StudentRoute = ({ children }: { children: ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/login" replace />;
};

// Controlador de Layout para ocultar Navbar/Footer
const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isAcademyPort = window.location.port === '8094' || window.location.hostname.includes('escuelaitinerantedelamusica');
  
  // Ocultar Navbar/Footer en el Dashboard Admin, Login y Aula
  const isStandalone = 
    location.pathname.startsWith('/nardonardonardo') || 
    location.pathname === '/login' ||
    location.pathname === '/aula' ||
    location.pathname.toLowerCase().startsWith('/guitartracker') ||
    location.pathname === '/clases' || 
    location.pathname.startsWith('/clases/') ||
    (isAcademyPort && (location.pathname === '/' || location.pathname.startsWith('/material'))); 
  
    useEffect(() => {
    const handleContextMenu = (e: any) => e.preventDefault();
    const handleKeyDown = (e: any) => {
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85) || 
        (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.metaKey && e.keyCode === 85)
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className='min-h-[100vh] w-full font-sans flex flex-col bg-transparent text-white relative z-10 overflow-hidden' style={{ minHeight: '100dvh' }}>
      {!isStandalone && <Navbar />}
            {isStandalone && (
        <div 
            className="fixed top-[-100vh] left-[-100vw] right-[-100vw] bottom-[-100vh] z-[-2]" 
            style={{ backgroundColor: location.pathname.includes('/nardonardonardo') ? '#fdfbf7' : location.pathname.includes('login') ? '#000000' : '#faf8ff' }} 
        />
      )}
      {!isStandalone && <SpaceBackground />}
        <main className="flex-grow">{children}</main>
      {!isStandalone && <Footer />}
    </div>
  );
};

function App() {
  const isAcademyPort = window.location.port === '8094' || window.location.hostname.includes('escuelaitinerantedelamusica');
  
  // --- INICIALIZACIÃ“N DE GOOGLE ANALYTICS 4 ---
  useEffect(() => {
    try {
      const GA_ID = "G-8a85ba5727"; 
      
      // Verificamos de forma dinÃ¡mica para evitar el error de TypeScript ts(2367)
      if (GA_ID && !GA_ID.includes("REAL")) {
          GA.initialize(GA_ID);
          console.log("Analytics Initialized");
      }
    } catch (error) {
      console.error("Error inicializando Analytics:", error);
    }
  }, []);

    useEffect(() => {
    const handleContextMenu = (e: any) => e.preventDefault();
    const handleKeyDown = (e: any) => {
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85) || 
        (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.metaKey && e.keyCode === 85)
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          <BrowserRouter>
            <RouteTracker />
            
            
            
            <Layout>
              <Routes>
                {/* RUTAS PÃšBLICAS */}
                <Route path='/' element={isAcademyPort ? <Clases /> : <Hero />} />
                <Route path='/musica' element={<Musica />} />
                <Route path='/tienda' element={<Navigate to="/" replace />} />
                <Route path='/biografia' element={<Bio />} />
                <Route path='/conciertos' element={<Navigate to="/" replace />} />
                <Route path='/booking' element={<Booking />} />
                <Route path='/carrito' element={<Carrito />} />
                
                {/* RUTAS ACADEMIA */}
                <Route path='/clases' element={isAcademyPort ? <Navigate to="/" replace /> : <Clases />} />
                <Route path='/material' element={isAcademyPort ? <TiendaAcademia /> : <Navigate to="/clases/material" replace />} />
                <Route path='/clases/material' element={isAcademyPort ? <Navigate to="/material" replace /> : <TiendaAcademia />} />
                <Route path='/login' element={<LoginEstudiantes />} />
                <Route path='/aula' element={<StudentRoute><Aula /></StudentRoute>} />
                <Route path='/guitarTracker' element={<GuitarTracker />} />
                <Route path='/guitartracker' element={<GuitarTracker />} />
                <Route path='/nardonardonardo/guitarTracker' element={<GuitarTracker />} />
                <Route path='/nardonardonardo/guitartracker' element={<GuitarTracker />} />

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

