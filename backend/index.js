const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_tu_key_de_prueba');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  console.log("💰 Petición recibida para Stripe...");

  try {
    const { items, success_url, cancel_url } = req.body;
    
    const line_items = items.map(item => {
      // Monedas que no tienen decimales en Stripe
      const zeroDecimalCurrencies = ['cop', 'jpy', 'clp', 'pyg'];
      const currency = item.currency_id ? item.currency_id.toLowerCase() : 'cop';
      const isZeroDecimal = zeroDecimalCurrencies.includes(currency);
      
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.title || 'Producto',
          },
          unit_amount: isZeroDecimal ? Math.round(item.unit_price) : Math.round(item.unit_price * 100),
        },
        quantity: item.quantity || 1,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: success_url || 'https://www.google.com',
      cancel_url: cancel_url || 'https://www.google.com',
      customer_email: req.body.payer?.email || undefined,
    });

    console.log("✅ SESSION GENERADA:", session.url);
    res.json({ id: session.id, url: session.url });

  } catch (error) {
    console.error("❌ ERROR STRIPE:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 BACKEND STRIPE CORREGIDO EN PUERTO 3000');
});