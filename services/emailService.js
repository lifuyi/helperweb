// utils/logger.js
var isDevelopment = false;
var logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

// services/emailService.ts
var EMAILS_ENABLED = false;
async function sendEmail(config) {
  if (!EMAILS_ENABLED) {
    console.log("[EMAIL DISABLED] Would have sent email to:", config.to);
    return true;
  }
  try {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    logger.log("Email sent successfully to:", config.to);
    return true;
  } catch (error) {
    logger.error("Error sending email:", error);
    return false;
  }
}
async function sendLowInventoryAlert(adminEmails, stats) {
  try {
    const lowStockPercentage = 20;
    const availablePercentage = 100 - stats.utilization;
    if (availablePercentage > lowStockPercentage) {
      logger.log("Inventory levels normal, no alert needed");
      return true;
    }
    const subject = `\u26A0\uFE0F Low VPN Inventory Alert - ${stats.activeVpnUrls} URLs Remaining`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .alert-box { background-color: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
          .stat-item { background-color: #f3f4f6; padding: 15px; border-radius: 6px; }
          .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
          .button { 
            background-color: #dc2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>\u26A0\uFE0F Low VPN Inventory Alert</h1>
          </div>

          <div class="alert-box">
            <p><strong>Inventory levels are running low!</strong></p>
            <p>You have only ${stats.activeVpnUrls} active VPN URLs remaining (${availablePercentage.toFixed(1)}% available).</p>
            <p>Consider importing more VPN URLs to avoid stockouts.</p>
          </div>

          <h2>Current Inventory Status</h2>
          <div class="stats">
            <div class="stat-item">
              <div class="stat-label">Total URLs</div>
              <div class="stat-value">${stats.totalVpnUrls}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Active (Available)</div>
              <div class="stat-value">${stats.activeVpnUrls}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Used (Sold)</div>
              <div class="stat-value">${stats.usedVpnUrls}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Utilization</div>
              <div class="stat-value">${stats.utilization.toFixed(1)}%</div>
            </div>
          </div>

          <p>To add more VPN URLs, go to your admin panel and use the VPN Import feature.</p>

          <a href="${window.location.origin}/admin" class="button">Go to Admin Panel</a>

          <div class="footer">
            <p>\xA9 2025 ChinaConnect. This is an automated alert. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `
Low VPN Inventory Alert

You have only ${stats.activeVpnUrls} active VPN URLs remaining (${availablePercentage.toFixed(1)}% available).

Current Status:
- Total URLs: ${stats.totalVpnUrls}
- Active (Available): ${stats.activeVpnUrls}
- Used (Sold): ${stats.usedVpnUrls}
- Utilization: ${stats.utilization.toFixed(1)}%

Please import more VPN URLs to avoid stockouts.

Go to: ${window.location.origin}/admin

\xA9 2025 ChinaConnect
    `;
    const results = await Promise.all(
      adminEmails.map(
        (email) => sendEmail({
          from: process.env.REACT_APP_EMAIL_FROM || "noreply@chinaconnect.com",
          to: email,
          subject,
          html,
          text
        })
      )
    );
    const successCount = results.filter((r) => r).length;
    logger.log(`Sent low inventory alert to ${successCount}/${adminEmails.length} admins`);
    return successCount > 0;
  } catch (error) {
    logger.error("Error sending low inventory alert:", error);
    return false;
  }
}
async function sendPurchaseConfirmation(email, productName, vpnUrl, accessUrl) {
  try {
    const subject = `\u2713 Your ${productName} Purchase Confirmation`;
    const vpnSection = vpnUrl ? `
      <h3>Your VPN Address:</h3>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
        ${vpnUrl}
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 10px;">
        <strong>Note:</strong> This VPN address is for your personal use only.
      </p>
    ` : "";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .button { 
            background-color: #dc2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>\u2713 Thank You for Your Purchase!</h1>
          </div>

          <p>Your purchase of <strong>${productName}</strong> has been confirmed.</p>

          ${vpnSection}

          ${accessUrl ? `
          <p>You can access your content here:</p>
          <a href="${accessUrl}" class="button">Access Your Content</a>
          ` : ""}

          <p>If you have any questions, please contact our support team.</p>

          <div class="footer">
            <p>\xA9 2025 ChinaConnect.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return await sendEmail({
      from: process.env.REACT_APP_EMAIL_FROM || "noreply@chinaconnect.com",
      to: email,
      subject,
      html
    });
  } catch (error) {
    logger.error("Error sending purchase confirmation:", error);
    return false;
  }
}
async function sendPasswordResetEmail(email, resetLink) {
  try {
    const subject = "Password Reset Request";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .button { 
            background-color: #dc2626; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>

          <p>We received a password reset request for your account. Click the button below to reset your password:</p>

          <a href="${resetLink}" class="button">Reset Password</a>

          <p>This link will expire in 24 hours.</p>

          <p>If you did not request this, you can safely ignore this email.</p>

          <div class="footer">
            <p>\xA9 2025 ChinaConnect.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return await sendEmail({
      from: process.env.REACT_APP_EMAIL_FROM || "noreply@chinaconnect.com",
      to: email,
      subject,
      html
    });
  } catch (error) {
    logger.error("Error sending password reset email:", error);
    return false;
  }
}
export {
  sendEmail,
  sendLowInventoryAlert,
  sendPasswordResetEmail,
  sendPurchaseConfirmation
};
