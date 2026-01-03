const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// TU TOKEN
const ACCESS_TOKEN = 'APP_USR-6875411157114734-010209-b36df770b45f0a72aa78e15405122b82-3102975181';

const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

app.post('/create_preference', async (req, res) => {
  console.log("💰 Petición recibida...");

  try {
    const { items } = req.body;
    
    const preference = new Preference(client);
    
    // CONFIGURACIÓN A PRUEBA DE FALLOS
    const result = await preference.create({
      body: {
        items: items,
        payer: {
            email: "test_user_1954@testuser.com" 
        },
        // URLs de retorno (Usamos HTTPS genérico para pasar la validación estricta por ahora)
        back_urls: {
          success: "https://www.google.com",
          failure: "https://www.google.com",
          pending: "https://www.google.com"
        },
        // COMENTADO: Desactivamos auto_return porque choca con localhost a veces
        // auto_return: "approved", 
      }
    });

    console.log("✅ LINK GENERADO:", result.init_point);
    res.json({ id: result.id, init_point: result.init_point });

  } catch (error) {
    console.error("❌ ERROR MP:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 BACKEND CORREGIDO EN PUERTO 3000');
});