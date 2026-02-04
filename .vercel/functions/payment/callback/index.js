// api/payment/callback/index.ts
import Stripe from "stripe";
var runtime = "nodejs";
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16"
});
async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return Response.redirect("/?payment_error=no_session");
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured in callback");
      return Response.redirect("/?payment_error=config_error");
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer"]
    });
    if (session.payment_status === "paid") {
      const productId = session.metadata?.productId;
      return Response.redirect(`/payment/success?session_id=${sessionId}&product=${productId}`);
    } else if (session.payment_status === "unpaid") {
      return Response.redirect("/?payment_error=canceled");
    }
    return Response.redirect("/?payment_error=pending");
  } catch (error) {
    console.error("Callback error:", error);
    return Response.redirect("/?payment_error=failed");
  }
}
export {
  GET,
  runtime
};
