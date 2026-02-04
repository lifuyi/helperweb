// api/payment/checkout/index.ts
import Stripe from "stripe";
var runtime = "nodejs";
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16"
});
async function createCheckoutSession(data) {
  const { productId, productType, successUrl, cancelUrl, currency = "usd", promotionCode, userId } = data;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  const productPrices = {
    "vpn-3days": 499,
    "vpn-7days": 999,
    "vpn-14days": 1699,
    "vpn-30days": 2999,
    "payment-guide": 999
  };
  const productNames = {
    "vpn-3days": "VPN 3-Day Pass",
    "vpn-7days": "VPN Weekly Pass",
    "vpn-14days": "VPN 14-Day Pass",
    "vpn-30days": "VPN Monthly Pass",
    "payment-guide": "Payment Guide PDF"
  };
  const priceInCents = productPrices[productId];
  const productName = productNames[productId];
  if (!priceInCents) {
    throw new Error(`Invalid product ID: ${productId}`);
  }
  const sessionParams = {
    mode: productType === "subscription" ? "subscription" : "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: productName,
            description: productType === "subscription" ? `Access to VPN service for ${productId.replace("vpn-", "").replace("days", " days")}` : "Complete payment guide with step-by-step instructions"
          },
          unit_amount: priceInCents,
          recurring: productType === "subscription" ? {
            interval: "day",
            interval_count: parseInt(productId.replace("vpn-", "").replace("days", "")) || 7
          } : void 0
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    metadata: { productId, productType, ...userId && { userId } }
  };
  if (promotionCode) {
    sessionParams.discounts = [{ coupon: promotionCode }];
  }
  if (currency === "cny") {
    sessionParams.payment_method_types = ["card", "alipay", "wechat_pay"];
  }
  const session = await stripe.checkout.sessions.create(sessionParams);
  return { sessionId: session.id, url: session.url };
}
async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sid");
    if (!sessionId) {
      return Response.json({ error: "Missing session_id" }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.url) {
      return Response.redirect(session.url);
    }
    return Response.json({ error: "Session has no URL" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to redirect to checkout" },
      { status: 500 }
    );
  }
}
async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured");
      return Response.json({ error: "STRIPE_SECRET_KEY not configured in environment" }, { status: 500 });
    }
    const body = await request.json();
    console.log("Checkout request received:", {
      productId: body.productId,
      productType: body.productType,
      userId: body.userId,
      hasPromotionCode: !!body.promotionCode,
      currency: body.currency
    });
    const result = await createCheckoutSession(body);
    console.log("Checkout session created:", {
      sessionId: result.sessionId,
      hasUrl: !!result.url
    });
    return Response.json(result);
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
export {
  GET,
  POST,
  createCheckoutSession,
  runtime
};
