# Admin Dashboard - Quick Start Guide

## 5-Minute Setup

### Step 1: Configure Environment (1 min)
```bash
# Add to your .env file:
VITE_ADMIN_EMAILS=your-email@gmail.com
```

### Step 2: Deploy Database (2 min)
1. Go to Supabase Dashboard → SQL Editor
2. Copy this SQL and run it:

```sql
CREATE TABLE IF NOT EXISTS vpn_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  day_period INTEGER NOT NULL,
  traffic_limit BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vpn_urls_status ON vpn_urls(status);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_assigned_to_user_id ON vpn_urls(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_vpn_urls_created_at ON vpn_urls(created_at);

ALTER TABLE vpn_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to insert" ON vpn_urls
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all users to read" ON vpn_urls
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON vpn_urls
  FOR UPDATE USING (auth.role() = 'authenticated');
```

### Step 3: Test Access (2 min)
1. Log in with Google (use email from VITE_ADMIN_EMAILS)
2. Click your avatar (top-right)
3. Click "Admin Dashboard"
4. You should see the dashboard! ✅

## Common Tasks

### Import VPN URLs

**Format your CSV:**
```csv
url,day_period,traffic_limit
vpn1.example.com,30,1073741824
vpn2.example.com,7,536870912
```

**Or use the sample file:**
- `sample_vpn_import.csv` - Ready to test

**Steps:**
1. Admin Dashboard → VPN Import
2. Select or drag your CSV file
3. Review preview
4. Click "Import X VPN URLs"

### Export Purchases

1. Admin Dashboard → Purchases
2. Click "Export as CSV"
3. File downloads automatically

### Search Purchases

1. Admin Dashboard → Purchases
2. Type user email or name in search box
3. Click "Search"

### Manage VPN Inventory

1. Admin Dashboard → VPN Import → Inventory
2. Filter by status: All, Active, Used, Inactive
3. Update status or delete URLs as needed

## Traffic Limit Quick Reference

| Size | Bytes |
|------|-------|
| 256 MB | 268435456 |
| 512 MB | 536870912 |
| 1 GB | 1073741824 |
| 2 GB | 2147483648 |
| 5 GB | 5368709120 |
| 10 GB | 10737418240 |

## Troubleshooting

### "Admin Dashboard" not showing?
- Check email is in `VITE_ADMIN_EMAILS`
- Log out and log back in
- Clear browser cache

### Import shows error?
- Verify CSV format: `url,day_period,traffic_limit`
- No extra spaces or commas
- All rows have 3 fields
- Try sample file first

### Statistics not updating?
- Click "Refresh" button
- Wait 2-3 seconds
- Check browser console for errors

## File Overview

| File | Purpose |
|------|---------|
| `components/AdminDashboard.tsx` | Main dashboard |
| `components/PurchaseManagement.tsx` | Manage purchases |
| `components/VpnImport.tsx` | Import & manage VPN URLs |
| `services/adminService.ts` | Backend API |
| `ADMIN_DASHBOARD.md` | Full documentation |
| `ADMIN_SETUP.md` | Detailed setup |
| `sample_vpn_import.csv` | Test CSV file |

## Features at a Glance

✅ View all purchases with search
✅ Export purchase data to CSV
✅ Sort purchases by date or amount
✅ Import VPN URLs from CSV
✅ Manage VPN inventory
✅ Filter by status
✅ Real-time statistics
✅ Multiple admin support
✅ Secure email-based access

## Next Steps

1. Read `ADMIN_SETUP.md` for detailed configuration
2. Check `ADMIN_DASHBOARD.md` for full documentation
3. Use `sample_vpn_import.csv` to test import
4. Explore all dashboard tabs

## Support Resources

📖 **Full Documentation**: `ADMIN_DASHBOARD.md`
🚀 **Setup Guide**: `ADMIN_SETUP.md`
📋 **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
📁 **Sample Data**: `sample_vpn_import.csv`

---

**Need help?** Refer to the detailed documentation files or check browser console for error messages.
