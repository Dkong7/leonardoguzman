import PocketBase from 'pocketbase';

// Usamos la URL local por defecto si no hay variable de entorno
const url = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(url);

// ESTA LÍNEA ES LA CLAVE PARA ARREGLAR EL ERROR "NO DEFAULT EXPORT"
export default pb;
