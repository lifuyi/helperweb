# VPN Client Management System - Implementation Guide

## Overview

This system automatically creates X-UI VPN clients when users purchase VPN products via Stripe. It handles:
- Automatic client creation in X-UI panel with expiration
- VLESS URL generation
- Email delivery to users immediately on purchase
- Database storage for management

## System Flow

```
User Purchases VPN → Stripe Webhook → Server Creates X-UI Client (with expiration) → Saves to DB → Sends Email
```

## Setup Instructions

### 1. Supabase Database Setup

Run the SQL commands from `DATABASE_SCHEMA.md` in your Supabase SQL Editor:

```sql
-- Creates vpn_clients table with expiration
```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# X-UI Configuration
XUI_BASE_URL=http://your-xui-server:2053
XUI_USERNAME=your-xui-username
XUI_PASSWORD=your-xui-password

# VPN Server
VPN_SERVER_HOST=vpn.yourdomain.com
VPN_SERVER_PORT=443
VPN_SECURITY=reality
VPN_SNI=cloudflare.com

# SMTP (for sending VPN credentials)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

### 3. X-UI Panel Setup

1. Install X-UI on your server
2. Create at least one inbound (VLESS + Reality recommended)
3. Note the inbound ID (usually 1 for first inbound)
4. Set up API access in X-UI settings

### 4. Vercel Deployment

The API endpoints are automatically deployed:
- `/api/vpn/create` - Create VPN client (called by Stripe webhook)
- `/api/vpn/list` - List user's VPN clients

## API Endpoints

### Create VPN Client
```http
POST /api/vpn/create
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "user@example.com",
  "productId": "vpn-3days"
}
```

### List User VPN Clients
```http
GET /api/vpn/list?userId=user-uuid
```

## Stripe Webhook Integration

The webhook automatically:
1. Listens for `checkout.session.completed`
2. Checks if product is VPN product (starts with `vpn-`)
3. Creates X-UI client with expiration date
4. Sends email with credentials immediately

## Expiration Management

- X-UI handles expiration natively
- Client is created with `expiryTime` set
- User can connect until expiration date
- No activation flow needed

## Managing Clients

### View All Client
Access via Supabase dashboard → vpn_clients table

### Revoke Client Access
```http
POST /api/vpn/revoke
{
  "clientId": "vpn-client-id"
}
```

## Troubleshooting

### Client Not Created
1. Check X-UI credentials in environment variables
2. Verify X-UI API is accessible
3. Check server logs for errors

### Email Not Sent
1. Verify SMTP configuration
2. Check spam folder
3. Test SMTP connection manually

## Security Considerations

1. **Keep X-UI credentials secure**
2. **Use HTTPS for VPN server**
3. **Validate webhook signatures**
4. **Rate limit API endpoints**
5. **Monitor client creation rate**

## File Structure

```
china connect/
├── services/
│   ├── xuiClient.ts          # X-UI API client
│   └── vpnClientService.ts   # Main VPN service
├── api/
│   ├── vpn/
│   │   ├── create.ts         # Create endpoint
│   │   └── list.ts           # List endpoint
│   └── email/send/
│       └── vpn.ts            # Email service
├── utils/
│   └── vlessGenerator.ts     # URL generation
├── DATABASE_SCHEMA.md        # SQL setup
└── .env.example              # Environment template
```

## Testing

1. Purchase a VPN product in your app
2. Check Stripe webhook logs
3. Verify client created in X-UI panel
4. Check email received with VLESS URL
5. Verify expiration date set correctly

## Support

For issues:
1. Check Vercel function logs
2. Verify X-UI panel accessible
3. Test SMTP configuration
4. Review database records
