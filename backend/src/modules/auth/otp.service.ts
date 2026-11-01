import otpGenerator from 'otp-generator';
import nodemailer from 'nodemailer';
import path from 'path';

// In-memory store for OTPs. In production, use Redis or DB.
// Map<email, { otp, expiresAt }>
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

// Configure Nodemailer transport
// Note: In a real app, use environment variables for credentials.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SUPERADMIN_EMAIL = 'super.admin@probus.io';
const SUPERADMIN_FIXED_OTP = '749261';

export const generateAndSendOTP = async (email: string): Promise<void> => {
  // If it's the superadmin, we don't need to generate a new one or send an email.
  if (email === SUPERADMIN_EMAIL) {
    console.log(`[DEV MODE] Superadmin login requested. Use fixed OTP.`);
    return;
  }

  // Generate a 6-digit numeric OTP
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    digits: true
  });

  // Store OTP with a 5-minute expiration
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  otpStore.set(email, { otp, expiresAt });

  // For development without SMTP setup, just log it.
  if (!process.env.SMTP_USER) {
    console.log(`[DEV MODE] Generated OTP for ${email}: ${otp}`);
    return;
  }

  // Send the email
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Prolt Operations Centre" <proltenergy.operations@probus.io>',
    to: email,
    subject: 'Your Login OTP - Prolt by Probus',
    text: `Your One-Time Password (OTP) for login is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #e6e8fc; padding: 24px; text-align: center; border-bottom: 1px solid #e0e0e0;">
          <img src="cid:proltlogo" alt="Prolt Energy by Probus" style="max-height: 50px; width: auto;" />
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #333333; margin-top: 0; font-size: 22px;">Secure Login Verification</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            You have requested to log in to the Prolt Operations Centre. Please use the One-Time Password (OTP) below to complete your secure sign-in.
          </p>
          <div style="background-color: #f4f6f8; border-radius: 8px; padding: 20px; display: inline-block; margin-bottom: 30px; border: 1px dashed #cccccc;">
            <span style="font-size: 36px; font-weight: bold; color: #0d47a1; letter-spacing: 4px;">${otp}</span>
          </div>
          <p style="color: #d32f2f; font-size: 14px; font-weight: 500; margin-bottom: 0;">
            ⏳ This code will expire in 5 minutes.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.5;">
            If you did not request this login, please ignore this email or contact your administrator immediately.
          </p>
          <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
            &copy; ${new Date().getFullYear()} Probus. All rights reserved.
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(process.cwd(), 'assets', 'logo.png'),
        cid: 'proltlogo'
      }
    ]
  });
};

export const verifyOTP = (email: string, enteredOtp: string): boolean => {
  // Superadmin bypass
  if (email === SUPERADMIN_EMAIL) {
    return enteredOtp === SUPERADMIN_FIXED_OTP;
  }

  const stored = otpStore.get(email);
  if (!stored) {
    return false;
  }

  // Check if expired
  if (stored.expiresAt < new Date()) {
    otpStore.delete(email); // Clean up expired OTP
    return false;
  }

  // Verify
  if (stored.otp === enteredOtp) {
    // Clear OTP after successful use
    otpStore.delete(email);
    return true;
  }

  return false;
};
