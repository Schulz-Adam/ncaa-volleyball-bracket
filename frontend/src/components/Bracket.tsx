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

  // Organize matches by round and split into left/right brackets
  const { leftBracket, rightBracket, finalFour, championship } = useMemo(() => {
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

    // Split rounds 1-4 into left and right brackets
    const leftBracket: Record<number, MatchWithPrediction[]> = {};
    const rightBracket: Record<number, MatchWithPrediction[]> = {};

    [1, 2, 3, 4].forEach(round => {
      const roundMatches = grouped[round];
      const midpoint = Math.ceil(roundMatches.length / 2);
      leftBracket[round] = roundMatches.slice(0, midpoint);
      rightBracket[round] = roundMatches.slice(midpoint);
    });

    return {
      leftBracket,
      rightBracket,
      finalFour: grouped[5], // Semifinals
      championship: grouped[6], // Championship
    };
  }, [matches, predictions]);

  const handlePredict = async (matchId: string, winner: string, totalSets: number) => {
    await onSubmitPrediction(matchId, winner, totalSets);
  };

  return (
    <>
      <div className="bracket-container overflow-x-auto pb-8">
        <div className="inline-flex gap-8 min-w-min px-4">
          {/* LEFT BRACKET - Rounds 1-4 */}
          <div className="flex gap-8">
            {[1, 2, 3, 4].map(round => (
              <div key={`left-${round}`} className="flex flex-col">
                <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900">
                    {ROUND_NAMES[round]}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {leftBracket[round]?.length || 0} matches
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {(leftBracket[round] || []).map((match, idx) => (
                    <div
                      key={match.id}
                      className="relative"
                      style={{
                        marginTop: round > 1 ? `${Math.pow(2, round - 1) * 20 - 20}px` : 0,
                      }}
                    >
                      <MatchCard match={match} onPredict={handlePredict} />

                      {/* Connecting line to next round */}
                      {round < 4 && (
                        <div className="absolute top-1/2 -right-8 w-8 h-px bg-blue-300" />
                      )}

                      {/* Vertical connecting line */}
                      {idx % 2 === 0 && idx < (leftBracket[round]?.length || 0) - 1 && (
                        <div
                          className="absolute -right-8 w-px bg-blue-300"
                          style={{
                            top: '50%',
                            height: `calc(100% + ${Math.pow(2, round - 1) * 20 + 80}px)`,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
                {finalFour.map((match, idx) => (
                  <div key={match.id} className="relative">
                    <MatchCard match={match} onPredict={handlePredict} />
                    {/* Connecting lines to championship */}
                    {idx === 0 && (
                      <>
                        <div className="absolute top-1/2 left-1/2 transform translate-x-0 w-16 h-px bg-yellow-400" />
                        <div className="absolute top-1/2 left-1/2 transform translate-x-16 w-px bg-yellow-400" style={{ height: '50%' }} />
                      </>
                    )}
                    {idx === 1 && (
                      <>
                        <div className="absolute bottom-1/2 left-1/2 transform translate-x-16 w-px bg-yellow-400" style={{ height: '50%' }} />
                      </>
                    )}
                  </div>
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

          {/* RIGHT BRACKET - Rounds 4-1 (mirrored) */}
          <div className="flex gap-8">
            {[4, 3, 2, 1].map(round => (
              <div key={`right-${round}`} className="flex flex-col">
                <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900">
                    {ROUND_NAMES[round]}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {rightBracket[round]?.length || 0} matches
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {(rightBracket[round] || []).map((match, idx) => (
                    <div
                      key={match.id}
                      className="relative"
                      style={{
                        marginTop: round > 1 ? `${Math.pow(2, round - 1) * 20 - 20}px` : 0,
                      }}
                    >
                      {/* Connecting line from previous round */}
                      {round < 4 && (
                        <div className="absolute top-1/2 -left-8 w-8 h-px bg-blue-300" />
                      )}

                      {/* Vertical connecting line */}
                      {idx % 2 === 0 && idx < (rightBracket[round]?.length || 0) - 1 && (
                        <div
                          className="absolute -left-8 w-px bg-blue-300"
                          style={{
                            top: '50%',
                            height: `calc(100% + ${Math.pow(2, round - 1) * 20 + 80}px)`,
                          }}
                        />
                      )}

                      <MatchCard match={match} onPredict={handlePredict} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
