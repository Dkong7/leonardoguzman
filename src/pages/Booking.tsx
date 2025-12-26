const Booking = () => (
  <div className='pt-32 min-h-screen bg-nardo-950 flex justify-center px-4'>
     <div className='w-full max-w-2xl'>
        <h1 className='text-4xl font-serif font-bold text-white mb-8 text-center'>BOOKING & MANAGEMENT</h1>
        <form className='bg-nardo-900 p-8 rounded-xl border border-nardo-800 space-y-6'>
           <div>
              <label className='block text-xs font-bold text-nardo-500 uppercase tracking-widest mb-2'>Nombre</label>
              <input type="text" className='w-full bg-nardo-950 border border-nardo-800 rounded p-3 text-white focus:border-nardo-500 outline-none' />
           </div>
           <div>
              <label className='block text-xs font-bold text-nardo-500 uppercase tracking-widest mb-2'>Email</label>
              <input type="email" className='w-full bg-nardo-950 border border-nardo-800 rounded p-3 text-white focus:border-nardo-500 outline-none' />
           </div>
           <div>
              <label className='block text-xs font-bold text-nardo-500 uppercase tracking-widest mb-2'>Asunto (Concierto, Clase, Prensa)</label>
              <select className='w-full bg-nardo-950 border border-nardo-800 rounded p-3 text-white focus:border-nardo-500 outline-none'>
                 <option>Contratación para Concierto</option>
                 <option>Clase Magistral / Clínica</option>
                 <option>Clases Particulares</option>
                 <option>Prensa / Entrevista</option>
              </select>
           </div>
           <div>
              <label className='block text-xs font-bold text-nardo-500 uppercase tracking-widest mb-2'>Mensaje</label>
              <textarea rows={5} className='w-full bg-nardo-950 border border-nardo-800 rounded p-3 text-white focus:border-nardo-500 outline-none'></textarea>
           </div>
           <button className='w-full py-4 bg-nardo-500 text-white font-bold tracking-widest hover:bg-white hover:text-black transition-colors rounded'>ENVIAR MENSAJE</button>
        </form>
     </div>
  </div>
);
export default Booking;