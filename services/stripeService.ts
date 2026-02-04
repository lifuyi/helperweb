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
  userId?: string;
}

const API_BASE = '/api/payment';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Payment request timed out. Please check your connection and try again. This may take a moment.');
    }
    throw error;
  }
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
  const { productId, productType = 'one-time', promotionCode, currency = 'usd', userId } = params;

  const successUrl = `${window.location.origin}/api/payment/callback?session_id={CHECKOUT_SESSION_ID}&product=${productId}`;
  const cancelUrl = `${window.location.origin}/?payment_canceled=true`;

  const response = await fetchWithTimeout(`${API_BASE}/checkout`, {
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
      userId,
    }),
  }, 30000);

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
  const { productId, productType = 'one-time', promotionCode, currency = 'usd', userId } = params;

  const successUrl = `${window.location.origin}/api/payment/callback?session_id={CHECKOUT_SESSION_ID}&product=${productId}`;
  const cancelUrl = `${window.location.origin}/?payment_canceled=true`;

  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/checkout`, {
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
          userId,
        }),
      }, 45000 + (attempt * 5000)); // Increase timeout with each retry

      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the error response, just use the status
          console.log('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const { sessionId } = await response.json();
      window.location.href = `/api/payment/checkout?sid=${sessionId}`;
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError || new Error('Payment checkout failed');
}

export const PRODUCTS = {
  vpn3Days: {
    id: 'vpn-3days',
    name: 'VPN 3-Day Pass',
    price: 4.99,
    type: 'one-time' as const,
    description: 'Short trip access',
  },
  vpn7Days: {
    id: 'vpn-7days',
    name: 'VPN Weekly Pass',
    price: 9.99,
    type: 'one-time' as const,
    description: 'Most popular for tourists',
  },
  vpn14Days: {
    id: 'vpn-14days',
    name: 'VPN 14-Day Pass',
    price: 16.99,
    type: 'one-time' as const,
    description: 'Extended stay',
  },
  vpn30Days: {
    id: 'vpn-30days',
    name: 'VPN Monthly Pass',
    price: 29.99,
    type: 'one-time' as const,
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
