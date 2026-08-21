import { Link, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BaseFilters, useFilterState } from './components/filters'
import { DataTable, Empty, ErrorState, formatDate, formatPoints, Loading, PageHeader, Select } from './components/ui'
import { useEventBundle, useEventBundles, useManifest, useRaceBundle, useRaceBundles } from './domain/data'
import { bikeStandings, pointEntries, riderEventPositions, riderStandings, riderStatistics, teamStandings } from './domain/scoring'
import type { RaceBundle, Result, Standing, Statistics } from './domain/types'
import './standings.css'
import './about.css'

function homeSummary(bundle?: RaceBundle) {
  if (!bundle) return null
  const entries = pointEntries(bundle)
  const raceEntries = entries.filter((entry) => entry.isRace)
  const latestEvent = [...new Map(raceEntries.map((entry) => [entry.eventId, { id: entry.eventId, name: entry.eventName, date: entry.eventDate }])).values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0]
  return {
    category: bundle.category.name.replace('™', ''),
    event: latestEvent?.name ?? 'No completed race',
    podium: latestEvent ? raceEntries.filter((entry) => entry.eventId === latestEvent.id).sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).slice(0, 3) : [],
    standings: riderStandings(entries).slice(0, 5),
  }
}

export function HomePage() {
  const manifest = useManifest(); const year = manifest.data?.currentSeason
  const motoGp = useRaceBundle(year, 3), moto2 = useRaceBundle(year, 2), moto3 = useRaceBundle(year, 1)
  const queries = [motoGp, moto2, moto3]; const summaries = queries.map((query) => homeSummary(query.data)).filter((summary) => summary !== null)
  const loading = manifest.isLoading || queries.some((query) => query.isLoading)
  const error = manifest.error ?? queries.find((query) => query.error)?.error
  return <><PageHeader title="The season, clearly." description="Race results, championship standings, points and rider statistics in one focused dashboard." /><section className="hero"><div><span className="live-dot" /> DAILY DATA REFRESH</div><h2>Built for the numbers behind every race weekend.</h2><p>Explore MotoGP, Moto2 and Moto3 without fighting through spreadsheets.</p></section>{loading ? <Loading /> : error ? <ErrorState error={error} /> : <><section className="home-section"><div className="section-heading"><p className="eyebrow">Latest completed event</p><h2>Latest Race Podium: {summaries[0]?.event}</h2></div><div className="summary-grid">{summaries.map((summary) => <article className="summary-card" key={`podium-${summary.category}`}><h3>{summary.category}</h3><ol>{summary.podium.map((rider) => <li key={rider.riderName}><span className={`rank rank-${rider.position}`}>{rider.position}</span><strong>{rider.riderName}</strong><small>{rider.constructorName}</small></li>)}</ol></article>)}</div></section><section className="home-section"><div className="section-heading"><p className="eyebrow">Current season</p><h2>Top Five Riders: {year}</h2></div><div className="summary-grid">{summaries.map((summary) => <article className="summary-card" key={`standings-${summary.category}`}><h3>{summary.category}</h3><ol>{summary.standings.map((rider) => <li key={rider.name}><span className="rank">{rider.position}</span><strong>{rider.name}</strong><small>{formatPoints(rider.points)} pts</small></li>)}</ol></article>)}</div></section></>}</>
}

function DataGate({ children, error, loading }: { children: React.ReactNode; error?: Error | null; loading: boolean }) { if (loading) return <Loading />; if (error) return <ErrorState error={error} />; return children }

export function CalendarPage() {
  const { season, year, set, manifest } = useFilterState()
  const [showTests, setShowTests] = useState(false)
  const events = (season.data?.events ?? []).filter((event) => showTests || !event.test)
  return <><PageHeader title="Calendar" description="Race weekends, circuits and completed-event shortcuts." /><div className="filters"><Select label="Season" value={year ?? ''} onChange={(v) => set('season', v)}>{manifest.data?.seasons.slice().reverse().map((s) => <option key={s.year}>{s.year}</option>)}</Select><label className="switch-field"><span>Show tests</span><input type="checkbox" role="switch" checked={showTests} onChange={(event) => setShowTests(event.target.checked)} /><i aria-hidden="true" /></label></div><DataGate loading={season.isLoading} error={season.error}><DataTable rows={events} initialSort={{ key: 'start' }} rowKey={(r) => r.id} columns={[
    { key: 'event', label: 'Event', value: (r) => <strong>{r.name}</strong>, sort: (r) => r.name }, { key: 'circuit', label: 'Circuit', value: (r) => r.circuit, sort: (r) => r.circuit }, { key: 'country', label: 'Country', value: (r) => r.country, sort: (r) => r.country }, { key: 'start', label: 'Start', value: (r) => formatDate(r.startDate), sort: (r) => r.startDate ?? '9999' }, { key: 'end', label: 'End', value: (r) => formatDate(r.endDate), sort: (r) => r.endDate ?? '9999' }, { key: 'results', label: 'Results', value: (r) => r.endDate && new Date(r.endDate) <= new Date() ? <Link className="text-link" to={`/results?season=${year}&event=${r.id}`}>View</Link> : '—' },
  ]} /></DataGate></>
}

export function ResultsByRacePage() {
  const { params, year, category, set } = useFilterState(); const eventId = params.get('event') ?? undefined
  const bundle = useEventBundle(year, eventId, category); const sessionId = params.get('session') ?? ''; const session = bundle.data?.sessions.find((s) => s.id === sessionId)
  return <><PageHeader title="Race Results" description="Full classification for every available race-weekend session." /><BaseFilters event /><div className="filters subfilters"><Select label="Session" value={sessionId} disabled={!bundle.data} onChange={(v) => set('session', v)}><option value="">Select a session</option>{bundle.data?.sessions.map((s) => <option key={s.id} value={s.id}>{s.type}{s.number ? ` ${s.number}` : ''}</option>)}</Select></div><DataGate loading={bundle.isLoading} error={bundle.error}>{session ? session.classification.length ? <ResultTable rows={session.classification} raceSession={['RAC', 'RACE', 'SPR', 'SPRINT'].includes(session.type.toUpperCase())} /> : <Empty /> : <Empty>Select an event and session to see its classification.</Empty>}</DataGate></>
}

export function ResultsPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'year' ? 'year' : 'race'
  const selectView = (nextView: 'race' | 'year') => {
    const next = new URLSearchParams(params)
    if (nextView === 'year') next.set('view', 'year'); else next.delete('view')
    next.delete('session')
    setParams(next)
  }
  return <><div className="tabs results-switcher"><button className={view === 'race' ? 'active' : ''} onClick={() => selectView('race')}>By Race</button><button className={view === 'year' ? 'active' : ''} onClick={() => selectView('year')}>Full year</button></div>{view === 'race' ? <ResultsByRacePage /> : <ResultsByYearPage />}</>
}

function parseTiming(value: string) {
  if (!value) return null
  const parts = value.split(':').map(Number)
  if (parts.some(Number.isNaN) || parts.length > 3) return null
  return parts.reduce((total, part) => total * 60 + part, 0) * 1000
}

function formatGap(milliseconds: number) {
  const seconds = milliseconds / 1000
  if (seconds < 60) return `+${seconds.toFixed(3)}`
  const minutes = Math.floor(seconds / 60)
  return `+${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`
}

function ResultTable({ rows, raceSession }: { rows: Result[]; raceSession: boolean }) {
  const timing = (row: Result) => raceSession ? row.totalTime : row.time
  const leader = rows.find((row) => row.position === 1) ?? rows[0]
  const leaderTime = leader ? parseTiming(timing(leader)) : null
  const gap = (row: Result) => {
    if (row === leader || row.position === 1) return null
    const riderTime = parseTiming(timing(row))
    return riderTime === null || leaderTime === null ? null : Math.max(0, riderTime - leaderTime)
  }
  return <DataTable rows={rows} rowKey={(r) => `${r.riderName}-${r.position}`} columns={[
  { key: 'pos', label: 'Pos', value: (r) => <strong>{r.position ?? '—'}</strong>, sort: (r) => r.position ?? 999 }, { key: 'number', label: '#', value: (r) => r.riderNumber ?? '—', sort: (r) => r.riderNumber ?? 999 }, { key: 'rider', label: 'Rider', value: (r) => <strong>{r.riderName}</strong>, sort: (r) => r.riderName }, { key: 'team', label: 'Team', value: (r) => r.teamName, sort: (r) => r.teamName }, { key: 'bike', label: 'Bike', value: (r) => r.constructorName, sort: (r) => r.constructorName }, { key: 'laps', label: 'Laps', value: (r) => r.totalLaps ?? '—', sort: (r) => r.totalLaps ?? 0, align: 'right' }, { key: 'time', label: raceSession ? 'Finish time' : 'Time', value: (r) => timing(r) || '—', sort: (r) => timing(r) || '', align: 'right' }, { key: 'gap', label: 'Gap', value: (r) => { const value = gap(r); return value === null ? '-' : formatGap(value) }, sort: (r) => gap(r) ?? -1, align: 'right' },
  ]}/>
}

function usePoints() { const { year, category } = useFilterState(); const query = useRaceBundle(year, category); return { query, entries: query.data ? pointEntries(query.data) : [], year, category } }

export function ResultsByYearPage() {
  const { query, entries, category } = usePoints(); const { riders, events } = riderEventPositions(entries)
  const sessions = category === 3 ? ['sprint', 'race'] as const : ['race'] as const
  const rows = riders.map((rider) => ({ rider, results: events.map((event) => { const eventRows = entries.filter((e) => e.riderName === rider && e.eventId === event.id); return { sprint: eventRows.find((e) => e.isSprint)?.position, race: eventRows.find((e) => e.isRace)?.position } }) }))
  const [sorting, setSorting] = useState({ key: 'rider', desc: false })
  const toggleSort = (key: string) => setSorting((old) => ({ key, desc: old.key === key ? !old.desc : false }))
  const sortedRows = [...rows].sort((a, b) => {
    if (sorting.key === 'rider') return (sorting.desc ? -1 : 1) * a.rider.localeCompare(b.rider)
    const [eventId, session] = sorting.key.split(':')
    const eventIndex = events.findIndex((event) => event.id === eventId)
    const av = a.results[eventIndex]?.[session as 'sprint' | 'race']
    const bv = b.results[eventIndex]?.[session as 'sprint' | 'race']
    if (av == null) return bv == null ? a.rider.localeCompare(b.rider) : 1
    if (bv == null) return -1
    return sorting.desc ? bv - av : av - bv
  })
  const sortLabel = (key: string) => sorting.key === key ? sorting.desc ? ' ↓' : ' ↑' : ''
  return <><PageHeader title="Full Year Results" description="Race and sprint finishing positions across the selected season." /><BaseFilters /><DataGate loading={query.isLoading} error={query.error}>{rows.length ? <div className="table-wrap matrix results-year"><table><thead><tr><th rowSpan={2}><button onClick={() => toggleSort('rider')}>Rider{sortLabel('rider')}</button></th>{events.map((event, index) => <th className={index % 2 ? 'event-shade' : ''} colSpan={sessions.length} key={event.id}>{event.name}<small>{formatDate(event.date, false)}</small></th>)}</tr><tr>{events.flatMap((event, index) => sessions.map((session) => { const key = `${event.id}:${session}`; return <th className={index % 2 ? 'event-shade' : ''} key={key}><button onClick={() => toggleSort(key)}>{session === 'sprint' ? 'Sprint' : 'Race'}{sortLabel(key)}</button></th> }))}</tr></thead><tbody>{sortedRows.map((row) => <tr key={row.rider}><td><strong>{row.rider}</strong></td>{row.results.flatMap((result, index) => sessions.map((session) => <ResultPosition shaded={Boolean(index % 2)} key={`${events[index].id}-${session}`} value={result[session]} />))}</tr>)}</tbody></table></div> : <Empty />}</DataGate></>
}

function ResultPosition({ value, shaded }: { value?: number | null; shaded: boolean }) {
  const medal = value === 1 ? 'gold' : value === 2 ? 'silver' : value === 3 ? 'bronze' : ''
  return <td className={shaded ? 'event-shade' : ''}><span className={`result-position ${medal}`}>{value ?? '—'}</span></td>
}

function StandingTable({ rows, showTeam = true, showBike = true }: { rows: Standing[]; showTeam?: boolean; showBike?: boolean }) { return <DataTable rows={rows} rowKey={(r) => r.name} columns={[
  { key: 'position', label: 'Pos', value: (r) => <strong>{r.position}</strong>, sort: (r) => r.position }, { key: 'name', label: 'Name', value: (r) => <strong>{r.name}</strong>, sort: (r) => r.name }, ...(showTeam ? [{ key: 'team', label: 'Team', value: (r: Standing) => r.teamName, sort: (r: Standing) => r.teamName }] : []), ...(showBike ? [{ key: 'bike', label: 'Bike', value: (r: Standing) => r.bikeName, sort: (r: Standing) => r.bikeName }] : []), { key: 'points', label: 'Points', value: (r) => formatPoints(r.points), sort: (r) => r.points, align: 'right' }, { key: 'prev', label: 'Gap prev.', value: (r) => r.position === 1 ? '—' : formatPoints(r.gapToPrevious), sort: (r) => r.gapToPrevious, align: 'right' }, { key: 'first', label: 'Gap leader', value: (r) => r.position === 1 ? '—' : formatPoints(r.gapToFirst), sort: (r) => r.gapToFirst, align: 'right' },
]} /> }

function formatOrdinal(value: number) {
  const remainder = value % 100
  if (remainder >= 11 && remainder <= 13) return `${value}th`
  return `${value}${value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th'}`
}

export function RankPage() {
  const { query, entries } = usePoints()
  const [view, setView] = useLocalTab('table')
  const [savedRiders, setSavedRiders] = useState<string[] | null>(null)
  const [rankSorting, setRankSorting] = useState({ key: 'last', desc: false })
  const completedEventIds = new Set(entries.map((entry) => entry.eventId))
  const events = (query.data?.events ?? []).filter((event) => completedEventIds.has(event.id))
  const riders = riderStandings(entries).map((standing) => standing.name)
  const selectedRiders = savedRiders ? savedRiders.filter((rider) => riders.includes(rider)) : riders.slice(0, 1)
  const riderOptions = [...riders].sort((a, b) => a.localeCompare(b))
  const snapshots = events.map((_event, eventIndex) => {
    const includedIds = new Set(events.slice(0, eventIndex + 1).map((item) => item.id))
    return new Map(riderStandings(entries.filter((entry) => includedIds.has(entry.eventId))).map((standing) => [standing.name, standing.position]))
  })
  const graphData = events.map((event, eventIndex) => riders.reduce<Record<string, string | number | null>>((row, _rider, riderIndex) => {
    row[`rider-${riderIndex}`] = snapshots[eventIndex].get(riders[riderIndex]) ?? null
    return row
  }, { circuit: event.circuit }))
  const colors = ['#ff4d3d', '#4f9cff', '#ffc857', '#50c878', '#a875ff', '#20b8cd', '#ff7ab6', '#8ea34a']
  const rankTicks = Array.from({ length: riders.length }, (_, index) => index + 1)
  const toggleRankSort = (key: string) => setRankSorting((current) => ({ key, desc: (current.key === 'last' ? events.at(-1)?.id : current.key) === key ? !current.desc : false }))
  const rankSortLabel = (key: string) => rankSorting.key === key || (rankSorting.key === 'last' && key === events.at(-1)?.id) ? rankSorting.desc ? ' ↓' : ' ↑' : ''
  const sortedRiders = [...riders].sort((a, b) => {
    if (rankSorting.key === 'rider') return (rankSorting.desc ? -1 : 1) * a.localeCompare(b)
    const eventIndex = rankSorting.key === 'last' ? events.length - 1 : events.findIndex((event) => event.id === rankSorting.key)
    const aRank = snapshots[eventIndex]?.get(a), bRank = snapshots[eventIndex]?.get(b)
    if (aRank == null) return bRank == null ? a.localeCompare(b) : 1
    if (bRank == null) return -1
    return rankSorting.desc ? bRank - aRank : aRank - bRank
  })

  return <><PageHeader title="Rank" description="Follow every rider's championship rank after each circuit." /><BaseFilters /><Tabs value={view} set={setView} values={['table', 'graph']} /><DataGate loading={query.isLoading} error={query.error}>{riders.length && events.length ? view === 'graph' ? <div className="chart-card rank-chart"><div className="chart-toolbar"><h2>Championship rank trend</h2><TrendMultiSelect label="Riders" options={riderOptions} selected={selectedRiders} onChange={setSavedRiders}/></div>{selectedRiders.length ? <ResponsiveContainer width="100%" height={780}><LineChart data={graphData} margin={{ top: 20, right: 24, bottom: 24, left: 8 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="circuit" interval={0} angle={-35} textAnchor="end" height={110} tick={{ fontSize: 11 }}/><YAxis domain={[1, riders.length]} reversed ticks={rankTicks} allowDecimals={false} tickFormatter={(value) => formatOrdinal(Number(value))}/><Tooltip formatter={(value, name) => [formatOrdinal(Number(value)), name]} contentStyle={{ background: '#fff', borderColor: '#dfe4e9', borderRadius: 9 }} labelStyle={{ color: '#424a53', fontWeight: 700 }}/><Legend/>{selectedRiders.map((rider, index) => <Line key={rider} type="monotone" name={rider} dataKey={`rider-${riders.indexOf(rider)}`} stroke={colors[index % colors.length]} strokeWidth={2} connectNulls={false} dot={false} activeDot={{ r: 5 }}/>)}</LineChart></ResponsiveContainer> : <div className="trend-empty">Select at least one rider to display the rank trend.</div>}</div> : <div className="table-wrap matrix results-year rank-table"><table><thead><tr><th><button onClick={() => toggleRankSort('rider')}>Rider{rankSortLabel('rider')}</button></th>{events.map((event, index) => <th className={index % 2 ? 'event-shade' : ''} key={event.id}><button onClick={() => toggleRankSort(event.id)}>{event.circuit}{rankSortLabel(event.id)}</button></th>)}</tr></thead><tbody>{sortedRiders.map((rider) => <tr key={rider}><td><strong>{rider}</strong></td>{events.map((event, index) => { const rank = snapshots[index].get(rider); const medal = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''; return <td className={index % 2 ? 'event-shade' : ''} key={event.id}>{rank ? <span className={`result-position ${medal}`}>{formatOrdinal(rank)}</span> : '—'}</td> })}</tr>)}</tbody></table></div> : <Empty />}</DataGate></>
}

function TrendMultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (names: string[]) => void }) {
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name])
  return <details className="trend-filter"><summary><span>{label}</span><strong>{selected.length ? `${selected.length} selected` : 'None selected'}</strong></summary><div className="trend-filter-menu"><div className="trend-filter-actions"><button type="button" onClick={() => onChange(options)}>Select all</button><button type="button" onClick={() => onChange([])}>Clear</button></div>{options.map((name) => <label key={name}><input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} /><span>{name}</span></label>)}</div></details>
}

export function StandingsPage() {
  const { query, entries } = usePoints()
  const [scope, setScope] = useState('full year')
  const [view, setView] = useLocalTab('riders')
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [fromRace, setFromRace] = useState('')
  const [toRace, setToRace] = useState('')
  const completedEventIds = new Set(entries.map((entry) => entry.eventId))
  const allEvents = (query.data?.events ?? []).filter((event) => completedEventIds.has(event.id))
  const effectiveFrom = allEvents.some((event) => event.id === fromRace) ? fromRace : allEvents[0]?.id ?? ''
  const effectiveTo = allEvents.some((event) => event.id === toRace) ? toRace : allEvents.at(-1)?.id ?? ''
  const fromIndex = allEvents.findIndex((event) => event.id === effectiveFrom)
  const toIndex = allEvents.findIndex((event) => event.id === effectiveTo)
  const rangeStart = Math.min(fromIndex, toIndex)
  const rangeEnd = Math.max(fromIndex, toIndex)
  const visibleEvents = scope === 'range' ? allEvents.slice(rangeStart, rangeEnd + 1) : allEvents
  const visibleEventIds = new Set(visibleEvents.map((event) => event.id))
  const standingsEntries = scope === 'range' ? entries.filter((entry) => visibleEventIds.has(entry.eventId)) : entries
  const rows = view === 'teams' ? teamStandings(standingsEntries) : view === 'bikes' ? bikeStandings(standingsEntries) : riderStandings(standingsEntries)
  const savedSelections = selections[view]
  const selectedNames = savedSelections ? savedSelections.filter((name) => rows.some((row) => row.name === name)) : rows.slice(0, 1).map((row) => row.name)
  const entityKey = view === 'teams' ? 'teamName' : view === 'bikes' ? 'constructorName' : 'riderName'
  const entityLabel = view === 'teams' ? 'Teams' : view === 'bikes' ? 'Bikes' : 'Riders'
  const trendOptions = rows.map((row) => row.name).sort((a, b) => a.localeCompare(b))
  const trend = visibleEvents.map((event, index) => {
    const trendEventIds = new Set(visibleEvents.slice(0, index + 1).map((item) => item.id))
    return selectedNames.reduce<Record<string, string | number>>((trendRow, name) => {
      trendRow[name] = standingsEntries.filter((entry) => trendEventIds.has(entry.eventId) && entry[entityKey] === name).reduce((sum, entry) => sum + entry.points, 0)
      return trendRow
    }, { event: event.name })
  })
  const chartColors = ['#ff4d3d', '#4f9cff', '#ffc857', '#50c878', '#a875ff', '#20b8cd', '#ff7ab6', '#8ea34a']
  const selectFromRace = (eventId: string) => {
    setFromRace(eventId)
    if (allEvents.findIndex((event) => event.id === eventId) > toIndex) setToRace(eventId)
  }
  const selectToRace = (eventId: string) => {
    setToRace(eventId)
    if (allEvents.findIndex((event) => event.id === eventId) < fromIndex) setFromRace(eventId)
  }

  return <><Tabs value={scope} set={setScope} values={['full year', 'range']} /><PageHeader title="Standings" description={scope === 'range' ? 'Standings recalculated across a selected range of races.' : 'Calculated rider, team and manufacturer championship standings.'} /><BaseFilters />{scope === 'range' && <div className="filters subfilters"><Select label="From race" value={effectiveFrom} onChange={selectFromRace}>{allEvents.map((event) => <option key={event.id} value={event.id}>{event.name} — {event.circuit}</option>)}</Select><Select label="To race" value={effectiveTo} onChange={selectToRace}>{allEvents.map((event) => <option key={event.id} value={event.id}>{event.name} — {event.circuit}</option>)}</Select></div>}<Tabs value={view} set={setView} values={['riders', 'teams', 'bikes']} /><DataGate loading={query.isLoading} error={query.error}>{rows.length ? <><StandingTable rows={rows} showTeam={view === 'riders'} showBike={view !== 'bikes'} /><div className="chart-card"><div className="chart-toolbar"><h2>Championship trend</h2><TrendMultiSelect label={entityLabel} options={trendOptions} selected={selectedNames} onChange={(names) => setSelections((current) => ({ ...current, [view]: names }))}/></div>{selectedNames.length ? <ResponsiveContainer width="100%" height={780}><LineChart data={trend} margin={{ right: 18, bottom: 24, left: 4 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="event" interval={0} angle={-35} textAnchor="end" height={110} tick={{ fontSize: 11 }}/><YAxis/><Tooltip formatter={(value) => `${formatPoints(Number(value))} pts`} contentStyle={{ background: '#fff', borderColor: '#dfe4e9', borderRadius: 9 }} labelStyle={{ color: '#424a53', fontWeight: 700 }}/><Legend/>{selectedNames.map((name, index) => <Line key={name} type="monotone" name={name} dataKey={name} stroke={chartColors[index % chartColors.length]} strokeWidth={3} activeDot={{ r: 5 }}/>)}</LineChart></ResponsiveContainer> : <div className="trend-empty">Select at least one {entityLabel.toLowerCase().slice(0, -1)} to display the trend.</div>}</div></> : <Empty />}</DataGate></>
}

export function PointsByRacePage() {
  const { query, entries, year } = usePoints(); const { params } = useFilterState(); const eventId = params.get('event') ?? ''; const eventList = query.data?.events ?? []; const eventRows = entries.filter((e) => e.eventId === eventId); const riders = [...new Set(eventRows.map((e) => e.riderName))].map((name) => { const rows = eventRows.filter((e) => e.riderName === name); const sprint = rows.filter((e) => e.isSprint).reduce((s,e)=>s+e.points,0), race = rows.filter((e)=>e.isRace).reduce((s,e)=>s+e.points,0); return { name, number: rows[0]?.riderNumber, sprint, race, total:sprint+race } }).filter((r)=>r.total>0).sort((a,b)=>b.total-a.total)
  return <><PageHeader title="Points by Race" description="Sprint, race and combined points for a selected event." /><BaseFilters event /><DataGate loading={query.isLoading} error={query.error}>{eventId ? riders.length ? <DataTable className="compact-points-table" rows={riders} rowKey={(r)=>r.name} columns={[{key:'name',label:'Rider',value:(r)=><strong>{r.name}</strong>,sort:(r)=>r.name},{key:'number',label:'#',value:(r)=>r.number??'—',sort:(r)=>r.number??999},{key:'sprint',label:'Sprint',value:(r)=><PointHighlight value={r.sprint} medal={r.sprint===12?'gold':r.sprint===9?'silver':r.sprint===7?'bronze':''}/>,sort:(r)=>r.sprint,align:'right'},{key:'race',label:'Race',value:(r)=><PointHighlight value={r.race} medal={r.race===25?'gold':r.race===20?'silver':r.race===16?'bronze':''}/>,sort:(r)=>r.race,align:'right'},{key:'total',label:'Total',value:(r)=><PointHighlight value={r.total} medal={r.total===37?'perfect':''}/>,sort:(r)=>r.total,align:'right'}]}/> : <Empty /> : <Empty>Select an event to see points. {eventList.length ? '' : `No events found for ${year}.`}</Empty>}</DataGate></>
}

function PointHighlight({ value, medal }: { value: number; medal: string }) {
  return <strong className={`point-highlight ${medal}`}>{formatPoints(value)}</strong>
}

export function PointsPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'year' ? 'year' : 'race'
  const selectView = (nextView: 'race' | 'year') => {
    const next = new URLSearchParams(params)
    if (nextView === 'year') next.set('view', 'year'); else next.delete('view')
    setParams(next)
  }
  return <><div className="tabs results-switcher"><button className={view === 'race' ? 'active' : ''} onClick={() => selectView('race')}>By Race</button><button className={view === 'year' ? 'active' : ''} onClick={() => selectView('year')}>Full year</button></div>{view === 'race' ? <PointsByRacePage /> : <PointsByYearPage />}</>
}

export function PointsByYearPage() {
  const { query, entries } = usePoints(); const standings = riderStandings(entries); const events = [...new Map(entries.map((e) => [e.eventId, e])).values()]
  const chart = events.map((event) => { const row: Record<string, string | number> = { event: event.eventName }; standings.slice(0, 5).forEach((rider) => { row[rider.name] = entries.filter((e) => e.riderName === rider.name && e.eventId === event.eventId).reduce((s, e) => s + e.points, 0) }); return row })
  const rows = standings.map((rider) => ({ rider, values: events.map((event) => entries.filter((entry) => entry.riderName === rider.name && entry.eventId === event.eventId).reduce((sum, entry) => sum + entry.points, 0)) }))
  const [sorting, setSorting] = useState({ key: 'rider', desc: false })
  const toggleSort = (key: string) => setSorting((old) => ({ key, desc: old.key === key ? !old.desc : false }))
  const sortedRows = [...rows].sort((a, b) => {
    if (sorting.key === 'rider') return (sorting.desc ? -1 : 1) * a.rider.name.localeCompare(b.rider.name)
    const av = sorting.key === 'total' ? a.rider.points : a.values[events.findIndex((event) => event.eventId === sorting.key)] ?? 0
    const bv = sorting.key === 'total' ? b.rider.points : b.values[events.findIndex((event) => event.eventId === sorting.key)] ?? 0
    return sorting.desc ? bv - av : av - bv
  })
  const sortLabel = (key: string) => sorting.key === key ? sorting.desc ? ' ↓' : ' ↑' : ''
  return <><PageHeader title="Full Year Points" description="Event-by-event scoring with season totals and rider comparisons." /><BaseFilters /><DataGate loading={query.isLoading} error={query.error}>{standings.length ? <><div className="table-wrap matrix results-year full-year-points"><table><thead><tr><th><button onClick={() => toggleSort('rider')}>Rider{sortLabel('rider')}</button></th>{events.map((event, index)=><th className={index % 2 ? 'event-shade' : ''} key={event.eventId}><button onClick={() => toggleSort(event.eventId)}>{event.eventName}{sortLabel(event.eventId)}</button></th>)}<th><button onClick={() => toggleSort('total')}>Total{sortLabel('total')}</button></th></tr></thead><tbody>{sortedRows.map((row)=><tr key={row.rider.name}><td><strong>{row.rider.name}</strong></td>{row.values.map((value, index)=><td className={index % 2 ? 'event-shade' : ''} key={events[index].eventId}><PointHighlight value={value} medal={value === 37 ? 'perfect' : ''}/></td>)}<td><PointHighlight value={row.rider.points} medal={row.rider.points === 37 ? 'perfect' : ''}/></td></tr>)}</tbody></table></div><div className="chart-card"><h2>Top-five event points</h2><ResponsiveContainer width="100%" height={340}><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="event" hide /><YAxis /><Tooltip /><Legend />{standings.slice(0, 5).map((r, i) => <Line key={r.name} type="monotone" dataKey={r.name} stroke={['#ff4d3d','#4f9cff','#ffc857','#50c878','#a875ff'][i]} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div></> : <Empty />}</DataGate></>
}

function RiderStatisticsView() {
  const manifest = useManifest()
  const years = manifest.data?.seasons.map((season) => season.year) ?? []
  const raceQueries = useRaceBundles(years, [3, 2, 1])
  const [riderSearch, setRiderSearch] = useState('')
  const [pointsCategory, setPointsCategory] = useState('3')
  const datasets = raceQueries.flatMap((raceQuery) => raceQuery.data ? [{ bundle: raceQuery.data, entries: pointEntries(raceQuery.data) }] : [])
  const riders = [...new Set(datasets.flatMap(({ entries: bundleEntries }) => bundleEntries.map((entry) => entry.riderName)))].sort((a, b) => a.localeCompare(b))
  const selectedRider = riders.includes(riderSearch) ? riderSearch : ''
  const categoryRows = [{ id: 3, name: 'MotoGP' }, { id: 2, name: 'Moto2' }, { id: 1, name: 'Moto3' }].map((category) => {
    const podiums = datasets.filter(({ bundle }) => bundle.category.legacyId === category.id).flatMap(({ entries: bundleEntries }) => bundleEntries.filter((entry) => entry.riderName === selectedRider && entry.isRace && (entry.position ?? 99) <= 3))
    const first = podiums.filter((entry) => entry.position === 1).length
    const second = podiums.filter((entry) => entry.position === 2).length
    const third = podiums.filter((entry) => entry.position === 3).length
    return { category: category.name, first, second, third, total: first + second + third }
  })
  const podiumByYear = [...years].sort((a, b) => a - b).map((season) => {
    const podiums = datasets.filter(({ bundle }) => bundle.year === season).flatMap(({ entries: bundleEntries }) => bundleEntries.filter((entry) => entry.riderName === selectedRider && entry.isRace && (entry.position ?? 99) <= 3))
    const first = podiums.filter((entry) => entry.position === 1).length
    const second = podiums.filter((entry) => entry.position === 2).length
    const third = podiums.filter((entry) => entry.position === 3).length
    const total = first + second + third
    return { year: season, first, second, third, total, firstLabel: first || '', secondLabel: second || '', thirdLabel: third || '', firstTotal: total && !second && !third ? total : '', secondTotal: total && second && !third ? total : '', thirdTotal: third ? total : '' }
  }).filter((row) => row.total)
  const pointsByYear = [...years].sort((a, b) => a - b).map((season) => {
    const riderEntries = datasets.filter(({ bundle }) => bundle.year === season && bundle.category.legacyId === Number(pointsCategory)).flatMap(({ entries: bundleEntries }) => bundleEntries.filter((entry) => entry.riderName === selectedRider))
    return { year: season, points: riderEntries.reduce((sum, entry) => sum + entry.points, 0), participated: riderEntries.length > 0 }
  }).filter((row) => row.participated)
  const loading = manifest.isLoading || raceQueries.some((raceQuery) => raceQuery.isLoading)
  const error = manifest.error ?? raceQueries.find((raceQuery) => raceQuery.error)?.error

  return <><PageHeader title="Statistics by Rider" description="Explore a rider's podiums and points across categories and seasons." /><div className="filters"><label className="field"><span>Rider</span><input type="search" list="statistics-riders" value={riderSearch} onChange={(event) => setRiderSearch(event.target.value)} placeholder="Search for a rider…" autoComplete="off"/><datalist id="statistics-riders">{riders.map((rider) => <option key={rider} value={rider}/>)}</datalist></label></div><DataGate loading={loading} error={error}>{selectedRider ? <><DataTable rows={categoryRows} rowKey={(row) => row.category} columns={[{ key: 'category', label: 'Category', value: (row) => <strong>{row.category}</strong>, sort: (row) => row.category }, { key: 'first', label: '1st', value: (row) => row.first, sort: (row) => row.first, align: 'right' }, { key: 'second', label: '2nd', value: (row) => row.second, sort: (row) => row.second, align: 'right' }, { key: 'third', label: '3rd', value: (row) => row.third, sort: (row) => row.third, align: 'right' }, { key: 'total', label: 'Total', value: (row) => <strong>{row.total}</strong>, sort: (row) => row.total, align: 'right' }]}/><div className="chart-card"><h2>Podium Breakdown by Year</h2>{podiumByYear.length ? <ResponsiveContainer width="100%" height={560}><BarChart data={podiumByYear} margin={{ top: 28, right: 18, bottom: 10, left: 4 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year"/><YAxis allowDecimals={false}/><Tooltip contentStyle={{ background: '#fff', borderColor: '#dfe4e9', borderRadius: 9 }} labelStyle={{ color: '#424a53', fontWeight: 700 }}/><Legend/><Bar name="1st" dataKey="first" stackId="podium" fill="#d9a900"><LabelList dataKey="firstLabel" position="center" fill="#424a53" fontSize={11} fontWeight={800}/><LabelList dataKey="firstTotal" position="top" fill="var(--text)" fontSize={11} fontWeight={800}/></Bar><Bar name="2nd" dataKey="second" stackId="podium" fill="#aeb8c2"><LabelList dataKey="secondLabel" position="center" fill="#303841" fontSize={11} fontWeight={800}/><LabelList dataKey="secondTotal" position="top" fill="var(--text)" fontSize={11} fontWeight={800}/></Bar><Bar name="3rd" dataKey="third" stackId="podium" fill="#a85f34"><LabelList dataKey="thirdLabel" position="center" fill="#fff" fontSize={11} fontWeight={800}/><LabelList dataKey="thirdTotal" position="top" fill="var(--text)" fontSize={11} fontWeight={800}/></Bar></BarChart></ResponsiveContainer> : <Empty>No race podiums found for this rider.</Empty>}</div><div className="chart-card"><div className="chart-toolbar"><h2>Points Trend by Year</h2><Select label="Category" value={pointsCategory} onChange={setPointsCategory}><option value="3">MotoGP</option><option value="2">Moto2</option><option value="1">Moto3</option></Select></div>{pointsByYear.length ? <ResponsiveContainer width="100%" height={560}><LineChart data={pointsByYear} margin={{ top: 16, right: 24, bottom: 8, left: 4 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year"/><YAxis/><Tooltip formatter={(value) => `${formatPoints(Number(value))} pts`} contentStyle={{ background: '#fff', borderColor: '#dfe4e9', borderRadius: 9 }} labelStyle={{ color: '#424a53', fontWeight: 700 }}/><Line type="monotone" name="Points" dataKey="points" stroke="#ff4d3d" strokeWidth={3} activeDot={{ r: 5 }}/></LineChart></ResponsiveContainer> : <Empty>No points found for this rider in the selected category.</Empty>}</div></> : <Empty>Search for and select one rider to view their career statistics.</Empty>}</DataGate></>
}

export function StatisticsPage() {
  const { query, entries, year, category } = usePoints()
  const [scope, setScope] = useState('by year')
  const [podiumType, setPodiumType] = useState('both')
  const hasSprint = category === 3
  const effectivePodiumType = hasSprint ? podiumType : 'race'
  const eventIds = scope === 'by year' ? (query.data?.events ?? []).map((event) => event.id) : []
  const eventQueries = useEventBundles(year, eventIds, category)
  const poleWinners = eventQueries.flatMap((eventQuery) => {
    const qualifying = eventQuery.data?.sessions.filter((session) => session.type.toUpperCase() === 'Q' && session.classification.length).sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0]
    const pole = qualifying?.classification.find((result) => result.position === 1)
    return pole ? [pole.riderName] : []
  })
  const dnfRiders = (query.data?.events ?? []).flatMap((event) => {
    const raceSessions = event.sessions.filter((session) => session.type.toUpperCase() === 'RAC')
    const countedSessions = raceSessions.some((session) => session.number === 2) ? raceSessions.filter((session) => session.number === 2) : raceSessions
    return countedSessions.flatMap((session) => session.classification.filter((result) => result.position === null && (result.totalLaps ?? 0) > 0).map((result) => result.riderName))
  })
  const rows = riderStatistics(entries).map((row) => ({ ...row, poles: poleWinners.filter((name) => name === row.name).length, dnfs: dnfRiders.filter((name) => name === row.name).length }))
  const sessionMaximums = [...new Map(entries.map((entry) => [entry.sessionId, { sprint: entry.isSprint, maximum: Math.max(...entries.filter((item) => item.sessionId === entry.sessionId).map((item) => item.points)) }])).values()]
  const maximumRacePoints = sessionMaximums.filter((session) => !session.sprint).reduce((sum, session) => sum + session.maximum, 0)
  const maximumSprintPoints = sessionMaximums.filter((session) => session.sprint).reduce((sum, session) => sum + session.maximum, 0)
  const podiumEntries = entries.filter((entry) => effectivePodiumType === 'race' ? entry.isRace : effectivePodiumType === 'sprint' ? entry.isSprint : entry.isRace || entry.isSprint)
  const chart = rows.map((row) => {
    const podiums = podiumEntries.filter((entry) => entry.riderName === row.name && (entry.position ?? 99) <= 3)
    const first = podiums.filter((entry) => entry.position === 1).length
    const second = podiums.filter((entry) => entry.position === 2).length
    const third = podiums.filter((entry) => entry.position === 3).length
    const total = first + second + third
    return { rider: row.name, first, second, third, total, firstLabel: first || '', secondLabel: second || '', thirdLabel: third || '', firstTotal: total && !second && !third ? total : '', secondTotal: total && second && !third ? total : '', thirdTotal: third ? total : '' }
  }).sort((a, b) => b.total - a.total || b.first - a.first || b.second - a.second || a.rider.localeCompare(b.rider))
  const loading = query.isLoading || eventQueries.some((eventQuery) => eventQuery.isLoading)
  const error = query.error ?? eventQueries.find((eventQuery) => eventQuery.error)?.error

  if (scope === 'by rider') return <><Tabs value={scope} set={setScope} values={['by year', 'by rider']} /><RiderStatisticsView/></>
  return <><Tabs value={scope} set={setScope} values={['by year', 'by rider']} />{scope === 'by rider' ? <><PageHeader title="Statistics by Rider" description="Individual rider statistics will be available here." /><Empty>By rider statistics are coming soon.</Empty></> : <><PageHeader title="Statistics by Year" description="Race performance and scoring for every rider in the selected season." /><BaseFilters /><DataGate loading={loading} error={error}>{rows.length ? <><StatisticsTable rows={rows} showSprint={hasSprint} /><div className="section-heading statistics-subheading"><p className="eyebrow">Points conversion</p><h2>Points Efficiency</h2></div><PointsEfficiencyTable rows={rows} showSplit={hasSprint} maximumRacePoints={maximumRacePoints} maximumSprintPoints={maximumSprintPoints}/><div className="chart-card"><div className="chart-toolbar"><h2>Podium Breakdown</h2><Tabs value={effectivePodiumType} set={setPodiumType} values={hasSprint ? ['race', 'sprint', 'both'] : ['race']}/></div><ResponsiveContainer width="100%" height={560}><BarChart data={chart} margin={{ top: 28, right: 18, bottom: 24, left: 4 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="rider" interval={0} angle={-35} textAnchor="end" height={120} tick={{ fontSize: 11 }}/><YAxis allowDecimals={false}/><Tooltip contentStyle={{ background: '#fff', borderColor: '#dfe4e9', borderRadius: 9 }} labelStyle={{ color: '#424a53', fontWeight: 700 }}/><Legend/><Bar name="1st" dataKey="first" stackId="podium" fill="#d9a900"><LabelList dataKey="firstLabel" position="center" fill="#424a53" fontSize={11} fontWeight={800}/><LabelList dataKey="firstTotal" position="top" fill="var(--text)" fontSize={11} fontWeight={800}/></Bar><Bar name="2nd" dataKey="second" stackId="podium" fill="#aeb8c2"><LabelList dataKey="secondLabel" position="center" fill="#303841" fontSize={11} fontWeight={800}/><LabelList dataKey="secondTotal" position="top" fill="var(--text)" fontSize={11} fontWeight={800}/></Bar><Bar name="3rd" dataKey="third" stackId="podium" fill="#a85f34"><LabelList dataKey="thirdLabel" position="center" fill="#fff" fontSize={11} fontWeight={800}/><LabelList dataKey="thirdTotal" position="top" fill="var(--text)" fontSize={11} fontWeight={800}/></Bar></BarChart></ResponsiveContainer></div></> : <Empty />}</DataGate></>}</>
}

function StatisticsTable({ rows, showSprint }: { rows: (Statistics & { poles: number; dnfs: number })[]; showSprint: boolean }) { return <DataTable rows={rows} rowKey={(r) => r.name} columns={[
  { key: 'pos', label: 'Pos', value: (r) => r.position, sort: (r) => r.position }, { key: 'rider', label: 'Rider', value: (r) => <strong>{r.name}</strong>, sort: (r) => r.name }, { key: 'starts', label: 'Starts', value: (r) => r.starts, sort: (r) => r.starts, align: 'right' }, { key: 'dnfs', label: 'DNFs', value: (r) => r.dnfs, sort: (r) => r.dnfs, align: 'right' }, { key: 'wins', label: 'Wins race', value: (r) => r.wins, sort: (r) => r.wins, align: 'right' }, ...(showSprint ? [{ key: 'sprint', label: 'Wins sprint', value: (r: Statistics) => r.sprintWins, sort: (r: Statistics) => r.sprintWins, align: 'right' as const }] : []), { key: 'podiums', label: 'Podiums', value: (r) => r.podiums, sort: (r) => r.podiums, align: 'right' }, { key: 'poles', label: 'Poles', value: (r) => r.poles, sort: (r) => r.poles, align: 'right' }, ...(showSprint ? [{ key: 'racePoints', label: 'Race pts', value: (r: Statistics) => formatPoints(r.racePoints), sort: (r: Statistics) => r.racePoints, align: 'right' as const }, { key: 'sprintPoints', label: 'Sprint pts', value: (r: Statistics) => formatPoints(r.sprintPoints), sort: (r: Statistics) => r.sprintPoints, align: 'right' as const }] : []), { key: 'total', label: 'Total', value: (r) => <strong>{formatPoints(r.points)}</strong>, sort: (r) => r.points, align: 'right' },
]} /> }

function PointsEfficiencyTable({ rows, showSplit, maximumRacePoints, maximumSprintPoints }: { rows: Statistics[]; showSplit: boolean; maximumRacePoints: number; maximumSprintPoints: number }) {
  const percentage = (points: number, maximum: number) => maximum ? `${(points / maximum * 100).toFixed(1)}%` : '—'
  const maximumTotal = maximumRacePoints + maximumSprintPoints
  return <><p className="statistics-description">See how much of the maximum available score each rider earned across all completed races and sprints.</p><DataTable rows={rows} rowKey={(row) => row.name} columns={[
    { key: 'position', label: 'Pos', value: (row) => row.position, sort: (row) => row.position }, { key: 'rider', label: 'Rider', value: (row) => <strong>{row.name}</strong>, sort: (row) => row.name }, ...(showSplit ? [{ key: 'racePoints', label: 'Race pts', value: (row: Statistics) => formatPoints(row.racePoints), sort: (row: Statistics) => row.racePoints, align: 'right' as const }, { key: 'sprintPoints', label: 'Sprint pts', value: (row: Statistics) => formatPoints(row.sprintPoints), sort: (row: Statistics) => row.sprintPoints, align: 'right' as const }] : []), { key: 'total', label: 'Total', value: (row) => <strong>{formatPoints(row.points)}</strong>, sort: (row) => row.points, align: 'right' }, ...(showSplit ? [{ key: 'racePercent', label: 'Race %', value: (row: Statistics) => percentage(row.racePoints, maximumRacePoints), sort: (row: Statistics) => maximumRacePoints ? row.racePoints / maximumRacePoints : 0, align: 'right' as const }, { key: 'sprintPercent', label: 'Sprint %', value: (row: Statistics) => percentage(row.sprintPoints, maximumSprintPoints), sort: (row: Statistics) => maximumSprintPoints ? row.sprintPoints / maximumSprintPoints : 0, align: 'right' as const }] : []), { key: 'totalPercent', label: 'Total %', value: (row) => percentage(row.points, maximumTotal), sort: (row) => maximumTotal ? row.points / maximumTotal : 0, align: 'right' },
  ]}/></>
}

function Tabs({ value, set, values }: { value: string; set: (v: string) => void; values: string[] }) { return <div className="tabs">{values.map((v) => <button className={value === v ? 'active' : ''} onClick={() => set(v)} key={v}>{v}</button>)}</div> }
function useLocalTab(initial: string): [string, (v: string) => void] { const { params, set } = useFilterState(); return [params.get('view') ?? initial, (v) => set('view', v)] }

export function PrivacyPage() { return <><PageHeader title="Privacy" description="A simple static site with no tracking." /><article className="prose"><h2>Your data</h2><p>Bike Stats Dashboard does not use analytics, advertising, accounts or cookies. Your theme preference is stored locally in your browser and is never transmitted.</p><h2>Race data</h2><p>Public race-result snapshots are generated during deployment. The browser does not contact the upstream MotoGP service.</p><h2>Disclaimer</h2><p>This is an unofficial fan project and is not associated with MotoGP or Dorna Sports.</p></article></> }

export function AboutPage() {
  return <><PageHeader title="About Me" description="The story and principles behind Bike Stats." /><article className="about-page"><section className="about-intro"><p className="eyebrow">Built by a fan</p><h2>Making a racing season easier to understand.</h2><p>I'm the person behind Bike Stats, an independent project created for fans who enjoy looking beyond a single race result. I built it to bring calendars, classifications, championship standings, points, statistics and rank trends together in one focused place.</p><p>Bike Stats is a one-person project, designed and maintained in my spare time. The aim is simple: turn years of race data into clear tables and graphs that are quick to explore on any device.</p></section><div className="about-grid"><section><h2>What you can explore</h2><p>Follow MotoGP, Moto2 and Moto3 seasons, compare riders and teams, inspect event-by-event points, and see how championship positions develop from one circuit to the next.</p></section><section><h2>Data and accuracy</h2><p>Race-result snapshots come from the public MotoGP results service and are processed into the views shown here. The data is provided as-is and may occasionally be incomplete or corrected after an event.</p></section><section><h2>Independent project</h2><p>Bike Stats is an unofficial fan project. It is not affiliated with, endorsed by, or connected to MotoGP, Dorna Sports, the FIM, any team, rider, manufacturer or circuit.</p></section><section><h2>Privacy</h2><p>There are no user accounts, advertisements or tracking analytics. The only browser preference stored locally is your light or dark theme. You can read the full <Link className="text-link" to="/privacy">privacy page</Link>.</p></section></div><section className="about-contact"><div><p className="eyebrow">Questions or feedback?</p><h2>Help make Bike Stats better.</h2><p>If you notice incorrect data, find a bug or have an idea for a useful statistic, open an issue on GitHub.</p></div><a className="about-button" href="https://github.com/manudarde/BikestatsWeb/issues" target="_blank" rel="noreferrer">Open GitHub issues</a></section><p className="about-legal">© 2026 Bike Stats. MotoGP, Moto2 and Moto3 are trademarks of their respective owners.</p></article></>
}
