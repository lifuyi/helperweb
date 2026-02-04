import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { PRODUCTS, getProductDescription } from './config/products.js';

dotenv.config({ path: '.env.local' });

/**
 * Validate that all required environment variables are set
 */
function validateEnvironmentVariables() {
  const required = ['STRIPE_SECRET_KEY', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Validate that a URL is safe for Stripe redirects
 * Stripe requires absolute URLs (http:// or https://)
 */
function isValidRedirectUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    // Only allow safe protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    return true;
  } catch {
    // Not a valid absolute URL
    return false;
  }
}

// Validate environment on startup
validateEnvironmentVariables();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// 初始化 Supabase 服务器端客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/json' }));

// Product configuration is now centralized in config/products.ts
// Use PRODUCTS constant imported above

// Checkout API - POST to create a new session
app.post('/api/payment/checkout', async (req, res) => {
  try {
    const { productId, productType = 'one-time', successUrl, cancelUrl, currency = 'usd', promotionCode } = req.body;
    
    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // SECURITY: Validate redirect URLs - must be absolute URLs for Stripe
    try {
      new URL(successUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid success URL format' });
    }
    try {
      new URL(cancelUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid cancel URL format' });
    }

    // SECURITY: Reject dangerous protocols
    if (!successUrl.startsWith('http://') && !successUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Success URL must use http:// or https://' });
    }
    if (!cancelUrl.startsWith('http://') && !cancelUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Cancel URL must use http:// or https://' });
    }

    const sessionParams = {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: product.name,
              description: product.description,
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
    // SECURITY: Always require signature verification for webhooks
    if (!sig || !webhookSecret) {
      console.warn('Webhook signature verification failed: missing signature or secret');
      return res.status(400).json({ error: 'Missing webhook credentials' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.warn('Webhook signature verification failed:', err instanceof Error ? err.message : err);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Payment successful:', event.data.object.id);
        
        // Handle VPN product purchases
        await handleSuccessfulPayment(event.data.object);
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
    res.status(400).json({ error: 'Webhook processing error' });
  }
});

/**
 * Handle successful Stripe payment
 * Creates VPN client for VPN product purchases
 */
async function handleSuccessfulPayment(session) {
  try {
    const sessionId = session.id;
    const customerEmail = session.customer_details?.email;
    
    if (!customerEmail) {
      console.error('No customer email in session:', sessionId);
      return;
    }

    // Get product info from metadata
    const metadata = session.metadata || {};
    const productId = metadata.productId;
    const productType = metadata.productType;

    if (!productId) {
      console.log('No product ID in metadata for session:', sessionId);
      return;
    }

    // Only handle VPN products
    if (!productId.startsWith('vpn-')) {
      console.log('Non-VPN product, skipping:', productId);
      return;
    }

    console.log(`Processing VPN purchase: ${productId} for ${customerEmail}`);

    // Get user from Supabase by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', customerEmail)
      .single();

    if (userError || !user) {
      console.error('User not found for email:', customerEmail);
      return;
    }

    // Create VPN client
    const { createVpnClient } = await import('./services/vpnClientService.js');
    const result = await createVpnClient({
      userId: user.id,
      email: customerEmail,
      productId: productId,
      sessionId: sessionId
    });

    if (result.success) {
      console.log(`VPN client created successfully for ${customerEmail}`);
    } else {
      console.error(`Failed to create VPN client: ${result.error}`);
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

// Callback API
app.get('/api/payment/callback', (req, res) => {
  try {
    const { session_id } = req.query;
    
    // SECURITY: Validate session_id format (Stripe session IDs start with cs_)
    if (!session_id || typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    res.redirect('/payment/success?session_id=' + encodeURIComponent(session_id));
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(400).json({ error: 'Callback processing error' });
  }
});

// Auth Callback API - 处理Supabase OAuth回调
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      const errorMessage = error_description || error;
      return res.redirect(`/?auth_error=${encodeURIComponent(errorMessage)}`);
    }

    if (!code) {
      return res.redirect('/?auth_error=No authorization code received');
    }

    // 使用授权码交换会话
    if (!supabaseAdmin) {
      return res.redirect('/?auth_error=Supabase not configured');
    }

    const { data, error: exchangeError } = await supabaseAdmin.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.session) {
      return res.redirect(`/?auth_error=${encodeURIComponent(exchangeError?.message || 'Failed to exchange code for session')}`);
    }

    // 设置认证cookie或者重定向回前端
    // 注意：这里假设前端会通过localStorage或其他方式存储token
    const redirectUrl = new URL('/', req.headers.origin || 'http://localhost:3000');
    redirectUrl.searchParams.append('access_token', data.session.access_token);
    redirectUrl.searchParams.append('refresh_token', data.session.refresh_token);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect(`/?auth_error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
  }
});

// Serve static files from chinaconnect dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Serve index.html for all other routes (SPA fallback)
// Only serve index.html for routes that don't have a file extension (to avoid overriding static assets)
app.get('*', (req, res, next) => {
  // Skip /api routes - they should be handled by specific routes above
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return next();
  }
  
  // Don't serve index.html for requests with file extensions (static assets should be handled by express.static)
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  
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
  console.log('  GET  /auth/callback (Supabase OAuth)');
});