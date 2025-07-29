export class OverviewStatsDto {
  totalUsersEver: number;
  totalNewUsers: number;
  totalInitiatedPlays: number;
  totalCompletedPlays: number;
  totalUncompletedPlays: number;
  playsByMode: Record<
    string,
    { initiated: number; completed: number; uncompleted: number }
  >;
  allPlays: {
    playId: number;
    modeConfigId: number;
    modeName: string;
    completed: boolean;
    attemptsCount: number;
  }[];
}
