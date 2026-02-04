# Admin Dashboard - Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Navbar Component                         │  │
│  │  (Updated: Admin Link, Email-based Authorization)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AdminDashboard Component                     │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Overview Tab    │  Purchases Tab  │  VPN Tab     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │         ↓                  ↓                  ↓           │  │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐ │  │
│  │  │  Statistics │  │ PurchaseManager  │  │ VpnImport    │ │  │
│  │  │  Cards      │  │                  │  │              │ │  │
│  │  │             │  │ • Search         │  │ • Import     │ │  │
│  │  │ • Revenue   │  │ • Sort           │  │ • Inventory  │ │  │
│  │  │ • Purchases │  │ • Expand Details │  │ • Manage     │ │  │
│  │  │ • VPN Stats │  │ • Export CSV     │  │ • Filter     │ │  │
│  │  │             │  │ • Pagination     │  │ • Search     │ │  │
│  │  └─────────────┘  └──────────────────┘  └──────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                  adminService.ts (20+ functions)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Purchase Functions       │  VPN URL Functions          │  │
│  │  ├─ getAllPurchases()    │  ├─ addVpnUrl()             │  │
│  │  ├─ getPurchaseCount()   │  ├─ bulkImportVpnUrls()     │  │
│  │  ├─ getTotalRevenue()    │  ├─ getAllVpnUrls()         │  │
│  │  ├─ getPurchase()        │  ├─ getVpnUrlCount()        │  │
│  │  ├─ searchPurchases()    │  ├─ updateVpnUrlStatus()    │  │
│  │  └─ getPurchaseByStripe()│  ├─ deleteVpnUrl()          │  │
│  │                          │  ├─ assignVpnUrlToUser()    │  │
│  │  Statistics Functions     │  ├─ unassignVpnUrl()        │  │
│  │  ├─ getAdminStats()      │  └─ searchVpnUrls()         │  │
│  │  └─ (aggregates data)    │                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE CLIENT LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • supabaseService.ts (Authentication)                          │
│  • Supabase JavaScript SDK                                      │
│  • Real-time queries and mutations                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PostgreSQL (via Supabase)                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Database Tables                        │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │  │
│  │  │   users    │  │  purchases   │  │  vpn_urls (NEW)  │ │  │
│  │  │ ────────── │  │ ──────────── │  │ ────────────────│ │  │
│  │  │ id (PK)    │  │ id (PK)      │  │ id (PK)         │ │  │
│  │  │ email      │  │ user_id (FK) │  │ url (UNIQUE)    │ │  │
│  │  │ username   │  │ product_id   │  │ day_period      │ │  │
│  │  │ avatar_url │  │ amount       │  │ traffic_limit   │ │  │
│  │  │ google_id  │  │ currency     │  │ status          │ │  │
│  │  │ ...        │  │ stripe_id    │  │ assigned_to_uid │ │  │
│  │  │            │  │ status       │  │ assigned_at     │ │  │
│  │  │            │  │ created_at   │  │ created_at      │ │  │
│  │  │            │  │ updated_at   │  │ updated_at      │ │  │
│  │  └────────────┘  └──────────────┘  └──────────────────┘ │  │
│  │         ↓               ↓                   ↓            │  │
│  │  ┌───────────────────────────────────────────────────┐  │  │
│  │  │         Foreign Key Relationships                 │  │  │
│  │  │  purchases.user_id → users.id (CASCADE)           │  │  │
│  │  │  vpn_urls.assigned_to_user_id → users.id (NULL)  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌───────────────────────────────────────────────────┐  │  │
│  │  │              Indexes for Performance              │  │  │
│  │  │  • idx_vpn_urls_status                            │  │  │
│  │  │  • idx_vpn_urls_assigned_to_user_id               │  │  │
│  │  │  • idx_vpn_urls_created_at                        │  │  │
│  │  │  • idx_purchases_user_id                          │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌───────────────────────────────────────────────────┐  │  │
│  │  │         Row Level Security (RLS)                  │  │  │
│  │  │  • Authenticated users can insert/read/update     │  │  │
│  │  │  • Policies restrict data access                  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Admin Dashboard Access Flow

```
┌─────────────┐
│  User Logs  │
│    In       │
└──────┬──────┘
       │ (Google OAuth)
       ↓
┌─────────────────────────────┐
│ AuthContext Manages Session │
└──────┬──────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ User Email Verified          │
└──────┬───────────────────────┘
       │
       ↓ (Check against VITE_ADMIN_EMAILS)
┌──────────────────────────────────┐
│ Is Email in Admin List?          │
└──────┬───────────┬────────────────┘
       │ YES       │ NO
       ↓           ↓
   ┌───────┐   ┌─────────────┐
   │ Admin │   │ Regular User│
   │ Link  │   │ (No Link)   │
   │Shows  │   │             │
   └───┬───┘   └─────────────┘
       │
       ↓
  ┌──────────────┐
  │Admin Dashboard│
  └──────────────┘
```

### Purchase Search Flow

```
┌─────────────────────┐
│ User Enters Search  │
│ Query (Email/Name)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────┐
│ Form Submit Event Handler   │
└──────────┬──────────────────┘
           │
           ↓
┌────────────────────────────────┐
│ searchPurchases(query)         │
│ • Search users table           │
│ • Match email/name pattern     │
│ • Get user IDs                 │
└──────────┬─────────────────────┘
           │
           ↓
┌────────────────────────────────┐
│ Query purchases table          │
│ • Filter by user_id            │
│ • Order by created_at DESC     │
│ • Attach user info             │
└──────────┬─────────────────────┘
           │
           ↓
┌────────────────────────────────┐
│ Return Results & Display       │
│ • Update table with data       │
│ • Show pagination              │
│ • Enable expand/sort/export    │
└────────────────────────────────┘
```

### VPN URL Import Flow

```
┌─────────────────────┐
│ User Selects CSV    │
│ File                │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────┐
│ FileReader reads CSV        │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Parse CSV                   │
│ • Split by lines            │
│ • Extract columns           │
│ • Validate data             │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Display Preview             │
│ • Show first 10 rows        │
│ • Format traffic limit      │
│ • Allow user confirmation   │
└──────────┬──────────────────┘
           │
           ↓ (User clicks Import)
┌─────────────────────────────┐
│ bulkImportVpnUrls()         │
│ • Batch data (50 per batch) │
│ • Insert to database        │
│ • Collect errors            │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Display Results             │
│ • Success count             │
│ • Failed count              │
│ • Error messages            │
└─────────────────────────────┘
```

## Component Hierarchy

```
App
├── Navbar (Updated)
│   ├── NavItems
│   └── UserDropdown
│       ├── GoogleLoginButton (when not auth)
│       └── User Menu
│           ├── My Account Button
│           ├── Admin Dashboard Button ← NEW
│           └── Sign Out Button
│
└── AdminDashboard (NEW) ← when currentPage === 'admin'
    ├── Header
    │   ├── Back Button
    │   └── Refresh Button
    │
    ├── Statistics Cards (Overview tab)
    │   ├── StatCard (Total Purchases)
    │   ├── StatCard (Total Revenue)
    │   ├── StatCard (Active VPN URLs)
    │   └── StatCard (Used VPN URLs)
    │
    ├── Tab Navigation
    │   ├── Overview Tab
    │   ├── Purchases Tab
    │   └── VPN Import Tab
    │
    ├── Overview Tab Content ← when activeTab === 'overview'
    │   ├── VPN Inventory Summary
    │   ├── Purchase Statistics
    │   └── Quick Actions
    │
    ├── PurchaseManagement (NEW) ← when activeTab === 'purchases'
    │   ├── Search Bar
    │   ├── Export CSV Button
    │   ├── Purchases Table
    │   │   ├── Table Header (sortable)
    │   │   └── Table Rows (expandable)
    │   │       ├── Purchase Summary
    │   │       └── Expanded Details (when clicked)
    │   └── Pagination Controls
    │
    └── VpnImport (NEW) ← when activeTab === 'vpn-import'
        ├── Tab Navigation (Import / Inventory)
        │
        ├── Import Tab
        │   ├── Instructions
        │   ├── File Upload Area (drag-drop)
        │   ├── Preview Table (first 10 rows)
        │   ├── Import Button
        │   └── Result Message
        │
        └── Inventory Tab
            ├── Search Bar
            ├── Status Filter Buttons
            ├── VPN URLs Table
            │   ├── Table Header
            │   └── Table Rows (with actions)
            │       ├── Status Dropdown
            │       └── Delete Button
            ├── Show/Hide URLs Toggle
            └── Pagination Controls
```

## Authentication & Authorization Flow

```
┌─────────────────────────────────┐
│  User Authentication            │
│  (Google OAuth via Supabase)    │
└──────────┬──────────────────────┘
           │
           ├─ Authenticated: user object with email
           │
           ├─ Not Authenticated: null
           │
           ↓
┌──────────────────────────────────────┐
│  isAdminUser(email) Function         │
│  • Reads VITE_ADMIN_EMAILS           │
│  • Splits by comma                   │
│  • Case-insensitive comparison       │
│  • Returns boolean                   │
└──────────┬───────────────────────────┘
           │
           ├─ true: User is admin
           │   • Show admin link in navbar
           │   • Allow dashboard access
           │   • All operations allowed
           │
           ├─ false: User is not admin
           │   • No admin link in navbar
           │   • Dashboard shows "Access Denied"
           │   • No operations allowed
           │
           ↓
┌──────────────────────────────────────┐
│  Conditional Rendering               │
│  • Navbar: Admin link appears/hides   │
│  • AdminDashboard: Shows dashboard   │
│    or access denied message          │
└──────────────────────────────────────┘
```

## State Management Flow

```
AdminDashboard State:
├─ currentPage: 'home' | 'vpn' | 'guide' | 'user-center' | 'admin'
├─ currentTab: 'overview' | 'purchases' | 'vpn-import'
└─ user: AuthUser (from AuthContext)

PurchaseManagement State:
├─ purchases: PurchaseWithUser[]
├─ totalCount: number
├─ currentPage: number
├─ isLoading: boolean
├─ searchQuery: string
├─ sortBy: 'date' | 'amount'
├─ sortOrder: 'asc' | 'desc'
└─ expandedPurchaseId: string | null

VpnImport State (Import Tab):
├─ file: File | null
├─ previewData: VpnData[]
├─ isImporting: boolean
├─ importResult: ImportResult | null
└─ dragActive: boolean

VpnImport State (Inventory Tab):
├─ vpnUrls: VpnUrlWithUser[]
├─ isLoadingInventory: boolean
├─ filterStatus: 'all' | 'active' | 'used' | 'inactive'
├─ searchQuery: string
├─ inventoryPage: number
├─ totalVpnUrls: number
└─ showMaskedUrls: boolean
```

## Error Handling Flow

```
Operation (e.g., Import)
       ↓
   ┌───────────────────┐
   │ Try Block         │
   │ • Validate input  │
   │ • Call API        │
   │ • Await response  │
   └─────┬─────────────┘
         │
         ├─ Success
         │  └─ Display result
         │
         └─ Error
            └─ Catch Block
               ├─ Log to console
               ├─ Set error state
               └─ Display error message
                  to user

User sees:
├─ Loading state: Spinner
├─ Success: Green message with counts
├─ Error: Red message with details
└─ Finally: Re-enable buttons
```

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│ Client-Side Security                            │
├─────────────────────────────────────────────────┤
│ • Email verification (VITE_ADMIN_EMAILS)        │
│ • Conditional component rendering               │
│ • Menu item visibility control                  │
│ • Input validation for CSV                      │
│ • URL masking display option                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Supabase Client Authentication                  │
├─────────────────────────────────────────────────┤
│ • Google OAuth token verification               │
│ • Session management                           │
│ • Auto token refresh                           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Database Level Security (PostgreSQL)            │
├─────────────────────────────────────────────────┤
│ • RLS Policies (Row Level Security)             │
│ • Foreign key constraints                       │
│ • Unique constraints (url)                      │
│ • Audit trail (created_at, updated_at)         │
└─────────────────────────────────────────────────┘
```

## Performance Optimization

```
Admin Dashboard Performance Strategies:

1. PAGINATION
   ├─ Purchases: 20 items per page
   ├─ VPN URLs: 20 items per page
   └─ Result: Reduced initial load, faster rendering

2. BATCH PROCESSING
   ├─ CSV Import: 50 URLs per batch
   ├─ Prevents: Database timeout, memory overflow
   └─ Result: Handle large imports (1000+ URLs)

3. DATABASE INDEXES
   ├─ vpn_urls(status)
   ├─ vpn_urls(assigned_to_user_id)
   ├─ vpn_urls(created_at)
   ├─ purchases(user_id)
   └─ Result: O(log n) query performance

4. SEARCH OPTIMIZATION
   ├─ Database-side search for accuracy
   ├─ Pattern matching with ILIKE
   └─ Result: Fast results even with large datasets

5. LAZY LOADING
   ├─ Components load data on tab switch
   ├─ Statistics refresh on demand
   └─ Result: Faster initial dashboard load

6. COMPONENT MEMOIZATION
   ├─ StatCard components
   ├─ Table row components
   └─ Result: Reduced unnecessary re-renders
```

## Extension Points

```
Extensibility & Customization:

1. ADD NEW COLUMNS
   • Update interfaces in adminService.ts
   • Modify component table headers
   • Add CSV parsing logic

2. ADD NEW STATISTICS
   • Extend getAdminStats() function
   • Add new StatCard components
   • Create calculation functions

3. ADD BULK ACTIONS
   • Add checkboxes to table rows
   • Create selection state
   • Add batch operation functions
   • Create confirmation modals

4. ADD EXPORT FORMATS
   • Extend export functionality
   • Add JSON, XML, PDF support
   • Create format converters

5. ADD REAL-TIME UPDATES
   • Use Supabase real-time subscriptions
   • Add live stat updates
   • Implement WebSocket listeners

6. ADD AUDIT LOGGING
   • Track admin actions
   • Log data changes
   • Create audit reports
```

---

**Architecture Last Updated**: January 2026
**Version**: 1.0 (Production Ready)
