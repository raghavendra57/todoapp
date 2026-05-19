import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import redisClient from '../config/redis';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_for_test'
});

export const createOrder = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const isMock = process.env.RAZORPAY_KEY === 'dummy-razorpay-key' || process.env.RAZORPAY_SECRET === 'dummy_secret_for_test' || !process.env.RAZORPAY_SECRET;
    
    if (isMock) {
      // Return a mock order
      return res.json({
        orderId: `order_mock_${Date.now()}`,
        amount: 9900,
        currency: 'INR'
      });
    }

    const options = {
      amount: 9900, // Amount in paise (99.00 INR)
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error: any) {
    console.error('Create order error details:', error.error || error);
    res.status(500).json({ error: 'Failed to create order', details: error.error?.description || error.message });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const isMock = razorpay_order_id?.startsWith('order_mock_');

  if (isMock) {
    // Skip signature verification for mock orders
    await redisClient.set(`user:${userId}:premium`, 'true');
    return res.json({ message: 'Mock payment verified successfully, upgraded to premium!' });
  }

  const secret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === razorpay_signature) {
    await redisClient.set(`user:${userId}:premium`, 'true');
    res.json({ message: 'Payment verified successfully, upgraded to premium!' });
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
};

export const checkPremium = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const isPremium = await redisClient.get(`user:${userId}:premium`);
  res.json({ premium: isPremium === 'true' });
};
