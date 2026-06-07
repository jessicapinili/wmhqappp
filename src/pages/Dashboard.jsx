import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getMonthKey, todayFormatted } from '../lib/utils'
import { getTodaysInsight } from '../lib/insights'
import YourFocus from '../components/YourFocus'
import BrainDump from '../components/BrainDump'
import PinnedLinks from '../components/PinnedLinks'
import { HeartIcon } from '../lib/icons'

const BRAND = '#3d0c0c'

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
  1: 'Empty — be gentle with yourself today.',
  2: 'Very low — basics only.',
  3: 'Low — pick one thing.',
  4: 'Below average — conserve and pace.',
  5: 'Steady — good foundation day.',
  6: 'Above average — solid output day.',
  7: 'Strong — lean into focused work.',
  8: 'High-output — lean in fully.',
  9: 'Peak — make significant moves.',
  10: 'Overflow — make it count.',
}

const MODE_BAR_COLORS = {
  full_power: '#6b1a1a',
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
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">This Week</p>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d, i) => {
          const dKey = toLocalDateKey(d)
          const log = weekLogs[dKey]
          const isToday = dKey === todayKey
          const isFuture = d > todayDate
          const barColor = log ? (MODE_BAR_COLORS[log.mode] || '#d4b0b0') : null
          const barH = log ? scoreToBarHeight(log.energy) : 0
          console.log(`[WeeklyTracker] ${DAY_LABELS[i]} (${dKey}): energy=${log?.energy ?? 'none'}, barH=${barH}px`)

          return (
            <div key={dKey} className="flex flex-col items-center gap-1">
              <div className="flex items-end justify-center" style={{ height: `${BAR_CONTAINER_H}px`, width: '100%' }}>
                {isFuture ? null : log ? (
                  <div className="w-full rounded-sm" style={{ height: `${barH}px`, backgroundColor: barColor }} />
                ) : (
                  <div className="w-full" style={{ height: '14px', borderBottom: '1.5px dashed #e4d4d4' }} />
                )}
              </div>
              {log && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: barColor }} />}
              <p className="text-[9px] font-semibold" style={{ color: isToday ? '#6b1a1a' : '#b0a0a0' }}>
                {DAY_LABELS[i]}
              </p>
              {log && <p className="text-[9px] font-bold" style={{ color: '#9c7070' }}>{log.energy}</p>}
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
    <div className="card-section">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Today's Capacity Check-in</h2>
          <p className="section-subtitle">Set your mode and energy level for the day.</p>
        </div>
        {locked && (
          <button
            onClick={() => setLocked(false)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: '#9c7070', border: '1px solid #e8d8d8', backgroundColor: '#fdf9f9' }}
          >
            Edit
          </button>
        )}
      </div>

      {locked && !lockFlash ? (
        <div>
          <div className="flex items-center gap-5 p-4 rounded-xl mb-5"
            style={{ backgroundColor: '#faf1f1', border: '1px solid #f0e0e0' }}>
            <div className="flex items-center gap-2.5">
              <span style={{ color: '#6b1a1a' }}>{selectedMode ? MODE_ICON_MAP[selectedMode.key] : null}</span>
              <div>
                <p className="text-xs font-bold text-gray-700">{selectedMode?.label || '—'}</p>
                <p className="text-[10px] text-gray-400">{selectedMode?.descriptor}</p>
              </div>
            </div>
            <div className="w-px self-stretch" style={{ backgroundColor: '#e8d8d8' }} />
            <div>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 300, fontStyle: 'italic', color: '#6b1a1a' }}>{energy}</span>
              <span className="text-sm text-gray-400"> / 10</span>
              <p className="text-[10px] text-gray-400 mt-0.5">{ENERGY_CAPTIONS[energy]}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f0ebe8', paddingTop: '16px' }}>
            <WeeklyTracker weekDays={weekDays} weekLogs={weekLogs} todayKey={todayKey} />
          </div>
        </div>
      ) : (
        <div>
          {/* Section A: Mode selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {CAPACITY_MODES.map(m => {
              const isSelected = mode === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={isSelected
                    ? { backgroundColor: '#faf1f1', border: '1.5px solid #c49090' }
                    : { backgroundColor: '#fdf9f7', border: '1.5px solid #ede6e1' }}
                >
                  <span style={{ color: isSelected ? '#6b1a1a' : '#c4b5af' }}>{MODE_ICON_MAP[m.key]}</span>
                  <p className="text-xs font-bold mt-2" style={{ color: isSelected ? '#6b1a1a' : '#374151' }}>{m.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: isSelected ? '#9c7070' : '#9ca3af' }}>{m.descriptor}</p>
                </button>
              )
            })}
          </div>

          {/* Section B: Energy slider */}
          <div className="mb-5">
            <div className="flex justify-between items-baseline mb-2">
              <label className="label mb-0">How full is your tank right now?</label>
              <span className="text-[10px] text-gray-400">Drag to set — your gut knows.</span>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={energy}
              onChange={e => { setEnergy(parseInt(e.target.value)); setLocked(false) }}
              className="w-full capacity-slider"
              style={{ background: `linear-gradient(to right, #6b1a1a ${trackPct}%, #f0e0e0 ${trackPct}%)` }}
            />
            <div className="flex items-baseline gap-2 mt-3">
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '34px', fontWeight: 300, fontStyle: 'italic', color: '#6b1a1a' }}>{energy}</span>
              <span className="text-sm text-gray-400">/ 10</span>
              <span className="text-xs text-gray-500 ml-1">{ENERGY_CAPTIONS[energy]}</span>
            </div>
          </div>

          {/* Section C: Insight box */}
          {mode && selectedMode && (
            <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: '#faf1f1', borderLeft: '3px solid #6b1a1a' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9c7070' }}>Today's Focus</p>
              <p className="text-sm text-gray-700">{selectedMode.insight}</p>
            </div>
          )}

          {/* Section D: Lock in button */}
          <div className="flex justify-end mb-5">
            <button
              onClick={handleLockIn}
              disabled={!mode || lockFlash}
              className="text-sm font-semibold px-5 py-2 rounded-xl transition-all"
              style={lockFlash
                ? { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }
                : mode
                  ? { backgroundColor: '#6b1a1a', color: '#fff' }
                  : { backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }}
            >
              {lockFlash ? 'Locked in ✓' : 'Lock in check-in'}
            </button>
          </div>

          {/* Section E: Weekly tracker */}
          <div style={{ borderTop: '1px solid #f0ebe8', paddingTop: '16px' }}>
            <WeeklyTracker weekDays={weekDays} weekLogs={weekLogs} todayKey={todayKey} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const { user, firstName } = useAuth()
  const { insight } = getTodaysInsight()
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
        <a
          href="https://www.jessicapinili.com/login"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand flex-shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          Login to WMHQ ↗
        </a>
      </div>

      {/* Pinned quick links */}
      <PinnedLinks userId={user.id} />

      {/* Portal video notice */}
      <div style={{ backgroundColor: '#fdf8f5', border: '0.5px solid rgba(240,208,208,0.5)', borderLeft: '2px solid rgba(240,208,208,0.7)', borderRadius: '4px', padding: '13px 16px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '11px', fontWeight: 300, color: '#3d0c0c' }}>
        <HeartIcon /> Please watch the WMHQ Personal Portal Video inside the WMHQ Vault
      </div>

      {/* Insight of the Day */}
      <div className="card-section" style={{ borderLeft: `3px solid ${BRAND}` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: BRAND }}>
          JP × WMHQ — Insight of the Day
        </p>
        <p className="text-gray-800 font-medium text-base leading-relaxed italic">
          "{insight}"
        </p>
      </div>

      {/* Brain dump */}
      <BrainDump userId={user.id} />

      {/* Your Season This Month */}
      <div className="card-section">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">YOUR SEASON THIS MONTH</p>
            {season ? (
              <>
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{SEASONS[season].label}</h2>
                <p className="text-sm italic mt-0.5" style={{ color: '#8a8a8a' }}>{SEASONS[season].sub}</p>
              </>
            ) : (
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Choose Your Monthly Mode</h2>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              {localMonthName} {new Date().getFullYear()}. Select once and it locks for the month.
            </p>
          </div>
          {seasonLocked && (
            <button
              onClick={resetSeason}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 mt-1"
              style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#faf7f5' }}
            >
              <span>↺</span> Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(SEASONS).map(([key, s]) => {
            const isSelected = season === key
            // Disable all non-selected cards while locked, loading, or mid-save.
            // The selected card is intentionally NOT disabled so it keeps full visual styling.
            // saveSeason() guards against re-clicking via seasonLocked check.
            const isDisabled = !seasonLoaded || seasonSaving || (seasonLocked && !isSelected)
            return (
              <button
                key={key}
                onClick={() => saveSeason(key)}
                disabled={isDisabled}
                className="p-4 rounded-xl text-left transition-all"
                style={
                  isSelected
                    ? { border: `1px solid ${s.color}`, backgroundColor: s.bg, boxShadow: `0 2px 10px ${s.color}55` }
                    : isDisabled
                    ? { border: '1px solid rgba(0,0,0,0.06)', backgroundColor: '#f9f7f5', opacity: 0.42, cursor: 'not-allowed' }
                    : { border: '1px solid rgba(0,0,0,0.06)', backgroundColor: '#faf7f5' }
                }
              >
                <div className="w-3 h-3 rounded-full mb-2.5" style={{ backgroundColor: s.color }} />
                <p className="font-bold text-xs leading-tight" style={{ color: isSelected ? '#2a2a2a' : '#6b6b6b' }}>{s.label}</p>
                <p className="text-xs mt-0.5" style={{ color: isSelected ? '#5a5a5a' : '#b0b0b0' }}>{s.sub}</p>
              </button>
            )
          })}
        </div>

        {seasonError && (
          <p className="mt-3 text-xs text-red-600 font-medium">
            Could not save monthly mode — {seasonError}
          </p>
        )}

        {season && (() => {
          const text = SEASONS[season].text
          const modeIdx = text.indexOf('MODE:')
          const bodyText = modeIdx > -1 ? text.slice(0, modeIdx).trim() : text
          const modeText = modeIdx > -1 ? text.slice(modeIdx) : null
          return (
            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: SEASONS[season].bg }}>
              <p className="text-sm text-gray-600 mb-2">{bodyText}</p>
              {modeText && (
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SEASONS[season].color }}>
                  {modeText}
                </p>
              )}
            </div>
          )
        })()}
      </div>

      {/* Today's Capacity Check-in */}
      <CapacityCheckin />

      {/* Your Focus */}
      <YourFocus userId={user.id} />
    </div>
  )
}
