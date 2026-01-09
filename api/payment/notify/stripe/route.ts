import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export interface PaymentEvent {
  type: string;
  data: {
    object: unknown;
  };
}

export async function handleStripeWebhook(event: PaymentEvent) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as unknown as Stripe.Checkout.Session;
      const productId = session.metadata?.productId as string;
      const customerEmail = session.customer_details?.email || '';
      const paymentIntentId = session.payment_intent as string;

      console.log(`Payment completed for ${productId} by ${customerEmail}`);
      
      return { success: true, message: 'Payment processed successfully' };
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as unknown as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      
      console.log(`Subscription payment succeeded: ${subscriptionId}`);
      
      return { success: true, message: 'Subscription renewed' };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      
      console.log(`Subscription payment failed: ${subscriptionId}`);
      
      return { success: true, message: 'Payment failure recorded' };
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as unknown as Stripe.Subscription;
      
      console.log(`Subscription updated: ${subscription.id}`);
      
      return { success: true, message: 'Subscription updated' };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as Stripe.Subscription;
      
      console.log(`Subscription canceled: ${subscription.id}`);
      
      return { success: true, message: 'Subscription canceled' };
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
      return { success: true, message: 'Event ignored' };
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return Response.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: PaymentEvent;

    try {
      event = Stripe.Webhooks.constructEvent(body, signature, webhookSecret) as PaymentEvent;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return Response.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const result = await handleStripeWebhook(event);

    return Response.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}