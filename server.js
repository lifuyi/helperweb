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
    console.log('[PAYMENT] Checkout request started');
    const { productId, productType = 'one-time', successUrl, cancelUrl, currency = 'usd', promotionCode } = req.body;
    
    console.log('[PAYMENT] Request body:', { productId, productType, currency, hasPromotionCode: !!promotionCode });
    
    const product = PRODUCTS[productId];
    if (!product) {
      console.error('[PAYMENT] Invalid product ID:', productId);
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    console.log('[PAYMENT] Product found:', { productId, productName: product.name });

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
            unit_amount: product.price_cents,
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

    console.log('[PAYMENT] About to call Stripe API with params:', {
      mode: sessionParams.mode,
      currency: sessionParams.line_items[0]?.price_data?.currency,
      amount: sessionParams.line_items[0]?.price_data?.unit_amount,
      hasSuccessUrl: !!sessionParams.success_url,
      hasCancelUrl: !!sessionParams.cancel_url,
    });
    
    // Wrap Stripe call with a timeout to prevent hanging
    let session;
    try {
      const stripePromise = stripe.checkout.sessions.create(sessionParams);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Stripe API timeout after 25 seconds')), 25000)
      );
      session = await Promise.race([stripePromise, timeoutPromise]);
    } catch (stripeError) {
      console.error('[PAYMENT] Stripe API error:', {
        message: stripeError.message,
        type: stripeError.type,
        statusCode: stripeError.statusCode,
      });
      throw stripeError;
    }
    
    console.log('[PAYMENT] Stripe session created:', { sessionId: session.id, hasUrl: !!session.url });
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
app.get('/api/payment/callback', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    // SECURITY: Validate session_id format (Stripe session IDs start with cs_)
    if (!session_id || typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    console.log('[PAYMENT CALLBACK] Received callback for session:', session_id);
    
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'customer'],
    });

    console.log('[PAYMENT CALLBACK] Stripe session retrieved:', {
      payment_status: session.payment_status,
      metadata: session.metadata,
      amount: session.amount_total,
      currency: session.currency,
    });

    if (session.payment_status === 'paid') {
      const productId = session.metadata?.productId;
      const userId = session.metadata?.userId;
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const currency = session.currency || 'usd';

      console.log('[PAYMENT CALLBACK] Payment confirmed. Processing:', {
        productId,
        userId,
        amount,
        currency,
      });

      // Save purchase and create access token + VPN client
      if (!userId) {
        console.error('[PAYMENT CALLBACK] No userId in session metadata');
        return res.status(400).json({ error: 'No userId in session metadata' });
      }

      if (!productId) {
        console.error('[PAYMENT CALLBACK] No productId in session metadata');
        return res.status(400).json({ error: 'No productId in session metadata' });
      }

      try {
        await handlePaymentSuccess(userId, productId, amount, currency, session_id);
        console.log('[PAYMENT CALLBACK] Payment processing completed successfully');
      } catch (error) {
        console.error('[PAYMENT CALLBACK] Failed to save payment details:', error);
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save payment details' });
      }
    }
    
    res.redirect('/payment/success?session_id=' + encodeURIComponent(session_id));
  } catch (error) {
    console.error('[PAYMENT CALLBACK] Error:', error);
    res.status(400).json({ error: 'Callback processing error' });
  }
});

/**
 * Helper function to create access tokens and purchase record
 */
async function handlePaymentSuccess(
  userId,
  productId,
  amount,
  currency,
  stripeSessionId
) {
  try {
    console.log('[PAYMENT CALLBACK] handlePaymentSuccess called:', {
      userId,
      productId,
      amount,
      currency,
      stripeSessionId,
    });

    // 0. Ensure user exists
    console.log('[PAYMENT CALLBACK] Ensuring user exists...');
    const userExists = await ensureUserExists(userId);
    if (!userExists) {
      throw new Error('Failed to ensure user exists in database');
    }

    // 1. Save purchase record
    console.log('[PAYMENT CALLBACK] Saving purchase record...');
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: userId,
        product_id: productId,
        amount,
        currency,
        stripe_session_id: stripeSessionId,
        status: 'completed',
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('[PAYMENT CALLBACK] Error saving purchase:', purchaseError);
      throw purchaseError;
    }

    console.log('[PAYMENT CALLBACK] Purchase saved:', purchase);

    // 2. Create VPN client for VPN products FIRST (to get real expiration)
    const isVpnProduct = productId.startsWith('vpn-');
    let vpnExpiresAt = null;
    if (isVpnProduct) {
      console.log('[PAYMENT CALLBACK] Creating VPN client for product:', productId);
      try {
        // Get user email from Supabase
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();

        if (userError || !userData?.email) {
          console.error('[PAYMENT CALLBACK] Could not get user email for VPN creation:', userError);
        } else {
          try {
            // Call VPN API endpoint via HTTP instead of importing the service
            const apiBaseUrl = `http://localhost:${PORT}`;
            
            console.log('[PAYMENT CALLBACK] Calling VPN API endpoint:', `${apiBaseUrl}/api/vpn/create`);
            
            const response = await fetch(`${apiBaseUrl}/api/vpn/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                email: userData.email,
                productId,
                sessionId: stripeSessionId,
              }),
            });

            const vpnResult = await response.json();
            console.log('[PAYMENT CALLBACK] VPN API response:', vpnResult);

            if (vpnResult.success) {
              console.log('[PAYMENT CALLBACK] VPN client created successfully:', vpnResult.client?.id);
              // Use the real VPN expiration from X-UI
              vpnExpiresAt = vpnResult.client?.expires_at || null;
            } else {
              console.error('[PAYMENT CALLBACK] Failed to create VPN client:', vpnResult.error);
            }
          } catch (apiError) {
            console.error('[PAYMENT CALLBACK] Failed to call VPN API:', apiError);
          }
        }
      } catch (vpnError) {
        console.error('[PAYMENT CALLBACK] Error creating VPN client:', vpnError);
        // Don't fail the entire payment if VPN creation fails
      }
    }

    // 3. Create access token with expiration based on product type
    const expiryDays = getExpiryDaysForProduct(productId);
    const now = new Date();

    // For VPN products: use the real expiration from X-UI
    // For other products (PDF guide): calculate expiration immediately
    let expiresAt = null;
    if (isVpnProduct) {
      // Use the VPN's actual expiration
      expiresAt = vpnExpiresAt;
    } else {
      // Today (purchase day) is FREE. Next X days are paid. Expires at 00:00 after paid days.
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + expiryDays + 1);
      expirationDate.setHours(0, 0, 0, 0);
      expiresAt = expirationDate.toISOString();
    }

    const token = generateAccessToken();
    console.log('[PAYMENT CALLBACK] Creating access token:', {
      productId,
      isVpnProduct,
      expiryDays,
      expiresAt: expiresAt ? `Set to ${expiresAt}` : 'NULL',
    });

    const { data: accessToken, error: tokenError } = await supabaseAdmin
      .from('access_tokens')
      .insert({
        user_id: userId,
        product_id: productId,
        token,
        purchase_date: now.toISOString(),
        expires_at: expiresAt,
        activated_at: now.toISOString(), // VPN is immediately activated on payment
      })
      .select()
      .single();

    if (tokenError) {
      console.error('[PAYMENT CALLBACK] Error creating access token:', tokenError);
      throw tokenError;
    }

    console.log('[PAYMENT CALLBACK] Payment processed successfully:', {
      purchaseId: purchase.id,
      tokenId: accessToken.id,
      productId,
    });

    return { purchase, accessToken };
  } catch (error) {
    console.error('[PAYMENT CALLBACK] Error in handlePaymentSuccess:', error);
    throw error;
  }
}

/**
 * Ensure user exists in the users table
 */
async function ensureUserExists(userId) {
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      console.log('[PAYMENT CALLBACK] User already exists:', userId);
      return true;
    }

    // If user doesn't exist, create a placeholder user
    console.log('[PAYMENT CALLBACK] User does not exist, creating placeholder user:', userId);
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: `user-${userId}@placeholder.local`,
        username: `User-${userId.slice(0, 8)}`,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PAYMENT CALLBACK] Error creating placeholder user:', insertError);
      return false;
    }

    console.log('[PAYMENT CALLBACK] Placeholder user created successfully');
    return true;
  } catch (error) {
    console.error('[PAYMENT CALLBACK] Error in ensureUserExists:', error);
    return false;
  }
}

/**
 * Get expiry days for a product
 */
function getExpiryDaysForProduct(productId) {
  const productDays = {
    'vpn-3days': 3,
    'vpn-7days': 7,
    'vpn-14days': 14,
    'vpn-30days': 30,
    'payment-guide': 365,
  };
  return productDays[productId] || 7;
}

/**
 * Generate access token
 */
function generateAccessToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// VPN API Routes - for local development
app.post('/api/vpn/create', async (req, res) => {
  try {
    const { userId, email, productId, sessionId } = req.body;
    
    console.log('[VPN API] Create VPN client request:', { userId, email, productId });
    
    // Validate required fields
    if (!userId || !email || !productId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'email', 'productId']
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate product ID
    if (!productId.startsWith('vpn-')) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    // Import and call the VPN service
    const { createVpnClient } = await import('./services/vpnClientService.js');
    const result = await createVpnClient({
      userId,
      email,
      productId,
      sessionId: sessionId || ''
    });
    
    if (!result.success) {
      console.error('[VPN API] Failed to create VPN client:', result.error);
      return res.status(400).json({ 
        error: result.error,
        details: result.details,
        code: result.code
      });
    }
    
    console.log('[VPN API] VPN client created successfully:', result.client?.id);
    
    return res.status(200).json({
      success: true,
      client: {
        id: result.client?.id,
        vlessUrl: result.client?.vless_url,
        productId: result.client?.product_id,
        expiryDays: result.client?.expiry_days,
        status: result.client?.status,
      }
    });
  } catch (error) {
    console.error('[VPN API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/vpn/list', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const { getUserVpnClients } = await import('./services/vpnClientService.js');
    const clients = await getUserVpnClients(userId);
    
    return res.status(200).json({
      success: true,
      clients
    });
  } catch (error) {
    console.error('[VPN API] Error listing clients:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
app.get('/{*splat}', (req, res, next) => {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('\n📡 API endpoints:');
  console.log('  POST /api/payment/checkout');
  console.log('  POST /api/payment/notify/stripe');
  console.log('  GET  /api/payment/callback');
  console.log('  GET  /auth/callback (Supabase OAuth)');
  console.log('\n💡 For development, run:');
  console.log('   Terminal 1: npm run dev     (Vite on port 5173)');
  console.log('   Terminal 2: npm run server  (API server on port 3001)\n');
});