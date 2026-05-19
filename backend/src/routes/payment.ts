import { Router } from 'express';
import { createOrder, verifyPayment, checkPremium } from '../controllers/payment';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);
router.get('/status', requireAuth, checkPremium);

export default router;
