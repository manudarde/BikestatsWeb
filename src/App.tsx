import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BarChart3, CalendarDays, Flag, Home, ListOrdered, Moon, Sun, Trophy, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AboutPage, CalendarPage, HomePage, PointsPage, PrivacyPage, RankPage, ResultsPage, StandingsPage, StatisticsPage } from './pages'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } } })
const links = [
  ['/', 'Home', Home], ['/calendar', 'Calendar', CalendarDays], ['/results', 'Results', Flag],
  ['/standings', 'Standings', Trophy], ['/points', 'Points', BarChart3], ['/statistics', 'Statistics', BarChart3],
  ['/rank', 'Rank', ListOrdered],
  ['/about', 'About Me', User],
] as const

function Shell() {
  const [dark, setDark] = useState(() => localStorage.getItem('motoracedata-theme') !== 'light' && (localStorage.getItem('motoracedata-theme') === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches))
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('motoracedata-theme', dark ? 'dark' : 'light') }, [dark])
  return <div className="app-shell"><aside><NavLink to="/" className="brand"><span>MR</span><strong>MotoRaceData<small>Race intelligence</small></strong></NavLink><nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={to === '/about' ? 'about-link' : undefined}><Icon />{label}</NavLink>)}</nav><button className="theme" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}{dark ? 'Light mode' : 'Dark mode'}</button></aside><main><Routes><Route path="/" element={<HomePage />} /><Route path="/rank" element={<RankPage />} /><Route path="/calendar" element={<CalendarPage />} /><Route path="/results" element={<ResultsPage />} /><Route path="/results/race" element={<Navigate to="/results" replace />} /><Route path="/results/year" element={<Navigate to="/results?view=year" replace />} /><Route path="/standings" element={<StandingsPage />} /><Route path="/points" element={<PointsPage />} /><Route path="/points/race" element={<Navigate to="/points" replace />} /><Route path="/points/year" element={<Navigate to="/points?view=year" replace />} /><Route path="/statistics" element={<StatisticsPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/privacy" element={<PrivacyPage />} /></Routes><footer>Unofficial fan project · Data sourced from the public MotoGP results service · <NavLink to="/privacy">Privacy</NavLink></footer></main></div>
}

export default function App() { return <QueryClientProvider client={queryClient}><HashRouter><Shell /></HashRouter></QueryClientProvider> }
