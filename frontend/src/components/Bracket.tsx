import { useMemo } from 'react';
import type { Match, MatchWithPrediction, Prediction } from '../types/bracket';
import { ROUND_NAMES } from '../types/bracket';
import MatchCard from './MatchCard';


interface BracketProps {
  matches: Match[];
  predictions: Prediction[];
  onSubmitPrediction: (matchId: string, winner: string, totalSets: number) => Promise<void>;
  onResetPrediction: (matchId: string) => Promise<void>;
  bracketSubmitted: boolean;
}

export default function Bracket({ matches, predictions, onSubmitPrediction, onResetPrediction, bracketSubmitted }: BracketProps) {

  // Helper function to get predicted winner team name from a match
  const getPredictedWinner = (match: Match, prediction?: Prediction): string | null => {
    if (!prediction) return null;
    return prediction.predictedWinner === 'team1' ? match.team1 : match.team2;
  };

  // Helper function to get team logo and seed
  const getTeamInfo = (match: Match, team: 'team1' | 'team2') => {
    return {
      logo: team === 'team1' ? match.team1Logo : match.team2Logo,
      seed: team === 'team1' ? match.team1Seed : match.team2Seed,
    };
  };

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

    // First pass: add all matches with their predictions and sort
    matches.forEach(match => {
      const prediction = predictions.find(p => p.matchId === match.id);
      grouped[match.round].push({
        ...match,
        userPrediction: prediction,
      });
    });

    // Sort by match number within each round FIRST
    Object.keys(grouped).forEach(round => {
      grouped[Number(round)].sort((a, b) => a.matchNumber - b.matchNumber);
    });

    // Second pass: populate later rounds with predicted winners
    // For each round, check if previous round has predictions and update teams
    for (let round = 2; round <= 6; round++) {
      const currentRound = grouped[round];
      const previousRound = grouped[round - 1];

      currentRound.forEach((match, matchIdx) => {
        // Each match in current round gets teams from 2 matches in previous round
        const prevMatch1Idx = matchIdx * 2;
        const prevMatch2Idx = matchIdx * 2 + 1;

        const prevMatch1 = previousRound[prevMatch1Idx];
        const prevMatch2 = previousRound[prevMatch2Idx];

        if (prevMatch1 && prevMatch1.userPrediction) {
          const winnerName = getPredictedWinner(prevMatch1, prevMatch1.userPrediction);
          const winnerInfo = getTeamInfo(prevMatch1, prevMatch1.userPrediction.predictedWinner as 'team1' | 'team2');
          if (winnerName) {
            match.team1 = winnerName;
            match.team1Logo = winnerInfo.logo;
            match.team1Seed = winnerInfo.seed;
          }
        }

        if (prevMatch2 && prevMatch2.userPrediction) {
          const winnerName = getPredictedWinner(prevMatch2, prevMatch2.userPrediction);
          const winnerInfo = getTeamInfo(prevMatch2, prevMatch2.userPrediction.predictedWinner as 'team1' | 'team2');
          if (winnerName) {
            match.team2 = winnerName;
            match.team2Logo = winnerInfo.logo;
            match.team2Seed = winnerInfo.seed;
          }
        }
      });
    }

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

  const handleReset = async (matchId: string) => {
    await onResetPrediction(matchId);
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
    const matchCardHeight = 120; // Approximate height of a match card
    const round1Gap = 80; // Gap between Round 1 matches (accounts for set selector height)
    const matchHeight = matchCardHeight + round1Gap; // Center-to-center distance in Round 1 (200px)

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

          return (
            <div key={`${label}-${round}`} className="flex flex-col relative">
              <div className="sticky top-0 bg-white z-10 pb-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 text-center">
                  {ROUND_NAMES[round]}
                </h3>
              </div>
              <div className="flex flex-col">
                {displayMatches.map((match, idx) => {
                  // Calculate margin for proper bracket alignment
                  let marginTop;

                  if (round === 1) {
                    // Round 1: simple gap between matches
                    marginTop = idx === 0 ? 0 : round1Gap;
                  } else {
                    // Later rounds: position to be centered among groups of Round 1 matches
                    if (idx === 0) {
                      // Position to center between pairs of previous round matches
                      marginTop = (spacingMultiplier / 2 - 0.5) * matchHeight;
                    } else {
                      // Gap between subsequent matches
                      // Each match skips spacingMultiplier worth of Round 1 matches
                      marginTop = matchHeight * spacingMultiplier - matchCardHeight;
                    }
                  }

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
                      onResetPrediction={handleReset}
                      isEmpty={!match}
                      bracketSubmitted={bracketSubmitted}
                    />

                    {/* Connecting line to next round */}
                    {round < 4 && (
                      <div
                        className={`absolute top-1/2 ${isRightSide ? '-left-8' : '-right-8'} w-8 h-px bg-gray-900`}
                        style={{ zIndex: 1 }}
                      />
                    )}

                    {/* Vertical connecting line between pairs */}
                    {idx % 2 === 0 && idx < displayMatches.length - 1 && (
                      <div
                        className={`absolute ${isRightSide ? '-left-8' : '-right-8'} w-px bg-gray-900`}
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
      <div className="bracket-container overflow-x-auto pb-8 bg-white">
        <div className="flex flex-col gap-12 px-4">
          {/* TOP ROW - Top Left and Top Right Quadrants */}
          <div className="flex gap-8">
            <div className="p-4">
              {renderQuadrant(topLeftBracket, 'top-left', false)}
            </div>

            <div className="p-4">
              {renderQuadrant(topRightBracket, 'top-right', true)}
            </div>
          </div>

          {/* CENTER - Final Four & Championship */}
          <div className="flex flex-col items-center justify-center gap-8 px-8">
            {/* Final Four (Semifinals) */}
            <div className="flex flex-col items-center">
              <div className="px-6 py-2 mb-6">
                <h3 className="text-lg font-bold text-gray-800 text-center">
                  {ROUND_NAMES[5]}
                </h3>
                <p className="text-sm text-gray-600 text-center">December 18</p>
              </div>
              <div className="flex flex-row gap-8">
                {finalFour.map((match) => (
                  <MatchCard key={match.id} match={match} onPredict={handlePredict} onResetPrediction={handleReset} bracketSubmitted={bracketSubmitted} />
                ))}
              </div>
            </div>

            {/* Championship */}
            <div className="flex flex-col items-center">
              <div className="px-6 py-3 mb-6">
                <h3 className="text-xl font-bold text-gray-800 text-center">
                  {ROUND_NAMES[6]}
                </h3>
                <p className="text-sm text-gray-600 text-center">December 21</p>
              </div>
              {championship.map(match => (
                <MatchCard key={match.id} match={match} onPredict={handlePredict} onResetPrediction={handleReset} bracketSubmitted={bracketSubmitted} />
              ))}
            </div>
          </div>

          {/* BOTTOM ROW - Bottom Left and Bottom Right Quadrants */}
          <div className="flex gap-8">
            <div className="p-4">
              {renderQuadrant(bottomLeftBracket, 'bottom-left', false)}
            </div>

            <div className="p-4">
              {renderQuadrant(bottomRightBracket, 'bottom-right', true)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
