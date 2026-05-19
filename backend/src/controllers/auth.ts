import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';
import redisClient from '../config/redis';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcrypt';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Credential is required' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google Token' });
    }

    const { email, name } = payload;
    const userId = Buffer.from(email).toString('base64');

    const mfaSecret = await redisClient.get(`user:${userId}:mfa_secret`);
    const mfaEnabled = !!mfaSecret;

    const jwtPayload = {
      id: userId,
      email,
      mfaVerified: !mfaEnabled
    };

    const accessToken = generateToken(jwtPayload, '15m');
    const refreshToken = generateToken({ id: userId }, '7d');

    await redisClient.setEx(`user:${userId}:refresh_token`, 7 * 24 * 60 * 60, refreshToken);

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

    res.json({
      message: 'Login successful',
      user: { id: userId, email, name, mfaEnabled },
      requireMfa: mfaEnabled
    });
  } catch (error) {
    console.error('Error verifying Google Token', error);
    return res.status(401).json({ error: 'Invalid Google credential' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  console.log(`[AUTH] Register attempt: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userId = Buffer.from(email).toString('base64');
    const existingUser = await redisClient.get(`user:${userId}:password`);
    
    if (existingUser) {
      console.log(`[AUTH] Register failed: User ${email} already exists`);
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await redisClient.set(`user:${userId}:password`, hashedPassword);
    await redisClient.set(`user:${userId}:name`, name || 'User');

    console.log(`[AUTH] Register success: ${email}`);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log(`[AUTH] Login attempt: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userId = Buffer.from(email).toString('base64');
    const hashedPassword = await redisClient.get(`user:${userId}:password`);
    
    if (!hashedPassword) {
      console.log(`[AUTH] Login failed: User ${email} not found`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      console.log(`[AUTH] Login failed: Password mismatch for ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const name = await redisClient.get(`user:${userId}:name`) || 'User';
    const mfaSecret = await redisClient.get(`user:${userId}:mfa_secret`);
    const mfaEnabled = !!mfaSecret;

    const jwtPayload = {
      id: userId,
      email,
      mfaVerified: !mfaEnabled
    };

    const accessToken = generateToken(jwtPayload, '15m');
    const refreshToken = generateToken({ id: userId }, '7d');

    await redisClient.setEx(`user:${userId}:refresh_token`, 7 * 24 * 60 * 60, refreshToken);

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

    res.json({
      message: 'Login successful',
      user: { id: userId, email, name, mfaEnabled },
      requireMfa: mfaEnabled
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    // In a real app, decode token to get userId and delete from Redis
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};
