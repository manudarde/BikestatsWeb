import { describe, expect, it } from 'vitest'
import { pointEntries, racePoints, sameTeam, sprintPoints } from './scoring'
import type { RaceBundle } from './types'

describe('MotoGP scoring', () => {
  it('uses the established race scale', () => {
    expect([1, 2, 3, 15, 16].map(racePoints)).toEqual([25, 20, 16, 1, 0])
  })
  it('uses the established sprint scale', () => {
    expect([1, 2, 3, 9, 10].map(sprintPoints)).toEqual([12, 9, 7, 1, 0])
  })
  it('normalizes sponsor variants of the same team', () => {
    expect(sameTeam('Red Bull KTM Factory Racing', 'KTM Factory')).toBe(true)
  })
  it('selects Moto2 race two and awards half points', () => {
    const result = { position: 1, riderName: 'Rider', riderNumber: 1, teamName: 'Team', constructorName: 'Bike', totalLaps: 1, topSpeed: null, gapFirst: '', gapPrevious: '' }
    const bundle = { schemaVersion: 1, year: 2020, category: { id: '2', name: 'Moto2', legacyId: 2 }, events: [{ id: 'e', name: 'Event', circuit: '', country: '', startDate: null, endDate: null, test: false, sessions: [{ id: 'r1', type: 'RAC', number: 1, status: '', date: null, classification: [result] }, { id: 'r2', type: 'RAC', number: 2, status: '', date: null, classification: [result] }] }] } satisfies RaceBundle
    expect(pointEntries(bundle)).toHaveLength(1)
    expect(pointEntries(bundle)[0].points).toBe(12.5)
  })
})
