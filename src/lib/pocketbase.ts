import PocketBase from 'pocketbase';

// Cambie la URL local por la IP del servidor
const url = import.meta.env.VITE_POCKETBASE_URL || window.location.origin;
const pb = new PocketBase(url);

pb.autoCancellation(false);

export default pb;
