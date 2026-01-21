import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
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
      console.log(`Payment completed for ${session.metadata?.productId}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as Stripe.Subscription;
      console.log(`Subscription canceled: ${subscription.id}`);
      break;
    }
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