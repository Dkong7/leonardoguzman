import React from 'react'; // <--- Importante para los tipos
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import pb from './lib/pocketbase';

// Guard: Solo permite acceso si hay un token válido
// CAMBIO: Usamos React.ReactNode en lugar de JSX.Element para evitar el error de namespace
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  return pb.authStore.isValid ? <>{children}</> : <Navigate to="/" replace />;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  // Ocultamos navbar/footer en rutas administrativas
  const isAdmin = location.pathname.startsWith('/nardonardonardo');
  return (
    <div className='bg-nardo-950 text-nardo-100 min-h-screen font-sans flex flex-col'>
      {!isAdmin && <Navbar />}
      <main className="flex-grow">{children}</main>
      {!isAdmin && <Footer />}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Rutas Públicas */}
          <Route path='/' element={<Hero />} />
          <Route path='/musica' element={<Musica />} />
          <Route path='/tienda' element={<Tienda />} />
          <Route path='/biografia' element={<Bio />} />
          <Route path='/conciertos' element={<Conciertos />} />
          <Route path='/booking' element={<Booking />} />
          
          {/* Rutas Trampa / Honeypots (Redirigen a Home) */}
          <Route path='/login' element={<Navigate to="/" replace />} />
          <Route path='/admin' element={<Navigate to="/" replace />} />
          <Route path='/dashboard' element={<Navigate to="/" replace />} />
          <Route path='/wp-admin' element={<Navigate to="/" replace />} />

          {/* Rutas Administrativas Reales */}
          <Route path='/nardonardonardo' element={<Login />} />
          
          <Route path='/nardonardonardo/dashboard' element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          {/* Catch-all */}
          <Route path='*' element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
export default App;