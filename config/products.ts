/**
 * Centralized product configuration
 * Ensures consistency across server and client
 */

export interface ProductConfig {
  price: number;
  name: string;
  description: string;
  expiryDays: number;
}

export const PRODUCTS: Record<string, ProductConfig> = {
  'vpn-3days': {
    price: 499, // in cents for Stripe
    name: 'VPN 3-Day Pass',
    description: 'Access to VPN service for 3 days',
    expiryDays: 3,
  },
  'vpn-7days': {
    price: 999,
    name: 'VPN Weekly Pass',
    description: 'Access to VPN service for 7 days',
    expiryDays: 7,
  },
  'vpn-14days': {
    price: 1699,
    name: 'VPN 14-Day Pass',
    description: 'Access to VPN service for 14 days',
    expiryDays: 14,
  },
  'vpn-30days': {
    price: 2999,
    name: 'VPN Monthly Pass',
    description: 'Access to VPN service for 30 days',
    expiryDays: 30,
  },
  'payment-guide': {
    price: 999,
    name: 'Payment Guide PDF',
    description: 'Complete payment guide with step-by-step instructions',
    expiryDays: 365,
  },
};

/**
 * Get product configuration by ID
 */
export function getProduct(productId: string): ProductConfig | null {
  return PRODUCTS[productId] || null;
}

/**
 * Get expiry days for a product
 */
export function getExpiryDaysForProduct(productId: string): number {
  return PRODUCTS[productId]?.expiryDays || 30;
}

/**
 * Get product name
 */
export function getProductName(productId: string): string {
  return PRODUCTS[productId]?.name || productId;
}

/**
 * Get product price in cents (for Stripe)
 */
export function getProductPrice(productId: string): number {
  return PRODUCTS[productId]?.price || 0;
}

/**
 * Get product description
 */
export function getProductDescription(productId: string): string {
  return PRODUCTS[productId]?.description || '';
}

/**
 * List all available products
 */
export function getAllProducts(): Record<string, ProductConfig> {
  return PRODUCTS;
}
