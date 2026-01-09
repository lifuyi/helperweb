export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  type: 'one-time' | 'subscription';
  description?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface CreateCheckoutParams {
  productId: string;
  productType?: 'one-time' | 'subscription';
  promotionCode?: string;
  currency?: string;
}

const API_BASE = '/api/payment';

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
  const { productId, productType = 'one-time', promotionCode, currency = 'usd' } = params;

  const successUrl = `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&product=${productId}`;
  const cancelUrl = `${window.location.origin}/?payment_canceled=true`;

  const response = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId,
      productType,
      successUrl,
      cancelUrl,
      currency,
      promotionCode,
    }),
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('API error')) {
        throw e;
      }
      throw new Error(`API error ${response.status}: Failed to parse response`);
    }
  }

  return response.json();
}

export function redirectToCheckout(sessionId: string): void {
  window.location.href = `/api/payment/checkout?sid=${sessionId}`;
}

export async function initiateCheckout(params: CreateCheckoutParams): Promise<void> {
  const { productId, productType = 'one-time', promotionCode, currency = 'usd' } = params;

  const successUrl = `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&product=${productId}`;
  const cancelUrl = `${window.location.origin}/?payment_canceled=true`;

  const response = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId,
      productType,
      successUrl,
      cancelUrl,
      currency,
      promotionCode,
    }),
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('API error')) {
        throw e;
      }
      throw new Error(`API error ${response.status}: Failed to parse response`);
    }
  }

  const { sessionId } = await response.json();
  window.location.href = `/api/payment/checkout?sid=${sessionId}`;
}

export const PRODUCTS = {
  vpn3Days: {
    id: 'vpn-3days',
    name: 'VPN 3-Day Pass',
    price: 4.99,
    type: 'subscription' as const,
    description: 'Short trip access',
  },
  vpn7Days: {
    id: 'vpn-7days',
    name: 'VPN Weekly Pass',
    price: 9.99,
    type: 'subscription' as const,
    description: 'Most popular for tourists',
  },
  vpn14Days: {
    id: 'vpn-14days',
    name: 'VPN 14-Day Pass',
    price: 16.99,
    type: 'subscription' as const,
    description: 'Extended stay',
  },
  vpn30Days: {
    id: 'vpn-30days',
    name: 'VPN Monthly Pass',
    price: 29.99,
    type: 'subscription' as const,
    description: 'Full month access',
  },
  paymentGuide: {
    id: 'payment-guide',
    name: 'Payment Guide PDF',
    price: 9.99,
    type: 'one-time' as const,
    description: 'Complete step-by-step guide',
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
