-- Fix policies on users table
-- Drop new policies if they exist
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all authenticated users to insert" ON users;
DROP POLICY IF EXISTS "Allow all users to read" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON users;

-- Create corrected policies for users
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_read_policy" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Fix policies on vpn_urls table
-- Drop new policies if they exist
DROP POLICY IF EXISTS "vpn_urls_insert_policy" ON vpn_urls;
DROP POLICY IF EXISTS "vpn_urls_read_policy" ON vpn_urls;
DROP POLICY IF EXISTS "vpn_urls_update_policy" ON vpn_urls;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all authenticated users to insert" ON vpn_urls;
DROP POLICY IF EXISTS "Allow all users to read" ON vpn_urls;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON vpn_urls;

-- Create corrected policies for vpn_urls
CREATE POLICY "vpn_urls_insert_policy" ON vpn_urls
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "vpn_urls_read_policy" ON vpn_urls
  FOR SELECT USING (true);

CREATE POLICY "vpn_urls_update_policy" ON vpn_urls
  FOR UPDATE USING (auth.role() = 'authenticated');
