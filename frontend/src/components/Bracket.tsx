import { useMemo } from 'react';
import type { Match, MatchWithPrediction, Prediction } from '../types/bracket';
import { ROUND_NAMES } from '../types/bracket';
import MatchCard from './MatchCard';

interface BracketProps {
  matches: Match[];
  predictions: Prediction[];
  onSubmitPrediction: (matchId: string, winner: string, totalSets: number) => Promise<void>;
}

export default function Bracket({ matches, predictions, onSubmitPrediction }: BracketProps) {

  // Organize matches by round and split into 4 quadrants
  const { topLeftBracket, topRightBracket, bottomLeftBracket, bottomRightBracket, finalFour, championship } = useMemo(() => {
    const grouped: Record<number, MatchWithPrediction[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    matches.forEach(match => {
      const prediction = predictions.find(p => p.matchId === match.id);
      grouped[match.round].push({
        ...match,
        userPrediction: prediction,
      });
    });

    // Sort by match number within each round
    Object.keys(grouped).forEach(round => {
      grouped[Number(round)].sort((a, b) => a.matchNumber - b.matchNumber);
    });

    // Split round 1 into 4 quadrants (8 matches each)
    // Top left: matches 1-8
    // Top right: matches 9-16
    // Bottom left: matches 17-24
    // Bottom right: matches 25-32
    const round1Matches = grouped[1];
    const topLeftR1 = round1Matches.slice(0, 8);    // Matches 1-8
    const topRightR1 = round1Matches.slice(8, 16);  // Matches 9-16
    const bottomLeftR1 = round1Matches.slice(16, 24); // Matches 17-24
    const bottomRightR1 = round1Matches.slice(24, 32); // Matches 25-32

    // For subsequent rounds, distribute proportionally
    const topLeftBracket: Record<number, MatchWithPrediction[]> = { 1: topLeftR1 };
    const topRightBracket: Record<number, MatchWithPrediction[]> = { 1: topRightR1 };
    const bottomLeftBracket: Record<number, MatchWithPrediction[]> = { 1: bottomLeftR1 };
    const bottomRightBracket: Record<number, MatchWithPrediction[]> = { 1: bottomRightR1 };

    // Distribute rounds 2-4 proportionally
    [2, 3, 4].forEach(round => {
      const roundMatches = grouped[round];
      const quarterSize = Math.ceil(roundMatches.length / 4);
      topLeftBracket[round] = roundMatches.slice(0, quarterSize);
      topRightBracket[round] = roundMatches.slice(quarterSize, quarterSize * 2);
      bottomLeftBracket[round] = roundMatches.slice(quarterSize * 2, quarterSize * 3);
      bottomRightBracket[round] = roundMatches.slice(quarterSize * 3);
    });

    return {
      topLeftBracket,
      topRightBracket,
      bottomLeftBracket,
      bottomRightBracket,
      finalFour: grouped[5], // Semifinals
      championship: grouped[6], // Championship
    };
  }, [matches, predictions]);

  const handlePredict = async (matchId: string, winner: string, totalSets: number) => {
    await onSubmitPrediction(matchId, winner, totalSets);
  };

  // Calculate expected matches for each round based on standard bracket progression
  const getExpectedMatchCount = (round: number, quadrantSize: number) => {
    // Round 1: quadrantSize matches (8 for each quadrant)
    // Round 2: quadrantSize / 2 matches (4 for each quadrant)
    // Round 3: quadrantSize / 4 matches (2 for each quadrant)
    // Round 4: quadrantSize / 8 matches (1 for each quadrant)
    return Math.ceil(quadrantSize / Math.pow(2, round - 1));
  };

  const renderQuadrant = (bracket: Record<number, MatchWithPrediction[]>, label: string, isRightSide: boolean = false) => {
    const rounds = isRightSide ? [4, 3, 2, 1] : [1, 2, 3, 4];
    const quadrantSize = 8; // Each quadrant has 8 teams
    const matchHeight = 120; // Approximate height of a match card including gap

    return (
      <div className="flex gap-8">
        {rounds.map((round) => {
          const matches = bracket[round] || [];
          const expectedCount = getExpectedMatchCount(round, quadrantSize);

          // Create array with actual matches + empty placeholders
          const displayMatches: (MatchWithPrediction | null)[] = [
            ...matches,
            ...Array(Math.max(0, expectedCount - matches.length)).fill(null)
          ];

          // Calculate vertical spacing for proper alignment
          // Each subsequent round should be centered between pairs of previous round matches
          const spacingMultiplier = Math.pow(2, round - 1);
          const baseMargin = (matchHeight * (spacingMultiplier - 1)) / 2;

          return (
            <div key={`${label}-${round}`} className="flex flex-col relative">
              <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {ROUND_NAMES[round]}
                </h3>
                <p className="text-sm text-gray-600">
                  {matches.length}/{expectedCount} matches
                </p>
              </div>
              <div className="flex flex-col">
                {displayMatches.map((match, idx) => {
                  // Calculate margin for proper alignment
                  // First match needs offset to center between previous round matches
                  // Subsequent matches need gap to align with their feeding matches
                  const marginTop = idx === 0 ? baseMargin : matchHeight * spacingMultiplier;

                  return (
                  <div
                    key={match?.id || `empty-${label}-${round}-${idx}`}
                    className="relative"
                    style={{
                      marginTop: `${marginTop}px`,
                    }}
                  >
                    <MatchCard
                      match={match || undefined}
                      onPredict={handlePredict}
                      isEmpty={!match}
                    />

                    {/* Connecting line to next round */}
                    {round < 4 && (
                      <div
                        className={`absolute top-1/2 ${isRightSide ? '-left-8' : '-right-8'} w-8 h-px bg-blue-400`}
                        style={{ zIndex: 1 }}
                      />
                    )}

                    {/* Vertical connecting line between pairs */}
                    {idx % 2 === 0 && idx < displayMatches.length - 1 && (
                      <div
                        className={`absolute ${isRightSide ? '-left-8' : '-right-8'} w-px bg-blue-400`}
                        style={{
                          top: '50%',
                          height: `${matchHeight * spacingMultiplier}px`,
                          zIndex: 1,
                        }}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="bracket-container overflow-x-auto pb-8">
        <div className="flex flex-col gap-12 px-4">
          {/* TOP ROW - Top Left and Top Right Quadrants */}
          <div className="flex gap-8">
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-blue-50">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Top Left Region (1-8)</h2>
              {renderQuadrant(topLeftBracket, 'top-left', false)}
            </div>

            <div className="border-2 border-gray-300 rounded-lg p-4 bg-green-50">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Top Right Region (9-16)</h2>
              {renderQuadrant(topRightBracket, 'top-right', true)}
            </div>
          </div>

          {/* CENTER - Final Four & Championship */}
          <div className="flex flex-col items-center justify-center gap-8 px-8">
            {/* Final Four (Semifinals) */}
            <div className="flex flex-col items-center">
              <div className="bg-blue-600 px-6 py-2 rounded-lg shadow-lg mb-6">
                <h3 className="text-lg font-bold text-white text-center">
                  {ROUND_NAMES[5]}
                </h3>
              </div>
              <div className="flex flex-col gap-8">
                {finalFour.map((match) => (
                  <MatchCard key={match.id} match={match} onPredict={handlePredict} />
                ))}
              </div>
            </div>

            {/* Championship */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-6 py-3 rounded-lg shadow-xl mb-6">
                <h3 className="text-xl font-bold text-white text-center">
                  🏆 {ROUND_NAMES[6]}
                </h3>
              </div>
              {championship.map(match => (
                <MatchCard key={match.id} match={match} onPredict={handlePredict} />
              ))}
            </div>
          </div>

          {/* BOTTOM ROW - Bottom Left and Bottom Right Quadrants */}
          <div className="flex gap-8">
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-yellow-50">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Lower Left Region (17-24)</h2>
              {renderQuadrant(bottomLeftBracket, 'bottom-left', false)}
            </div>

            <div className="border-2 border-gray-300 rounded-lg p-4 bg-purple-50">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Lower Right Region (25-32)</h2>
              {renderQuadrant(bottomRightBracket, 'bottom-right', true)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
