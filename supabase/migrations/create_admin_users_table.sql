-- ============================================================================
-- Create admin_users table for role-based access control
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, moderator, viewer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_users_read_policy" ON admin_users
  FOR SELECT USING (true);

CREATE POLICY "admin_users_insert_policy" ON admin_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_users_update_policy" ON admin_users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "admin_users_delete_policy" ON admin_users
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE admin_users IS 'Admin users with role-based access control';
COMMENT ON COLUMN admin_users.user_id IS 'Reference to the user in users table';
COMMENT ON COLUMN admin_users.role IS 'Role: admin (full access), moderator (manage products), viewer (read-only)';
