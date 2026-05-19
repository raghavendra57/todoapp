import { Router } from 'express';
import { googleAuth, logout, login, register } from '../controllers/auth';

const router = Router();

router.post('/google', googleAuth);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

export default router;
