import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EditIcon, DeleteIcon, HeartIcon } from '../lib/icons'

const BRAND = '#3d0c0c'
const ORANGE = '#fcc799'
const DAYS = 30

// The full rundown page.
const DETAILS_URL = 'https://tools.womanmasteryhqportal.com/content-challenge/'

// The challenge opens at this exact moment. The +10:00 is Brisbane, which stays on
// UTC+10 all year, so this lands correctly wherever a member happens to be.
// Set to null to remove the gate and let anyone join straight away.
const LAUNCH_AT = new Date('2026-09-14T09:00:00+10:00')
const inBrisbane = (opts) => LAUNCH_AT.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', ...opts })
const LAUNCH_LABEL = LAUNCH_AT && inBrisbane({
  weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
})
const LAUNCH_SENTENCE = LAUNCH_AT && `We begin ${
  inBrisbane({ day: 'numeric', month: 'long', year: 'numeric' })
}, ${
  inBrisbane({ hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '').replace(/\s+/g, '')
} AEST.`

/* Ticks once a second until the moment arrives, then stops. */
function useLaunchGate() {
  const [now, setNow] = useState(() => Date.now())
  const open = !LAUNCH_AT || LAUNCH_AT.getTime() - now <= 0
  useEffect(() => {
    if (open) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open])
  return { open, remaining: LAUNCH_AT ? Math.max(0, LAUNCH_AT.getTime() - now) : 0 }
}

function Countdown({ ms }) {
  const parts = [
    { n: Math.floor(ms / 86400000),        l: 'days' },
    { n: Math.floor(ms / 3600000) % 24,    l: 'hours' },
    { n: Math.floor(ms / 60000) % 60,      l: 'mins' },
    { n: Math.floor(ms / 1000) % 60,       l: 'secs' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {parts.map(p => (
        <div key={p.l} className="text-center rounded-xl py-3"
          style={{ backgroundColor: '#fff8f8', border: '0.5px solid #e8e0d8' }}>
          <p className="stat-number">{String(p.n).padStart(2, '0')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{p.l}</p>
        </div>
      ))}
    </div>
  )
}

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'youtube',   label: 'YouTube' },
]

/* ── Local dates. Never UTC, or a member's day flips at the wrong hour. ── */
const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayISO = () => isoOf(new Date())
const addDaysISO = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}
const daysFrom = (fromIso, toIso) => {
  const [y1, m1, d1] = fromIso.split('-').map(Number)
  const [y2, m2, d2] = toIso.split('-').map(Number)
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000)
}
const fmtShort = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
const fmtLong = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* Colour deepens as the day's count rises. */
const SHADES = ['#fde3cc', '#fcd0aa', ORANGE, '#f7ab6f', '#ef8b3d']
const shadeFor = (n) => SHADES[Math.min(SHADES.length - 1, Math.max(0, n - 1))]

/* ── One day ── */
function DayCircle({ dayNum, date, count, state, onClick }) {
  const logged = state === 'logged'
  const base = {
    aspectRatio: '1',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    transition: 'transform 0.15s ease',
  }
  const style =
    logged   ? { ...base, backgroundColor: shadeFor(count), color: '#1a0606', border: 'none' }
  : state === 'missed' ? { ...base, backgroundColor: '#fdf0f0', border: '1px solid #f3dede', color: '#dcc0c0' }
  : state === 'today'  ? { ...base, backgroundColor: '#ffffff', border: `1px solid ${ORANGE}`, color: '#c9a48a' }
  :                      { ...base, backgroundColor: 'transparent', border: '1.5px dashed #e5ded8', color: '#d8cec6' }

  const clickable = state !== 'future'
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={clickable ? onClick : undefined}
        disabled={!clickable}
        title={clickable ? `Day ${dayNum}, ${fmtLong(date)}` : `Day ${dayNum}, not yet`}
        className="w-full"
        style={{
          ...style,
          cursor: clickable ? 'pointer' : 'default',
          boxShadow: state === 'today' || (logged && date === todayISO())
            ? `0 0 0 2.5px #ef8b3d` : 'none',
        }}
      >
        {logged ? count : dayNum}
      </button>
      <span style={{ fontSize: '8px', color: '#b8a898', whiteSpace: 'nowrap' }}>{fmtShort(date)}</span>
    </div>
  )
}

/* ── Scroll wheel, 0 to 30 ── */
const ITEM_H = 36
function Wheel({ label, value, onChange }) {
  const ref = useRef(null)
  const settle = useRef(null)
  const nums = useMemo(() => Array.from({ length: 31 }, (_, i) => i), [])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = value * ITEM_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = () => {
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.max(0, Math.min(30, Math.round(el.scrollTop / ITEM_H)))
      if (idx !== value) onChange(idx)
    }, 90)
  }

  const step = (delta) => {
    const next = Math.max(0, Math.min(30, value + delta))
    onChange(next)
    if (ref.current) ref.current.scrollTo({ top: next * ITEM_H, behavior: 'smooth' })
  }

  return (
    <div className="flex-1 min-w-0 text-center">
      <p className="label" style={{ marginBottom: '6px' }}>{label}</p>
      <div className="relative mx-auto" style={{ height: ITEM_H * 3 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, top: ITEM_H, height: ITEM_H,
            borderTop: '1px solid #e8e0d8', borderBottom: '1px solid #e8e0d8',
            backgroundColor: '#fff8f8', borderRadius: '4px', pointerEvents: 'none',
          }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="wheel-scroll"
          style={{
            height: '100%', overflowY: 'auto', position: 'relative',
            scrollSnapType: 'y mandatory', paddingTop: ITEM_H, paddingBottom: ITEM_H,
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}
        >
          {nums.map(n => (
            <div
              key={n}
              onClick={() => step(n - value)}
              style={{
                height: ITEM_H, scrollSnapAlign: 'center', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                fontSize: n === value ? '18px' : '14px',
                fontWeight: n === value ? 700 : 400,
                color: n === value ? BRAND : '#c4b5af',
                transition: 'font-size 0.12s ease',
              }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <button onClick={() => step(-1)} disabled={value === 0} className="edit-btn" title={`One fewer on ${label}`}>−</button>
        <button onClick={() => step(1)} disabled={value === 30} className="edit-btn" title={`One more on ${label}`}>+</button>
      </div>
    </div>
  )
}

/* ── Logging modal ── */
function LogModal({ date, existing, onSave, onClear, onClose }) {
  const [vals, setVals] = useState({
    instagram: existing?.instagram || 0,
    tiktok:    existing?.tiktok    || 0,
    youtube:   existing?.youtube   || 0,
  })
  const [busy, setBusy] = useState(false)
  const total = vals.instagram + vals.tiktok + vals.youtube

  const save = async () => {
    setBusy(true)
    if (total === 0) await onClear()
    else await onSave(vals)
    setBusy(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box p-6" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', color: '#1a0606' }}>
            {fmtLong(date)}
          </h3>
          <button onClick={onClose} className="edit-btn" title="Close">×</button>
        </div>
        <p className="text-xs text-gray-400 mb-5">What did you post?</p>

        <div className="flex gap-3">
          {PLATFORMS.map(p => (
            <Wheel key={p.key} label={p.label} value={vals[p.key]}
              onChange={v => setVals(s => ({ ...s, [p.key]: v }))} />
          ))}
        </div>

        <div className="text-center mt-5 mb-5">
          <p className="stat-number" style={{ color: total > 0 ? BRAND : '#c4b5af' }}>{total}</p>
          <p className="text-xs text-gray-400">{total === 1 ? 'post that day' : 'posts that day'}</p>
        </div>

        <button onClick={save} disabled={busy} className="btn-brand w-full mb-2">
          {busy ? 'Saving' : total === 0 ? 'Save as nothing posted' : 'Save'}
        </button>
        <div className="flex gap-2">
          {existing && (
            <button onClick={onClear} disabled={busy} className="btn-brand-outline flex-1">Clear this day</button>
          )}
          <button onClick={onClose} className="btn-brand-outline flex-1">Cancel</button>
        </div>
        {total === 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Zero across all three counts as a day you did not post.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Visibility Data ── */
const NOTE_SECTIONS = [
  { kind: 'best',       title: 'Best performing',
    blurb: 'Your strongest piece, and why you think it worked.' },
  { kind: 'performing', title: 'Performing well',
    blurb: 'Anything else of yours that is doing something.' },
]

function NoteForm({ initial, onSave, onCancel }) {
  const [url, setUrl] = useState(initial?.url || '')
  const [platform, setPlatform] = useState(initial?.platform || 'Instagram')
  const [note, setNote] = useState(initial?.note || '')

  return (
    <div className="form-card space-y-3">
      <div>
        <label className="label">Link</label>
        <input className="input-field" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://..." autoFocus />
      </div>
      <div>
        <label className="label">Platform</label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => {
            const on = platform === p.label
            return (
              <button key={p.key} onClick={() => setPlatform(p.label)} className="tag-btn"
                style={on ? { backgroundColor: BRAND, color: '#f5ece0', borderColor: BRAND }
                          : { backgroundColor: '#faf7f3', color: '#b8a898', borderColor: '#e8e0d8' }}>
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="label">Your thoughts</label>
        <textarea className="textarea-field" rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Why do you think it performed?" />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="btn-brand-outline">Cancel</button>
        <button onClick={() => onSave({ url: url.trim(), platform, note: note.trim() })}
          className="btn-brand" disabled={!url.trim() && !note.trim()}>Save</button>
      </div>
    </div>
  )
}

function NotesSection({ section, rows, onAdd, onUpdate, onDelete, readOnly }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  return (
    <div className="card-section">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h3 className="section-title">{section.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{section.blurb}</p>
        </div>
        {!readOnly && !adding && (
          <button onClick={() => { setAdding(true); setEditing(null) }} className="btn-brand flex-shrink-0">
            Add new
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4">
          <NoteForm onCancel={() => setAdding(false)}
            onSave={async v => { await onAdd(section.kind, v); setAdding(false) }} />
        </div>
      )}

      <div className="space-y-2 mt-4">
        {rows.length === 0 && !adding && (
          <p className="text-sm text-gray-400">Nothing added yet.</p>
        )}
        {rows.map(r => editing === r.id ? (
          <NoteForm key={r.id} initial={r} onCancel={() => setEditing(null)}
            onSave={async v => { await onUpdate(r.id, v); setEditing(null) }} />
        ) : (
          <div key={r.id} className="rounded-xl px-3 py-3"
            style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {r.platform && <p className="label" style={{ marginBottom: '2px' }}>{r.platform}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener"
                    className="text-sm font-semibold break-all" style={{ color: BRAND }}>
                    {r.url}
                  </a>
                )}
                {r.note && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.note}</p>}
              </div>
              {!readOnly && (
                <div className="flex gap-1 flex-shrink-0 no-print">
                  <button onClick={() => { setEditing(r.id); setAdding(false) }} className="edit-btn" title="Edit">
                    <EditIcon />
                  </button>
                  <button onClick={() => setConfirmDelete(r.id)} className="delete-btn" title="Delete">
                    <DeleteIcon />
                  </button>
                </div>
              )}
            </div>
            {confirmDelete === r.id && (
              <div className="flex items-center gap-2 mt-3">
                <p className="text-xs text-gray-500 flex-1">Delete this entry?</p>
                <button onClick={() => setConfirmDelete(null)} className="btn-brand-outline">Keep</button>
                <button onClick={async () => { await onDelete(r.id); setConfirmDelete(null) }}
                  className="btn-brand">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stats ── */
function StatStrip({ streak, totalPosts, daysLogged, daysElapsed }) {
  const items = [
    { n: streak, l: 'Day streak' },
    { n: totalPosts, l: totalPosts === 1 ? 'Post logged' : 'Posts logged' },
    { n: `${daysLogged}/${Math.max(daysElapsed, 0)}`, l: 'Days logged' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(i => (
        <div key={i.l} className="card text-center">
          <p className="stat-number">{i.n}</p>
          <p className="text-xs text-gray-400 mt-0.5">{i.l}</p>
        </div>
      ))}
    </div>
  )
}

function PlatformSplit({ totals }) {
  const sum = PLATFORMS.reduce((a, p) => a + (totals[p.key] || 0), 0)
  return (
    <div className="card-section">
      <h3 className="section-title mb-4">Where it went</h3>
      {sum === 0 ? (
        <p className="text-sm text-gray-400">Nothing logged yet.</p>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const n = totals[p.key] || 0
            const pct = Math.round((n * 100) / sum)
            return (
              <div key={p.key}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#1a0606' }}>{p.label}</span>
                  <span className="text-xs text-gray-400">{n} {n === 1 ? 'post' : 'posts'} · {pct}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#f3ece6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', backgroundColor: ORANGE, borderRadius: '3px' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── How it works. Always open, directly under the page description. ── */
function HowItWorks() {
  return (
    <div className="card-section">
      <p className="label" style={{ marginBottom: '10px' }}>How this challenge works</p>
      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
        <span className="font-bold" style={{ color: '#1a0606' }}>Log daily.</span>{' '}
        Takes ten seconds. Record what you posted across Instagram, TikTok and YouTube.
      </p>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        <span className="font-bold" style={{ color: '#1a0606' }}>Hold the streak.</span>{' '}
        Consistency is the mechanism, not volume.
      </p>
      <a href={DETAILS_URL} target="_blank" rel="noopener"
        className="block rounded-lg px-3 py-2.5 text-sm font-bold"
        style={{ backgroundColor: '#FFF8F8', border: '1px solid rgba(61,12,12,0.18)', color: BRAND }}>
        <HeartIcon /> Read the full rundown →
      </a>
    </div>
  )
}

/* ── Join screen ── */
function JoinCard({ onJoin }) {
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const { open, remaining } = useLaunchGate()

  return (
    <div className="card-section">
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px',
        lineHeight: 1.25, color: '#1a0606' }}>
        Join the WMHQ 30 Day Content Challenge?
      </h2>
      {!open && (
        <p className="mt-3 font-bold" style={{ fontSize: '17px', color: BRAND }}>
          {LAUNCH_SENTENCE}
        </p>
      )}


      {!open ? (
        <div className="form-card mt-5">
          <p className="label" style={{ marginBottom: '10px' }}>Opens in</p>
          <Countdown ms={remaining} />
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">
            The challenge opens {LAUNCH_LABEL} Brisbane time. This page unlocks on its own the
            moment it does, so there is nothing to refresh and nothing to remember.
          </p>
        </div>
      ) : (
        <div className="form-card mt-5">
          <label className="label">Start date</label>
          <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          <p className="text-xs text-gray-400 mt-2">
            Pick today, an earlier day if you have already begun, or a day ahead to start later.
          </p>
          <button onClick={async () => { setBusy(true); await onJoin(date); setBusy(false) }}
            disabled={busy || !date} className="btn-brand w-full mt-4">
            {busy ? 'Starting' : 'Yes, start my thirty days'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ══════════════════ PAGE ══════════════════ */
export default function ContentChallenge() {
  const { user } = useAuth()
  const userId = user?.id

  const [view, setView] = useState('Challenge')
  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState(null)
  const [pastRounds, setPastRounds] = useState([])
  const [logs, setLogs] = useState([])
  const [notes, setNotes] = useState([])
  const [modalDate, setModalDate] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const [draftStart, setDraftStart] = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    const { data: rounds } = await supabase
      .from('content_challenge_rounds').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false })

    const all = rounds || []
    const active = all.find(r => !r.ended_at) || null
    setRound(active)
    setPastRounds(all.filter(r => r.id !== active?.id))

    if (active) {
      const [{ data: l }, { data: n }] = await Promise.all([
        supabase.from('content_challenge_logs').select('*').eq('round_id', active.id).order('log_date'),
        supabase.from('content_challenge_notes').select('*').eq('round_id', active.id).order('created_at'),
      ])
      setLogs(l || [])
      setNotes(n || [])
    } else {
      setLogs([]); setNotes([])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  /* Derived */
  const start = round?.start_date || null
  const logByDate = useMemo(() => {
    const m = {}
    logs.forEach(l => { m[l.log_date] = l })
    return m
  }, [logs])

  const today = todayISO()
  const dayList = useMemo(() => {
    if (!start) return []
    return Array.from({ length: DAYS }, (_, i) => addDaysISO(start, i))
  }, [start])

  const daysElapsed = start ? Math.min(DAYS, Math.max(0, daysFrom(start, today) + 1)) : 0
  const finished = start ? daysFrom(start, today) >= DAYS : false
  const daysLogged = logs.filter(l => l.total > 0).length
  const totalPosts = logs.reduce((a, l) => a + (l.total || 0), 0)
  const platformTotals = useMemo(() => {
    const t = { instagram: 0, tiktok: 0, youtube: 0 }
    logs.forEach(l => { t.instagram += l.instagram || 0; t.tiktok += l.tiktok || 0; t.youtube += l.youtube || 0 })
    return t
  }, [logs])

  const streak = useMemo(() => {
    if (!start) return 0
    let cursor = today
    // The streak holds through today until a full day has passed with nothing logged.
    if (!(logByDate[cursor]?.total > 0)) cursor = addDaysISO(cursor, -1)
    let n = 0
    while (cursor >= start && logByDate[cursor]?.total > 0) {
      n++
      cursor = addDaysISO(cursor, -1)
    }
    return n
  }, [logByDate, start, today])

  const openDays = useMemo(
    () => dayList.filter(d => d < today && !(logByDate[d]?.total > 0)).length,
    [dayList, logByDate, today]
  )

  // Named only when one platform clearly leads, so a tie never makes a false claim.
  const topPlatform = useMemo(() => {
    const entries = PLATFORMS.map(p => [p.label, platformTotals[p.key] || 0])
    const max = Math.max(...entries.map(e => e[1]))
    if (max <= 0) return null
    const leaders = entries.filter(e => e[1] === max)
    return leaders.length === 1 ? leaders[0][0] : null
  }, [platformTotals])

  const orphanedBy = useCallback((candidate) => {
    const last = addDaysISO(candidate, DAYS - 1)
    return logs.filter(l => l.total > 0 && (l.log_date < candidate || l.log_date > last)).length
  }, [logs])

  const todayLog = logByDate[today]
  const todayInWindow = start && today >= start && daysFrom(start, today) < DAYS

  const stateOf = (date) => {
    if (logByDate[date]?.total > 0) return 'logged'
    if (date > today) return 'future'
    if (date === today) return 'today'
    return 'missed'
  }

  /* Writes */
  const join = async (startDate) => {
    const { data } = await supabase.from('content_challenge_rounds')
      .insert({ user_id: userId, start_date: startDate }).select().single()
    if (data) { setRound(data); setLogs([]); setNotes([]) }
  }

  const saveLog = async (vals) => {
    const { data, error } = await supabase.from('content_challenge_logs').upsert(
      { user_id: userId, round_id: round.id, log_date: modalDate, ...vals },
      { onConflict: 'user_id,log_date' }
    ).select().single()
    if (error) { alert(error.message); return }
    setLogs(prev => [...prev.filter(l => l.log_date !== modalDate), data])
    setModalDate(null)
  }

  const clearLog = async () => {
    await supabase.from('content_challenge_logs').delete()
      .eq('user_id', userId).eq('log_date', modalDate)
    setLogs(prev => prev.filter(l => l.log_date !== modalDate))
    setModalDate(null)
  }

  const addNote = async (kind, v) => {
    const { data } = await supabase.from('content_challenge_notes')
      .insert({ user_id: userId, round_id: round.id, kind, ...v }).select().single()
    if (data) setNotes(prev => [...prev, data])
  }
  const updateNote = async (id, v) => {
    const { data } = await supabase.from('content_challenge_notes')
      .update({ ...v, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (data) setNotes(prev => prev.map(n => n.id === id ? data : n))
  }
  const deleteNote = async (id) => {
    await supabase.from('content_challenge_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const changeStart = async () => {
    const { data } = await supabase.from('content_challenge_rounds')
      .update({ start_date: draftStart }).eq('id', round.id).select().single()
    if (data) {
      setRound(data)
      setEditingDates(false)
    }
  }

  const restart = async () => {
    await supabase.from('content_challenge_rounds')
      .update({ ended_at: new Date().toISOString() }).eq('id', round.id)
    setRestarting(false)
    setShowPast(false)
    setView('Challenge')
    await load()   // no open round remains, so the join screen comes back
  }

  const promptKey = round ? `wmhq-cc-saved-${round.id}` : null
  useEffect(() => {
    if (!promptKey) return
    try { setDismissed(localStorage.getItem(promptKey) === '1') } catch { setDismissed(false) }
  }, [promptKey])
  const dismissPrompt = () => {
    setDismissed(true)
    try { localStorage.setItem(promptKey, '1') } catch { /* ignore */ }
  }

  if (loading) {
    return <div className="p-6"><p className="text-sm text-gray-400">Loading</p></div>
  }

  return (
    <div>
      {/* Page furniture */}
      <div className="mb-4 no-print">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: ORANGE }} />
              <h1 className="page-title">Content Challenge</h1>
            </div>
            <p className="text-sm text-gray-500">Thirty days. One data point a day. Minimum.</p>
          </div>
          {(round || pastRounds.length > 0) && (
            <button onClick={() => setShowPast(true)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#fff8f8', border: '0.5px solid #e8e0d8', color: BRAND }}
              title="See your past rounds">
              Past rounds
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 no-print"><HowItWorks /></div>

      {!round ? (
        <JoinCard onJoin={join} />
      ) : (
        <>
          {/* Toggle */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 no-print" style={{ backgroundColor: '#fff8f8' }}>
            {['Challenge', 'Visibility Data'].map(t => (
              <button key={t} onClick={() => setView(t)}
                className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors"
                style={view === t ? { backgroundColor: BRAND, color: 'white' }
                                  : { backgroundColor: '#fff8f8', color: '#5a3a3c' }}>
                {t}
              </button>
            ))}
          </div>

          <div className="print-area">
            {view === 'Challenge' ? (
              <div className="space-y-4">
                {/* Start and finish dates, changeable so a late joiner can backdate */}
                <div className="card-section">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-8">
                      <div>
                        <p className="label">Started</p>
                        <p className="text-sm font-semibold" style={{ color: '#1a0606' }}>
                          {fmtLong(start)}
                        </p>
                      </div>
                      <div>
                        <p className="label">Finishes</p>
                        <p className="text-sm font-semibold" style={{ color: '#1a0606' }}>
                          {fmtLong(addDaysISO(start, DAYS - 1))}
                        </p>
                      </div>
                    </div>
                    {!editingDates && (
                      <button
                        onClick={() => { setDraftStart(start); setEditingDates(true) }}
                        className="edit-btn no-print" title="Change your start date">
                        <EditIcon />
                      </button>
                    )}
                  </div>

                  {editingDates && (
                    <div className="form-card mt-4 no-print">
                      <label className="label">Start date</label>
                      <input type="date" className="input-field" value={draftStart || ''}
                        onChange={e => setDraftStart(e.target.value)} />
                      <p className="text-xs text-gray-400 mt-2">
                        Finishes {draftStart ? fmtLong(addDaysISO(draftStart, DAYS - 1)) : '—'}.
                        Move it back if you started before you joined.
                      </p>
                      {draftStart && orphanedBy(draftStart) > 0 && (
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#b5651d' }}>
                          {orphanedBy(draftStart)} logged{' '}
                          {orphanedBy(draftStart) === 1 ? 'day falls' : 'days fall'} outside these thirty
                          days. Nothing is deleted, but{' '}
                          {orphanedBy(draftStart) === 1 ? 'it' : 'they'} will not show here.
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setEditingDates(false)} className="btn-brand-outline flex-1">
                          Cancel
                        </button>
                        <button onClick={changeStart} disabled={!draftStart} className="btn-brand flex-1">
                          Save dates
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {finished && (
                  <div className="card-section" style={{ borderColor: ORANGE }}>
                    <h3 className="section-title mb-1">Your thirty days are done</h3>
                    <p className="text-sm text-gray-600">
                      You logged {daysLogged} of {DAYS} days{topPlatform ? `. Most of it on ${topPlatform}` : ''}.
                    </p>
                    {!dismissed && (
                      <div className="mt-4 no-print">
                        <p className="text-sm text-gray-500 mb-3">
                          Save your record while it is all here. Your links stay clickable in the saved file.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => window.print()} className="btn-brand flex-1">Save my record</button>
                          <button onClick={dismissPrompt} className="btn-brand-outline flex-1">Not now</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {start > today ? (
                  <div className="card-section">
                    <h3 className="section-title mb-1">Not started yet</h3>
                    <p className="text-sm text-gray-500">
                      Your thirty days begin on {fmtLong(start)}, {daysFrom(today, start)}{' '}
                      {daysFrom(today, start) === 1 ? 'day' : 'days'} from now. Nothing to log until then.
                    </p>
                  </div>
                ) : (
                  <StatStrip streak={streak} totalPosts={totalPosts}
                    daysLogged={daysLogged} daysElapsed={daysElapsed} />
                )}

                {todayInWindow && (
                  <button onClick={() => setModalDate(today)} className="w-full no-print"
                    style={{
                      backgroundColor: todayLog?.total > 0 ? '#e8f0e4' : BRAND,
                      color: todayLog?.total > 0 ? '#2f5d3f' : '#f5ece0',
                      border: todayLog?.total > 0 ? '0.5px solid #cdd5ae' : 'none',
                      borderRadius: '5px', padding: '14px', fontWeight: 700, fontSize: '13px',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                    {todayLog?.total > 0
                      ? <>{todayLog.total} {todayLog.total === 1 ? 'post' : 'posts'} logged today
                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 400,
                            textTransform: 'none', letterSpacing: 0, marginTop: '3px', opacity: 0.75 }}>
                            Tap to change
                          </span></>
                      : "Log today's posts"}
                  </button>
                )}

                {/* The thirty days */}
                <div className="card-section">
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="section-title">Your thirty days</h3>
                    <span className="text-xs font-semibold" style={{ color: BRAND }}>
                      {daysElapsed > 0
                        ? `Day ${daysElapsed} of ${DAYS}`
                        : `Starts ${fmtShort(start)}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10" style={{ gap: '8px' }}>
                    {dayList.map((date, i) => (
                      <DayCircle key={date} dayNum={i + 1} date={date}
                        count={logByDate[date]?.total || 0} state={stateOf(date)}
                        onClick={() => setModalDate(date)} />
                    ))}
                  </div>
                  <p className="text-xs mt-4 no-print"
                    style={{ color: openDays > 0 ? BRAND : '#b8a898' }}>
                    {openDays > 0
                      ? `${openDays} ${openDays === 1 ? 'day is' : 'days are'} still open. Tap any of them to fill it in.`
                      : 'Tap any day up to today to log it or change it.'}
                  </p>
                </div>

                <PlatformSplit totals={platformTotals} />

              </div>
            ) : (
              <div className="space-y-4">
                {NOTE_SECTIONS.map(s => (
                  <NotesSection key={s.kind} section={s}
                    rows={notes.filter(n => n.kind === s.kind)}
                    onAdd={addNote} onUpdate={updateNote} onDelete={deleteNote} />
                ))}
              </div>
            )}
          </div>

          {view === 'Challenge' && !finished && (
            <div className="mt-5 text-center no-print">
              <button onClick={() => window.print()} className="text-xs font-semibold"
                style={{ color: '#b8a898' }}>
                Save my record
              </button>
            </div>
          )}
        </>
      )}

      {showPast && (
        <div className="modal-overlay" onClick={() => setShowPast(false)}
          style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: 0 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width: 'min(380px, 88vw)', height: '100%', backgroundColor: '#ffffff',
              borderLeft: '0.5px solid #e8e0d8', overflowY: 'auto', padding: '24px',
            }}>
            <div className="flex items-start justify-between mb-1">
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', color: '#1a0606' }}>
                Past rounds
              </h3>
              <button onClick={() => setShowPast(false)} className="edit-btn" title="Close">×</button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Kept for twelve months. Save your record before the date shown.
            </p>
            <div className="space-y-2">
              {pastRounds.length === 0 && (
                <p className="text-sm text-gray-400">No past rounds yet.</p>
              )}
              {pastRounds.map(r => (
                <div key={r.id} className="rounded-xl px-3 py-3"
                  style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
                  <p className="text-sm font-semibold" style={{ color: '#1a0606' }}>
                    {fmtShort(r.start_date)} to {fmtShort(addDaysISO(r.start_date, DAYS - 1))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Clears on {fmtLong(addDaysISO(r.start_date, DAYS - 1 + 365))}
                  </p>
                </div>
              ))}
            </div>

            {round && (
              <div className="mt-6 pt-5" style={{ borderTop: '0.5px solid #e8e0d8' }}>
                {restarting ? (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold" style={{ color: '#1a0606' }}>Start again?</p>
                      <button onClick={() => setRestarting(false)} className="edit-btn"
                        title="No, keep going">×</button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                      This round moves into your past rounds and you go back to the start to pick a new
                      date. Nothing you have logged is deleted.
                    </p>
                    <button onClick={restart} className="w-full text-xs font-bold px-3 py-2.5 rounded-lg"
                      style={{ backgroundColor: '#f7ab6f', color: '#3d1a06' }}>
                      Yes, start again
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setRestarting(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: '#fff4ea', border: '0.5px solid #f5c9a0', color: '#b5651d' }}>
                    Start again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {modalDate && (
        <LogModal date={modalDate} existing={logByDate[modalDate]}
          onSave={saveLog} onClear={clearLog} onClose={() => setModalDate(null)} />
      )}
    </div>
  )
}
