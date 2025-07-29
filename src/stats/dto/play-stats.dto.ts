export class PlayStatsDto {
  playId: number;
  userId?: number;
  guestId?: string;
  startedAt: Date;
  completed: boolean;
  attempts: string[];
  attemptsCount: number;
}
