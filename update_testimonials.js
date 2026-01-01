const BASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'nardonardo@nardo.com';
const ADMIN_PASS = 'nardonardonardo'; 

const TESTIMONIOS_NUEVOS = [
    {
        autor: 'Jason Becker',
        texto: '¡Wow, Leonardo es extremadamente musical y creativo! Me encanta el uso innovador del slide en su meñique derecho, este es un solo muy emocionante y explosivo...',
        texto_en: 'Wow, Leonardo is extremely musical and creative! I love the innovative use of the slide on his right pinky, this is a very exciting and explosive solo...',
        orden: 1
    },
    {
        autor: 'Daniele Gottardo',
        texto: 'Wow, buenas ideas y creatividad, grandes ideas de tapping y sentido de la armonía sobre la progresión de acordes...',
        texto_en: 'Wow, nice ideas and creativity, great tapping ideas and sense of harmony over the chord progression...',
        orden: 2
    },
    {
        autor: 'Sean Carpenter',
        texto: 'Leonardo absolutamente se lució en este, técnica de solo demente y un hermoso final para rematar...',
        texto_en: 'Leonardo absolutely played the hell out of this one, insane solo technique and a beautiful outtro to top it off...',
        orden: 3
    },
    {
        autor: 'Laurie Monk',
        texto: 'Leonardo Guzmán continúa impresionando a los músicos con su técnica y estilo. Creo que es uno de los más impresionantes de la nueva ola de guitarristas globales.',
        texto_en: 'Leonardo Guzman continues to impress players with his technique and style. I think he is one of the impressive of the new wave of global guitar players.',
        orden: 4
    }
];

async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = token;
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    
    // Concatenación simple para evitar errores
    const res = await fetch(BASE_URL + endpoint, config);

    if (res.status === 204) return {}; 

    const json = await res.json();
    
    if (!res.ok) {
        throw new Error('Fallo en ' + endpoint + ': ' + JSON.stringify(json));
    }
    return json;
}

async function main() {
    console.log('🚀 Corrigiendo tildes y caracteres especiales...');
    
    try {
        const auth = await request('/api/admins/auth-with-password', 'POST', {
            identity: ADMIN_EMAIL, password: ADMIN_PASS
        });
        const token = auth.token;
        console.log('✅ Autenticado.');

        // Borramos los registros corruptos (con )
        const oldRecords = await request('/api/collections/testimonios/records?perPage=50', 'GET', null, token);
        for (const rec of oldRecords.items) {
            await request('/api/collections/testimonios/records/' + rec.id, 'DELETE', null, token);
        }
        console.log('🧹 Registros corruptos eliminados.');

        // Insertamos los limpios
        for (const item of TESTIMONIOS_NUEVOS) {
            await request('/api/collections/testimonios/records', 'POST', item, token);
        }
        console.log('✅ Nuevos testimonios insertados (UTF-8).');
        console.log('🏁 Base de datos reparada.');

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    }
}

main();
