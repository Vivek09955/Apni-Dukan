import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { config } from '../config/env';

// ============================================================
// Email Service — supports Resend (HTTP API) or SMTP (Nodemailer)
// Resend is recommended for cloud hosts like Render that block SMTP ports.
// ============================================================

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ----- Resend client -----
let resendClient: Resend | null = null;

const getResendClient = (): Resend | null => {
  if (!config.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(config.RESEND_API_KEY);
  }
  return resendClient;
};

// ----- Nodemailer transporter (fallback) -----
let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const getSmtpTransporter = () => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return smtpTransporter;
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
      <p style="color: #4b5563; line-height: 1.6;">
        Hello <strong>${userName}</strong>,
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        We received a request to reset your password. Use the OTP below to reset your password:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          ${otp}
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.
      </p>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #92400e; margin: 0; font-size: 13px;">
          ⚠️ If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding: 20px 0; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Apni Dukan. Secure Cloud Business ERP • Made for Indian MSMEs
      </p>
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
      <p style="color: #4b5563; line-height: 1.6;">
        Hello <strong>${userName}</strong>,
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        Thank you for registering. Please verify your email address using the OTP below:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 15px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          ${otp}
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.
      </p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding: 20px 0; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Apni Dukan. Secure Cloud Business ERP • Made for Indian MSMEs
      </p>
    </div>
  </div>
`;

// ============================================================
// Core send function — tries Resend first, then SMTP, then console
// ============================================================

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  fromName: string = 'Apni Dukan'
): Promise<boolean> => {

  // --- Option 1: Resend (HTTP-based, works on all hosts) ---
  const resend = getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <onboarding@resend.dev>`,
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
  }

  // --- Option 2: SMTP / Nodemailer (fallback) ---
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: config.SMTP_FROM,
        to,
        subject,
        html,
      });
      console.log(`[Email Service] ✅ Email sent via SMTP to ${to}, messageId: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error(`[Email Service] ❌ SMTP failed to send to ${to}`);
      console.error(`[Email Service] Error code: ${error.code}`);
      console.error(`[Email Service] Error message: ${error.message}`);
      return false;
    }
  }

  // --- No provider configured ---
  console.log('═══════════════════════════════════════════');
  console.log(`📧 EMAIL (dev mode — no email provider configured)`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log('═══════════════════════════════════════════');
  return true; // Pretend success in dev
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
