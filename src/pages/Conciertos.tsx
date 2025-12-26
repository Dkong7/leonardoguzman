import GigsWidget from '../components/GigsWidget';
const Conciertos = () => (
  <div className='pt-32 min-h-screen bg-nardo-950'>
    <div className='text-center mb-12'>
      <h1 className='text-6xl font-serif font-bold text-white mb-4'>TOUR <span className='text-nardo-500'>DATES</span></h1>
      <p className='text-gray-400 tracking-widest'>UPCOMING SHOWS & MASTERCLASSES AROUND THE WORLD</p>
    </div>
    <GigsWidget />
  </div>
);
export default Conciertos;