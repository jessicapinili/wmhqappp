import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getMonthKey, todayFormatted } from '../lib/utils'
import YourFocus from '../components/YourFocus'
import YourFocusNew from '../components/YourFocusNew'
import BrainDump from '../components/BrainDump'
import PinnedLinks from '../components/PinnedLinks'
import { HeartIcon } from '../lib/icons'

const BRAND = '#3d0c0c'

const SEASON_PASTEL = {
  bloom: { bg: '#fde4ee', edge: '#f2b8cd', ink: '#9b3f5c' },
  integration: { bg: '#dbe9f3', edge: '#a9c8de', ink: '#3f5f93' },
  sprint: { bg: '#e2ecdc', edge: '#a9c39a', ink: '#3f6b46' },
}

const SEASONS = {
  bloom: {
    label: 'BLOOM SEASON',
    sub: 'Testing / Exploring',
    color: '#fbd2e2',
    bg: '#f7f7f7',
    text: 'Bloom is where you test, explore and plant seeds. MODE: TESTING AND EXPLORING',
  },
  integration: {
    label: 'INTEGRATION SEASON',
    sub: 'Stabilising / Systemising',
    color: '#a6c6dd',
    bg: '#f7f7f7',
    text: 'Integration is where you stabilise and systemise. MODE: STABILISING AND SYSTEMISING',
  },
  sprint: {
    label: 'SPRINT SEASON',
    sub: 'Full Lock-In / Executing',
    color: '#d6d7ab',
    bg: '#f7f7f7',
    text: 'Sprint is where you lock in fully, knowing your base is strong enough to hold it. MODE: FULL LOCK-IN AND EXECUTION',
  },
}

/* ─── Capacity Check-In helpers ─── */
const toLocalDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const getCurrentWeekDays = () => {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CAPACITY_MODES = [
  {
    key: 'full_power',
    label: 'Full Power',
    descriptor: 'All systems on',
    insight: 'Your energy is high. Prioritise deep work and high-stakes decisions today.',
  },
  {
    key: 'flowing',
    label: 'Flowing',
    descriptor: 'Creative and connected',
    insight: "You're in flow. Let creativity lead and batch your content work today.",
  },
  {
    key: 'low_slow',
    label: 'Low & Slow',
    descriptor: 'Steady and gentle',
    insight: 'Protect your energy today. Focus on one priority and skip the non-essential.',
  },
  {
    key: 'rest_mode',
    label: 'Rest Mode',
    descriptor: 'Rest and restore',
    insight: 'Rest is strategic. Identify what truly needs you today, and let the rest wait.',
  },
]

const ENERGY_CAPTIONS = {
  1: 'Empty → be gentle with yourself today.',
  2: 'Very low → basics only.',
  3: 'Low → pick one thing.',
  4: 'Below average → conserve and pace.',
  5: 'Steady → good foundation day.',
  6: 'Above average → solid output day.',
  7: 'Strong → lean into focused work.',
  8: 'High-output → lean in fully.',
  9: 'Peak → make significant moves.',
  10: 'Overflow → make it count.',
}

const MODE_BAR_COLORS = {
  full_power: '#3d0c0c',
  flowing: '#c49090',
  low_slow: '#d4b0b0',
  rest_mode: '#e8c8c8',
}

/* ─── Capacity mode SVG icons ─── */
function BoltSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
function WaveSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 Q4.5 7 7 12 Q9.5 17 12 12 Q14.5 7 17 12 Q19.5 17 22 12" />
    </svg>
  )
}
function SunSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}
function MoonSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

const MODE_ICON_MAP = {
  full_power: <BoltSvg />,
  flowing: <WaveSvg />,
  low_slow: <SunSvg />,
  rest_mode: <MoonSvg />,
}

/* ─── Height mapping: score 1–10 → bar height 18–64px ─── */
const MIN_BAR_H = 18
const MAX_BAR_H = 64
const BAR_CONTAINER_H = MAX_BAR_H + 8

function scoreToBarHeight(score) {
  if (!score || score < 1) return 0
  const clamped = Math.min(10, Math.max(1, score))
  return Math.round(MIN_BAR_H + ((clamped - 1) / 9) * (MAX_BAR_H - MIN_BAR_H))
}

/* ─── Weekly Tracker sub-component ─── */
function WeeklyTracker({ weekDays, weekLogs, todayKey }) {
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  return (
    <div className="flex items-end gap-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 pb-0.5 flex-shrink-0">This week</p>
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {weekDays.map((d, i) => {
          const dKey = toLocalDateKey(d)
          const log = weekLogs[dKey]
          const isToday = dKey === todayKey
          const isFuture = d > todayDate
          const barColor = log ? (MODE_BAR_COLORS[log.mode] || '#d4b0b0') : null
          return (
            <div key={dKey} className="flex flex-col items-center gap-1" title={log ? `${DAY_LABELS[i]}: ${log.energy}/10` : DAY_LABELS[i]}>
              <div className="w-full flex items-end" style={{ height: '14px' }}>
                {log ? (
                  <div className="w-full rounded-full" style={{ height: `${4 + log.energy}px`, backgroundColor: barColor }} />
                ) : (
                  <div className="w-full rounded-full" style={{ height: '3px', backgroundColor: isFuture ? '#f5efec' : '#ece2de' }} />
                )}
              </div>
              <p className="text-[9px]" style={{ color: isToday ? '#3d0c0c' : '#b0a0a0', fontWeight: isToday ? 700 : 500 }}>{DAY_LABELS[i]}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Capacity Check-In component ─── */
function CapacityCheckin() {
  const { user } = useAuth()
  // todayKey is the actual calendar date for today's check-in record
  const todayKey = toLocalDateKey(new Date())
  const weekDays = getCurrentWeekDays()
  const weekStartKey = toLocalDateKey(weekDays[0])
  const weekEndKey = toLocalDateKey(weekDays[6])

  const [mode, setMode] = useState(null)
  const [energy, setEnergy] = useState(5)
  const [locked, setLocked] = useState(false)
  const [lockFlash, setLockFlash] = useState(false)
  // weekLogs: keyed by YYYY-MM-DD, each day has its OWN saved record (or nothing)
  const [weekLogs, setWeekLogs] = useState({})

  useEffect(() => {
    if (!user?.id) return
    const fetchData = async () => {
      // 1. Load TODAY's record to populate the check-in form
      const { data: todayData, error: todayErr } = await supabase
        .from('capacity_checkins')
        .select('mode, energy')
        .eq('user_id', user.id)
        .eq('date_key', todayKey)
        .maybeSingle()
      console.log('[CapacityCheckin] today record:', todayData, 'error:', todayErr)

      if (todayData) {
        setMode(todayData.mode || null)
        setEnergy(todayData.energy ?? 5)
        setLocked(true)
      } else {
        setMode(null)
        setEnergy(5)
        setLocked(false)
      }

      // 2. Load ALL records for the current week (Monday → Sunday range)
      // Each day only shows a bar if a real record exists for that specific date.
      const { data: weekData, error: weekErr } = await supabase
        .from('capacity_checkins')
        .select('date_key, mode, energy')
        .eq('user_id', user.id)
        .gte('date_key', weekStartKey)
        .lte('date_key', weekEndKey)
      console.log('[CapacityCheckin] week records fetched:', weekData, 'error:', weekErr)

      if (weekData) {
        const logs = {}
        weekData.forEach(row => {
          logs[row.date_key] = { mode: row.mode, energy: row.energy }
          console.log(`[CapacityCheckin] mapped ${row.date_key}: energy=${row.energy}, mode=${row.mode}`)
        })
        const allDayKeys = weekDays.map(d => toLocalDateKey(d))
        const emptyDays = allDayKeys.filter(k => !logs[k])
        console.log('[CapacityCheckin] days with records:', Object.keys(logs))
        console.log('[CapacityCheckin] days without records:', emptyDays)
        setWeekLogs(logs)
      } else {
        setWeekLogs({})
      }
    }
    fetchData()
  }, [user?.id])

  const handleLockIn = async () => {
    // Saves ONLY today's record — never touches other days
    const savePayload = { user_id: user.id, date_key: todayKey, mode, energy }
    console.log('[CapacityCheckin] saving today check-in:', savePayload)
    const { error } = await supabase.from('capacity_checkins').upsert(
      savePayload,
      { onConflict: 'user_id,date_key' }
    )
    console.log('[CapacityCheckin] save error:', error)
    if (!error) {
      // Update only today's entry in the tracker — other days are unchanged
      setWeekLogs(prev => ({ ...prev, [todayKey]: { mode, energy } }))
      setLockFlash(true)
      setTimeout(() => { setLockFlash(false); setLocked(true) }, 2500)
    } else {
      console.error('[CapacityCheckin] Save failed:', error)
    }
  }

  const selectedMode = CAPACITY_MODES.find(m => m.key === mode)
  const trackPct = ((energy - 1) / 9) * 100

  return (
    <div className="card-section" style={{ padding: '16px 20px' }}>
      {locked && !lockFlash ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#b8a898' }}>Today</p>
          <span className="inline-flex items-center gap-2" style={{ fontSize: '14px', color: '#3d0c0c' }}>
            <span style={{ display: 'inline-flex', transform: 'scale(0.8)' }}>{selectedMode ? MODE_ICON_MAP[selectedMode.key] : null}</span>
            <span style={{ fontWeight: 600 }}>{selectedMode?.label || '—'} · {energy}/10</span>
          </span>
          {selectedMode && <span className="text-xs flex-1 min-w-[180px]" style={{ color: '#6b5a5a' }}>→ {selectedMode.insight}</span>}
          <button type="button" onClick={() => setLocked(false)} className="text-xs underline" style={{ color: '#9c7070' }}>Edit</button>
          <div className="w-full"><WeeklyTracker weekDays={weekDays} weekLogs={weekLogs} todayKey={todayKey} /></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
            <p className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: '#b8a898' }}>Today’s check-in</p>
            <select value={mode || ''} onChange={e => setMode(e.target.value || null)}
              style={{ backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '999px', padding: '6px 12px', fontSize: '12.5px', color: '#3d0c0c', minWidth: '170px' }}>
              <option value="" disabled>Choose your mode…</option>
              {CAPACITY_MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: '#9c7070' }}>Score</span>
              <input
                type="range" min={1} max={10} step={1}
                value={energy}
                onChange={e => { setEnergy(parseInt(e.target.value)); setLocked(false) }}
                className="flex-1 capacity-slider"
                style={{ background: `linear-gradient(to right, #3d0c0c ${trackPct}%, #f0e0e0 ${trackPct}%)` }}
              />
              <span className="flex-shrink-0" style={{ fontSize: '13px', fontWeight: 600, color: '#3d0c0c' }}>{energy}<span className="text-gray-400 font-normal">/10</span></span>
            </div>
            <button
              onClick={handleLockIn}
              disabled={!mode || lockFlash}
              className="btn-brand flex-shrink-0 self-start md:self-auto"
              style={{ opacity: mode || lockFlash ? 1 : 0.5, cursor: mode && !lockFlash ? 'pointer' : 'default' }}
            >
              {lockFlash ? 'Locked in ✓' : 'Lock in'}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: '#9c7070' }}>
            <span style={{ fontWeight: 700, color: '#3d0c0c' }}>{ENERGY_CAPTIONS[energy]}</span>{selectedMode ? `  ·  ${selectedMode.insight}` : ''}
          </p>
          <WeeklyTracker weekDays={weekDays} weekLogs={weekLogs} todayKey={todayKey} />
        </div>
      )}
    </div>
  )
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const { user, firstName } = useAuth()
  const today = todayFormatted()
  const monthKey = getMonthKey()
  const localMonthName = new Date().toLocaleString('default', { month: 'long' })

  const [season, setSeason] = useState(null)       // value confirmed in DB — source of truth
  const [seasonLocked, setSeasonLocked] = useState(false)
  const [seasonLoaded, setSeasonLoaded] = useState(false)
  const [seasonSaving, setSeasonSaving] = useState(false)
  const [seasonError, setSeasonError] = useState(null)

  // Season fetch — runs once on mount (and again if user changes).
  // Month/year computed fresh inside so there is no stale-closure risk.
  // On a new month the user naturally refreshes the page and this runs again.
  useEffect(() => {
    if (!user?.id) return
    const month_year = new Date().toISOString().slice(0, 7)
    console.log('[Season] Fetching — user:', user.id, 'month_year:', month_year)
    supabase.from('season_selection')
      .select('season')
      .eq('user_id', user.id)
      .eq('month_year', month_year)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log('[Season] Fetched row:', data, 'error:', error)
        if (error) {
          console.error('[Season] Fetch FAILED — full error:', JSON.stringify(error))
          setSeason(null)
          setSeasonLocked(false)
        } else if (data?.season) {
          console.log('[Season] DB record found — locking season:', data.season)
          setSeason(data.season)
          setSeasonLocked(true)
        } else {
          console.log('[Season] No record for this month — blank unlocked state')
          setSeason(null)
          setSeasonLocked(false)
        }
        setSeasonLoaded(true)
      })
      .catch((err) => {
        console.error('[Season] Fetch threw unexpectedly:', err)
        setSeason(null)
        setSeasonLocked(false)
        setSeasonLoaded(true)  // unblock the UI even on hard failure
      })
  }, [user?.id])

  const saveSeason = async (s) => {
    if (seasonLocked || !seasonLoaded || seasonSaving) return
    const month_year = new Date().toISOString().slice(0, 7)
    const payload = { user_id: user.id, month_year, season: s }
    console.log('[Season] Saving payload:', payload)
    setSeasonSaving(true)
    const { error } = await supabase.from('season_selection')
      .upsert(payload, { onConflict: 'user_id,month_year' })
    setSeasonSaving(false)
    if (!error) {
      console.log('[Season] Save confirmed — setting locked season:', s)
      setSeasonError(null)
      setSeason(s)
      setSeasonLocked(true)
    } else {
      console.error('[Season] Save FAILED. Full error:', JSON.stringify(error, null, 2))
      setSeasonError(error.message || JSON.stringify(error))
    }
  }

  const resetSeason = async () => {
    const month_year = new Date().toISOString().slice(0, 7)
    console.log('[Season] Resetting — user:', user.id, 'month_year:', month_year)
    setSeason(null)
    setSeasonLocked(false)
    const { error } = await supabase.from('season_selection')
      .delete()
      .eq('user_id', user.id)
      .eq('month_year', month_year)
    if (error) console.error('[Season] Reset FAILED:', error)
    else console.log('[Season] Reset complete')
  }

  return (
    <div className="space-y-6">
      {/* Header image */}
      <div>
        <img
          src="https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2162592122/settings_images/1622d17-4367-a434-f718-0be170584c6a_WMHQ_Community_Covers.png"
          alt="WMHQ"
          className="w-full rounded-2xl object-contain"
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Welcome + Date + Login button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Welcome back, {firstName} <span style={{ fontFamily: 'inherit', fontSize: '0.85em', opacity: 0.6 }}><HeartIcon /></span></h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex flex-col sm:items-end gap-1.5 flex-shrink-0">
        <a
          href="https://www.jessicapinili.com/login"
          target="_blank"
          rel="noopener noreferrer"
          className="login-wmhq flex-shrink-0"
        >
          <span className="login-wmhq-dot" />
          Log in to WMHQ
          <span aria-hidden="true">↗</span>
        </a>
          <a href="https://www.jessicapinili.com/login" target="_blank" rel="noopener noreferrer"
            title="It brings your strategy, planning and weekly audits into one place, so you can apply what you’re learning inside WMHQ to your actual business."
            className="text-[11px] hover:underline" style={{ color: '#9c7070', textUnderlineOffset: '2px' }}>
            ▶ Please watch the Personal Portal Video in the Vault
          </a>
        </div>
      </div>

      {/* Pinned quick links */}
      <PinnedLinks userId={user.id} />

      {/* Today's Capacity Check-in */}
      <CapacityCheckin />

      {/* Your Focus */}
      <YourFocusNew userId={user.id} seasonSlot={
        season ? (
          <span className="inline-flex items-center gap-1.5" title={SEASONS[season].text}
            style={{ backgroundColor: SEASON_PASTEL[season].bg, border: `1px solid ${SEASON_PASTEL[season].edge}`, borderRadius: '999px', padding: '3px 4px 3px 10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: SEASON_PASTEL[season].ink }}>🔒 {SEASONS[season].label.charAt(0) + SEASONS[season].label.slice(1).toLowerCase()}</span>
            <button type="button" onClick={resetSeason} title="Change season"
              style={{ fontSize: '10px', borderRadius: '999px', padding: '1px 6px', backgroundColor: 'rgba(255,255,255,0.75)', color: '#3d0c0c' }}>↺</button>
          </span>
        ) : (
          <select value="" disabled={!seasonLoaded || seasonSaving} onChange={e => e.target.value && saveSeason(e.target.value)}
            style={{ fontSize: '11px', fontWeight: 600, color: '#3d0c0c', backgroundColor: '#fff', border: '1px dashed rgba(61,12,12,0.3)', borderRadius: '999px', padding: '3px 10px' }}>
            <option value="" disabled>{seasonSaving ? 'Saving…' : 'Choose your season…'}</option>
            {Object.entries(SEASONS).map(([key, x]) => <option key={key} value={key}>{x.label.charAt(0) + x.label.slice(1).toLowerCase()} · {x.sub}</option>)}
          </select>
        )
      } />

      {/* Brain dump */}
      <BrainDump userId={user.id} />


    </div>
  )
}
