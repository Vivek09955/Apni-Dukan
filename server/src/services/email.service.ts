import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { config } from '../config/env';

// ============================================================
// Email Service
// Priority: Brevo (HTTP) → Resend (HTTP) → SMTP → Console log
// ============================================================

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================================
// HTML email templates
// ============================================================

const passwordResetHTML = (otp: string, userName: string) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb;">
      <h1 style="color: #1e3a5f; margin: 0; font-size: 28px;">🏪 Apni Dukan</h1>
      <p style="color: #6b7280; margin: 5px 0 0; font-size: 14px;">Apni Pahchan</p>
    </div>
    <div style="padding: 30px 0;">
      <h2 style="color: #1f2937; margin: 0 0 10px;">Password Reset Request</h2>
      <p style="color: #4b5563; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
      <p style="color: #4b5563; line-height: 1.6;">We received a request to reset your password. Use the OTP below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          ${otp}
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #92400e; margin: 0; font-size: 13px;">⚠️ If you did not request this, please ignore this email.</p>
      </div>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 20px 0; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Apni Dukan • Made for Indian MSMEs</p>
    </div>
  </div>
`;

const emailVerificationHTML = (otp: string, userName: string) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb;">
      <h1 style="color: #1e3a5f; margin: 0; font-size: 28px;">🏪 Apni Dukan</h1>
      <p style="color: #6b7280; margin: 5px 0 0; font-size: 14px;">Apni Pahchan</p>
    </div>
    <div style="padding: 30px 0;">
      <h2 style="color: #1f2937; margin: 0 0 10px;">Welcome to Apni Dukan! 🎉</h2>
      <p style="color: #4b5563; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
      <p style="color: #4b5563; line-height: 1.6;">Please verify your email using the OTP below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 15px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          ${otp}
        </div>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 20px 0; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Apni Dukan • Made for Indian MSMEs</p>
    </div>
  </div>
`;

// ============================================================
// Brevo (Sendinblue) — HTTP API, free 300 emails/day, any recipient
// ============================================================

const sendViaBrevo = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!config.BREVO_API_KEY || !config.BREVO_SENDER_EMAIL) return false;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': config.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: config.BREVO_SENDER_NAME,
          email: config.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Email Service] ❌ Brevo error (${response.status}):`, errorBody);
      return false;
    }

    const result = await response.json();
    console.log(`[Email Service] ✅ Email sent via Brevo to ${to}, messageId: ${result.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Service] ❌ Brevo exception:`, error.message);
    return false;
  }
};

// ============================================================
// Resend — HTTP API (requires domain verification for non-test emails)
// ============================================================

let resendClient: Resend | null = null;

const sendViaResend = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!config.RESEND_API_KEY) return false;

  if (!resendClient) {
    resendClient = new Resend(config.RESEND_API_KEY);
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: 'Apni Dukan <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error(`[Email Service] ❌ Resend error:`, error);
      return false;
    }

    console.log(`[Email Service] ✅ Email sent via Resend to ${to}, id: ${data?.id}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Service] ❌ Resend exception:`, error.message);
    return false;
  }
};

// ============================================================
// SMTP / Nodemailer — fallback (blocked on some hosts)
// ============================================================

let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const sendViaSMTP = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) return false;

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  try {
    const info = await smtpTransporter.sendMail({
      from: config.SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log(`[Email Service] ✅ Email sent via SMTP to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Service] ❌ SMTP error (${error.code}):`, error.message);
    return false;
  }
};

// ============================================================
// Core send — tries providers in priority order
// ============================================================

const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {

  // 1. Brevo (recommended — HTTP, free, any recipient)
  if (config.BREVO_API_KEY) {
    return sendViaBrevo(to, subject, html);
  }

  // 2. Resend (HTTP, but limited recipients without domain)
  if (config.RESEND_API_KEY) {
    return sendViaResend(to, subject, html);
  }

  // 3. SMTP (may be blocked on cloud hosts)
  if (config.SMTP_HOST) {
    return sendViaSMTP(to, subject, html);
  }

  // 4. No provider — dev mode log
  console.log('═══════════════════════════════════════════');
  console.log(`📧 EMAIL (no provider configured)`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log('═══════════════════════════════════════════');
  return true;
};

// ============================================================
// Public API
// ============================================================

export const sendPasswordResetOTP = async (
  to: string,
  otp: string,
  userName: string
): Promise<boolean> => {
  return sendEmail(to, 'Apni Dukan — Password Reset OTP', passwordResetHTML(otp, userName));
};

export const sendEmailVerificationOTP = async (
  to: string,
  otp: string,
  userName: string
): Promise<boolean> => {
  return sendEmail(to, 'Apni Dukan — Verify Your Email', emailVerificationHTML(otp, userName));
};

export const emailService = {
  generateOTP,
  sendPasswordResetOTP,
  sendEmailVerificationOTP,
};

export default emailService;
