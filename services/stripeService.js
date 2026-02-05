// services/stripeService.ts
var API_BASE = "/api/payment";
async function fetchWithTimeout(url, options, timeoutMs = 3e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Payment request timed out. Please check your connection and try again. This may take a moment.");
    }
    throw error;
  }
}
async function createCheckoutSession(params) {
  const { productId, productType = "one-time", promotionCode, currency = "usd", userId } = params;
  const successUrl = `${window.location.origin}/api/payment/callback?session_id={CHECKOUT_SESSION_ID}&product=${productId}`;
  const cancelUrl = `${window.location.origin}/?payment_canceled=true`;
  const response = await fetchWithTimeout(`${API_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      productId,
      productType,
      successUrl,
      cancelUrl,
      currency,
      promotionCode,
      userId
    })
  }, 3e4);
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("API error")) {
        throw e;
      }
      throw new Error(`API error ${response.status}: Failed to parse response`);
    }
  }
  return response.json();
}
function redirectToCheckout(sessionId) {
  window.location.href = `/api/payment/checkout?sid=${sessionId}`;
}
async function initiateCheckout(params) {
  const { productId, productType = "one-time", promotionCode, currency = "usd", userId } = params;
  const successUrl = `${window.location.origin}/api/payment/callback?session_id={CHECKOUT_SESSION_ID}&product=${productId}`;
  const cancelUrl = `${window.location.origin}/?payment_canceled=true`;
  let lastError = null;
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId,
          productType,
          successUrl,
          cancelUrl,
          currency,
          promotionCode,
          userId
        })
      }, 45e3 + attempt * 5e3);
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch (parseError) {
          console.log("Could not parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }
      const { sessionId } = await response.json();
      window.location.href = `/api/payment/checkout?sid=${sessionId}`;
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) {
        throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3 * attempt));
    }
  }
  throw lastError || new Error("Payment checkout failed");
}
var PRODUCTS = {
  vpn3Days: {
    id: "vpn-3days",
    name: "VPN 3-Day Pass",
    price: 4.99,
    type: "one-time",
    description: "Short trip access"
  },
  vpn7Days: {
    id: "vpn-7days",
    name: "VPN Weekly Pass",
    price: 9.99,
    type: "one-time",
    description: "Most popular for tourists"
  },
  vpn14Days: {
    id: "vpn-14days",
    name: "VPN 14-Day Pass",
    price: 16.99,
    type: "one-time",
    description: "Extended stay"
  },
  vpn30Days: {
    id: "vpn-30days",
    name: "VPN Monthly Pass",
    price: 29.99,
    type: "one-time",
    description: "Full month access"
  },
  paymentGuide: {
    id: "payment-guide",
    name: "Payment Guide PDF",
    price: 9.99,
    type: "one-time",
    description: "Complete step-by-step guide"
  }
};
export {
  PRODUCTS,
  createCheckoutSession,
  initiateCheckout,
  redirectToCheckout
};
