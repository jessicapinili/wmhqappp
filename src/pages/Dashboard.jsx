import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getMonthKey, getDateKey, todayFormatted, getDayOfYear } from '../lib/utils'
import { getTodaysInsight } from '../lib/insights'
import { EditIcon, DeleteIcon, ResetIcon } from '../lib/icons'

const BRAND = '#6B1010'

const SEASONS = {
  bloom: {
    label: 'BLOOM SEASON',
    sub: 'Testing / Exploring',
    color: '#fbd2e2',
    bg: '#fff5f9',
    text: 'Bloom is where you test, explore and plant seeds. MODE: TESTING AND EXPLORING',
  },
  integration: {
    label: 'INTEGRATION SEASON',
    sub: 'Stabilising / Systemising',
    color: '#a6c6dd',
    bg: '#f0f7fc',
    text: 'Integration is where you stabilise and systemise. MODE: STABILISING AND SYSTEMISING',
  },
  sprint: {
    label: 'SPRINT SEASON',
    sub: 'Full Lock-In / Executing',
    color: '#d6d7ab',
    bg: '#f6f7ed',
    text: 'Sprint is where you lock in fully, knowing your base is strong enough to hold it. MODE: FULL LOCK-IN AND EXECUTION',
  },
}

const CHECKLIST_DATA = {
  'New Followers': {
    CONNECT: [
      'Share a belief you refuse to compromise on in business',
      'Share something people misunderstand about your industry',
      'Explain one mistake beginners always make',
      'Share a lesson you learned the hard way',
      'Share a rule you follow when creating results',
      'Share something unpopular you believe about your niche',
      'Explain why most people struggle in your industry',
      'Share a personal leadership habit',
      'Share something you stopped doing that improved results',
      'Talk about a challenge that made you better',
      'Share what discipline looks like in your field',
      'Explain what separates professionals from amateurs',
      'Share a mindset shift that improved your results',
      'Talk about something you believed early in your career that changed',
      'Share a moment that changed how you think about business',
      'Explain why consistency matters in your field',
      'Share how you stay focused during busy seasons',
      'Share what long-term thinking looks like in your industry',
      'Explain what people underestimate about your field',
      'Share something people should take more seriously',
      'Share something you learned from experience',
      'Explain why shortcuts fail in your industry',
      'Share a leadership decision you had to make',
      'Talk about the discipline required behind your work',
      'Share something that shaped your standards',
    ],
    'CREATE DEMAND': [
      'Explain a mindset shift that improves results',
      'Break down what high standards look like in your niche',
      'Show what quality work actually requires',
      'Explain why shortcuts fail in your industry',
      'Break down a step most people skip',
      'Show what professionals do differently',
      'Share a framework that improves results',
      'Explain why most people struggle to get outcomes',
      'Break down a myth in your industry',
      'Show how experts think about this problem',
      'Explain the real work behind great results',
      'Show how small improvements compound',
      'Explain what beginners usually get wrong',
      'Break down the structure behind success in your field',
      'Explain why patience matters for results',
      'Share the difference between activity and progress',
      'Break down how professionals approach improvement',
      'Show what real discipline looks like in your field',
      'Explain why people stay stuck in this area',
      'Break down how results actually happen',
      'Share a method that improves outcomes',
      'Explain the biggest misconception in your niche',
      'Show what real improvement actually looks like',
      'Break down how people sabotage progress',
      'Explain the standard required for real results',
    ],
    ACTIVATE: [
      'Explain how your offer solves a specific bottleneck',
      'Share a moment a client realised they needed your help',
      'Break down the transformation your clients experience',
      'Show the before and after of your process',
      'Explain why this problem keeps people stuck',
      'Share the biggest benefit clients gain from solving this',
      'Break down what life looks like after fixing this problem',
      'Explain the cost of not solving this issue',
      'Share a result one of your clients experienced',
      'Explain who this offer is best suited for',
      'Break down the first improvement clients notice',
      'Show how your method works step by step',
      'Share a moment when a client saw real progress',
      'Explain why solving this creates momentum',
      'Break down the biggest bottleneck your offer removes',
      'Show how solving this improves other areas of life or business',
      'Explain why most people delay solving this problem',
      'Share a scenario where this solution made a difference',
      'Break down the result people are really buying',
      'Explain how your method is different from others',
      'Show the long-term benefit of solving this problem',
      'Share something clients often say after working with you',
      'Break down how small changes lead to big results',
      'Explain why solving this now matters',
      'Share what clients gain beyond the obvious result',
    ],
  },
  'Build Trust': {
    CONNECT: [
      'Share how you organise your day as a leader',
      'Show what preparation looks like before important work',
      'Share how you maintain high standards',
      'Explain how you approach problem solving',
      'Share something you consistently prioritise',
      'Explain how you stay disciplined during busy seasons',
      'Show how you approach long-term growth',
      'Share a principle that guides your work',
      'Explain how you make decisions in business',
      'Share how you maintain consistency',
      'Show what leadership looks like behind the scenes',
      'Explain how you approach challenges',
      'Share how you stay accountable to your standards',
      'Show how you handle setbacks',
      'Share a rule that guides your work',
      'Explain how you improve your craft',
      'Share how you maintain focus in your work',
      'Show how you plan important work',
      'Share how you approach personal growth',
      'Explain how you build discipline',
      'Share something that strengthened your leadership',
      'Explain how you improve over time',
      'Share how you handle pressure',
      'Show how you evaluate your own performance',
      'Share how you build resilience',
    ],
    'CREATE DEMAND': [
      'Break down your process for getting results',
      'Show the steps behind your method',
      'Explain how you approach solving this problem',
      'Break down the framework you use with clients',
      'Show the thinking behind your process',
      'Explain how you diagnose this problem',
      'Share how you structure your work',
      'Break down the stages of your method',
      'Show how you approach this challenge',
      'Explain the strategy behind your results',
      'Share how you guide clients through this process',
      'Break down how professionals approach this issue',
      'Show how you improve outcomes',
      'Explain the structure behind your results',
      'Share how you refine your method over time',
      'Break down the key stages of improvement',
      'Show how your system works step by step',
      'Explain the biggest mistake people make here',
      'Share the key principle behind your work',
      'Break down the strategy that produces results',
      'Explain the logic behind your approach',
      'Show how you simplify complex problems',
      'Share how you help clients move forward',
      'Explain the thinking behind your framework',
      'Break down how progress happens',
    ],
    ACTIVATE: [
      'Explain how someone knows they need your offer',
      'Share a scenario where your solution helped someone',
      'Break down the transformation your offer provides',
      'Explain what clients gain from working with you',
      'Share a breakthrough a client experienced',
      'Break down what happens inside your program',
      'Explain the outcome your clients are working toward',
      'Share a client success story',
      'Explain why solving this problem matters now',
      'Break down the first change clients notice',
      'Share what clients often say after solving this problem',
      'Explain the long-term benefit of fixing this issue',
      'Share a moment when a client saw the bigger picture',
      'Break down what clients gain beyond the obvious result',
      'Explain the biggest obstacle your offer removes',
      'Share the most common challenge your clients face',
      'Break down the result people truly want',
      'Explain why this solution works',
      'Share what makes your approach effective',
      'Break down the improvement clients experience',
      'Explain the difference between struggling and solving this',
      'Share what life looks like after solving this problem',
      'Explain why people delay fixing this issue',
      'Break down the real cost of staying stuck',
      'Share why solving this now matters',
    ],
  },
  'Sell/Launch': {
    CONNECT: [
      'Share a belief you have about money in business',
      'Explain why most businesses struggle with revenue',
      'Share a lesson you learned about selling',
      'Explain why pricing matters in business',
      'Share something people misunderstand about sales',
      'Explain why confidence affects revenue',
      'Share a money mindset shift you had',
      'Explain why businesses need strong offers',
      'Share what selling taught you about people',
      'Explain why value determines pricing',
      'Share something you learned about demand',
      'Explain why sales require leadership',
      'Share a turning point in your revenue journey',
      'Explain why consistency matters in selling',
      'Share something people avoid about sales',
      'Explain why clarity increases conversions',
      'Share a pricing mistake you made early on',
      'Explain why revenue requires strategy',
      'Share what changed your approach to selling',
      'Explain why undercharging hurts businesses',
      'Share a sales insight you learned from experience',
      'Explain why businesses need predictable revenue',
      'Share a lesson you learned from losing a sale',
      'Explain why positioning affects pricing',
      'Share something founders must learn about money',
    ],
    'CREATE DEMAND': [
      'Break down how you structure your offers',
      'Explain how you price your services',
      'Share how you prepare for sales conversations',
      'Break down how you identify client problems',
      'Explain how you improve conversion rates',
      'Show how you structure a sales call',
      'Break down how you present your offer clearly',
      'Explain how you evaluate demand',
      'Share how you refine your offers',
      'Break down how you create value for clients',
      'Explain how you analyse sales performance',
      'Share how you qualify potential clients',
      'Break down how you design better offers',
      'Explain how you handle objections',
      'Share how you improve client experience',
      'Break down the structure of your pricing',
      'Explain how you increase perceived value',
      'Share how you improve sales messaging',
      'Break down how you build long-term clients',
      'Explain how you improve your offer over time',
      'Share how you identify buying signals',
      'Break down how you position your offer',
      'Explain how you test pricing strategies',
      'Share how you strengthen your sales process',
      'Break down how strong offers are built',
    ],
    ACTIVATE: [
      'Explain who your offer is designed for',
      'Share the transformation your offer provides',
      'Break down the problem your offer solves',
      'Show what clients gain from working with you',
      'Explain the biggest bottleneck your offer removes',
      'Share a recent client result',
      'Break down what happens inside your program',
      'Explain why solving this problem matters now',
      'Share a story of someone who benefited from your work',
      'Break down the first change clients experience',
      'Explain why this solution works',
      'Share a common challenge your clients face',
      'Break down the outcome people want',
      'Explain the long-term benefits of solving this problem',
      'Share a client breakthrough moment',
      'Explain what makes your approach effective',
      'Break down the results clients achieve',
      'Share what clients often say after working with you',
      'Explain why this investment matters',
      'Break down the opportunity cost of not solving this',
      'Explain the result clients are really buying',
      'Share what life looks like after solving this problem',
      'Break down why this offer exists',
      'Explain what makes this solution different',
      'Share the long-term impact of solving this problem',
    ],
  },
}

const TABS = ['New Followers', 'Build Trust', 'Sell/Launch']
const COLS = ['CONNECT', 'CREATE DEMAND', 'ACTIVATE']
const COL_SUBTITLES = {
  CONNECT: 'Attracting new eyes',
  'CREATE DEMAND': 'Shift their perspective',
  ACTIVATE: 'Selling to them',
}

const CHECKLIST_TAB_COLORS = {
  'New Followers': { bg: '#c6def2', text: '#1e4d78' },
  'Build Trust': { bg: '#fcc799', text: '#7a3c0a' },
  'Sell/Launch': { bg: '#cdd5ae', text: '#3d4a1c' },
}

function seededShuffle(arr, seed) {
  const a = [...arr]
  let s = (seed ^ 0xdeadbeef) >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getDailyPrompts(tab, col, dayOfYear, year) {
  const tabIdx = TABS.indexOf(tab)
  const colIdx = COLS.indexOf(col)
  const seed = (year * 366 + dayOfYear) * 100 + tabIdx * 10 + colIdx
  return seededShuffle(CHECKLIST_DATA[tab][col], seed).slice(0, 2)
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

/* ─── Weekly Tracker sub-component ─── */
function WeeklyTracker({ weekDays, weekLogs, todayKey }) {
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const MAX_BAR = 44

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
          const barH = log ? Math.max(6, Math.round((log.energy / 10) * MAX_BAR)) : 0

          return (
            <div key={dKey} className="flex flex-col items-center gap-1">
              <div className="flex items-end justify-center" style={{ height: `${MAX_BAR + 4}px`, width: '100%' }}>
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
  const dateKey = getDateKey()

  const [mode, setMode] = useState(null)
  const [energy, setEnergy] = useState(5)
  const [locked, setLocked] = useState(false)
  const [lockFlash, setLockFlash] = useState(false)
  const [weekLogs, setWeekLogs] = useState({})

  const loadWeekLogs = async () => {
    const days = getCurrentWeekDays()
    const keys = days.map(d => toLocalDateKey(d))
    const { data } = await supabase
      .from('capacity_checkins')
      .select('date_key, mode, energy')
      .eq('user_id', user.id)
      .in('date_key', keys)
    if (data) {
      const logs = {}
      data.forEach(row => { logs[row.date_key] = { mode: row.mode, energy: row.energy } })
      setWeekLogs(logs)
    }
  }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('capacity_checkins')
        .select('mode, energy')
        .eq('user_id', user.id)
        .eq('date_key', dateKey)
        .single()
      if (data) {
        setMode(data.mode || null)
        setEnergy(data.energy ?? 5)
        setLocked(true)
      }
      await loadWeekLogs()
    }
    load()
  }, [user, dateKey])

  const handleLockIn = async () => {
    const payload = { mode, energy }
    await supabase.from('capacity_checkins').upsert(
      { user_id: user.id, date_key: dateKey, mode, energy },
      { onConflict: 'user_id,date_key' }
    )
    setLockFlash(true)
    setWeekLogs(prev => ({ ...prev, [dateKey]: payload }))
    setTimeout(() => { setLockFlash(false); setLocked(true) }, 2500)
  }

  const selectedMode = CAPACITY_MODES.find(m => m.key === mode)
  const trackPct = ((energy - 1) / 9) * 100
  const weekDays = getCurrentWeekDays()

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
              <span className="text-2xl font-black" style={{ color: '#6b1a1a' }}>{energy}</span>
              <span className="text-sm text-gray-400"> / 10</span>
              <p className="text-[10px] text-gray-400 mt-0.5">{ENERGY_CAPTIONS[energy]}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f0ebe8', paddingTop: '16px' }}>
            <WeeklyTracker weekDays={weekDays} weekLogs={weekLogs} todayKey={dateKey} />
          </div>
        </div>
      ) : (
        <div>
          {/* Section A: Mode selector */}
          <div className="grid grid-cols-4 gap-2 mb-5">
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
              <span className="text-3xl font-black" style={{ color: '#6b1a1a' }}>{energy}</span>
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
            <WeeklyTracker weekDays={weekDays} weekLogs={weekLogs} todayKey={dateKey} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Inline Business Focus Form ─── */
function BusinessFocusForm({ onSave, onClose, initial }) {
  const [type, setType] = useState(initial?.focus_type || 'offer')
  const [data, setData] = useState(initial?.data || {})

  const setField = (k, v) => setData(prev => ({ ...prev, [k]: v }))

  const handleSave = () => {
    if (!data.begin_date) return alert('Please select a begin date.')
    onSave({ focus_type: type, data })
  }

  return (
    <div className="form-card space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-sm text-gray-700">{initial ? 'Edit Focus' : 'Add Business Focus'}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg leading-none">×</button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {['offer', 'visibility', 'revenue'].map(t => (
          <button
            key={t}
            onClick={() => {
              setType(t)
              setData(prev => ({ begin_date: prev.begin_date, completion_date: prev.completion_date, status: prev.status }))
            }}
            className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors"
            style={type === t
              ? { backgroundColor: BRAND, color: '#fff' }
              : { backgroundColor: '#f5ede9', color: '#8a6055' }}
          >
            {t === 'offer' ? 'Offer Focus' : t === 'visibility' ? 'Visibility Focus' : 'Revenue Focus'}
          </button>
        ))}
      </div>

      {/* Begin / Completion date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Begin Date</label>
          <input type="date" className="input-field" value={data.begin_date || ''} onChange={e => setField('begin_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Completion Date</label>
          <input type="date" className="input-field" value={data.completion_date || ''} onChange={e => setField('completion_date', e.target.value)} />
        </div>
      </div>

      {type === 'offer' && (
        <div className="space-y-3">
          <div><label className="label">Offer in Focus</label>
            <input className="input-field" value={data.offer || ''} onChange={e => setField('offer', e.target.value)} placeholder="e.g. 1:1 Coaching" /></div>
          <div><label className="label">Revenue Goal</label>
            <input className="input-field" value={data.revenueGoal || ''} onChange={e => setField('revenueGoal', e.target.value)} placeholder="$0" /></div>
          <div><label className="label">Traffic Needed</label>
            <input className="input-field" value={data.trafficNeeded || ''} onChange={e => setField('trafficNeeded', e.target.value)} placeholder="e.g. 500 website visits" /></div>
        </div>
      )}

      {type === 'visibility' && (
        <div className="space-y-3">
          <div><label className="label">Visibility Focus</label>
            <select className="input-field" value={data.visibilityFocus || ''} onChange={e => setField('visibilityFocus', e.target.value)}>
              <option value="">Select...</option>
              {['TikTok Followers', 'Instagram Followers', 'Email List', 'Podcast Downloads', 'YouTube Subscribers', 'Website Traffic'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label className="label">Current Number</label>
            <input className="input-field" type="number" value={data.currentNumber || ''} onChange={e => setField('currentNumber', e.target.value)} /></div>
          <div><label className="label">Target Number</label>
            <input className="input-field" type="number" value={data.targetNumber || ''} onChange={e => setField('targetNumber', e.target.value)} /></div>
        </div>
      )}

      {type === 'revenue' && (
        <div className="space-y-3">
          <div><label className="label">Revenue Focus Type</label>
            <select className="input-field" value={data.revenueFocusType || ''} onChange={e => setField('revenueFocusType', e.target.value)}>
              <option value="">Select...</option>
              {['New Clients', 'Renewals', 'Upsells', 'Launch', 'Recurring Revenue', 'Passive Income'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label className="label">Current Revenue</label>
            <input className="input-field" value={data.currentRevenue || ''} onChange={e => setField('currentRevenue', e.target.value)} placeholder="$0" /></div>
          <div><label className="label">Target Revenue</label>
            <input className="input-field" value={data.targetRevenue || ''} onChange={e => setField('targetRevenue', e.target.value)} placeholder="$0" /></div>
          <div><label className="label">Primary Lever</label>
            <select className="input-field" value={data.primaryLever || ''} onChange={e => setField('primaryLever', e.target.value)}>
              <option value="">Select...</option>
              {['New Offer Launch', 'Increasing Prices', 'Adding Volume', 'Reducing Churn', 'Referrals', 'Ads/Paid Traffic'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors font-medium">Cancel</button>
        <button onClick={handleSave} className="flex-1 btn-brand py-2 rounded-lg" style={{ backgroundColor: BRAND }}>Save Focus</button>
      </div>
    </div>
  )
}

/* ─── Inline Life Focus Form (unchanged) ─── */
function LifeFocusForm({ onSave, onClose, initial }) {
  const AREAS = ['Relationships', 'Hobbies', 'Travel', 'Finances', 'Health']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const years = [2024, 2025, 2026, 2027, 2028]
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

  const [month, setMonth] = useState(initial?.month || '')
  const [year, setYear] = useState(initial?.year || '')
  const [quarter, setQuarter] = useState(initial?.quarter || '')
  const [areas, setAreas] = useState(initial?.areas || [])
  const [notes, setNotes] = useState(initial?.notes || '')

  const toggleArea = (a) => setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const handleSave = () => {
    if (!month || !year) return alert('Please select a month and year.')
    onSave({ month, year, quarter, areas, notes })
  }

  return (
    <div className="form-card space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-sm text-gray-700">{initial ? 'Edit Life Focus' : 'Add Life Focus'}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg leading-none">×</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div><label className="label">Month</label>
          <select className="input-field" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">--</option>
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div><label className="label">Year</label>
          <select className="input-field" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">--</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div><label className="label">Quarter</label>
          <select className="input-field" value={quarter} onChange={e => setQuarter(e.target.value)}>
            <option value="">--</option>
            {quarters.map(q => <option key={q}>{q}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Area of Focus</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {AREAS.map(a => (
            <button
              key={a}
              onClick={() => toggleArea(a)}
              className="tag-btn"
              style={areas.includes(a)
                ? { backgroundColor: BRAND, color: '#fff', borderColor: BRAND }
                : { backgroundColor: '#f5ede9', color: '#8a6055', borderColor: '#e8ddd8' }}
            >{a}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">What does success look like this month?</label>
        <textarea className="textarea-field" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors font-medium">Cancel</button>
        <button onClick={handleSave} className="flex-1 btn-brand py-2 rounded-lg" style={{ backgroundColor: BRAND }}>Save Focus</button>
      </div>
    </div>
  )
}

/* ─── Focus Card — status + date updates ─── */
const STATUS_OPTS = ['Not Started', 'In Progress', 'Completed', 'Not Completed']
const STATUS_STYLES = {
  'Not Started': 'bg-gray-100 text-gray-600 border-gray-200',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Not Completed': 'bg-rose-50 text-rose-700 border-rose-200',
}

function FocusCard({ item, onEdit, onDelete, type, onStatusChange }) {
  const d = item.data || item
  const isLife = type === 'life'

  const focusTypeLabel = item.focus_type === 'offer' ? 'Offer Focus'
    : item.focus_type === 'visibility' ? 'Visibility Focus'
    : 'Revenue Focus'

  const currentStatus = d.status || 'Not Started'

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return (
    <div className="rounded-xl p-4 group" style={{ backgroundColor: '#fdf9f7', border: '1px solid #ede6e1' }}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {!isLife && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-2"
              style={{ backgroundColor: '#f0e6e0', color: BRAND }}>
              {focusTypeLabel}
            </span>
          )}
          {isLife && d.areas?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {d.areas.map(a => (
                <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: '#f3e9f5', color: '#5a2d58' }}>{a}</span>
              ))}
            </div>
          )}

          {/* Dates — new format */}
          {!isLife && (d.begin_date || d.completion_date) && (
            <p className="text-xs text-gray-400 mb-1.5">
              {d.begin_date && <span>From {formatDisplayDate(d.begin_date)}</span>}
              {d.begin_date && d.completion_date && <span className="mx-1 text-gray-300">—</span>}
              {d.completion_date && <span>Due {formatDisplayDate(d.completion_date)}</span>}
            </p>
          )}
          {/* Legacy fallback for old records */}
          {!isLife && !d.begin_date && !d.completion_date && d.month && (
            <p className="text-xs text-gray-400 mb-1">
              {d.month} {d.year}{d.quarter ? ` · ${d.quarter}` : ''}
            </p>
          )}
          {isLife && (d.month || d.year) && (
            <p className="text-xs text-gray-400 mb-1">
              {d.month} {d.year}{d.quarter ? ` · ${d.quarter}` : ''}
            </p>
          )}

          {!isLife && d.offer && <p className="text-sm font-semibold text-gray-800">{d.offer}</p>}
          {!isLife && d.visibilityFocus && <p className="text-sm font-semibold text-gray-800">{d.visibilityFocus}</p>}
          {!isLife && d.revenueFocusType && <p className="text-sm font-semibold text-gray-800">{d.revenueFocusType}</p>}
          {!isLife && d.revenueGoal && <p className="text-xs text-gray-500 mt-1">Goal: {d.revenueGoal}</p>}
          {!isLife && d.targetNumber && <p className="text-xs text-gray-500 mt-1">Target: {d.targetNumber}</p>}
          {!isLife && d.targetRevenue && <p className="text-xs text-gray-500 mt-1">Target: {d.targetRevenue}</p>}
          {isLife && d.notes && <p className="text-sm text-gray-600 mt-1">{d.notes}</p>}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="edit-btn"><EditIcon /></button>
          <button onClick={onDelete} className="delete-btn"><DeleteIcon /></button>
        </div>
      </div>

      {/* Status row — business only */}
      {!isLife && (
        <div className="flex gap-1.5 flex-wrap pt-3 mt-2" style={{ borderTop: '1px solid #ede6e1' }}>
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => onStatusChange && onStatusChange(s)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-all ${
                currentStatus === s
                  ? STATUS_STYLES[s]
                  : 'text-gray-400 bg-transparent border-transparent hover:border-gray-200 hover:text-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
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
  const dateKey = getDateKey()
  const localMonthName = new Date().toLocaleString('default', { month: 'long' })

  const [season, setSeason] = useState(null)
  const [seasonLocked, setSeasonLocked] = useState(false)
  const [seasonLoaded, setSeasonLoaded] = useState(false)

  const [businessFocuses, setBusinessFocuses] = useState([])
  const [lifeFocuses, setLifeFocuses] = useState([])
  const [showBizForm, setShowBizForm] = useState(false)
  const [showLifeForm, setShowLifeForm] = useState(false)
  const [editBiz, setEditBiz] = useState(null)
  const [editLife, setEditLife] = useState(null)

  const [checklistTab, setChecklistTab] = useState('New Followers')
  const [checked, setChecked] = useState({})
  const [checklistComplete, setChecklistComplete] = useState(false)
  const [bizTab, setBizTab] = useState('main')

  const todayDate = new Date()
  const dayOfYear = getDayOfYear(todayDate)
  const currentYear = todayDate.getFullYear()
  const currentMonth = todayDate.getMonth() + 1

  useEffect(() => {
    supabase.from('season_selection')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single()
      .then(({ data }) => {
        if (data) {
          setSeason(data.season)
          setSeasonLocked(true)
        }
        setSeasonLoaded(true)
      })
  }, [user, currentMonth, currentYear])

  const saveSeason = async (s) => {
    if (seasonLocked) return
    setSeason(s)
    setSeasonLocked(true)
    await supabase.from('season_selection').upsert(
      { user_id: user.id, month: currentMonth, year: currentYear, season: s },
      { onConflict: 'user_id,month,year' }
    )
  }

  const resetSeason = async () => {
    setSeason(null)
    setSeasonLocked(false)
    await supabase.from('season_selection')
      .delete()
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
  }

  useEffect(() => {
    const thisYear = new Date().getFullYear()
    supabase.from('business_focus').select('*').eq('user_id', user.id)
      .order('created_at').then(async ({ data }) => {
        if (!data) return setBusinessFocuses([])
        const stale = data.filter(item => new Date(item.created_at).getFullYear() < thisYear)
        if (stale.length > 0) {
          await Promise.all(stale.map(item => supabase.from('business_focus').delete().eq('id', item.id)))
          setBusinessFocuses(data.filter(item => new Date(item.created_at).getFullYear() >= thisYear))
        } else {
          setBusinessFocuses(data)
        }
      })
  }, [user])

  const saveBizFocus = async (item) => {
    if (businessFocuses.length >= 15 && !editBiz) return alert('Max 15 business focuses.')
    if (editBiz) {
      const { data, error } = await supabase.from('business_focus').update(item).eq('id', editBiz.id).select().single()
      if (error || !data) { console.error('Failed to update business focus:', error); return }
      setBusinessFocuses(prev => prev.map(x => x.id === editBiz.id ? data : x))
    } else {
      const { data, error } = await supabase.from('business_focus').insert({ ...item, user_id: user.id }).select().single()
      if (error || !data) { console.error('Failed to save business focus:', error); return }
      setBusinessFocuses(prev => [...prev, data])
    }
    setShowBizForm(false); setEditBiz(null)
  }

  const deleteBizFocus = async (id) => {
    await supabase.from('business_focus').delete().eq('id', id)
    setBusinessFocuses(prev => prev.filter(x => x.id !== id))
  }

  const updateBizFocusStatus = async (id, status) => {
    const item = businessFocuses.find(x => x.id === id)
    if (!item) return
    const updatedData = { ...item.data, status }
    const { data } = await supabase.from('business_focus')
      .update({ data: updatedData })
      .eq('id', id).select().single()
    setBusinessFocuses(prev => prev.map(x => x.id === id ? data : x))
  }

  useEffect(() => {
    const thisYear = new Date().getFullYear()
    supabase.from('life_focus').select('*').eq('user_id', user.id)
      .order('created_at').then(async ({ data }) => {
        if (!data) return setLifeFocuses([])
        const stale = data.filter(item => new Date(item.created_at).getFullYear() < thisYear)
        if (stale.length > 0) {
          await Promise.all(stale.map(item => supabase.from('life_focus').delete().eq('id', item.id)))
          setLifeFocuses(data.filter(item => new Date(item.created_at).getFullYear() >= thisYear))
        } else {
          setLifeFocuses(data)
        }
      })
  }, [user])

  const saveLifeFocus = async (item) => {
    if (lifeFocuses.length >= 15 && !editLife) return alert('Max 15 life focuses.')
    if (editLife) {
      const { data, error } = await supabase.from('life_focus').update(item).eq('id', editLife.id).select().single()
      if (error || !data) { console.error('Failed to update life focus:', error); return }
      setLifeFocuses(prev => prev.map(x => x.id === editLife.id ? data : x))
    } else {
      const { data, error } = await supabase.from('life_focus').insert({ ...item, user_id: user.id }).select().single()
      if (error || !data) { console.error('Failed to save life focus:', error); return }
      setLifeFocuses(prev => [...prev, data])
    }
    setShowLifeForm(false); setEditLife(null)
  }

  const deleteLifeFocus = async (id) => {
    await supabase.from('life_focus').delete().eq('id', id)
    setLifeFocuses(prev => prev.filter(x => x.id !== id))
  }

  useEffect(() => {
    supabase.from('daily_checklist').select('*').eq('user_id', user.id).eq('date_key', dateKey).single()
      .then(({ data }) => {
        if (data) { setChecked(data.checked_items || {}); setChecklistComplete(data.is_complete || false) }
      })
  }, [user, dateKey])

  const toggleCheck = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    setChecklistComplete(false)
  }

  const saveChecklist = async (items, complete) => {
    await supabase.from('daily_checklist').upsert(
      { user_id: user.id, date_key: dateKey, checked_items: items, is_complete: complete },
      { onConflict: 'user_id,date_key' }
    )
  }

  const completeChecklist = () => { setChecklistComplete(true); saveChecklist(checked, true) }
  const resetChecklist = () => { setChecked({}); setChecklistComplete(false); saveChecklist({}, false) }

  return (
    <div className="space-y-6">
      {/* Header image */}
      <div>
        <img
          src="https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2162592122/settings_images/1622d17-4367-a434-f718-0be170584c6a_WMHQ_Community_Covers.png"
          alt="WMHQ"
          className="w-full rounded-2xl object-cover"
          style={{ maxHeight: '220px' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Welcome + Date + Login button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome back, {firstName} 👋</h1>
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

      {/* Insight of the Day */}
      <div className="card-section" style={{ borderLeft: `3px solid ${BRAND}` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: BRAND }}>
          JP × WMHQ — Insight of the Day
        </p>
        <p className="text-gray-800 font-medium text-base leading-relaxed italic">
          "{insight}"
        </p>
      </div>

      {/* Your Season This Month */}
      <div className="card-section">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">SEASON</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Your Monthly Mode</h2>
            <p className="text-xs text-gray-400 mt-1">
              Locks in for {localMonthName} — press Reset to change.
            </p>
          </div>
          {seasonLocked && (
            <button
              onClick={resetSeason}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 mt-1"
              style={{ border: '1px solid #ede6e1', backgroundColor: '#fdf9f7' }}
            >
              <span>↺</span> Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Object.entries(SEASONS).map(([key, s]) => {
            const isSelected = season === key
            const isDisabled = seasonLocked && !isSelected
            return (
              <button
                key={key}
                onClick={() => saveSeason(key)}
                disabled={isDisabled}
                className="p-4 rounded-xl text-left transition-all"
                style={
                  isSelected
                    ? { border: `2px solid ${s.color}`, backgroundColor: s.bg }
                    : isDisabled
                    ? { border: '2px solid #ede6e1', backgroundColor: '#fafafa', opacity: 0.45, cursor: 'not-allowed' }
                    : { border: '2px solid #ede6e1', backgroundColor: '#fdf9f7' }
                }
              >
                <div className="w-3.5 h-3.5 rounded-full mb-2.5" style={{ backgroundColor: s.color }} />
                <p className="font-bold text-xs text-gray-800 leading-tight">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </button>
            )
          })}
        </div>

        {season && (
          <div className="mt-4 p-3 rounded-lg text-sm text-gray-600"
            style={{ backgroundColor: SEASONS[season].bg, borderLeft: `3px solid ${SEASONS[season].color}` }}>
            {SEASONS[season].text}
          </div>
        )}
      </div>

      {/* Today's Capacity Check-in */}
      <CapacityCheckin />

      {/* Business Focus */}
      <div className="card-section">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="section-title">Business Focus</h2>
            <p className="section-subtitle">Your active priorities, moving forward.</p>
          </div>
          {!showBizForm && businessFocuses.length < 15 && (
            <button
              className="btn-brand text-sm flex-shrink-0"
              style={{ backgroundColor: BRAND }}
              onClick={() => { setEditBiz(null); setShowBizForm(true) }}
            >
              + Add
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-4">
          {[['main', 'Main'], ['completed', 'Completed'], ['not_completed', 'Not Completed']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBizTab(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={bizTab === key
                ? { backgroundColor: BRAND, color: '#fff' }
                : { color: '#9ca3af', backgroundColor: 'transparent' }}
            >{label}</button>
          ))}
        </div>

        <div className="space-y-3">
          {businessFocuses
            .filter(item => {
              const status = item.data?.status || 'Not Started'
              if (bizTab === 'completed') return status === 'Completed'
              if (bizTab === 'not_completed') return status === 'Not Completed'
              return status !== 'Completed' && status !== 'Not Completed'
            })
            .map(item => (
              <FocusCard
                key={item.id}
                item={item}
                type="business"
                onEdit={() => { setEditBiz(item); setShowBizForm(true) }}
                onDelete={() => deleteBizFocus(item.id)}
                onStatusChange={(status) => updateBizFocusStatus(item.id, status)}
              />
            ))}
        </div>

        {showBizForm && (
          <div className="mt-3">
            <BusinessFocusForm
              initial={editBiz}
              onSave={saveBizFocus}
              onClose={() => { setShowBizForm(false); setEditBiz(null) }}
            />
          </div>
        )}

        {businessFocuses.filter(item => {
          const status = item.data?.status || 'Not Started'
          if (bizTab === 'completed') return status === 'Completed'
          if (bizTab === 'not_completed') return status === 'Not Completed'
          return status !== 'Completed' && status !== 'Not Completed'
        }).length === 0 && !showBizForm && (
          <p className="text-sm text-gray-400 italic">
            {bizTab === 'main' ? 'No active business focuses.' : bizTab === 'completed' ? 'No completed items yet.' : 'No not-completed items.'}
          </p>
        )}
      </div>

      {/* Life Focus */}
      <div className="card-section">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="section-title">Life Focus</h2>
            <p className="section-subtitle">Current personal priorities and areas of attention.</p>
          </div>
          {!showLifeForm && lifeFocuses.length < 15 && (
            <button
              className="btn-brand text-sm flex-shrink-0"
              style={{ backgroundColor: BRAND }}
              onClick={() => { setEditLife(null); setShowLifeForm(true) }}
            >
              + Add
            </button>
          )}
        </div>

        <div className="space-y-3">
          {lifeFocuses.map(item => (
            <FocusCard
              key={item.id}
              item={{ ...item, data: item }}
              type="life"
              onEdit={() => { setEditLife(item); setShowLifeForm(true) }}
              onDelete={() => deleteLifeFocus(item.id)}
            />
          ))}
        </div>

        {showLifeForm && (
          <div className="mt-3">
            <LifeFocusForm
              initial={editLife}
              onSave={saveLifeFocus}
              onClose={() => { setShowLifeForm(false); setEditLife(null) }}
            />
          </div>
        )}

        {lifeFocuses.length === 0 && !showLifeForm && (
          <p className="text-sm text-gray-400 italic">No life focuses added yet.</p>
        )}
      </div>

      {/* Daily Marketing Checklist */}
      <div className="card-section">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="section-title">Daily Marketing Checklist</h2>
            <p className="section-subtitle">Resets daily</p>
          </div>
          <div className="flex gap-2 items-center">
            {checklistComplete ? (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100">✓ Done today</span>
            ) : (
              <button onClick={completeChecklist} className="btn-brand text-xs" style={{ backgroundColor: BRAND }}>Complete Today</button>
            )}
            <button onClick={resetChecklist} title="Reset" className="edit-btn"><ResetIcon /></button>
          </div>
        </div>

        <div className="flex gap-1 mb-5">
          {TABS.map(tab => {
            const pc = CHECKLIST_TAB_COLORS[tab]
            return (
              <button
                key={tab}
                onClick={() => setChecklistTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={checklistTab === tab
                  ? { backgroundColor: pc.bg, color: pc.text }
                  : { color: '#9ca3af', backgroundColor: 'transparent' }}
              >{tab}</button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {COLS.map(col => {
            const prompts = getDailyPrompts(checklistTab, col, dayOfYear, currentYear)
            return (
              <div key={col}>
                <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-0.5">{col}</p>
                <p className="text-xs text-gray-400 mb-3">{COL_SUBTITLES[col]}</p>
                <div className="space-y-2">
                  {prompts.map((item, i) => {
                    const key = `${checklistTab}-${col}-${i}`
                    return (
                      <label key={key}
                        className="flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={!!checked[key]}
                          onChange={() => toggleCheck(key)}
                          className="mt-0.5 flex-shrink-0"
                          style={{ accentColor: BRAND }}
                        />
                        <span className={`text-xs leading-relaxed ${checked[key] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
