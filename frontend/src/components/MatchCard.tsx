import { useState } from 'react';
import type { MatchWithPrediction } from '../types/bracket';

interface MatchCardProps {
  match?: MatchWithPrediction;
  onPredict: (matchId: string, winner: string, totalSets: number) => void;
  onResetPrediction?: (matchId: string) => void;
  isEmpty?: boolean;
  bracketSubmitted?: boolean;
}

export default function MatchCard({ match, onPredict, onResetPrediction, isEmpty = false, bracketSubmitted = false }: MatchCardProps) {
  const [selectedWinner, setSelectedWinner] = useState<'team1' | 'team2' | null>(null);

  // If empty match placeholder or teams not determined yet
  if (isEmpty || !match || !match.team1 || !match.team2 || match.team1 === 'TBD' || match.team2 === 'TBD') {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 border-dashed rounded-lg shadow-sm min-w-[200px] h-[120px] flex flex-col">
        {/* Header - empty but reserves space for prediction status */}
        <div className="bg-gray-200 px-3 py-1 border-b border-gray-300 flex justify-end items-center min-h-[28px]">
          {/* Empty space for prediction status */}
        </div>

        {/* Teams */}
        <div className="divide-y divide-gray-300 flex-1">
          <div className="px-3 py-2 text-sm text-gray-400">
            <span>{match?.team1 && match.team1 !== 'TBD' ? match.team1 : 'Winner TBD'}</span>
          </div>
          <div className="px-3 py-2 text-sm text-gray-400">
            <span>{match?.team2 && match.team2 !== 'TBD' ? match.team2 : 'Winner TBD'}</span>
          </div>
        </div>

        {/* Set Selection - disabled */}
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2 justify-center items-center">
            <span className="text-xs text-gray-600 mr-1">Sets:</span>
            {[3, 4, 5].map(sets => (
              <button
                key={sets}
                disabled
                className="w-10 h-10 rounded border-2 font-bold text-sm border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                {sets}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
    if (!isPredicted && !isCompleted && selectedWinner === team && !bracketSubmitted) {
      return `${baseClasses} bg-blue-100 font-medium text-blue-900 cursor-pointer`;
    }

    if (!isPredicted && !isCompleted && !bracketSubmitted) {
      return `${baseClasses} hover:bg-blue-50 cursor-pointer`;
    }

    return `${baseClasses}`;
  };

  const handleTeamClick = (team: 'team1' | 'team2') => {
    if (!isCompleted && !isPredicted && !bracketSubmitted) {
      setSelectedWinner(team);
    }
  };

  const handleSetSelection = (totalSets: number) => {
    if (selectedWinner && !bracketSubmitted) {
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
      <div className="flex items-center gap-1">
        <div className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">
          Predicted
        </div>
        {onResetPrediction && !bracketSubmitted && (
          <button
            onClick={() => onResetPrediction(match.id)}
            className="w-5 h-5 flex items-center justify-center text-red-600 hover:bg-red-100 rounded transition-colors"
            title="Reset prediction"
          >
            ×
          </button>
        )}
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
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow min-w-[200px] h-[120px] flex flex-col">
      {/* Header - no match number, just prediction status */}
      <div className="bg-gray-50 px-3 py-1 border-b border-gray-200 flex justify-end items-center min-h-[28px]">
        {getPredictionStatus()}
      </div>

      {/* Teams */}
      <div className="divide-y divide-gray-200 flex-1">
        <div
          className={getTeamClasses('team1')}
          onClick={() => handleTeamClick('team1')}
        >
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {match.team1Logo && (
                <img
                  src={match.team1Logo.startsWith('//') ? `https:${match.team1Logo}` : match.team1Logo}
                  alt={`${match.team1} logo`}
                  className="w-6 h-6 object-contain flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {match.team1Seed && (
                <span className="text-xs font-bold text-gray-500 flex-shrink-0">
                  {match.team1Seed}
                </span>
              )}
              <span className="truncate">{match.team1}</span>
            </div>
            {isCompleted && match.sets && (
              <span className="ml-2 font-bold text-gray-900 flex-shrink-0">{getScore('team1')}</span>
            )}
          </div>
        </div>
        <div
          className={getTeamClasses('team2')}
          onClick={() => handleTeamClick('team2')}
        >
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {match.team2Logo && (
                <img
                  src={match.team2Logo.startsWith('//') ? `https:${match.team2Logo}` : match.team2Logo}
                  alt={`${match.team2} logo`}
                  className="w-6 h-6 object-contain flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {match.team2Seed && (
                <span className="text-xs font-bold text-gray-500 flex-shrink-0">
                  {match.team2Seed}
                </span>
              )}
              <span className="truncate">{match.team2}</span>
            </div>
            {isCompleted && match.sets && (
              <span className="ml-2 font-bold text-gray-900 flex-shrink-0">{getScore('team2')}</span>
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
    </div>
  );
}
