# Admin Dashboard Documentation

## Overview

The Admin Dashboard is a comprehensive management interface for administrators to manage purchases and VPN URL inventory. It provides features for viewing all customer purchases, importing VPN URLs in bulk, and managing the VPN URL inventory.

## Features

### 1. Dashboard Overview
- **Real-time Statistics**: Display total purchases, revenue, and VPN URL inventory status
- **Quick Stats Cards**: Show active VPN URLs, used VPN URLs, inactive VPN URLs
- **VPN Inventory Summary**: Detailed breakdown of VPN URL status
- **Purchase Statistics**: Total purchases and total revenue

### 2. Purchase Management
- **View All Purchases**: See all customer purchases with user information
- **Search Functionality**: Search purchases by user email or name
- **Sorting**: Sort by date or amount (ascending/descending)
- **Detailed View**: Click to expand and see full purchase details
- **Export to CSV**: Download purchase data for external use
- **Pagination**: Browse through large purchase datasets

### 3. VPN URL Management
- **Bulk Import**: Import VPN URLs from CSV file with drag-and-drop support
- **CSV Preview**: Preview data before importing
- **Inventory Management**: View all imported VPN URLs
- **Status Management**: Update VPN URL status (active/used/inactive)
- **Search**: Find VPN URLs by URL pattern
- **Delete**: Remove VPN URLs from inventory
- **Pagination**: Navigate through large VPN URL datasets

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```
VITE_ADMIN_EMAILS=admin@example.com,admin2@example.com
```

You can add multiple admin emails separated by commas. Only users with these emails will have access to the admin dashboard.

### 2. Database Migration

The admin dashboard uses a new `vpn_urls` table. Apply the database migration:

```sql
-- This is already included in supabase/migrations/create_tables.sql
-- Run this migration in your Supabase project
```

### 3. Access the Admin Dashboard

1. Log in with your Google account (must be in the VITE_ADMIN_EMAILS list)
2. Click on your avatar in the top-right navigation bar
3. Select "Admin Dashboard" from the dropdown menu

## Using the Admin Dashboard

### Dashboard Overview Tab

This tab displays:
- **Total Purchases**: Count of all completed purchases
- **Total Revenue**: Sum of all completed purchases
- **Active VPN URLs**: Number of VPN URLs available for assignment
- **Used VPN URLs**: Number of VPN URLs already assigned to users
- **Inactive VPN URLs**: Number of VPN URLs marked as inactive
- **Total VPN URLs**: Total count of all VPN URLs

### Purchases Tab

#### Viewing Purchases
1. All purchases are displayed in a sortable table
2. Click on column headers "Amount" or "Date" to sort
3. Use the search box to find specific purchases by user email or name

#### Expanding Details
- Click the chevron icon at the right of any row to expand and see:
  - Full Purchase ID
  - User ID
  - Created and Updated timestamps
  - Stripe Session ID (if applicable)

#### Exporting Data
- Click "Export as CSV" button to download all visible purchases
- The file will be named `purchases_YYYY-MM-DD.csv`

#### Pagination
- Use the pagination controls at the bottom to navigate through pages
- Each page shows 20 purchases by default

### VPN Import Tab

#### Import VPN URLs

1. **Prepare CSV File**
   - Format: `url,day_period,traffic_limit`
   - Example:
     ```
     vpn1.example.com,30,1073741824
     vpn2.example.com,7,536870912
     ```
   - `url`: The VPN server URL
   - `day_period`: Validity in days (integer)
   - `traffic_limit`: Traffic limit in bytes (integer)

2. **Upload File**
   - Drag and drop CSV file onto the upload area, OR
   - Click "Select File" button and choose a CSV file
   - Supported file types: `.csv` files only

3. **Preview Data**
   - Review the parsed data before importing
   - First 10 rows are shown in the preview
   - Check for correct formatting

4. **Import**
   - Click "Import X VPN URLs" button
   - Wait for import to complete
   - Check the result message for success/failure count

#### Manage VPN Inventory

1. **View All VPN URLs**
   - Click the "Inventory" tab
   - All VPN URLs are displayed in a table

2. **Filter by Status**
   - Click filter buttons: All, Active, Used, Inactive
   - Table updates to show only selected status

3. **Search VPN URLs**
   - Use the search box to find URLs by pattern
   - Search is case-insensitive

4. **Update Status**
   - Click the status dropdown on any row
   - Select new status: Active, Used, or Inactive
   - Changes are saved immediately

5. **Show/Hide URLs**
   - Click "Show Full URLs" or "Mask URLs" button
   - Masked URLs show only first 4 and last 4 characters
   - Useful for taking screenshots

6. **Delete VPN URLs**
   - Click the trash icon on any row
   - Confirm deletion when prompted
   - Deleted URLs cannot be recovered

## CSV Import Format

### Header Row (Required)
```
url,day_period,traffic_limit
```

### Data Rows
Each row must contain exactly three fields:

- **url** (required)
  - Type: String
  - Example: `vpn.example.com` or `123.45.67.89:1194`
  - Must be unique

- **day_period** (required)
  - Type: Integer
  - Range: 1-365 (recommended)
  - Example: `30` for 30 days

- **traffic_limit** (required)
  - Type: Integer
  - Unit: Bytes
  - Common values:
    - 268435456 = 256 MB
    - 536870912 = 512 MB
    - 1073741824 = 1 GB
    - 2147483648 = 2 GB
    - 5368709120 = 5 GB

### Example CSV File

```csv
url,day_period,traffic_limit
vpn1.example.com,30,1073741824
vpn2.example.com,30,1073741824
vpn3.example.com,7,536870912
vpn4.example.com,14,1610612736
vpn5.example.com,30,2147483648
vpn6.asia.vpn.com,60,5368709120
```

## Traffic Limit Reference

| Size | Bytes | Decimal |
|------|-------|---------|
| 256 MB | 268,435,456 | 256 * 1024 * 1024 |
| 512 MB | 536,870,912 | 512 * 1024 * 1024 |
| 1 GB | 1,073,741,824 | 1 * 1024 * 1024 * 1024 |
| 2 GB | 2,147,483,648 | 2 * 1024 * 1024 * 1024 |
| 5 GB | 5,368,709,120 | 5 * 1024 * 1024 * 1024 |
| 10 GB | 10,737,418,240 | 10 * 1024 * 1024 * 1024 |

## VPN URL Statuses

- **Active**: VPN URL is available for assignment to users
- **Used**: VPN URL has been assigned to a user
- **Inactive**: VPN URL is not available for use (archived or broken)

## Database Schema

### vpn_urls Table

```sql
CREATE TABLE vpn_urls (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  day_period INTEGER NOT NULL,
  traffic_limit BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  assigned_to_user_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### "Access Denied" Error
- Check that your email is in `VITE_ADMIN_EMAILS`
- Make sure you're logged in with the correct Google account
- Try logging out and logging back in

### CSV Import Fails
- Check CSV format matches exactly: `url,day_period,traffic_limit`
- Ensure no extra spaces or commas
- Verify all rows have three fields
- Check that URLs are unique

### Statistics Not Updating
- Click the "Refresh" button in the dashboard header
- Wait a few seconds for data to load
- Check browser console for error messages

### Performance Issues with Large Datasets
- Admin dashboard uses pagination (20 items per page)
- If experiencing slowness, try using search/filter to narrow results
- For bulk operations, consider batch processing

## Security Considerations

- Admin access is restricted to specific email addresses via `VITE_ADMIN_EMAILS`
- All admin operations are subject to Supabase RLS policies
- CSV imports are validated before database insertion
- Deleted VPN URLs are permanently removed (no soft delete)
- URL masking feature helps protect sensitive data in screenshots

## Tips & Best Practices

1. **Bulk Import**: Use the CSV import feature for adding many VPN URLs at once
2. **Regular Backups**: Export purchase data regularly for record-keeping
3. **Status Management**: Regularly update VPN URL statuses to keep inventory clean
4. **Monitoring**: Check the overview tab regularly to monitor sales and inventory
5. **Search**: Use search functionality for quick lookups instead of manual browsing

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation at https://supabase.com/docs
3. Check browser console for error messages
4. Verify environment variables are correctly configured
