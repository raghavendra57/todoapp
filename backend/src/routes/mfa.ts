import { Router } from 'express';
import { setupMFA, verifyMFA, validateMFA, sendEmailCode } from '../controllers/mfa';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/setup', requireAuth, setupMFA);
router.post('/verify', requireAuth, verifyMFA);
router.post('/validate', requireAuth, validateMFA);
router.post('/send-email', requireAuth, sendEmailCode);

export default router;
