import Stripe from 'stripe';
import { createVpnClient } from '../../../services/vpnClientService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  timeout: 30000,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export interface PaymentEvent {
  type: string;
  data: { object: unknown };
}

export async function handleStripeWebhook(event: PaymentEvent) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as unknown as Stripe.Checkout.Session;
      console.log('[WEBHOOK] checkout.session.completed received:', { 
        sessionId: session.id, 
        productId: session.metadata?.productId,
        customerEmail: session.customer_email 
      });

      // Extract data from session
      const userId = session.metadata?.userId;
      const productId = session.metadata?.productId;
      const customerEmail = session.customer_email;

      if (!userId || !productId || !customerEmail) {
        console.error('[WEBHOOK] Missing required metadata:', { userId, productId, customerEmail });
        throw new Error('Missing required session metadata');
      }

      console.log('[WEBHOOK] Creating VPN client for purchase...');
      const vpnResult = await createVpnClient({
        userId,
        email: customerEmail,
        productId,
        sessionId: session.id
      });

      if (vpnResult.success) {
        console.log('[WEBHOOK] VPN client created successfully:', vpnResult.client?.id);
      } else {
        console.error('[WEBHOOK] Failed to create VPN client:', vpnResult.error);
        throw new Error(`VPN creation failed: ${vpnResult.error}`);
      }

      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as Stripe.Subscription;
      console.log('[WEBHOOK] Subscription canceled:', subscription.id);
      break;
    }
    default:
      console.log('[WEBHOOK] Unhandled event type:', event.type);
  }
  return { success: true };
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured in webhook');
      return Response.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.warn('Missing signature or webhook secret');
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as unknown as PaymentEvent;
    const result = await handleStripeWebhook(event);
    return Response.json(result);
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}