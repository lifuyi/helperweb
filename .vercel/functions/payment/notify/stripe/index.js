// api/payment/notify/stripe/index.ts
import Stripe from "stripe";
var runtime = "nodejs";
var maxDuration = 60;
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
  timeout: 3e4
});
var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
async function handleStripeWebhook(event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("[WEBHOOK] checkout.session.completed received:", {
        sessionId: session.id,
        productId: session.metadata?.productId,
        customerEmail: session.customer_email
      });
      console.log("[WEBHOOK] Payment verified, VPN creation will be handled by callback");
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("[WEBHOOK] Subscription canceled:", subscription.id);
      break;
    }
    default:
      console.log("[WEBHOOK] Unhandled event type:", event.type);
  }
  return { success: true };
}
async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured in webhook");
      return Response.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 });
    }
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature || !webhookSecret) {
      console.warn("Missing signature or webhook secret");
      return Response.json({ error: "Missing signature or webhook secret" }, { status: 400 });
    }
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const result = await handleStripeWebhook(event);
    return Response.json(result);
  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
export {
  POST,
  handleStripeWebhook,
  maxDuration,
  runtime
};
