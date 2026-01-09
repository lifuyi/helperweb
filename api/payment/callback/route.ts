import Stripe from 'stripe';

export const runtime = 'edge';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return Response.redirect('/?payment_error=no_session');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.redirect('/?payment_error=config_error');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    if (session.payment_status === 'paid') {
      const productId = session.metadata?.productId as string;
      return Response.redirect(`/payment/success?session_id=${sessionId}&product=${productId}`);
    } else if (session.payment_status === 'unpaid') {
      return Response.redirect('/?payment_error=canceled');
    }
    return Response.redirect('/?payment_error=pending');
  } catch (error) {
    return Response.redirect('/?payment_error=failed');
  }
}
