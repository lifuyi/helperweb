import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Get Supabase client for server-side operations
 * Creates a new instance to ensure valid credentials
 */
function getSupabaseClient() {
  // Check both SUPABASE_URL and VITE_SUPABASE_URL (fallback for Vercel)
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase config check:', {
    hasUrl: !!url,
    hasKey: !!key,
    urlLength: url?.length || 0,
    keyLength: key?.length || 0,
    usedViteUrl: !process.env.SUPABASE_URL && !!process.env.VITE_SUPABASE_URL,
  });

  if (!url || !key) {
    console.error('Missing Supabase configuration:', {
      hasUrl: !!url,
      hasKey: !!key,
      urlEnvVars: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
    });
    throw new Error('Supabase configuration missing in environment variables');
  }

  return createClient(url, key);
}

/**
 * Ensure user exists in the users table
 * This is needed because sometimes the user might not be saved yet due to race conditions
 */
async function ensureUserExists(userId: string, supabase: any): Promise<boolean> {
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      console.log('User already exists:', userId);
      return true;
    }

    // If user doesn't exist, create a placeholder user
    console.log('User does not exist, creating placeholder user:', userId);
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: `user-${userId}@placeholder.local`,
        username: `User-${userId.slice(0, 8)}`,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating placeholder user:', insertError);
      return false;
    }

    console.log('Placeholder user created successfully');
    return true;
  } catch (error) {
    console.error('Error in ensureUserExists:', error);
    return false;
  }
}

/**
 * Helper function to create access tokens and purchase record
 */
async function handlePaymentSuccess(
  userId: string,
  productId: string,
  amount: number,
  currency: string,
  stripeSessionId: string,
  customerEmail?: string
) {
  try {
    console.log('handlePaymentSuccess called:', {
      userId,
      productId,
      amount,
      currency,
      stripeSessionId,
      customerEmail,
    });

    const supabase = getSupabaseClient();

    // 0. Ensure user exists
    console.log('Ensuring user exists...');
    const userExists = await ensureUserExists(userId, supabase);
    if (!userExists) {
      throw new Error('Failed to ensure user exists in database');
    }

    // 1. Save purchase record
    console.log('Saving purchase record...');
    const { data: purchase, error: purchaseError } = await supabase
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
      console.error('Error saving purchase - detailed:', {
        message: purchaseError.message,
        code: purchaseError.code,
        details: purchaseError.details,
        hint: purchaseError.hint,
      });
      throw purchaseError;
    }

    console.log('Purchase saved:', purchase);

    // 2. Create VPN client for VPN products FIRST (to get real expiration)
    const isVpnProduct = productId.startsWith('vpn-');
    console.log('[PAYMENT] Product type check:', { productId, isVpnProduct });
    
    let vpnExpiresAt: string | null = null;
    if (isVpnProduct) {
      console.log('Creating VPN client for product:', productId);
      try {
        // Prioritize Stripe customer email from checkout page
        let userEmailForVpn = customerEmail;
        
        // Only fallback to database email if Stripe email is not available
        if (!userEmailForVpn) {
          console.log('No Stripe customer email, fetching from database...');
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

          if (userError || !userData?.email) {
            console.error('Could not get user email for VPN creation:', userError);
            throw new Error('No email available for VPN client creation');
          }
          userEmailForVpn = userData.email;
        }
        
        console.log('Using email for VPN client:', userEmailForVpn);
        
        try {
          // Directly call the VPN creation function instead of HTTP API call
          // This avoids the serverless function self-call issue
          console.log('Importing vpnClientService from ../../../services/vpnClientService.js');
          const { createVpnClient } = await import('../../../services/vpnClientService.js');
          console.log('Successfully imported createVpnClient function');
          
          console.log('Calling createVpnClient with:', { 
            userId, 
            email: userEmailForVpn, 
            productId, 
            sessionId: stripeSessionId 
          });
          
          const vpnResult = await createVpnClient({
            userId,
            email: userEmailForVpn,
            productId,
            sessionId: stripeSessionId,
          });

          console.log('VPN creation result:', vpnResult);

          if (vpnResult.success) {
            console.log('✅ VPN client created successfully:', vpnResult.client?.id);
            // Use the real VPN expiration from X-UI
            vpnExpiresAt = vpnResult.client?.expires_at || null;
          } else {
            console.error('❌ Failed to create VPN client:', vpnResult.error, vpnResult.details);
          }
        } catch (importError) {
          console.error('❌ Failed to import or call vpnClientService:', importError);
          console.error('Import error stack:', importError.stack);
        }
      } catch (vpnError) {
        console.error('❌ Error creating VPN client:', vpnError);
        // Don't fail the entire payment if VPN creation fails
      }
    } else {
      console.log('[PAYMENT] Skipping VPN creation - not a VPN product:', productId);
    }

    // 3. Create access token with expiration based on product type
    const expiryDays = getExpiryDaysForProduct(productId);
    const now = new Date();

    // For VPN products: use the real expiration from X-UI
    // For other products (PDF guide): calculate expiration immediately
    let expiresAt: string | null = null;
    if (isVpnProduct) {
      // Use the VPN's actual expiration
      expiresAt = vpnExpiresAt;
    } else {
      // Today (purchase day) is FREE. Next X days are paid. Expires at 00:00 after paid days.
      // e.g., 3 days paid on Feb 6 -> expires Feb 10 00:00 (6 free, 7/8/9 are 3 paid days)
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + expiryDays + 1);
      expirationDate.setHours(0, 0, 0, 0);
      expiresAt = expirationDate.toISOString();
    }

    const token = generateAccessToken();
    console.log('Creating access token:', {
      productId,
      isVpnProduct,
      expiryDays,
      expiresAt: expiresAt ? `Set to ${expiresAt}` : 'NULL',
    });

    const { data: accessToken, error: tokenError } = await supabase
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
      console.error('Error creating access token - detailed:', {
        message: tokenError.message,
        code: tokenError.code,
        details: tokenError.details,
        hint: tokenError.hint,
      });
      throw tokenError;
    }

    console.log('Payment processed successfully:', {
      purchaseId: purchase.id,
      tokenId: accessToken.id,
      productId,
    });

    return { purchase, accessToken };
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

function getExpiryDaysForProduct(productId: string): number {
  const productDays: Record<string, number> = {
    'vpn-3days': 3,
    'vpn-7days': 7,
    'vpn-14days': 14,
    'vpn-30days': 30,
    'payment-guide': 365, // PDF guide doesn't expire
  };
  return productDays[productId] || 7;
}

function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function GET(request: Request) {
  console.log('🔔 PAYMENT CALLBACK STARTED');
  console.log('Request URL:', request.url);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    console.log('Payment callback received with sessionId:', sessionId);

    if (!sessionId) {
      console.error('No session_id in callback');
      return Response.json({ error: 'Missing session_id' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured in callback');
      return Response.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    console.log('Stripe session retrieved:', {
      payment_status: session.payment_status,
      metadata: session.metadata,
      amount: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      customer: session.customer,
      customerEmailFromCustomer: session.customer?.email,
    });

    if (session.payment_status === 'paid') {
      const productId = session.metadata?.productId as string;
      const userId = session.metadata?.userId as string;
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const currency = session.currency || 'usd';

      console.log('✅ Payment confirmed. Processing:', {
        productId,
        userId,
        amount,
        currency,
        metadata: session.metadata,
      });

      // Save purchase and create access token
      if (!userId) {
        console.error('❌ No userId in session metadata');
        return Response.json({ error: 'No userId in session metadata' }, { status: 400 });
      }

      if (!productId) {
        console.error('❌ No productId in session metadata');
        return Response.json({ error: 'No productId in session metadata' }, { status: 400 });
      }

      // Validate productId format
      const validProductPrefixes = ['vpn-', 'payment-guide'];
      const isValidProduct = validProductPrefixes.some(prefix => productId.startsWith(prefix));
      if (!isValidProduct) {
        console.error('❌ Invalid productId format:', productId);
        return Response.json({ error: 'Invalid productId format' }, { status: 400 });
      }

      try {
        console.log('🚀 Calling handlePaymentSuccess...');
        // Try to get email from customer_details first, then from expanded customer object
        const customerEmail = session.customer_details?.email || session.customer?.email;
        console.log('Using customer email:', customerEmail);
        await handlePaymentSuccess(
          userId, 
          productId, 
          amount, 
          currency, 
          sessionId, 
          customerEmail
        );
        console.log('✅ Payment processing completed successfully');
        // Use HTTP redirect instead of meta refresh
        return Response.redirect(
          new URL(`/payment/success?session_id=${sessionId}&product=${productId}`, request.url),
          302
        );
      } catch (error) {
        console.error('❌ Failed to save payment details:', error);
        return Response.json(
          { error: error instanceof Error ? error.message : 'Failed to save payment details' },
          { status: 500 }
        );
      }
    } else if (session.payment_status === 'unpaid') {
      console.log('Payment unpaid');
      return Response.json({ error: 'Payment unpaid' }, { status: 400 });
    }

    console.log('Payment status:', session.payment_status);
    return Response.json({ error: 'Payment pending' }, { status: 400 });
  } catch (error) {
    console.error('❌ Callback error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return Response.json(
      { error: error instanceof Error ? error.message : 'Callback processing failed' },
      { status: 500 }
    );
  }
}
