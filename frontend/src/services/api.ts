import type { Match, Prediction } from '../types/bracket';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

function getAuthToken(): string | null {
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
  const response = await fetch(`${API_BASE_URL}/matches`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }

  return response.json();
}

export async function fetchPredictions(): Promise<Prediction[]> {
  const response = await fetch(`${API_BASE_URL}/predictions`, {
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
  const response = await fetch(`${API_BASE_URL}/predictions`, {
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
  const response = await fetch(`${API_BASE_URL}/predictions/${predictionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete prediction');
  }
}

export async function submitBracket(): Promise<{ user: any }> {
  const response = await fetch(`${API_BASE_URL}/auth/submit-bracket`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit bracket');
  }

  return response.json();
}
