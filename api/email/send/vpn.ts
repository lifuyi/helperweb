/**
 * VPN Email Service
 * Send VPN credentials and setup information to users
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email configuration from environment variables
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * VPN Email data
 */
export interface VpnEmailData {
  userEmail: string;
  userName: string;
  productName: string;
  expiryDays: number;
  vlessUrl: string;
  vlessConfig: {
    uuid: string;
    host: string;
    port: number;
    security: string;
  };
  expiresAt?: string;
}

/**
 * Create email transporter
 */
function createEmailTransporter(): Transporter | null {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  };

  if (!config.host || !config.user || !config.pass) {
    console.warn('Email configuration incomplete');
    return null;
  }

  return nodemailer.createTransport(config);
}

/**
 * Generate VPN setup guide HTML
 */
function generateVpnSetupHtml(data: VpnEmailData): string {
  const { userName, productName, expiryDays, vlessUrl, vlessConfig, expiresAt } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPN Credentials - ${productName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Your VPN is Ready!</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${userName},</p>

    <p style="font-size: 16px;">Thank you for purchasing <strong>${productName}</strong>!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">📋 Your VPN Details</h3>
      <p style="margin: 8px 0;"><strong>Product:</strong> ${productName}</p>
      <p style="margin: 8px 0;"><strong>Duration:</strong> ${expiryDays} days</p>
      <p style="margin: 8px 0;"><strong>Expires:</strong> ${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}</p>
      <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #28a745;">Active</span></p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">🔗 Your VLESS URL</h3>
      <p style="font-size: 12px; color: #666;">Copy and paste this URL into your VPN client:</p>
      <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; word-break: break-all; font-size: 12px;">${vlessUrl}</pre>
      <button onclick="navigator.clipboard.writeText('${vlessUrl.replace(/'/g, "\\'")}')" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">📋 Copy URL</button>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #667eea;">📱 Setup Instructions</h3>

      <h4 style="color: #333;">V2RayNG (Android)</h4>
      <ol style="padding-left: 20px;">
        <li>Open V2RayNG app</li>
        <li>Tap the + button → "Import from clipboard"</li>
        <li>Paste your VLESS URL</li>
        <li>Tap the floating action button to connect</li>
      </ol>

      <h4 style="color: #333;">V2Box (iOS)</h4>
      <ol style="padding-left: 20px;">
        <li>Open V2Box app</li>
        <li>Tap the + button</li>
        <li>Choose "Import from URL"</li>
        <li>Paste your VLESS URL</li>
        <li>Tap to connect</li>
      </ol>

      <h4 style="color: #333;">Nekoray (Windows)</h4>
      <ol style="padding-left: 20px;">
        <li>Open Nekoray</li>
        <li>Right-click the tray icon → "Import Config" → "Import from String"</li>
        <li>Paste your VLESS URL</li>
        <li>Click the connect button</li>
      </ol>
    </div>

    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h4 style="margin-top: 0; color: #667eea;">💡 Quick Tips</h4>
      <ul style="padding-left: 20px; margin-bottom: 0;">
        <li>Make sure your device clock is correct (enable automatic time)</li>
        <li>For best performance, choose a server close to your location</li>
        <li>If connection fails, try switching between TCP and WebSocket modes</li>
        <li>Contact support if you need assistance</li>
      </ul>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #666; font-size: 14px; text-align: center;">
      Thank you for choosing our VPN service!<br>
      If you have any questions, please don't hesitate to contact us.
    </p>

    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
      This email was sent to ${data.userEmail}<br>
      © ${new Date().getFullYear()} ChinaConnect. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of VPN email
 */
function generateVpnEmailText(data: VpnEmailData): string {
  const { userName, productName, expiryDays, vlessUrl, expiresAt } = data;

  return `
Hi ${userName},

Thank you for purchasing ${productName}!

YOUR VPN DETAILS
================
Product: ${productName}
Duration: ${expiryDays} days
Expires: ${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'}
Status: Active

YOUR VLESS URL
==============
${vlessUrl}

SETUP INSTRUCTIONS
==================

V2RayNG (Android):
1. Open V2RayNG app
2. Tap + button → "Import from clipboard"
3. Paste your VLESS URL
4. Tap to connect

V2Box (iOS):
1. Open V2Box app
2. Tap + button
3. Choose "Import from URL"
4. Paste your VLESS URL
5. Tap to connect

Nekoray (Windows):
1. Open Nekoray
2. Right-click tray icon → "Import Config" → "Import from String"
3. Paste your VLESS URL
4. Click connect

QUICK TIPS
==========
- Ensure your device clock is correct
- Choose a server close to your location
- Contact support if you need help

Thank you for choosing our VPN service!

---
© ${new Date().getFullYear()} ChinaConnect
  `.trim();
}

/**
 * Send VPN credentials email
 */
export async function sendVpnCredentialsEmail(data: VpnEmailData): Promise<boolean> {
  const transporter = createEmailTransporter();

  if (!transporter) {
    console.error('Email transporter not available');
    return false;
  }

  try {
    const html = generateVpnSetupHtml(data);
    const text = generateVpnEmailText(data);

    const info = await transporter.sendMail({
      from: `"ChinaConnect" <${process.env.SMTP_USER}>`,
      to: data.userEmail,
      subject: `🚀 Your ${data.productName} VPN Credentials`,
      html,
      text,
    });

    console.log('VPN credentials email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending VPN email:', error);
    return false;
  }
}

/**
 * Send VPN activation confirmation email
 */
export async function sendVpnActivationEmail(
  userEmail: string,
  userName: string,
  productName: string,
  expiryDays: number,
  expiresAt: Date
): Promise<boolean> {
  const transporter = createEmailTransporter();

  if (!transporter) {
    console.error('Email transporter not available');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"ChinaConnect" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `✅ Your VPN is Now Active!`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">✅ Your VPN is Now Active!</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>Great news! Your VPN has been activated.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Product:</strong> ${productName}</p>
      <p><strong>Activated:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>
      <p><strong>Duration:</strong> ${expiryDays} days remaining</p>
    </div>

    <p>Happy browsing! 🌍</p>
  </div>
</body>
</html>
      `.trim(),
    });

    console.log('VPN activation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending activation email:', error);
    return false;
  }
}

/**
 * Send VPN expiration reminder email
 */
export async function sendVpnExpiryReminderEmail(
  userEmail: string,
  userName: string,
  productName: string,
  daysRemaining: number
): Promise<boolean> {
  const transporter = createEmailTransporter();

  if (!transporter) {
    console.error('Email transporter not available');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"ChinaConnect" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `⚠️ Your VPN expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⚠️ VPN Expiring Soon</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${userName},</p>

    <p>Your <strong>${productName}</strong> will expire in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.VITE_APP_URL || 'https://chinaconnect.example.com'}/products" style="background: #667eea; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px;">Renew Now</a>
    </div>

    <p style="color: #666; font-size: 14px;">Don't lose your access - renew before it expires!</p>
  </div>
</body>
</html>
      `.trim(),
    });

    console.log('VPN expiry reminder sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending expiry reminder:', error);
    return false;
  }
}
