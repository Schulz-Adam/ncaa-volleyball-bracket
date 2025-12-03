'use client';

import { useState } from 'react';
import type { Match } from '@/types/bracket';

interface PredictionModalProps {
  match: Match;
  onSubmit: (winner: string, totalSets: number) => Promise<void>;
  onClose: () => void;
}

export default function PredictionModal({ match, onSubmit, onClose }: PredictionModalProps) {
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [selectedSets, setSelectedSets] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async () => {
    if (!selectedWinner) {
      setError('Please select a winner');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(selectedWinner, selectedSets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit prediction');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Make Your Prediction</h2>
          <p className="text-sm text-gray-600 mt-1">Match {match.matchNumber}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Winner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Who will win?
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedWinner('team1')}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedWinner === 'team1'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                }`}
              >
                {match.team1}
              </button>
              <button
                onClick={() => setSelectedWinner('team2')}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedWinner === 'team2'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                }`}
              >
                {match.team2}
              </button>
            </div>
          </div>

          {/* Total Sets Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Total sets in the match?
            </label>
            <div className="flex gap-2">
              {[3, 4, 5].map(sets => (
                <button
                  key={sets}
                  onClick={() => setSelectedSets(sets)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedSets === sets
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-300 hover:border-gray-400 text-gray-900'
                  }`}
                >
                  {sets}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Volleyball matches are best of 5 sets
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Scoring:</strong> Correct winner + correct total sets = maximum points
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedWinner}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
}
