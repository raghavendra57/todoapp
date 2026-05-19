import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import redisClient from '../config/redis';
import { encrypt, decrypt } from '../utils/crypto';
import { AuthRequest } from '../middleware/auth';
import { generateToken } from '../utils/jwt';
import { sendEmailOTP } from '../utils/email';

export const setupMFA = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const secret = speakeasy.generateSecret({ name: `TodoApp (${req.user?.email})` });
  
  // Encrypt secret before storing temporarily
  await redisClient.setEx(`mfa_temp:${userId}`, 600, encrypt(secret.base32)); // 10 mins expiry

  if (!secret.otpauth_url) return res.status(500).json({ error: 'Failed to generate QR code' });

  QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) return res.status(500).json({ error: 'Failed to generate QR code' });
    res.json({ secret: secret.base32, qrCode: data_url });
  });
};

export const verifyMFA = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { token } = req.body;

  if (!userId || !token) return res.status(400).json({ error: 'Invalid request' });

  const encryptedSecret = await redisClient.get(`mfa_temp:${userId}`);
  if (!encryptedSecret) return res.status(400).json({ error: 'MFA setup session expired or invalid' });

  const secret = decrypt(encryptedSecret);

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token
  });

  // Check email OTP if TOTP fails
  let emailVerified = false;
  if (!verified) {
    const savedEmailOtp = await redisClient.get(`email_otp:${userId}`);
    if (savedEmailOtp === token) {
      emailVerified = true;
      await redisClient.del(`email_otp:${userId}`);
    }
  }

  if (verified || emailVerified) {
    // Move to permanent storage
    await redisClient.set(`user:${userId}:mfa_secret`, encryptedSecret);
    await redisClient.del(`mfa_temp:${userId}`);
    
    // Update JWT
    const { exp, iat, ...cleanUser } = req.user as any;
    const payload = { ...cleanUser, mfaVerified: true };
    const accessToken = generateToken(payload, '15m');
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    
    res.json({ message: 'MFA successfully enabled' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
};

export const validateMFA = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { token } = req.body;

  if (!userId || !token) return res.status(400).json({ error: 'Invalid request' });

  const encryptedSecret = await redisClient.get(`user:${userId}:mfa_secret`);
  const savedEmailOtp = await redisClient.get(`email_otp:${userId}`);
  
  console.log(`[OTP DEBUG] User: ${userId}, Received: ${token}, SavedEmailOTP: ${savedEmailOtp}`);

  // 1. Check Email OTP first
  if (savedEmailOtp && savedEmailOtp === token) {
    await redisClient.del(`email_otp:${userId}`);
    const { exp, iat, ...cleanUser } = req.user as any;
    const payload = { ...cleanUser, mfaVerified: true };
    const accessToken = generateToken(payload, '15m');
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return res.json({ message: 'MFA validated successfully via email' });
  }

  // 2. If no email OTP, check TOTP if enabled
  if (encryptedSecret) {
    const secret = decrypt(encryptedSecret);
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token
    });

    if (verified) {
      const { exp, iat, ...cleanUser } = req.user as any;
      const payload = { ...cleanUser, mfaVerified: true };
      const accessToken = generateToken(payload, '15m');
      res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      return res.json({ message: 'MFA validated successfully' });
    }
  }

  // 3. If everything fails
  res.status(400).json({ error: 'Invalid OTP or MFA session expired' });

};

export const sendEmailCode = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) return res.status(401).json({ error: 'Unauthorized' });

  // Generate a random 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in Redis with 10 min expiry
  await redisClient.setEx(`email_otp:${userId}`, 600, otp);

  try {
    await sendEmailOTP(email, otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Email send error', error);
    res.status(500).json({ error: 'Failed to send email OTP' });
  }
};

