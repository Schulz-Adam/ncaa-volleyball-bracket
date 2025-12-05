import type { Match, Prediction } from '@/types/bracket';
import type { User } from '@/types/auth';
import type { LeaderboardEntry } from '@/types/leaderboard';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchMatches(): Promise<Match[]> {
  const response = await fetch('/api/matches', {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }

  return response.json();
}

export async function fetchPredictions(): Promise<Prediction[]> {
  const response = await fetch('/api/predictions', {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch predictions');
  }

  return response.json();
}

export async function submitPrediction(
  matchId: string,
  predictedWinner: string,
  predictedTotalSets: number
): Promise<Prediction> {
  const response = await fetch('/api/predictions', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      matchId,
      predictedWinner,
      predictedTotalSets,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit prediction');
  }

  return response.json();
}

export async function deletePrediction(predictionId: string): Promise<void> {
  const response = await fetch(`/api/predictions/${predictionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete prediction');
  }
}

export async function submitBracket(): Promise<{ user: User; message: string }> {
  const response = await fetch('/api/auth/submit-bracket', {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to submit bracket');
  }

  return response.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch('/api/leaderboard', {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}

export async function fetchUserPredictions(userId: string): Promise<{
  user: User;
  predictions: Prediction[];
}> {
  const response = await fetch(`/api/users/${userId}/predictions`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user predictions');
  }

  return response.json();
}
