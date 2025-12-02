import express from 'express';
import { signup, login, getCurrentUser, submitBracket } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.post('/submit-bracket', authenticateToken, submitBracket);

export default router;
