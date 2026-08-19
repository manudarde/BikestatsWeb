export type Category = { id: string; name: string; legacyId: number }

export type EventInfo = {
  id: string
  name: string
  circuit: string
  country: string
  startDate: string | null
  endDate: string | null
  test: boolean
}

export type Result = {
  position: number | null
  riderName: string
  riderNumber: number | null
  teamName: string
  constructorName: string
  totalLaps: number | null
  topSpeed: number | null
  gapFirst: string
  gapPrevious: string
}

export type Session = {
  id: string
  type: string
  number: number | null
  status: string
  date: string | null
  classification: Result[]
}

export type SeasonIndex = {
  schemaVersion: 1
  year: number
  seasonId: string
  categories: Category[]
  events: EventInfo[]
}

export type RaceEvent = EventInfo & { sessions: Session[] }
export type RaceBundle = {
  schemaVersion: 1
  year: number
  category: Category
  events: RaceEvent[]
}
export type EventBundle = {
  schemaVersion: 1
  year: number
  event: EventInfo
  category: Category
  sessions: Session[]
}

export type Manifest = {
  schemaVersion: 1
  revision: string
  generatedAt: string
  source: string
  currentSeason: number
  seasons: { year: number; id: string; current: boolean }[]
}

export type PointEntry = Result & {
  eventId: string
  eventName: string
  eventDate: string | null
  sessionId: string
  isRace: boolean
  isSprint: boolean
  points: number
}

export type Standing = {
  position: number
  name: string
  riderNumber: number | null
  teamName: string
  bikeName: string
  points: number
  gapToPrevious: number
  gapToFirst: number
}

export type Statistics = Standing & {
  starts: number
  wins: number
  secondPlaces: number
  thirdPlaces: number
  podiums: number
  sprintWins: number
  racePoints: number
  sprintPoints: number
}
