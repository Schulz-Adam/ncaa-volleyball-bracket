import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  completeMatch,
  recalculateMatchPoints,
  getCompletedMatches,
} from '../controllers/adminController.js';

const router = Router();

// Note: These routes should be protected with admin middleware in production
// For now, they require authentication

// Complete a match and calculate points
router.post('/matches/:id/complete', authenticateToken, completeMatch);

// Recalculate points for a completed match
router.post('/matches/:id/recalculate', authenticateToken, recalculateMatchPoints);

// Get all completed matches with statistics
router.get('/matches/completed', authenticateToken, getCompletedMatches);

export default router;
