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
 * Helper function to create access tokens and purchase record
 */
async function handlePaymentSuccess(
  userId: string,
  productId: string,
  amount: number,
  currency: string,
  stripeSessionId: string
) {
  try {
    console.log('handlePaymentSuccess called:', {
      userId,
      productId,
      amount,
      currency,
      stripeSessionId,
    });

    const supabase = getSupabaseClient();

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

    // 2. Create access token with expiration based on product
    const expiryDays = getExpiryDaysForProduct(productId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const token = generateAccessToken();
    console.log('Creating access token with expiry:', expiryDays, 'days, expires:', expiresAt.toISOString());
    
    const { data: accessToken, error: tokenError } = await supabase
      .from('access_tokens')
      .insert({
        user_id: userId,
        product_id: productId,
        token,
        expires_at: expiresAt.toISOString(),
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
    });

    if (session.payment_status === 'paid') {
      const productId = session.metadata?.productId as string;
      const userId = session.metadata?.userId as string;
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const currency = session.currency || 'usd';

      console.log('Payment confirmed. Processing:', {
        productId,
        userId,
        amount,
        currency,
      });

      // Save purchase and create access token
      if (!userId) {
        console.error('No userId in session metadata');
        return Response.json({ error: 'No userId in session metadata' }, { status: 400 });
      }
      
      if (!productId) {
        console.error('No productId in session metadata');
        return Response.json({ error: 'No productId in session metadata' }, { status: 400 });
      }

      try {
        await handlePaymentSuccess(userId, productId, amount, currency, sessionId);
        console.log('Payment processing completed successfully');
        // Return HTML that will redirect after a short delay, or use a meta refresh
        return new Response(
          `<html><head><meta http-equiv="refresh" content="0; url=/payment/success?session_id=${sessionId}&product=${productId}" /></head><body>Redirecting...</body></html>`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }
        );
      } catch (error) {
        console.error('Failed to save payment details:', error);
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
    console.error('Callback error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Callback processing failed' },
      { status: 500 }
    );
  }
}
