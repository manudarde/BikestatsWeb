import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BarChart3, Bike, CalendarDays, ChartNoAxesCombined, Flag, Home, Moon, Sun, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CalendarPage, HomePage, PointsByRacePage, PointsByYearPage, PrivacyPage, ResultsByRacePage, ResultsByYearPage, StandingsPage, StatisticsPage } from './pages'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } } })
const links = [
  ['/', 'Home', Home], ['/calendar', 'Calendar', CalendarDays], ['/results/race', 'Results by Race', Flag],
  ['/results/year', 'Results by Year', Bike], ['/standings', 'Standings', Trophy], ['/points/race', 'Points by Race', BarChart3],
  ['/points/year', 'Points by Year', ChartNoAxesCombined], ['/statistics', 'Statistics', BarChart3],
] as const

function Shell() {
  const [dark, setDark] = useState(() => localStorage.getItem('bikestats-theme') !== 'light' && (localStorage.getItem('bikestats-theme') === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches))
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('bikestats-theme', dark ? 'dark' : 'light') }, [dark])
  return <div className="app-shell"><aside><NavLink to="/" className="brand"><span>BS</span><strong>Bike Stats<small>Dashboard</small></strong></NavLink><nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon />{label}</NavLink>)}</nav><button className="theme" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}{dark ? 'Light mode' : 'Dark mode'}</button></aside><main><Routes><Route path="/" element={<HomePage />} /><Route path="/calendar" element={<CalendarPage />} /><Route path="/results/race" element={<ResultsByRacePage />} /><Route path="/results/year" element={<ResultsByYearPage />} /><Route path="/standings" element={<StandingsPage />} /><Route path="/points/race" element={<PointsByRacePage />} /><Route path="/points/year" element={<PointsByYearPage />} /><Route path="/statistics" element={<StatisticsPage />} /><Route path="/privacy" element={<PrivacyPage />} /></Routes><footer>Unofficial fan project · Data sourced from the public MotoGP results service · <NavLink to="/privacy">Privacy</NavLink></footer></main></div>
}

export default function App() { return <QueryClientProvider client={queryClient}><HashRouter><Shell /></HashRouter></QueryClientProvider> }
