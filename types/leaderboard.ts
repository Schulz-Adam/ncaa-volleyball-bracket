export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  email: string;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  rank: number;
}
