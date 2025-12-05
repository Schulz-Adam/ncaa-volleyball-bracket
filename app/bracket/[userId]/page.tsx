'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, useParams } from 'next/navigation';
import { fetchMatches, fetchUserPredictions } from '@/lib/api';
import type { Match, Prediction } from '@/types/bracket';
import type { User } from '@/types/auth';
import Bracket from '@/components/Bracket';
import Link from 'next/link';

export default function UserBracketPage() {
  const { user: currentUser, isAuthenticated, logout, initAuth } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bracketUser, setBracketUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

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
  }, [isAuthenticated, router, userId, initialized]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [matchesData, userPredictionsData] = await Promise.all([
        fetchMatches(),
        fetchUserPredictions(userId),
      ]);

      setMatches(matchesData);
      setPredictions(userPredictionsData.predictions);
      setBracketUser(userPredictionsData.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
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

  const isOwnBracket = currentUser?.id === userId;

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">VolleyTalk Bracket</h1>
              <div className="flex items-center gap-2">
                <Link href="/">
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {isOwnBracket ? 'My Bracket' : 'Bracket'}
                  </button>
                </Link>
                <Link href="/leaderboard">
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    Leaderboard
                  </button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                {currentUser?.displayName || currentUser?.email}
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

        {!loading && !error && bracketUser && (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isOwnBracket ? 'Your Bracket' : `${bracketUser.displayName || bracketUser.email.split('@')[0]}'s Bracket`}
                    </h2>
                    {bracketUser.bracketSubmitted && (
                      <p className="mt-1 text-sm text-gray-600">
                        Submitted on {new Date(bracketUser.bracketSubmittedAt!).toLocaleDateString()}
                      </p>
                    )}
                    {!bracketUser.bracketSubmitted && (
                      <p className="mt-1 text-sm text-gray-600">
                        Not yet submitted
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total Predictions</div>
                    <div className="text-3xl font-bold text-blue-600">{predictions.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <Bracket
              matches={matches}
              predictions={predictions}
              onSubmitPrediction={async () => {}}
              onResetPrediction={async () => {}}
              bracketSubmitted={true}
              readOnly={true}
            />
          </>
        )}
      </main>
    </div>
  );
}
