/**
 * Centralized product configuration
 * Now fetches from database with client-side caching
 * Fallback to hardcoded defaults if database is unavailable
 */

// Default products (fallback)
const DEFAULT_PRODUCTS = {
  'vpn-3days': {
    price_cents: 499,
    name: 'VPN 3-Day Pass',
    description: 'Access to VPN service for 3 days',
    expiry_days: 3,
  },
  'vpn-7days': {
    price_cents: 999,
    name: 'VPN Weekly Pass',
    description: 'Access to VPN service for 7 days',
    expiry_days: 7,
  },
  'vpn-14days': {
    price_cents: 1699,
    name: 'VPN 14-Day Pass',
    description: 'Access to VPN service for 14 days',
    expiry_days: 14,
  },
  'vpn-30days': {
    price_cents: 2999,
    name: 'VPN Monthly Pass',
    description: 'Access to VPN service for 30 days',
    expiry_days: 30,
  },
  'payment-guide': {
    price_cents: 999,
    name: 'Payment Guide PDF',
    description: 'Complete payment guide with step-by-step instructions',
    expiry_days: 365,
  },
};

// In-memory cache for products
let productsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get products from database (with caching)
 */
export async function loadProductsFromDatabase() {
  try {
    // Return cached products if still valid
    if (productsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return productsCache;
    }

    // Dynamically import Supabase client only when needed
    const { supabase } = await import('./services/supabaseService.js').then(m => m).catch(() => null);
    
    if (!supabase) {
      console.warn('Supabase client not available, using default products');
      return DEFAULT_PRODUCTS;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Transform database format to expected format
    const products = {};
    if (data && Array.isArray(data)) {
      data.forEach(product => {
        products[product.id] = {
          price_cents: product.price_cents,
          name: product.name,
          description: product.description,
          expiry_days: product.expiry_days,
        };
      });
    }

    // Update cache
    productsCache = products;
    cacheTimestamp = Date.now();

    return products;
  } catch (error) {
    console.error('Error loading products from database:', error);
    return DEFAULT_PRODUCTS;
  }
}

// Use default products initially
export let PRODUCTS = DEFAULT_PRODUCTS;

// Load products from database asynchronously
if (typeof window !== 'undefined') {
  loadProductsFromDatabase().then(products => {
    PRODUCTS = products;
  });
}

/**
 * Get product configuration by ID
 */
export function getProduct(productId) {
  return PRODUCTS[productId] || null;
}

/**
 * Get expiry days for a product
 */
export function getExpiryDaysForProduct(productId) {
  return PRODUCTS[productId]?.expiry_days || 30;
}

/**
 * Get product name
 */
export function getProductName(productId) {
  return PRODUCTS[productId]?.name || productId;
}

/**
 * Get product price in cents (for Stripe)
 */
export function getProductPrice(productId) {
  return PRODUCTS[productId]?.price_cents || 0;
}

/**
 * Get product description
 */
export function getProductDescription(productId) {
  return PRODUCTS[productId]?.description || '';
}

/**
 * List all available products
 */
export function getAllProducts() {
  return PRODUCTS;
}

/**
 * Get all products with description (for display)
 */
export function getAllProductsWithDescription() {
  return Object.entries(PRODUCTS).map(([id, product]) => ({
    id,
    ...product,
  }));
}
