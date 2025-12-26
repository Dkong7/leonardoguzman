import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Musica from './pages/Musica';
import Tienda from './pages/Tienda';
import Bio from './pages/Bio';
import Conciertos from './pages/Conciertos';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
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
          <Route path='/' element={<Home />} />
          <Route path='/musica' element={<Musica />} />
          <Route path='/tienda' element={<Tienda />} />
          <Route path='/biografia' element={<Bio />} />
          <Route path='/conciertos' element={<Conciertos />} />
          <Route path='/booking' element={<Booking />} />
          
          {/* Admin Routes */}
          <Route path='/nardonardonardo' element={<Login />} />
          <Route path='/nardonardonardo/dashboard' element={<Dashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
export default App;