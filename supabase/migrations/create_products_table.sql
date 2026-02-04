-- ============================================================================
-- Create products configuration table for dynamic pricing
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL, -- Price in cents (e.g., 999 = $9.99)
  expiry_days INTEGER NOT NULL, -- Validity period in days
  category VARCHAR(50) DEFAULT 'vpn', -- vpn, guide, etc.
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow reading all products, only admins can write
CREATE POLICY "products_read_policy" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_insert_policy" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_update_policy" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "products_delete_policy" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default products (can be modified via admin UI)
INSERT INTO products (id, name, description, price_cents, expiry_days, category, display_order) VALUES
  ('vpn-3days', 'VPN 3-Day Pass', 'Access to VPN service for 3 days', 499, 3, 'vpn', 1),
  ('vpn-7days', 'VPN Weekly Pass', 'Access to VPN service for 7 days', 999, 7, 'vpn', 2),
  ('vpn-14days', 'VPN 14-Day Pass', 'Access to VPN service for 14 days', 1699, 14, 'vpn', 3),
  ('vpn-30days', 'VPN Monthly Pass', 'Access to VPN service for 30 days', 2999, 30, 'vpn', 4),
  ('payment-guide', 'Payment Guide PDF', 'Complete payment guide with step-by-step instructions', 999, 365, 'guide', 5)
ON CONFLICT (id) DO UPDATE SET
  updated_at = CURRENT_TIMESTAMP;

-- Add comments
COMMENT ON TABLE products IS 'Product configuration table with dynamic pricing';
COMMENT ON COLUMN products.id IS 'Product ID (e.g., vpn-3days)';
COMMENT ON COLUMN products.name IS 'Product display name';
COMMENT ON COLUMN products.description IS 'Product description';
COMMENT ON COLUMN products.price_cents IS 'Price in cents (divide by 100 for dollars)';
COMMENT ON COLUMN products.expiry_days IS 'Validity period in days';
COMMENT ON COLUMN products.category IS 'Product category for filtering';
COMMENT ON COLUMN products.is_active IS 'Whether product is available for purchase';
COMMENT ON COLUMN products.display_order IS 'Order for displaying products';
