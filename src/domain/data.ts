import { useQuery } from '@tanstack/react-query'
import type { EventBundle, Manifest, RaceBundle, SeasonIndex } from './types'

const root = `${import.meta.env.BASE_URL}data`
async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(`${root}/${path}`)
  if (!response.ok) throw new Error(`Data request failed (${response.status})`)
  return response.json() as Promise<T>
}

export const useManifest = () => useQuery({ queryKey: ['manifest'], queryFn: () => readJson<Manifest>('manifest.json'), staleTime: 300_000 })
export const useSeason = (year?: number) => useQuery({ queryKey: ['season', year], queryFn: () => readJson<SeasonIndex>(`seasons/${year}/index.json`), enabled: Boolean(year), staleTime: Infinity })
export const useRaceBundle = (year?: number, category?: number) => useQuery({ queryKey: ['race', year, category], queryFn: () => readJson<RaceBundle>(`seasons/${year}/race/${category}.json`), enabled: Boolean(year && category), staleTime: Infinity })
export const useEventBundle = (year?: number, eventId?: string, category?: number) => useQuery({ queryKey: ['event', year, eventId, category], queryFn: () => readJson<EventBundle>(`seasons/${year}/events/${eventId}/${category}.json`), enabled: Boolean(year && eventId && category), staleTime: Infinity })
