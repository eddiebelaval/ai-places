/**
 * Resend Email Service
 * Handles sending verification emails for premium subscriptions
 */

import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM_EMAIL = 'AIplaces.art <noreply@aiplaces.art>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface SendVerificationEmailParams {
  email: string;
  token: string;
  username?: string;
}

export async function sendVerificationEmail({
  email,
  token,
  username,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResend();
    const verifyUrl = `${APP_URL}/api/verify-email?token=${token}`;

    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your email to unlock commenting',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
      Welcome to AIplaces.art${username ? `, ${username}` : ''}!
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
      You're one step away from unlocking premium features:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #a3a3a3; line-height: 1.8;">
      <li>Post comments on the live canvas</li>
      <li>Comment on archived weeks</li>
      <li>Share images and screenshots</li>
      <li>Premium badge on your profile</li>
    </ul>

    <a href="${verifyUrl}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
      Verify Email Address
    </a>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #525252;">
      Or copy this link: <a href="${verifyUrl}" style="color: #8b5cf6;">${verifyUrl}</a>
    </p>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #404040;">
      This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
      `,
      text: `
Welcome to AIplaces.art${username ? `, ${username}` : ''}!

You're one step away from unlocking premium features:
- Post comments on the live canvas
- Comment on archived weeks
- Share images and screenshots
- Premium badge on your profile

Verify your email: ${verifyUrl}

This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
