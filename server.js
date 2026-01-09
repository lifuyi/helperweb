import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/json' }));

// Product configuration
const productPrices = {
  'vpn-3days': { price: 499, name: 'VPN 3-Day Pass' },
  'vpn-7days': { price: 999, name: 'VPN Weekly Pass' },
  'vpn-14days': { price: 1699, name: 'VPN 14-Day Pass' },
  'vpn-30days': { price: 2999, name: 'VPN Monthly Pass' },
  'payment-guide': { price: 999, name: 'Payment Guide PDF' },
};

// Checkout API - POST to create a new session
app.post('/api/payment/checkout', async (req, res) => {
  try {
    const { productId, productType = 'one-time', successUrl, cancelUrl, currency = 'usd', promotionCode } = req.body;
    
    const product = productPrices[productId];
    if (!product) {
      return res.status(400).json({ error: 'Invalid product ID: ' + productId });
    }

    const sessionParams = {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: product.name,
              description: productId.startsWith('vpn') 
                ? 'Access to VPN service for ' + productId.replace('vpn-', '').replace('days', ' days') + ' days'
                : 'Complete payment guide with step-by-step instructions',
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      metadata: { productId, productType },
    };

    if (promotionCode) {
      sessionParams.discounts = [{ coupon: promotionCode }];
    }

    if (currency === 'cny') {
      sessionParams.payment_method_types = ['card', 'alipay', 'wechat_pay'];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create checkout session' });
  }
});

// Checkout API - GET to redirect to Stripe checkout
app.get('/api/payment/checkout', async (req, res) => {
  try {
    const { sid } = req.query;

    if (!sid) {
      return res.status(400).json({ error: 'Missing session ID (sid parameter)' });
    }

    const session = await stripe.checkout.sessions.retrieve(sid);
    if (session.url) {
      return res.redirect(session.url);
    } else {
      return res.status(400).json({ error: 'Session has no checkout URL' });
    }
  } catch (error) {
    console.error('Checkout GET error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve checkout session' });
  }
});

// Webhook API
app.post('/api/payment/notify/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event;
    if (sig && webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Payment successful:', event.data.object.id);
        break;
      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object.id);
        break;
      case 'customer.subscription.deleted':
        console.log('Subscription canceled:', event.data.object.id);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Callback API
app.get('/api/payment/callback', (req, res) => {
  const { session_id } = req.query;
  res.redirect('/payment/success?session_id=' + session_id);
});

// Serve static files from chinaconnect dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Serve index.html for all other routes (SPA fallback) - use RegExp instead of *
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<!DOCTYPE html><html><head><title>ChinaConnect</title></head><body><h1>ChinaConnect</h1><p>Please run "npm run build" first to build the app.</p><p>Then run "npm run server" to start the server.</p></body></html>');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
  console.log('API endpoints:');
  console.log('  POST /api/payment/checkout');
  console.log('  POST /api/payment/notify/stripe');
  console.log('  GET  /api/payment/callback');
});