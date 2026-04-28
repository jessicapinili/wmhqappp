import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BRAND = '#3d0c0c'
const GOLD  = '#C9A227'

/* ── Hardcoded arrays (fixed order, 0-indexed) ── */
const fears = [
  "You'll be abandoned or outgrow people you love",
  "You'll be criticised or called out publicly",
  "You'll be exposed as not good enough",
  "You'll fail privately and publicly",
  "You'll freeze or shut down when things get big",
  "You'll invest and not get the ROI",
  "You'll lose everything as soon as you get ahead",
  "You'll lose control as the business grows",
  "You'll never reach your true potential",
  "You're becoming too much for people",
  "You're not capable of holding the next level",
  "You're not meant for the success you want",
  "Your ambition makes you unrelatable",
  "Your audience won't get you or will misunderstand you",
  "Your business growth will expose your flaws",
  "Your identity will change faster than you can keep up",
  "Your success will create more pressure than you can handle",
  "Being fully seen for who you are",
  "Being perceived the wrong way",
  "Disappointing people who expect a lot from you",
  "Receiving more than your system can hold",
  "Slowing down and losing momentum",
  "Visibility. The attention, the eyes, the opinions",
  "If you simplify your business, everything will stop working",
  "Consistency will trap you into a version of success you don't actually want",
  "Being fully booked and secretly resenting your business",
  "Your next level requires becoming someone you don't recognise",
  "If you raise your prices, people will disappear overnight",
  "You've already missed your moment and everyone else is ahead",
  "If it finally works, you won't be able to maintain it",
]

const mantras = [
  "I can grow without abandoning myself or the people who are truly aligned with me",
  "I can be misunderstood and still stand firmly in my truth",
  "I don't need to prove I'm enough. I decide it and move from there",
  "I am willing to be seen trying, learning, and getting it wrong",
  "I stay present and responsive when things get bigger instead of shutting down",
  "I trust my decisions and take full ownership of how I create return",
  "I don't self-sabotage the moment things start working",
  "I lead even when things feel unfamiliar or uncertain",
  "I follow through on the life I say I want",
  "I no longer shrink to make others comfortable with me",
  "I expand my capacity instead of questioning if I can handle it",
  "I stop making success mean something about my worth",
  "I let my ambition filter out who isn't meant to stay",
  "I communicate clearly instead of diluting myself to be understood by everyone",
  "I let growth reveal what needs to be strengthened, not hidden",
  "I stabilise my identity as I evolve instead of chasing it",
  "I normalise responsibility instead of making it mean pressure",
  "I allow myself to be fully seen without performing",
  "I release the need to control how I'm perceived",
  "I stop carrying expectations that were never mine to hold",
  "I actively build the capacity to receive and keep more",
  "I trust that slowing down can be part of moving forward",
  "I choose visibility even when it feels exposing",
  "I trust simplicity to strengthen my results",
  "I create structure that supports me instead of trapping me",
  "I build a business that doesn't rely on me overextending",
  "I let myself evolve without making it an identity crisis",
  "I hold my pricing without negotiating against myself",
  "I stop comparing timelines and stay anchored in my own",
  "I build systems and standards that allow me to sustain what I create",
]

/* ── Calendar helpers (strict local-date logic) ── */
function getLocalMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDaysSinceStart(startedAt) {
  if (!startedAt) return 0
  const startMidnight = getLocalMidnight(new Date(startedAt))
  const todayMidnight = getLocalMidnight(new Date())
  return Math.floor((todayMidnight - startMidnight) / (1000 * 60 * 60 * 24))
}

// Returns 1-indexed today challenge day (1–30). Returns 31 when calendar is past day 30.
function getTodayChallengeDay(startedAt) {
  if (!startedAt) return 1
  return Math.min(getDaysSinceStart(startedAt) + 1, 31)
}

// dayNum is 1-indexed. completedDays stores 1-indexed day numbers.
function getDayStatus(dayNum, todayChallengeDay, completedDays) {
  if (completedDays.includes(dayNum)) return 'completed'
  if (dayNum < todayChallengeDay)     return 'missed'
  if (dayNum === todayChallengeDay && dayNum <= 30) return 'active'
  return 'future'
}

/* ── Canvas PNG export ── */
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line.trimEnd(), x, curY)
      line = words[i] + ' '
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trimEnd(), x, curY)
    curY += lineHeight
  }
  return curY
}

function exportPNG(dayNum, benefits, drawbacks) {
  const W = 1080
  const H = 1920
  const PAD = 80
  const MAX_W = W - PAD * 2
  const idx = dayNum - 1 // convert to 0-index for arrays

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FAF6F0'
  ctx.fillRect(0, 0, W, H)

  let y = 110

  ctx.fillStyle = BRAND
  ctx.font = 'bold 60px Georgia, serif'
  ctx.fillText('WOMAN MASTERY HQ', PAD, y)
  y += 52

  ctx.fillStyle = '#9ca3af'
  ctx.font = '500 17px Arial, sans-serif'
  ctx.fillText('CLEAR YOUR FEARS', PAD, y)
  y += 34

  ctx.fillStyle = '#9ca3af'
  ctx.font = '300 17px Arial, sans-serif'
  ctx.fillText(`Day ${dayNum} of 30`, PAD, y)
  y += 44

  ctx.strokeStyle = BRAND
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
  y += 64

  ctx.fillStyle = '#9ca3af'
  ctx.font = '600 12px Arial, sans-serif'
  ctx.fillText("TODAY'S FEAR", PAD, y)
  y += 32

  ctx.fillStyle = BRAND
  ctx.font = '500 26px Georgia, serif'
  y = wrapCanvasText(ctx, fears[idx], PAD, y, MAX_W, 40)
  y += 52

  ctx.fillStyle = '#9ca3af'
  ctx.font = '600 12px Arial, sans-serif'
  ctx.fillText('BENEFITS OF RELEASING', PAD, y)
  y += 32

  ctx.fillStyle = '#1a0606'
  ctx.font = '300 22px Arial, sans-serif'
  const benefitLines = benefits.filter(b => b.trim())
  if (benefitLines.length === 0) {
    y = wrapCanvasText(ctx, '—', PAD, y, MAX_W, 36)
  } else {
    benefitLines.forEach(b => { y = wrapCanvasText(ctx, `—  ${b}`, PAD, y, MAX_W, 36) })
  }
  y += 52

  ctx.fillStyle = '#9ca3af'
  ctx.font = '600 12px Arial, sans-serif'
  ctx.fillText('DRAWBACKS OF HOLDING', PAD, y)
  y += 32

  ctx.fillStyle = '#1a0606'
  ctx.font = '300 22px Arial, sans-serif'
  const drawbackLines = drawbacks.filter(d => d.trim())
  if (drawbackLines.length === 0) {
    y = wrapCanvasText(ctx, '—', PAD, y, MAX_W, 36)
  } else {
    drawbackLines.forEach(d => { y = wrapCanvasText(ctx, `—  ${d}`, PAD, y, MAX_W, 36) })
  }
  y += 52

  ctx.fillStyle = '#9ca3af'
  ctx.font = '600 12px Arial, sans-serif'
  ctx.fillText('CAPACITY MANTRA', PAD, y)
  y += 32

  ctx.fillStyle = BRAND
  ctx.font = 'italic 500 24px Georgia, serif'
  y = wrapCanvasText(ctx, `"${mantras[idx]}"`, PAD, y, MAX_W, 38)

  const footerLineY = H - 90
  ctx.strokeStyle = '#e8e0d8'
  ctx.lineWidth = 0.75
  ctx.beginPath()
  ctx.moveTo(PAD, footerLineY)
  ctx.lineTo(W - PAD, footerLineY)
  ctx.stroke()

  ctx.fillStyle = '#9ca3af'
  ctx.font = '300 14px Arial, sans-serif'
  ctx.fillText('This work is the sole property of Jessica Pinili. All rights reserved.', PAD, footerLineY + 30)

  const link = document.createElement('a')
  link.download = `clear-your-fears-day-${dayNum}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/* ── Day circle ── */
function DayCircle({ dayNum, status, onClick }) {
  const isClickable = status === 'active'

  let border, bg, mainColor, subColor
  if (status === 'completed') {
    border = 'none';          bg = BRAND
    mainColor = 'rgba(255,255,255,0.92)'; subColor = 'rgba(255,255,255,0.72)'
  } else if (status === 'active') {
    border = `2px solid ${GOLD}`; bg = 'transparent'
    mainColor = BRAND;             subColor = GOLD
  } else if (status === 'missed') {
    border = '1.5px solid #d1d5db'; bg = '#f8f7f6'
    mainColor = '#b8a898';           subColor = '#b8a898'
  } else {
    border = '1.5px solid #e5e7eb'; bg = 'transparent'
    mainColor = '#d1d5db';           subColor = '#d1d5db'
  }

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      title={`Day ${dayNum}`}
      style={{
        aspectRatio: '1',
        borderRadius: '50%',
        border,
        backgroundColor: bg,
        cursor: isClickable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        padding: '3px',
        transition: 'transform 0.1s ease',
        outline: 'none',
        boxShadow: status === 'active' ? `0 0 0 2px ${GOLD}22` : 'none',
      }}
      onMouseEnter={isClickable ? e => { e.currentTarget.style.transform = 'scale(1.12)' } : undefined}
      onMouseLeave={isClickable ? e => { e.currentTarget.style.transform = 'scale(1)' } : undefined}
    >
      <span style={{
        display: 'block',
        fontSize: '7px',
        fontWeight: status === 'active' ? 700 : 600,
        color: mainColor,
        lineHeight: 1.2,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        Day {dayNum}
      </span>
      {status === 'completed' && (
        <span style={{
          display: 'block',
          fontSize: '5.5px',
          color: subColor,
          lineHeight: 1.15,
          marginTop: '1.5px',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          Fear logged ✓
        </span>
      )}
      {status === 'missed' && (
        <span style={{
          display: 'block',
          fontSize: '5.5px',
          color: subColor,
          lineHeight: 1.15,
          marginTop: '1.5px',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          Not logged
        </span>
      )}
    </button>
  )
}

/* ── Main component ── */
export default function ClearYourFears() {
  const { user } = useAuth()
  const [progress, setProgress]             = useState(null)
  const [loading, setLoading]               = useState(true)
  const [view, setView]                     = useState('dashboard')
  const [benefits, setBenefits]             = useState(['', '', ''])
  const [drawbacks, setDrawbacks]           = useState(['', '', ''])
  const [timerSec, setTimerSec]             = useState(null)
  const [timerRunning, setTimerRunning]     = useState(false)
  const [timerMsg, setTimerMsg]             = useState('')
  const [loggedDay, setLoggedDay]           = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => { loadProgress() }, [user])

  const loadProgress = async () => {
    const { data } = await supabase
      .from('clear_the_fears_progress')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      // Auto-reset after 50 calendar days
      if (data.started_at && getDaysSinceStart(data.started_at) > 50) {
        await doReset(true)
        return
      }

      // Auto-compute and persist any newly missed days
      const todayChallengeDay = getTodayChallengeDay(data.started_at)
      const completedDays = data.completed_days ?? []
      const newMissed = []
      for (let day = 1; day < todayChallengeDay; day++) {
        if (!completedDays.includes(day)) newMissed.push(day)
      }
      const storedMissed = data.missed_days ?? []
      const missedChanged = newMissed.some(d => !storedMissed.includes(d))
      if (missedChanged) {
        await supabase
          .from('clear_the_fears_progress')
          .update({ missed_days: newMissed })
          .eq('user_id', user.id)
        setProgress({ ...data, missed_days: newMissed })
      } else {
        setProgress(data)
      }
    } else {
      // No row — user hasn't started yet. Show empty state.
      setProgress(null)
    }
    setLoading(false)
  }

  const handleBeginChallenge = async () => {
    const fresh = {
      user_id: user.id,
      current_day: 0,
      completed_days: [],
      missed_days: [],
      started_at: new Date().toISOString(),
    }
    await supabase.from('clear_the_fears_progress').insert(fresh)
    setProgress(fresh)
  }

  const doReset = async (fromLoad = false) => {
    const fresh = {
      user_id: user.id,
      current_day: 0,
      completed_days: [],
      missed_days: [],
      started_at: new Date().toISOString(),
    }
    await supabase
      .from('clear_the_fears_progress')
      .upsert(fresh, { onConflict: 'user_id' })
    setProgress(fresh)
    setView('dashboard')
    setShowResetConfirm(false)
    setBenefits(['', '', ''])
    setDrawbacks(['', '', ''])
    clearInterval(intervalRef.current)
    setTimerSec(null)
    setTimerRunning(false)
    setTimerMsg('')
    if (fromLoad) setLoading(false)
  }

  const handleStartDay = () => {
    setBenefits(['', '', ''])
    setDrawbacks(['', '', ''])
    clearInterval(intervalRef.current)
    setTimerSec(null)
    setTimerRunning(false)
    setTimerMsg('')
    setView('step1')
  }

  const handleLogDay = async () => {
    const todayChallengeDay = getTodayChallengeDay(progress?.started_at)
    const completedDays = progress?.completed_days ?? []

    // Guard: don't allow logging if today is already completed or past day 30
    if (completedDays.includes(todayChallengeDay) || todayChallengeDay > 30) return

    const newCompleted = [...completedDays, todayChallengeDay]
    const newMissed = []
    for (let day = 1; day < todayChallengeDay; day++) {
      if (!newCompleted.includes(day)) newMissed.push(day)
    }

    const updated = {
      user_id: user.id,
      current_day: 0,
      completed_days: newCompleted,
      missed_days: newMissed,
      started_at: progress.started_at,
    }

    await supabase
      .from('clear_the_fears_progress')
      .upsert(updated, { onConflict: 'user_id' })
    setProgress(updated)
    setLoggedDay(todayChallengeDay)
    clearInterval(intervalRef.current)
    setTimerRunning(false)
    setView('logged')
  }

  const startTimer = (minutes) => {
    clearInterval(intervalRef.current)
    const total = minutes * 60
    setTimerSec(total)
    setTimerRunning(true)
    setTimerMsg('Breathe and repeat')
    let remaining = total
    intervalRef.current = setInterval(() => {
      remaining -= 1
      setTimerSec(remaining)
      if (remaining <= 0) {
        clearInterval(intervalRef.current)
        setTimerRunning(false)
        setTimerMsg('Complete. Open your eyes when ready.')
      }
    }, 1000)
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: BRAND, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const startedAt         = progress?.started_at ?? null
  const todayChallengeDay = getTodayChallengeDay(startedAt)
  const completedDays     = progress?.completed_days ?? []
  const completedCount    = completedDays.length
  const progressPct       = (completedCount / 30) * 100
  const todayCompleted    = completedDays.includes(todayChallengeDay) && todayChallengeDay <= 30
  const challengeDone     = completedDays.includes(30)

  /* Shared page header — shown on every view */
  const PageHeader = () => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#e7cee3' }} />
        <h1 className="page-title">Clear Your Fears 30 Day Challenge</h1>
      </div>
      <p className="text-sm text-gray-500">
        A 30-day process to identify the fears driving your decisions, track them daily, and stop letting them dictate your actions.
      </p>
    </div>
  )

  /* ── First-time: no challenge started yet ── */
  if (!progress?.started_at) {
    return (
      <div className="space-y-6">
        <PageHeader />

        {/* 2-step intro — shown in both states */}
        <div>
          <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>
            2 steps to this challenge →
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mb-1">
            <span className="text-gray-500" style={{ fontWeight: 500 }}>Clear Your Fear:</span> break down the real benefit and cost of holding onto it.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="text-gray-500" style={{ fontWeight: 500 }}>Capacity Check-In:</span> use a timer to sit with it and expand your tolerance.
          </p>
        </div>

        <div className="card text-center" style={{ padding: '56px 24px' }}>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed mx-auto" style={{ maxWidth: '300px' }}>
            Face one fear per day. Sit with it. Build the capacity to hold more.
          </p>
          <button onClick={handleBeginChallenge} className="btn-brand-outline">
            Begin Clear Your Fears Challenge
          </button>
        </div>
      </div>
    )
  }

  /* ── Completion screen ── */
  if (challengeDone && view === 'dashboard') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="card text-center" style={{ padding: '48px 24px' }}>
          <div
            className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ backgroundColor: '#fdf8f5', border: '0.5px solid #e8e0d8' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="section-title mb-2">30 days complete</h3>
          <p className="text-sm text-gray-500 mx-auto mb-8 leading-relaxed" style={{ maxWidth: '340px' }}>
            You faced 30 fears. You expanded your capacity 30 times. The woman who started this is not the woman finishing it.
          </p>
          <button onClick={() => doReset()} className="btn-brand">
            Reset and go again
          </button>
        </div>
      </div>
    )
  }

  /* ── Day logged confirmation ── */
  if (view === 'logged') {
    return (
      <div className="space-y-6">
      <PageHeader />
      <div className="card text-center" style={{ padding: '48px 32px' }}>
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#fdf8f5', border: '0.5px solid #e8e0d8' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="section-title mb-1">Day {loggedDay} logged</h3>
        <p
          className="text-xs text-gray-400 uppercase tracking-wider mb-7"
          style={{ letterSpacing: '0.16em' }}
        >
          Fear faced. Capacity expanded.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => exportPNG(loggedDay, benefits, drawbacks)}
            className="btn-brand"
          >
            Save as PNG
          </button>
          <button
            onClick={() => setView('dashboard')}
            className="btn-brand-outline"
          >
            Back to grid
          </button>
        </div>
      </div>
      </div>
    )
  }

  /* ── Step 2: Capacity practice ── */
  if (view === 'step2') {
    const idx = todayChallengeDay - 1
    const mantra = mantras[idx]
    return (
      <div className="space-y-6">
      <PageHeader />
      <div className="card" style={{ padding: 0 }}>
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Clear Your Fears · Day {todayChallengeDay} of 30
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <p className="label mb-2">Capacity practice</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Hand over heart. Eyes closed. Repeat for 1–3 minutes. Feel whatever comes up. Let the sensation move through you.
            </p>
          </div>

          <div className="p-5 rounded-xl" style={{ backgroundColor: '#FFF8F8', border: `1.5px solid ${BRAND}28` }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '19px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: BRAND,
              lineHeight: 1.6,
            }}>
              &ldquo;{mantra}&rdquo;
            </p>
          </div>

          <div>
            <p className="label mb-3">Timer (optional)</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map(min => (
                <button key={min} onClick={() => startTimer(min)} className="btn-brand-outline">
                  {min} min
                </button>
              ))}
            </div>
          </div>

          {timerSec !== null && (
            <div className="text-center py-2">
              {timerSec > 0 ? (
                <>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: '54px',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: BRAND,
                    lineHeight: 1,
                  }}>
                    {formatTime(timerSec)}
                  </p>
                  {timerMsg && (
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-2" style={{ letterSpacing: '0.14em' }}>
                      {timerMsg}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">{timerMsg}</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100">
          <button onClick={handleLogDay} className="btn-brand w-full sm:w-auto">
            Log day
          </button>
        </div>
      </div>
      </div>
    )
  }

  /* ── Step 1: Fear prompt ── */
  if (view === 'step1') {
    const idx = todayChallengeDay - 1
    const fear = fears[idx]
    return (
      <div className="space-y-6">
      <PageHeader />
      <div className="card" style={{ padding: 0 }}>
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Clear Your Fears · Day {todayChallengeDay} of 30
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div>
            <p className="label mb-2">Today's fear</p>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF8F8', border: `1.5px solid ${BRAND}28` }}>
              <p className="section-title" style={{ color: BRAND }}>{fear}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="label mb-1">3 benefits of holding this fear</p>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                In what ways does this fear protect you, keep you alert, and help you avoid real danger when you hold onto it?
              </p>
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    className="input-field"
                    value={benefits[i]}
                    onChange={e => { const n = [...benefits]; n[i] = e.target.value; setBenefits(n) }}
                    placeholder={`Benefit ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="label mb-1">3 drawbacks of holding this fear</p>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                In what ways does this fear keep you stuck, limit your growth, and stop you from taking the exact actions that would move your life forward?
              </p>
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    className="input-field"
                    value={drawbacks[i]}
                    onChange={e => { const n = [...drawbacks]; n[i] = e.target.value; setDrawbacks(n) }}
                    placeholder={`Drawback ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 flex justify-end">
          <button onClick={() => setView('step2')} className="btn-brand w-full sm:w-auto">
            Next: Capacity practice →
          </button>
        </div>
      </div>
      </div>
    )
  }

  /* ── Dashboard ── */
  return (
    <div className="space-y-6">
      <PageHeader />

      {/* 2-step intro */}
      <div>
        <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>
          2 steps to this challenge →
        </p>
        <p className="text-xs text-gray-400 leading-relaxed mb-1">
          <span className="text-gray-500" style={{ fontWeight: 500 }}>Clear Your Fear:</span> break down the real benefit and cost of holding onto it.
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          <span className="text-gray-500" style={{ fontWeight: 500 }}>Capacity Check-In:</span> use a timer to sit with it and expand your tolerance.
        </p>
      </div>

      <div className="card p-4 sm:p-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="section-title">Clear Your Fears</h3>
            <p className="label mt-0.5" style={{ marginBottom: 0 }}>WMHQ 30-day challenge</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '17px',
              fontStyle: 'italic',
              fontWeight: 300,
              color: '#1a0606',
            }}>
              {completedCount}/30 complete
            </p>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '8px',
                fontWeight: 400,
                letterSpacing: '0.08em',
                color: '#b8a898',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                marginTop: '2px',
                display: 'block',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#6b7280' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#b8a898' }}
            >
              Reset challenge ↻
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-full mb-4">
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: BRAND }}
          />
        </div>

        {/* 30-dot grid — responsive columns */}
        <div
          className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 mb-4"
          style={{ gap: '6px' }}
        >
          {Array.from({ length: 30 }, (_, i) => {
            const dayNum = i + 1
            const status = getDayStatus(dayNum, todayChallengeDay, completedDays)
            const isClickable = status === 'active' && !todayCompleted
            return (
              <DayCircle
                key={i}
                dayNum={dayNum}
                status={isClickable ? 'active' : status === 'active' ? 'completed' : status}
                onClick={isClickable ? handleStartDay : undefined}
              />
            )
          })}
        </div>

        {/* Hint text */}
        {todayCompleted ? (
          <p className="text-xs text-gray-400 italic">
            Today's check-in is complete. Come back tomorrow for your next fear.
          </p>
        ) : todayChallengeDay <= 30 ? (
          <p className="text-xs text-gray-400 italic">
            Tap your current day to start today's check-in
          </p>
        ) : null}
      </div>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-box p-6" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 500, color: '#1a0606', marginBottom: '8px' }}>
              Reset Clear Your Fears?
            </h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              This will clear your completed and missed days and return you to Day 1.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => doReset()}
                className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Reset challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
