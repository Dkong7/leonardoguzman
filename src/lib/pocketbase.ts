import PocketBase from 'pocketbase';

// Cambie la URL local por la IP del servidor
const url = import.meta.env.VITE_POCKETBASE_URL || 'http://209.126.77.41:8090';
const pb = new PocketBase(url);

pb.autoCancellation(false);

export default pb;