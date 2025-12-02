import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import matchRoutes from './routes/matchRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { prisma } from './lib/prisma.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'NCAA Volleyball Bracket API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login'
      },
      matches: {
        list: 'GET /api/matches',
        get: 'GET /api/matches/:id'
      },
      predictions: {
        list: 'GET /api/predictions',
        create: 'POST /api/predictions',
        update: 'PUT /api/predictions/:id'
      },
      admin: {
        completeMatch: 'POST /api/admin/matches/:id/complete',
        recalculate: 'POST /api/admin/matches/:id/recalculate',
        completedMatches: 'GET /api/admin/matches/completed'
      },
      health: 'GET /health'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/admin', adminRoutes);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Auth routes: POST /api/auth/login, POST /api/auth/signup`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server');
  server.close(() => {
    process.exit(0);
  });
});

