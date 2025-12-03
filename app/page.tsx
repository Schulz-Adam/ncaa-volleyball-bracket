'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import type { Match, Prediction } from '@/types/bracket';
import { fetchMatches, fetchPredictions, submitPrediction, deletePrediction, submitBracket } from '@/lib/api';
import Bracket from '@/components/Bracket';
import RulesModal from '@/components/RulesModal';

export default function Home() {
  const { user, isAuthenticated, logout, updateUser, initAuth } = useAuthStore();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [initialized, setInitialized] = useState(false);

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
    initAuth();
    setInitialized(true);
  }, [initAuth]);

  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();

    // Check if this is the user's first time
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsFirstTime(true);
      setShowRulesModal(true);
    }
  }, [isAuthenticated, router, loadData, initialized]);

  const handleCloseRulesModal = () => {
    setShowRulesModal(false);
    if (isFirstTime) {
      localStorage.setItem('hasSeenWelcome', 'true');
      setIsFirstTime(false);
    }
  };

  const handleOpenRulesModal = () => {
    setIsFirstTime(false);
    setShowRulesModal(true);
  };

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

  const handleResetPrediction = async (matchId: string) => {
    try {
      const prediction = predictions.find(p => p.matchId === matchId);
      if (prediction) {
        await deletePrediction(prediction.id);
        setPredictions(prev => prev.filter(p => p.id !== prediction.id));
        // Reload all data to update dependent predictions
        await loadData();
      }
    } catch (err) {
      console.error('Failed to reset prediction:', err);
      alert('Failed to reset prediction');
    }
  };

  const handleSubmitBracket = async () => {
    if (!confirm('Are you sure you want to submit your bracket? You will not be able to make any more changes after submitting.')) {
      return;
    }

    try {
      const response = await submitBracket();
      updateUser(response.user);
      alert('Bracket submitted successfully! You can no longer make changes.');
    } catch (err) {
      console.error('Failed to submit bracket:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit bracket');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!initialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">VolleyTalk Bracket</h1>
              {!loading && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      {matches.length} matches
                    </span>
                    <span className="text-blue-600 font-medium">
                      {predictions.length} predictions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Bracket
                    </button>
                    <button
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
                    >
                      Leaderboard
                    </button>
                    <button
                      onClick={handleOpenRulesModal}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Rules
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {!user?.bracketSubmitted && (
                <button
                  onClick={handleSubmitBracket}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                >
                  Submit Bracket
                </button>
              )}
              {user?.bracketSubmitted && (
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-md font-medium border border-green-300">
                  ✓ Bracket Submitted
                </span>
              )}
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
            onResetPrediction={handleResetPrediction}
            bracketSubmitted={user?.bracketSubmitted || false}
          />
        )}
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={handleCloseRulesModal}
        isFirstTime={isFirstTime}
      />
    </div>
  );
}
