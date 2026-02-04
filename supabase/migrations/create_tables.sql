-- ============================================================================
-- Supabase 数据库架构
-- 创建用户表、访问令牌表和用户档案表
-- ============================================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 表 1: users (用户信息表)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以加快查询
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ============================================================================
-- 表 2: access_tokens (访问令牌表)
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  product_id VARCHAR(255) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_product_id ON access_tokens(product_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at);

-- ============================================================================
-- 表 3: user_profiles (用户档案表 - 统计用户购买情况)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  purchase_count INTEGER DEFAULT 0,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 表 4: purchases (购买记录表 - 可选)
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'usd',
  stripe_session_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'completed', -- completed, pending, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session_id ON purchases(stripe_session_id);

-- ============================================================================
-- RLS (行级安全) 策略 - 禁用以允许应用程序逻辑处理权限
-- ============================================================================

-- 注意：生产环境应该启用 RLS，但对于初始开发禁用以便调试
-- 启用 RLS - 但所有策略都是宽松的
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- 宽松的策略 - 允许所有身份验证用户进行操作
-- users 表
CREATE POLICY "Allow all authenticated users to insert" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- access_tokens 表
CREATE POLICY "Allow all authenticated users to insert" ON access_tokens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read" ON access_tokens
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON access_tokens
  FOR UPDATE USING (auth.role() = 'authenticated');

-- user_profiles 表
CREATE POLICY "Allow all authenticated users to insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON user_profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- purchases 表
CREATE POLICY "Allow all authenticated users to insert" ON purchases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read" ON purchases
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON purchases
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 视图: user_access_summary (用户访问总结)
-- ============================================================================
DROP VIEW IF EXISTS user_access_summary CASCADE;
CREATE VIEW user_access_summary AS
SELECT 
  u.id,
  u.email,
  u.username,
  COUNT(DISTINCT at.id) as total_tokens,
  COUNT(DISTINCT CASE WHEN at.is_used = TRUE THEN 1 END) as used_tokens,
  COUNT(DISTINCT CASE WHEN at.expires_at > CURRENT_TIMESTAMP AND at.is_used = FALSE THEN 1 END) as active_tokens,
  MAX(at.created_at) as latest_token_created_at,
  MAX(at.used_at) as latest_token_used_at
FROM users u
LEFT JOIN access_tokens at ON u.id = at.user_id
GROUP BY u.id, u.email, u.username;

-- ============================================================================
-- 表 5: vpn_urls (VPN URL 库存表)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vpn_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  day_period INTEGER NOT NULL,
  traffic_limit BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, used
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vpn_urls_status ON vpn_urls(status);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_assigned_to_user_id ON vpn_urls(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_created_at ON vpn_urls(created_at);

-- 启用 VPN URLs 表的 RLS
ALTER TABLE vpn_urls ENABLE ROW LEVEL SECURITY;

-- VPN URLs 表的 RLS 策略
CREATE POLICY "Allow all authenticated users to insert" ON vpn_urls
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read" ON vpn_urls
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON vpn_urls
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 注释
-- ============================================================================

COMMENT ON TABLE users IS 'Google 登录用户信息表';
COMMENT ON TABLE access_tokens IS '购买产品后生成的访问令牌表';
COMMENT ON TABLE user_profiles IS '用户档案统计表';
COMMENT ON TABLE purchases IS '购买交易记录表';
COMMENT ON TABLE vpn_urls IS 'VPN URL 库存表，用于管理可用的 VPN 地址';
COMMENT ON VIEW user_access_summary IS '用户访问令牌总结视图';

COMMENT ON COLUMN users.google_id IS 'Google 账户唯一标识';
COMMENT ON COLUMN access_tokens.token IS '唯一访问令牌，用于生成访问 URL';
COMMENT ON COLUMN access_tokens.is_used IS '令牌是否已被使用';
COMMENT ON COLUMN access_tokens.expires_at IS '令牌过期时间';
COMMENT ON COLUMN vpn_urls.url IS 'VPN URL 地址';
COMMENT ON COLUMN vpn_urls.day_period IS 'VPN 有效期（天数）';
COMMENT ON COLUMN vpn_urls.traffic_limit IS 'VPN 流量限制（字节）';
COMMENT ON COLUMN vpn_urls.status IS 'VPN URL 状态：active（活跃）、inactive（非活跃）、used（已使用）';
COMMENT ON COLUMN vpn_urls.assigned_to_user_id IS '分配给用户的 ID，如果为 NULL 则表示未分配';
