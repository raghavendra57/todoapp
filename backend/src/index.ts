import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectRedis } from './config/redis';
import { startReminderJob } from './jobs/reminder';

// Routes
import authRoutes from './routes/auth';
import mfaRoutes from './routes/mfa';
import todoRoutes from './routes/todo';
import scrapeRoutes from './routes/scrape';
import paymentRoutes from './routes/payment';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per `window`
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Connect Redis
connectRedis().then(() => {
  // Start background jobs
  startReminderJob();
});

// Routes setup
app.use('/api/auth', authRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send('Todo App Backend API is running. Use /api/health to check status.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
