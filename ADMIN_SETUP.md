# Admin Dashboard Setup Guide

## Quick Start

### Step 1: Configure Admin Emails

Add the following to your `.env` file:

```env
VITE_ADMIN_EMAILS=your-email@example.com,another-admin@example.com
```

Replace with your actual Google account email addresses. Multiple admins can be separated by commas.

### Step 2: Deploy Database Migration

The admin dashboard requires the `vpn_urls` table. Run this migration in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the migration from `supabase/migrations/create_tables.sql` (specifically the VPN URLs section)
5. Run the query

The migration creates:
- `vpn_urls` table with proper indexes
- RLS policies for secure access
- Proper foreign key relationships

### Step 3: Access the Admin Dashboard

1. Log in to your application with your Google account (must be in `VITE_ADMIN_EMAILS`)
2. Click your avatar in the top-right navigation
3. Select "Admin Dashboard" from the dropdown menu
4. You should see the admin dashboard overview

## Features Included

### 1. Purchase Management
- View all customer purchases
- Search purchases by user email or name
- Sort by date or amount
- View detailed purchase information
- Export all purchases to CSV
- Pagination for large datasets

### 2. VPN URL Management
- **Import**: Bulk import VPN URLs from CSV file
- **Manage**: View, update, delete VPN URLs
- **Filter**: Filter by status (Active, Used, Inactive)
- **Search**: Search VPN URLs by pattern
- **Status**: Change VPN URL status
- **Visibility**: Toggle between masked and full URLs

### 3. Dashboard Overview
- Real-time statistics dashboard
- Purchase statistics (total purchases, revenue)
- VPN inventory overview
- Quick action links to other sections

## File Structure

```
├── components/
│   ├── AdminDashboard.tsx          # Main admin dashboard component
│   ├── PurchaseManagement.tsx      # Purchase management tab
│   ├── VpnImport.tsx               # VPN import and inventory tab
│   └── Navbar.tsx                  # Updated with admin link
├── services/
│   └── adminService.ts             # Admin API service layer
├── supabase/
│   └── migrations/
│       └── create_tables.sql       # Database migration with vpn_urls table
├── sample_vpn_import.csv           # Sample CSV for testing
├── ADMIN_DASHBOARD.md              # Detailed documentation
└── ADMIN_SETUP.md                  # This file
```

## Database Schema

### vpn_urls Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| url | TEXT | VPN URL (unique) |
| day_period | INTEGER | Validity period in days |
| traffic_limit | BIGINT | Traffic limit in bytes |
| status | VARCHAR | active/used/inactive |
| assigned_to_user_id | UUID | User ID if assigned |
| assigned_at | TIMESTAMP | When assigned to user |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## CSV Import Format

Your CSV file should follow this format:

```csv
url,day_period,traffic_limit
vpn1.example.com,30,1073741824
vpn2.example.com,7,536870912
vpn3.example.com,14,1610612736
```

**Fields:**
- `url`: VPN server URL or IP:port
- `day_period`: Number of days valid (integer)
- `traffic_limit`: Traffic limit in bytes (integer)

**Example values for traffic_limit:**
- 268435456 = 256 MB
- 536870912 = 512 MB
- 1073741824 = 1 GB
- 2147483648 = 2 GB
- 5368709120 = 5 GB

## Usage Examples

### Importing VPN URLs

1. Prepare a CSV file with VPN data
2. Go to Admin Dashboard → VPN Import tab
3. Click "Select File" or drag-drop your CSV
4. Review the preview
5. Click "Import X VPN URLs"
6. Check the import result

### Managing Purchases

1. Go to Admin Dashboard → Purchases tab
2. Search for specific customers or browse all purchases
3. Click the expand button to see detailed information
4. Export to CSV for external analysis

### Managing VPN Inventory

1. Go to Admin Dashboard → VPN Import → Inventory tab
2. Filter by status using the buttons
3. Search for specific URLs
4. Update status with the dropdown
5. Delete old or inactive URLs with the trash button

## Admin Roles & Permissions

### Requirements for Admin Access
- Must be logged in with a Google account
- Email must be in `VITE_ADMIN_EMAILS` environment variable
- Can perform all operations: view, create, update, delete

### Access Control
- Non-admin users cannot see the "Admin Dashboard" menu option
- Attempting direct access shows "Access Denied" message
- All operations are validated server-side via Supabase RLS

## Troubleshooting

### Admin Dashboard Not Showing

**Problem**: "Admin Dashboard" option not appearing in user dropdown

**Solution**:
1. Check your email is in `VITE_ADMIN_EMAILS` environment variable
2. Clear browser cache and log out
3. Log back in with the correct Google account
4. Check environment variables are properly deployed

### CSV Import Fails

**Problem**: Import showing errors or no data preview

**Solution**:
1. Verify CSV format: exactly `url,day_period,traffic_limit`
2. Check for extra spaces or special characters
3. Ensure all values are on separate rows
4. Try the sample CSV file first
5. Check browser console for detailed error messages

### Statistics Not Updating

**Problem**: Dashboard shows old data

**Solution**:
1. Click the "Refresh" button in dashboard header
2. Wait 2-3 seconds for data to reload
3. Check Supabase connection status
4. Verify database migrations are applied

### Performance Issues

**Problem**: Dashboard is slow with large datasets

**Solution**:
1. Use search/filter to narrow results
2. Dashboard uses pagination (20 items per page)
3. For large imports, process in batches of 100-500 URLs
4. Check browser network tab for slow API calls

## API Service Reference

The `adminService.ts` provides these functions:

### Purchase Functions
- `getAllPurchases(limit, offset)` - Get paginated purchases
- `getPurchaseCount()` - Get total purchase count
- `getTotalRevenue()` - Get sum of all purchases
- `searchPurchases(query)` - Search purchases by email/name

### VPN URL Functions
- `addVpnUrl(url, dayPeriod, trafficLimit)` - Add single URL
- `bulkImportVpnUrls(vpnData)` - Bulk import URLs
- `getAllVpnUrls(status, limit, offset)` - Get VPN URLs
- `getVpnUrlCount(status)` - Get count by status
- `updateVpnUrlStatus(id, status)` - Update status
- `deleteVpnUrl(id)` - Delete URL
- `assignVpnUrlToUser(id, userId)` - Assign to user
- `searchVpnUrls(query)` - Search URLs

### Statistics
- `getAdminStats()` - Get all dashboard statistics

## Extending the Admin Dashboard

### Adding New Columns to Purchases

1. Update the `PurchaseManagement.tsx` table headers
2. Update the CSV export function
3. Add sorting support if needed

### Adding New VPN URL Fields

1. Create database migration to add column
2. Update `VpnUrl` interface in `adminService.ts`
3. Update `VpnImport.tsx` CSV parsing
4. Update `VpnImport.tsx` display columns

### Adding Bulk Actions

1. Add checkboxes to table rows
2. Create bulk action functions in `adminService.ts`
3. Add UI for action buttons
4. Implement confirmation dialogs

## Performance Optimization

The admin dashboard is optimized for:
- **Pagination**: 20 items per page to reduce memory usage
- **Search**: Client-side search to minimize API calls when results are small
- **Lazy Loading**: Components load data on demand
- **Batch Imports**: Bulk import splits into 50-item batches to prevent timeouts

## Security Best Practices

1. **Admin Email Control**: Keep `VITE_ADMIN_EMAILS` updated with current admins only
2. **Environment Variables**: Store sensitive values in environment variables, not code
3. **Data Export**: Be careful when exporting sensitive customer data
4. **URL Masking**: Use URL masking when sharing screenshots
5. **Regular Audits**: Review admin actions and data regularly

## Support & Documentation

- **Detailed Guide**: See `ADMIN_DASHBOARD.md`
- **Sample Data**: Use `sample_vpn_import.csv` for testing
- **Supabase Docs**: https://supabase.com/docs
- **Issues**: Check browser console for detailed error messages

## Next Steps

1. ✅ Configure `VITE_ADMIN_EMAILS` in your `.env` file
2. ✅ Deploy the database migration
3. ✅ Log in and access the admin dashboard
4. ✅ Try importing sample VPN URLs from `sample_vpn_import.csv`
5. ✅ View purchase data and export to CSV
6. ✅ Manage VPN URL inventory

## FAQ

**Q: Can I have multiple admins?**
A: Yes, separate emails with commas: `VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com`

**Q: Can I modify admin status for existing users?**
A: No, admin status is determined by email in `VITE_ADMIN_EMAILS` only. Update this environment variable to add/remove admins.

**Q: What happens when I delete a VPN URL?**
A: It is permanently deleted from the database and cannot be recovered. Ensure you have backups.

**Q: Can I undo a bulk import?**
A: Not automatically. You would need to manually delete or use your database backup.

**Q: How large can CSV files be?**
A: Limited by browser memory. Recommended: 5,000-10,000 rows per file. Larger files may require multiple uploads.

**Q: Can I schedule imports or exports?**
A: Not in the current version. Imports and exports are manual only.

---

**Last Updated**: January 2026
**Version**: 1.0
