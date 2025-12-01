import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import type { Match, Prediction } from '../types/bracket';
import { fetchMatches, fetchPredictions, submitPrediction } from '../services/api';
import Bracket from '../components/Bracket';

export default function Home() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [matchesData, predictionsData] = await Promise.all([
        fetchMatches(),
        fetchPredictions(),
      ]);
      setMatches(matchesData);
      setPredictions(predictionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate, loadData]);

  const handleSubmitPrediction = async (
    matchId: string,
    winner: string,
    totalSets: number
  ) => {
    try {
      const newPrediction = await submitPrediction(matchId, winner, totalSets);
      setPredictions(prev => [...prev, newPrediction]);
    } catch (err) {
      throw err; // Re-throw to be handled by PredictionModal
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">NCAA Volleyball Bracket</h1>
              {!loading && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    {matches.length} matches
                  </span>
                  <span className="text-blue-600 font-medium">
                    {predictions.length} predictions
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                {user?.displayName || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        {loading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bracket...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">No matches available</h3>
              <p className="text-gray-700">
                The tournament bracket will be available once matches are scheduled.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <Bracket
            matches={matches}
            predictions={predictions}
            onSubmitPrediction={handleSubmitPrediction}
          />
        )}
      </main>
    </div>
  );
}
