export class TopCharacter {
  character: string
  count: number
}

export class AccessDataDto {
  labels: string[]
  datasets: {
    label: string
    data: number[]
  }[]
}

export class ModeUsageDataDto {
  labels: string[]
  datasets: {
    data: number[]
  }[]
}

export class AttemptsDataDto {
  labels: string[]
  datasets: {
    label: string
    data: number[]
  }[]
}

export class KPI {
  totalUsers: number
  activeUsers: number
  dailyGames: number
  totalAttempts: number
  topCharacters: Record<string, TopCharacter[]>

  accessData: AccessDataDto
  modeUsageData: ModeUsageDataDto
  attemptsData: AttemptsDataDto
}
