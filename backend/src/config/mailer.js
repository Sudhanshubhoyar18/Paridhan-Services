import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

function getDbSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (_) {
    return null;
  }
}

/**
 * Create Nodemailer transporter based on DB settings or .env
 */
export function getTransporter() {
  const dbUser = getDbSetting('smtp_user');
  const dbPass = getDbSetting('smtp_pass');
  const dbHost = getDbSetting('smtp_host');
  const dbPort = getDbSetting('smtp_port');

  const host = dbHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(dbPort || process.env.SMTP_PORT || '587', 10);
  const user = dbUser || process.env.SMTP_USER;
  const pass = dbPass || process.env.SMTP_PASS;
  const secure = port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.trim()
    }
  });
}

/**
 * Send invoice email with attached PDF and HTML formatting
 */
export async function sendInvoiceEmail({ to, subject, text, html, pdfBuffer, filename }) {
  const customTransporter = getTransporter();

  const senderName = getDbSetting('business_name') || 'Paridhan Uniforms';
  const senderEmail = getDbSetting('business_email') || 'billing@paridhanuniforms.com';
  const fromAddress = `"${senderName}" <${senderEmail}>`;

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: text || 'Please find attached your invoice from Paridhan Uniforms.',
    html: html || `<p>${(text || '').replace(/\n/g, '<br/>')}</p>`,
    attachments: [
      {
        filename: filename || 'Invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  if (customTransporter) {
    // Send via configured SMTP (e.g. Gmail)
    const info = await customTransporter.sendMail(mailOptions);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      message: `Invoice email successfully sent to ${to} via SMTP!`
    };
  }

  // If no SMTP configured, use ephemeral Ethereal test account so the user gets a real email preview!
  try {
    const testAccount = await nodemailer.createTestAccount();
    const etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await etherealTransporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`[ETHEREAL EMAIL SENT] To: ${to} | Preview URL: ${previewUrl}`);

    return {
      success: true,
      simulated: true,
      previewUrl,
      message: `Invoice email generated! Preview link: ${previewUrl}`
    };
  } catch (err) {
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return {
      success: true,
      simulated: true,
      message: `Invoice email recorded for ${to}. To send real emails, set your Gmail App Password in Settings.`
    };
  }
}

/**
 * Test SMTP connection
 */
export async function verifySmtpConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      connected: false,
      message: 'SMTP credentials are not configured yet. You can enter your Gmail & App Password in the Settings tab.'
    };
  }

  try {
    await transporter.verify();
    return {
      connected: true,
      message: 'SMTP connection verified successfully! Ready to deliver live emails.'
    };
  } catch (err) {
    return {
      connected: false,
      message: `SMTP verification failed: ${err.message}`
    };
  }
}

export default {
  getTransporter,
  sendInvoiceEmail,
  verifySmtpConnection
};
