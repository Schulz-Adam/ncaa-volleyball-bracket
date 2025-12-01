import { useState } from 'react';
import type { MatchWithPrediction } from '../types/bracket';

interface MatchCardProps {
  match: MatchWithPrediction;
  onPredict: (matchId: string, winner: string, totalSets: number) => void;
}

export default function MatchCard({ match, onPredict }: MatchCardProps) {
  const [selectedWinner, setSelectedWinner] = useState<'team1' | 'team2' | null>(null);
  const isPredicted = !!match.userPrediction;
  const isCompleted = match.completed;

  const getTeamClasses = (team: 'team1' | 'team2') => {
    const baseClasses = 'px-3 py-2 text-sm transition-colors';

    if (isCompleted && match.winner === team) {
      return `${baseClasses} bg-green-100 font-semibold text-green-900`;
    }

    if (isPredicted && match.userPrediction?.predictedWinner === team) {
      return `${baseClasses} bg-blue-50 font-medium text-blue-900`;
    }

    // Highlight selected team when making prediction
    if (!isPredicted && !isCompleted && selectedWinner === team) {
      return `${baseClasses} bg-blue-100 font-medium text-blue-900 cursor-pointer`;
    }

    if (!isPredicted && !isCompleted) {
      return `${baseClasses} hover:bg-blue-50 cursor-pointer`;
    }

    return `${baseClasses}`;
  };

  const handleTeamClick = (team: 'team1' | 'team2') => {
    if (!isCompleted && !isPredicted) {
      setSelectedWinner(team);
    }
  };

  const handleSetSelection = (totalSets: number) => {
    if (selectedWinner) {
      onPredict(match.id, selectedWinner, totalSets);
      setSelectedWinner(null);
    }
  };

  const getPredictionStatus = () => {
    if (!isPredicted) return null;

    const prediction = match.userPrediction!;

    if (isCompleted) {
      if (prediction.pointsEarned !== null && prediction.pointsEarned > 0) {
        return (
          <div className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
            +{prediction.pointsEarned} pts
          </div>
        );
      } else if (prediction.pointsEarned === 0) {
        return (
          <div className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
            0 pts
          </div>
        );
      }
    }

    return (
      <div className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">
        Predicted
      </div>
    );
  };

  const getScore = (team: 'team1' | 'team2') => {
    if (!match.sets || match.sets.length === 0) return null;

    const wins = match.sets.filter(set => {
      const team1Won = set.team1Score > set.team2Score;
      return team === 'team1' ? team1Won : !team1Won;
    }).length;

    return wins;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow min-w-[200px]">
      {/* Match Header */}
      <div className="bg-gray-50 px-3 py-1 border-b border-gray-200 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600">
          Match {match.matchNumber}
        </span>
        {getPredictionStatus()}
      </div>

      {/* Teams */}
      <div className="divide-y divide-gray-200">
        <div
          className={getTeamClasses('team1')}
          onClick={() => handleTeamClick('team1')}
        >
          <div className="flex justify-between items-center">
            <span className="flex-1 truncate">{match.team1}</span>
            {isCompleted && match.sets && (
              <span className="ml-2 font-bold text-gray-900">{getScore('team1')}</span>
            )}
          </div>
        </div>
        <div
          className={getTeamClasses('team2')}
          onClick={() => handleTeamClick('team2')}
        >
          <div className="flex justify-between items-center">
            <span className="flex-1 truncate">{match.team2}</span>
            {isCompleted && match.sets && (
              <span className="ml-2 font-bold text-gray-900">{getScore('team2')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Set Selection for Prediction */}
      {!isCompleted && !isPredicted && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2 justify-center items-center">
            <span className="text-xs text-gray-600 mr-1">Sets:</span>
            {[3, 4, 5].map(sets => (
              <button
                key={sets}
                onClick={() => handleSetSelection(sets)}
                disabled={!selectedWinner}
                className={`
                  w-10 h-10 rounded border-2 font-bold text-sm transition-all
                  ${selectedWinner
                    ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white cursor-pointer'
                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {sets}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show prediction details if already predicted */}
      {!isCompleted && isPredicted && match.userPrediction && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-200">
          <div className="text-xs text-center text-blue-800">
            Predicted {match.userPrediction.predictedTotalSets} sets
          </div>
        </div>
      )}

      {/* Match Date */}
      <div className="px-3 py-1 bg-gray-50 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {new Date(match.matchDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
