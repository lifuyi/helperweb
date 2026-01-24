import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

/**
 * Email sending configuration
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send email endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to, subject, html, text } = req.body;

    // Validate required fields
    if (!from || !to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
