import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';

// --- IMPORTACIÓN DE CONTEXTOS (VITALES) ---
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';

// --- COMPONENTES ---
import SpaceBackground from './components/SpaceBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero'; 
import Musica from './pages/Musica';
import Tienda from './pages/Tienda';
import Bio from './pages/Bio';
import Conciertos from './pages/Conciertos';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Carrito from './pages/Carrito';
import pb from './lib/pocketbase';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/" replace />;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/nardonardonardo');
  
  return (
    // bg-transparent permite ver el SpaceBackground que está detrás
    <div className='min-h-screen font-sans flex flex-col bg-transparent text-white relative z-10'>
      {!isAdmin && <Navbar />}
      <main className="flex-grow">{children}</main>
      {!isAdmin && <Footer />}
    </div>
  );
};

function App() {
  return (
    // 1. EL PROVEEDOR DE TEMA DEBE ENVOLVER TODO PARA QUE SpaceBackground FUNCIONE
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          <BrowserRouter>
            
            {/* FONDO ANIMADO PERSISTENTE (Fuera del Layout para no re-renderizarse al cambiar de ruta) */}
            <SpaceBackground />
            
            <Layout>
              <Routes>
                <Route path='/' element={<Hero />} />
                <Route path='/musica' element={<Musica />} />
                <Route path='/tienda' element={<Tienda />} />
                <Route path='/biografia' element={<Bio />} />
                <Route path='/conciertos' element={<Conciertos />} />
                <Route path='/booking' element={<Booking />} />
                <Route path='/carrito' element={<Carrito />} />
                
                {/* Redirecciones de seguridad */}
                <Route path='/login' element={<Navigate to="/" replace />} />
                <Route path='/admin' element={<Navigate to="/" replace />} />
                <Route path='/dashboard' element={<Navigate to="/" replace />} />
                <Route path='/wp-admin' element={<Navigate to="/" replace />} />

                <Route path='/nardonardonardo' element={<Login />} />
                
                <Route path='/nardonardonardo/dashboard' element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } />

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