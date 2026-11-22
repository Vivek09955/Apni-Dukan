import nodemailer from 'nodemailer';
import { config } from '../config/env';

/**
 * Create Nodemailer transporter.
 * In development without SMTP_HOST, it logs OTPs to the console.
 * In production, it uses Gmail SMTP or any configured SMTP server.
 */
const createTransporter = () => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    console.warn(
      '[Email Service] SMTP not configured. Emails will be logged to console only.'
    );
    return null;
  }

  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465, // true for 465, false for 587/others
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
    connectionTimeout: 10000,  // 10 seconds to connect
    greetingTimeout: 10000,    // 10 seconds for greeting
    socketTimeout: 15000,      // 15 seconds socket timeout
  });
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send password reset OTP email
 */
export const sendPasswordResetOTP = async (
  to: string,
  otp: string,
  userName: string
): Promise<boolean> => {
  const subject = 'Apni Dukan - Password Reset OTP';
  const html = `
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

  return sendEmail(to, subject, html);
};

/**
 * Send email verification OTP
 */
export const sendEmailVerificationOTP = async (
  to: string,
  otp: string,
  userName: string
): Promise<boolean> => {
  const subject = 'Apni Dukan - Verify Your Email';
  const html = `
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

  return sendEmail(to, subject, html);
};

/**
 * Core email sending function
 */
const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  const transport = getTransporter();

  if (!transport) {
    // Dev mode: just log
    console.log('═══════════════════════════════════════════');
    console.log(`📧 EMAIL (dev mode - no SMTP configured)`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log('═══════════════════════════════════════════');
    return true; // Pretend success in dev
  }

  try {
    const info = await transport.sendMail({
      from: config.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log(`[Email Service] Email sent successfully to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Service] ❌ Failed to send email to ${to}`);
    console.error(`[Email Service] Error code: ${error.code}`);
    console.error(`[Email Service] Error message: ${error.message}`);
    console.error(`[Email Service] SMTP Host: ${config.SMTP_HOST}:${config.SMTP_PORT}`);
    console.error(`[Email Service] SMTP User: ${config.SMTP_USER}`);
    console.error(`[Email Service] Full error:`, error);
    return false;
  }
};

export const emailService = {
  generateOTP,
  sendPasswordResetOTP,
  sendEmailVerificationOTP,
};

export default emailService;
