import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BarChart3, Bike, CalendarDays, ChartNoAxesCombined, Flag, Trophy } from 'lucide-react'
import { BaseFilters, useFilterState } from './components/filters'
import { DataTable, Empty, ErrorState, formatDate, formatPoints, Loading, PageHeader, Select } from './components/ui'
import { useEventBundle, useRaceBundle } from './domain/data'
import { bikeStandings, groupedStatistics, pointEntries, riderEventPositions, riderStandings, riderStatistics, teamStandings } from './domain/scoring'
import type { Result, Standing, Statistics } from './domain/types'

const cards = [
  ['/calendar', 'Calendar', 'Every event, circuit and race-weekend date.', CalendarDays],
  ['/results/race', 'Results by Race', 'Session classifications across MotoGP, Moto2 and Moto3.', Flag],
  ['/results/year', 'Results by Year', 'Compare race and sprint finishes across a season.', Bike],
  ['/standings', 'Standings', 'Rider, team and manufacturer championship tables.', Trophy],
  ['/points/race', 'Points by Race', 'See exactly how each rider scored at an event.', BarChart3],
  ['/points/year', 'Points by Year', 'Follow event-by-event points and season totals.', ChartNoAxesCombined],
  ['/statistics', 'Statistics by Year', 'Wins, podiums, starts and points at a glance.', BarChart3],
] as const

export function HomePage() { return <><PageHeader title="The season, clearly." description="Race results, championship standings, points and rider statistics in one focused dashboard." /><section className="hero"><div><span className="live-dot" /> DAILY DATA REFRESH</div><h2>Built for the numbers behind every race weekend.</h2><p>Explore MotoGP, Moto2 and Moto3 without fighting through spreadsheets.</p></section><section className="card-grid">{cards.map(([to, title, description, Icon]) => <Link className="feature-card" to={to} key={to}><Icon /><h2>{title}</h2><p>{description}</p><span>Explore <ArrowRight /></span></Link>)}</section></> }

function DataGate({ children, error, loading }: { children: React.ReactNode; error?: Error | null; loading: boolean }) { if (loading) return <Loading />; if (error) return <ErrorState error={error} />; return children }

export function CalendarPage() {
  const { season, year, set, manifest } = useFilterState()
  return <><PageHeader title="Calendar" description="Race weekends, circuits and completed-event shortcuts." /><div className="filters"><Select label="Season" value={year ?? ''} onChange={(v) => set('season', v)}>{manifest.data?.seasons.slice().reverse().map((s) => <option key={s.year}>{s.year}</option>)}</Select></div><DataGate loading={season.isLoading} error={season.error}><DataTable rows={season.data?.events ?? []} rowKey={(r) => r.id} columns={[
    { key: 'event', label: 'Event', value: (r) => <strong>{r.name}</strong>, sort: (r) => r.name }, { key: 'circuit', label: 'Circuit', value: (r) => r.circuit, sort: (r) => r.circuit }, { key: 'country', label: 'Country', value: (r) => r.country, sort: (r) => r.country }, { key: 'start', label: 'Start', value: (r) => formatDate(r.startDate), sort: (r) => r.startDate ?? '' }, { key: 'end', label: 'End', value: (r) => formatDate(r.endDate), sort: (r) => r.endDate ?? '' }, { key: 'results', label: 'Results', value: (r) => r.endDate && new Date(r.endDate) <= new Date() ? <Link className="text-link" to={`/points/race?season=${year}&event=${r.id}`}>View</Link> : '—' },
  ]} /></DataGate></>
}

export function ResultsByRacePage() {
  const { params, year, category, set } = useFilterState(); const eventId = params.get('event') ?? undefined
  const bundle = useEventBundle(year, eventId, category); const sessionId = params.get('session') ?? ''; const session = bundle.data?.sessions.find((s) => s.id === sessionId)
  return <><PageHeader title="Results by Race" description="Full classification for every available race-weekend session." /><BaseFilters event /><div className="filters subfilters"><Select label="Session" value={sessionId} disabled={!bundle.data} onChange={(v) => set('session', v)}><option value="">Select a session</option>{bundle.data?.sessions.map((s) => <option key={s.id} value={s.id}>{s.type}{s.number ? ` ${s.number}` : ''}</option>)}</Select></div><DataGate loading={bundle.isLoading} error={bundle.error}>{session ? session.classification.length ? <ResultTable rows={session.classification} /> : <Empty /> : <Empty>Select an event and session to see its classification.</Empty>}</DataGate></>
}

function ResultTable({ rows }: { rows: Result[] }) { return <DataTable rows={rows} rowKey={(r) => `${r.riderName}-${r.position}`} columns={[
  { key: 'pos', label: 'Pos', value: (r) => <strong>{r.position ?? '—'}</strong>, sort: (r) => r.position ?? 999 }, { key: 'number', label: '#', value: (r) => r.riderNumber ?? '—', sort: (r) => r.riderNumber ?? 999 }, { key: 'rider', label: 'Rider', value: (r) => <strong>{r.riderName}</strong>, sort: (r) => r.riderName }, { key: 'team', label: 'Team', value: (r) => r.teamName, sort: (r) => r.teamName }, { key: 'bike', label: 'Bike', value: (r) => r.constructorName, sort: (r) => r.constructorName }, { key: 'laps', label: 'Laps', value: (r) => r.totalLaps ?? '—', sort: (r) => r.totalLaps ?? 0, align: 'right' }, { key: 'speed', label: 'Top speed', value: (r) => r.topSpeed ? `${r.topSpeed} km/h` : '—', sort: (r) => r.topSpeed ?? 0, align: 'right' },
]}/> }

function usePoints() { const { year, category } = useFilterState(); const query = useRaceBundle(year, category); return { query, entries: query.data ? pointEntries(query.data) : [], year, category } }

export function ResultsByYearPage() {
  const { query, entries } = usePoints(); const { riders, events } = riderEventPositions(entries)
  const rows = riders.map((rider) => ({ rider, results: events.map((event) => { const eventRows = entries.filter((e) => e.riderName === rider && e.eventId === event.id); return { sprint: eventRows.find((e) => e.isSprint)?.position, race: eventRows.find((e) => e.isRace)?.position } }) }))
  return <><PageHeader title="Results by Year" description="Race and sprint finishing positions across the selected season." /><BaseFilters /><DataGate loading={query.isLoading} error={query.error}>{rows.length ? <div className="table-wrap matrix"><table><thead><tr><th>Rider</th>{events.map((e) => <th key={e.id}>{e.name}<small>{formatDate(e.date, false)}</small></th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.rider}><td><strong>{row.rider}</strong></td>{row.results.map((value, index) => <td key={events[index].id}><span className="result-pill">{value.sprint ? `S${value.sprint}` : ''}{value.sprint && value.race ? ' · ' : ''}{value.race ? `R${value.race}` : '—'}</span></td>)}</tr>)}</tbody></table></div> : <Empty />}</DataGate></>
}

function StandingTable({ rows }: { rows: Standing[] }) { return <DataTable rows={rows} rowKey={(r) => r.name} columns={[
  { key: 'position', label: 'Pos', value: (r) => <strong>{r.position}</strong>, sort: (r) => r.position }, { key: 'name', label: 'Name', value: (r) => <strong>{r.name}</strong>, sort: (r) => r.name }, { key: 'team', label: 'Team', value: (r) => r.teamName, sort: (r) => r.teamName }, { key: 'bike', label: 'Bike', value: (r) => r.bikeName, sort: (r) => r.bikeName }, { key: 'points', label: 'Points', value: (r) => formatPoints(r.points), sort: (r) => r.points, align: 'right' }, { key: 'prev', label: 'Gap prev.', value: (r) => r.position === 1 ? '—' : formatPoints(r.gapToPrevious), sort: (r) => r.gapToPrevious, align: 'right' }, { key: 'first', label: 'Gap leader', value: (r) => r.position === 1 ? '—' : formatPoints(r.gapToFirst), sort: (r) => r.gapToFirst, align: 'right' },
]} /> }

export function StandingsPage() {
  const { query, entries } = usePoints(); const [view, setView] = useLocalTab('riders'); const rows = view === 'teams' ? teamStandings(entries) : view === 'bikes' ? bikeStandings(entries) : riderStandings(entries)
  const leaders = rows.slice(0, 5); const events = [...new Map(entries.map((e) => [e.eventId, e.eventName])).entries()]; const trend = events.map(([_id, name], index) => { const row: Record<string, string | number> = { event: name }; leaders.forEach((leader) => { const key = view === 'teams' ? 'teamName' : view === 'bikes' ? 'constructorName' : 'riderName'; row[leader.name] = entries.filter((e) => events.slice(0, index + 1).some(([eventId]) => eventId === e.eventId) && e[key] === leader.name).reduce((sum, e) => sum + e.points, 0) }); return row })
  return <><PageHeader title="Standings" description="Calculated rider, team and manufacturer championship standings." /><BaseFilters /><Tabs value={view} set={setView} values={['riders', 'teams', 'bikes']} /><DataGate loading={query.isLoading} error={query.error}>{rows.length ? <><StandingTable rows={rows} /><div className="chart-card"><h2>Championship trend</h2><ResponsiveContainer width="100%" height={340}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="event" hide/><YAxis/><Tooltip/><Legend/>{leaders.map((r,i)=><Line key={r.name} dataKey={r.name} stroke={['#ff4d3d','#4f9cff','#ffc857','#50c878','#a875ff'][i]} strokeWidth={2}/>)}</LineChart></ResponsiveContainer></div></> : <Empty />}</DataGate></>
}

export function PointsByRacePage() {
  const { query, entries, year } = usePoints(); const { params } = useFilterState(); const eventId = params.get('event') ?? ''; const eventList = query.data?.events ?? []; const eventRows = entries.filter((e) => e.eventId === eventId); const riders = [...new Set(eventRows.map((e) => e.riderName))].map((name) => { const rows = eventRows.filter((e) => e.riderName === name); const sprint = rows.filter((e) => e.isSprint).reduce((s,e)=>s+e.points,0), race = rows.filter((e)=>e.isRace).reduce((s,e)=>s+e.points,0); return { name, number: rows[0]?.riderNumber, sprint, race, total:sprint+race } }).filter((r)=>r.total>0).sort((a,b)=>b.total-a.total)
  return <><PageHeader title="Points by Race" description="Sprint, race and combined points for a selected event." /><BaseFilters event /><DataGate loading={query.isLoading} error={query.error}>{eventId ? riders.length ? <DataTable rows={riders} rowKey={(r)=>r.name} columns={[{key:'name',label:'Rider',value:(r)=><strong>{r.name}</strong>,sort:(r)=>r.name},{key:'number',label:'#',value:(r)=>r.number??'—',sort:(r)=>r.number??999},{key:'sprint',label:'Sprint',value:(r)=>formatPoints(r.sprint),sort:(r)=>r.sprint,align:'right'},{key:'race',label:'Race',value:(r)=>formatPoints(r.race),sort:(r)=>r.race,align:'right'},{key:'total',label:'Total',value:(r)=><strong>{formatPoints(r.total)}</strong>,sort:(r)=>r.total,align:'right'}]}/> : <Empty /> : <Empty>Select an event to see points. {eventList.length ? '' : `No events found for ${year}.`}</Empty>}</DataGate></>
}

export function PointsByYearPage() {
  const { query, entries } = usePoints(); const standings = riderStandings(entries); const events = [...new Map(entries.map((e) => [e.eventId, e])).values()]
  const chart = events.map((event) => { const row: Record<string, string | number> = { event: event.eventName }; standings.slice(0, 5).forEach((rider) => { row[rider.name] = entries.filter((e) => e.riderName === rider.name && e.eventId === event.eventId).reduce((s, e) => s + e.points, 0) }); return row })
  return <><PageHeader title="Points by Year" description="Event-by-event scoring with season totals and rider comparisons." /><BaseFilters /><DataGate loading={query.isLoading} error={query.error}>{standings.length ? <><div className="table-wrap matrix"><table><thead><tr><th>Rider</th>{events.map((e)=><th key={e.eventId}>{e.eventName}</th>)}<th>Total</th></tr></thead><tbody>{standings.map((r)=><tr key={r.name}><td><strong>{r.name}</strong></td>{events.map((event)=><td key={event.eventId}>{formatPoints(entries.filter((e)=>e.riderName===r.name&&e.eventId===event.eventId).reduce((s,e)=>s+e.points,0))}</td>)}<td><strong>{formatPoints(r.points)}</strong></td></tr>)}</tbody></table></div><div className="chart-card"><h2>Top-five event points</h2><ResponsiveContainer width="100%" height={340}><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="event" hide /><YAxis /><Tooltip /><Legend />{standings.slice(0, 5).map((r, i) => <Line key={r.name} type="monotone" dataKey={r.name} stroke={['#ff4d3d','#4f9cff','#ffc857','#50c878','#a875ff'][i]} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div></> : <Empty />}</DataGate></>
}

export function StatisticsPage() {
  const { query, entries } = usePoints(); const [view,setView]=useLocalTab('riders'); const rows = view==='teams'?groupedStatistics(entries,'team'):view==='bikes'?groupedStatistics(entries,'bike'):riderStatistics(entries)
  return <><PageHeader title="Statistics by Year" description="Starts, wins, podiums and scoring split by rider, team or manufacturer." /><BaseFilters /><Tabs value={view} set={setView} values={['riders','teams','bikes']}/><DataGate loading={query.isLoading} error={query.error}>{rows.length ? <StatisticsTable rows={rows} /> : <Empty />}</DataGate></>
}

function StatisticsTable({ rows }: { rows: Statistics[] }) { return <DataTable rows={rows} rowKey={(r) => r.name} columns={[
  { key: 'pos', label: 'Pos', value: (r) => r.position, sort: (r) => r.position }, { key: 'rider', label: 'Rider', value: (r) => <strong>{r.name}</strong>, sort: (r) => r.name }, { key: 'starts', label: 'Starts', value: (r) => r.starts, sort: (r) => r.starts, align: 'right' }, { key: 'wins', label: 'Wins', value: (r) => r.wins, sort: (r) => r.wins, align: 'right' }, { key: 'second', label: 'P2', value: (r) => r.secondPlaces, sort: (r) => r.secondPlaces, align: 'right' }, { key: 'third', label: 'P3', value: (r) => r.thirdPlaces, sort: (r) => r.thirdPlaces, align: 'right' }, { key: 'podiums', label: 'Podiums', value: (r) => r.podiums, sort: (r) => r.podiums, align: 'right' }, { key: 'sprint', label: 'Sprint wins', value: (r) => r.sprintWins, sort: (r) => r.sprintWins, align: 'right' }, { key: 'racePoints', label: 'Race pts', value: (r) => formatPoints(r.racePoints), sort: (r) => r.racePoints, align: 'right' }, { key: 'sprintPoints', label: 'Sprint pts', value: (r) => formatPoints(r.sprintPoints), sort: (r) => r.sprintPoints, align: 'right' }, { key: 'total', label: 'Total', value: (r) => <strong>{formatPoints(r.points)}</strong>, sort: (r) => r.points, align: 'right' },
]} /> }

function Tabs({ value, set, values }: { value: string; set: (v: string) => void; values: string[] }) { return <div className="tabs">{values.map((v) => <button className={value === v ? 'active' : ''} onClick={() => set(v)} key={v}>{v}</button>)}</div> }
function useLocalTab(initial: string): [string, (v: string) => void] { const { params, set } = useFilterState(); return [params.get('view') ?? initial, (v) => set('view', v)] }

export function PrivacyPage() { return <><PageHeader title="Privacy" description="A simple static site with no tracking." /><article className="prose"><h2>Your data</h2><p>Bike Stats Dashboard does not use analytics, advertising, accounts or cookies. Your theme preference is stored locally in your browser and is never transmitted.</p><h2>Race data</h2><p>Public race-result snapshots are generated during deployment. The browser does not contact the upstream MotoGP service.</p><h2>Disclaimer</h2><p>This is an unofficial fan project and is not associated with MotoGP or Dorna Sports.</p></article></> }
