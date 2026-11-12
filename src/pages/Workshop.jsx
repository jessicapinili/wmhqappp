import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SingleCard } from './Influence'
import { jsPDF } from 'jspdf'
import { DeleteIcon, EditIcon } from '../lib/icons'

/* ─── Workshop sessions (browser storage for now; Supabase later) ─── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SESSIONS_KEY = 'wmhq-workshop:sessions'
const CURRENT_KEY = 'wmhq-workshop:current'
const sessionLabel = sid => { const [y, m] = sid.split('-'); return `${MONTHS[Number(m) - 1]} ${y}` }
const answerKey = (sid, id) => `wmhq-workshop:${sid}:${id}`
/* Storage: answers live in Supabase (table workshop_entries, one row per key per member).
   The browser keeps a copy so the page stays instant; every change is written through. */
const PREFIX = 'wmhq-workshop:'
const OWNER_KEY = 'wmhq-workshop-owner'
let syncUserId = null
let syncReady = false
export const WORKSHOP_SYNC_EVENT = 'wmhq-workshop-synced'
const remoteKey = k => (k.startsWith(PREFIX) ? k.slice(PREFIX.length) : null)
function pushRemote(k, v) {
  const rk = remoteKey(k)
  if (!syncUserId || !rk) return
  const q = v === null
    ? supabase.from('workshop_entries').delete().eq('user_id', syncUserId).eq('entry_key', rk)
    : supabase.from('workshop_entries').upsert({ user_id: syncUserId, entry_key: rk, value: v, updated_at: new Date().toISOString() }, { onConflict: 'user_id,entry_key' })
  q.then(({ error }) => { if (error) console.error('Workshop save failed', error.message) })
}
const ls = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} pushRemote(k, v) },
  del: k => { try { localStorage.removeItem(k) } catch {} pushRemote(k, null) },
  keys: () => { try { return Object.keys(localStorage) } catch { return [] } },
}
const localKeys = () => ls.keys().filter(k => k.startsWith(PREFIX))

let syncInFlight = null
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'timed out' }, timedOut: true }), ms)),
])
function markReady(userId) {
  syncUserId = userId
  syncReady = true
  window.dispatchEvent(new Event(WORKSHOP_SYNC_EVENT))
}

export function startWorkshopSync(userId) {
  if (!userId) return Promise.resolve()
  if (syncUserId === userId && syncReady) return Promise.resolve()
  if (syncInFlight && syncInFlight.userId === userId) return syncInFlight.promise
  syncReady = false
  const promise = (async () => {
    let owner = null
    try { owner = localStorage.getItem(OWNER_KEY) } catch {}
    const keepLocal = owner === userId || owner === null
    try {
      // Never show one member's answers to another on a shared browser.
      if (!keepLocal) localKeys().forEach(k => { try { localStorage.removeItem(k) } catch {} })
      // Don't let a slow or stuck request hold the page on "Loading" forever.
      const res = await withTimeout(
        supabase.from('workshop_entries').select('entry_key, value').eq('user_id', userId),
        8000,
      )
      const { data, error } = res || {}
      if (error) {
        console.error('Workshop load failed', error.message)
        try { localStorage.setItem(OWNER_KEY, userId) } catch {}
        return // fall back to what this browser already has
      }
      const remote = new Map((data || []).map(r => [PREFIX + r.entry_key, r.value]))
      // Anything only in this browser (saved before syncing existed) gets uploaded once.
      const toUpload = keepLocal ? localKeys().filter(k => !remote.has(k)) : []
      remote.forEach((v, k) => { try { localStorage.setItem(k, v) } catch {} })
      localKeys().filter(k => !remote.has(k) && !toUpload.includes(k)).forEach(k => { try { localStorage.removeItem(k) } catch {} })
      try { localStorage.setItem(OWNER_KEY, userId) } catch {}
      if (toUpload.length) {
        const rows = toUpload.map(k => ({ user_id: userId, entry_key: remoteKey(k), value: localStorage.getItem(k) }))
        supabase.from('workshop_entries').upsert(rows, { onConflict: 'user_id,entry_key' })
          .then(({ error: e }) => { if (e) console.error('Workshop upload failed', e.message) })
      }
    } catch (e) {
      console.error('Workshop sync error', e)
    } finally {
      syncInFlight = null
      markReady(userId) // always release the page, even if loading failed
    }
  })()
  syncInFlight = { userId, promise }
  return promise
}
export function useWorkshopReady() {
  const [ready, setReady] = React.useState(syncReady)
  React.useEffect(() => {
    if (syncReady) { setReady(true); return }
    const on = () => setReady(true)
    window.addEventListener(WORKSHOP_SYNC_EVENT, on)
    return () => window.removeEventListener(WORKSHOP_SYNC_EVENT, on)
  }, [])
  return ready
}
function WorkshopLoading() {
  return <div className="min-h-[40vh] flex items-center justify-center text-sm" style={{ color: '#b8a898' }}>Loading your workshop…</div>
}
function getSessions() {
  // one-time move of early "Nov 2026" test answers into the new format
  const old = ls.keys().filter(k => k.startsWith('workshop-nov-2026:'))
  let list = []
  try { list = JSON.parse(ls.get(SESSIONS_KEY) || '[]') } catch {}
  if (old.length) {
    old.forEach(k => { ls.set(answerKey('2026-11', k.slice('workshop-nov-2026:'.length)), ls.get(k)); ls.del(k) })
    if (!list.includes('2026-11')) list.push('2026-11')
    ls.set(SESSIONS_KEY, JSON.stringify(list))
    if (!ls.get(CURRENT_KEY)) ls.set(CURRENT_KEY, '2026-11')
  }
  return list.sort()
}
function addSession(sid) {
  const list = getSessions()
  if (!list.includes(sid)) ls.set(SESSIONS_KEY, JSON.stringify([...list, sid].sort()))
  ls.set(CURRENT_KEY, sid)
}
function copyAnswers(fromSid, toSid) {
  const prefix = `wmhq-workshop:${fromSid}:`
  ls.keys().filter(k => k.startsWith(prefix)).forEach(k => ls.set(answerKey(toSid, k.slice(prefix.length)), ls.get(k)))
}
function sessionHasAnswers(sid) {
  return ls.keys().some(k => k.startsWith(`wmhq-workshop:${sid}:`))
}

const card = {
  backgroundColor: '#fdf8f5',
  border: '1px dashed rgba(61,12,12,0.25)',
  borderRadius: '4px',
  padding: '20px',
  color: '#b8a898',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: '12px',
}

export default function Workshop() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">WMHQ Biannual Workshop</h1>
        <p className="text-sm text-gray-500 mt-0.5">Placeholder page: content coming soon.</p>
      </div>

      <div style={{ ...card, minHeight: '160px' }}>Placeholder: hero / intro</div>

      <div className="grid gap-4 md:grid-cols-3">
        <div style={card}>Placeholder: section 1</div>
        <div style={card}>Placeholder: section 2</div>
        <div style={card}>Placeholder: section 3</div>
      </div>

      <div style={{ ...card, minHeight: '200px' }}>Placeholder: main content</div>
    </div>
  )
}

export function WorkshopPart({ title }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: '#b8a898' }}>WMHQ Biannual Workshop</p>
        <h1 className="page-title">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Placeholder dashboard: content coming soon.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div style={card}>Placeholder: metric 1</div>
        <div style={card}>Placeholder: metric 2</div>
        <div style={card}>Placeholder: metric 3</div>
        <div style={card}>Placeholder: metric 4</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div style={{ ...card, minHeight: '180px' }}>Placeholder: panel A</div>
        <div style={{ ...card, minHeight: '180px' }}>Placeholder: panel B</div>
      </div>

      <div style={{ ...card, minHeight: '200px' }}>Placeholder: main dashboard area</div>
    </div>
  )
}

const PHASES = [
  {
    name: 'Influence',
    color: '#c6def2',
    border: '#6f9fc6',
    def: 'How clearly people get who you help, with what, and why you.',
    check: 'Is your message attracting the right buyers?',
  },
  {
    name: 'Visibility',
    color: '#fcc799',
    border: '#d9894a',
    def: 'How consistently the right people see you. Not more posting, the right reach.',
    check: 'Is your effort reaching buyers, or just keeping you busy?',
  },
  {
    name: 'Cash',
    color: '#cdd5ae',
    border: '#8d9a5e',
    def: 'How your offers and sales process turn interest into income.',
    check: 'Where is money coming in, where is it leaking, and which offers are worth it?',
  },
  {
    name: 'Subconscious Mastery',
    color: '#e7cee3',
    border: '#b48aac',
    def: 'How your beliefs, fears and capacity shape your follow-through.',
    check: 'Where are self-doubt, fear or overwhelm holding the business back?',
  },
]

const SECTION_LABELS = { review: 'Review', diagnose: 'Diagnose', partA: 'Part A: Your Phase Priorities', partB: 'Part B: Your Month-by-Month Plan', capA: 'Part A: Your Real Hours', capB: 'Part B: If It Doesn’t Fit', capC: 'Part C: Follow-Through' }
const sectionsOf = questions => Object.keys(questions).map(k => [k, SECTION_LABELS[k] || null])

function phaseProgress(sid, phaseKey, questions) {
  if (!questions) return null
  const items = Object.keys(questions).flatMap(k => questions[k].map((item, i) => ({ item, id: answerKey(sid, `${phaseKey}-${k}-${i}`) }))).filter(({ item }) => !item.showIf || item.showIf(sid))
  let done = 0
  try {
    done = items.filter(({ item, id }) => {
      const v = localStorage.getItem(id)
      if (!v) return false
      if (item.type === 'plan') return planComplete(v)
      if (item.type === 'seasons') return seasonsComplete(v)
      return item.type === 'list' ? parseList(v).length >= (item.min || 1) : true
    }).length
  } catch {}
  return { done, total: items.length }
}

function PhaseCard({ name, color, border, def, check, active, onBegin, progress, beginLabel = 'Begin Reviewing & Diagnosing' }) {
  return (
    <div className="flex flex-col px-3 py-3 md:px-4 md:py-4" style={{ backgroundColor: `${color}${active ? '80' : '40'}`, border: `1px ${active ? 'solid' : 'dashed'} ${border}`, borderRadius: '4px', color: '#3d0c0c', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <p className="text-[16px] md:text-[18px]" style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 500 }}>{name}</p>
      <div className="mt-1 flex-1" style={{ fontSize: '12px', fontWeight: 300, lineHeight: 1.5 }}>
        <p>{def}</p>
        {check && <p className="mt-1.5"><span style={{ fontWeight: 500 }}>We're checking: </span>{check}</p>}
      </div>
      {progress && (
        <div className="mt-3">
          <div className="flex justify-between" style={{ fontSize: '10px', fontWeight: 400, color: '#3d0c0c', opacity: 0.7 }}>
            <span>{progress.done} of {progress.total} answered</span>
            <span>{Math.round((progress.done / progress.total) * 100)}%</span>
          </div>
          <div className="mt-1" style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <div style={{ height: '100%', width: `${(progress.done / progress.total) * 100}%`, borderRadius: '2px', backgroundColor: border, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onBegin}
        className="mt-3 w-full"
        style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 10px', borderRadius: '3px', border: `1px solid ${border}`, backgroundColor: active ? '#3d0c0c' : 'transparent', color: active ? '#f5ece0' : '#3d0c0c' }}
      >
        {active ? 'Close ✕' : (progress && progress.done === progress.total ? 'Read My Answers' : beginLabel)}
      </button>
    </div>
  )
}

function StepCard({ step, title, text }) {
  return (
    <div className="px-3 py-2.5 md:px-5 md:py-4" style={{ backgroundColor: '#fdf8f5', border: '1px dashed rgba(61,12,12,0.25)', borderRadius: '4px', color: '#3d0c0c', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <p className="text-[9px] uppercase tracking-widest" style={{ color: '#b8a898' }}>{step}</p>
      <p className="text-[16px] md:text-[20px]" style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 500 }}>{title}</p>
      <p className="mt-1" style={{ fontSize: '12px', fontWeight: 300, lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

const INFLUENCE_QUESTIONS = {
  review: [
    { q: 'Who exactly is your buyer right now?', hint: 'Think of your best recent buyer. Who were they, and what were they going through?' },
    { q: 'What problem do your offers solve?', hint: 'What is your buyer struggling with before they work with you?' },
    { q: 'What words or phrases do you want people to associate with your brand?', hint: 'Pick three to five words you want people to think of when they see you.' },
    { q: 'Where did your last three buyers come from, and what made them choose your offer?', hint: 'Check your messages or sales. Where did they find you, and what did they say?' },
  ],
  diagnose: [
    { q: "If someone landed on your main marketing channel today, would they know within five seconds whether it’s for them? Why or why not?", hint: "Look at your bio or homepage like a stranger would. Is it clear who it’s for?" },
    { q: 'Where are you still speaking to everyone instead of to someone?', hint: 'Look for posts or pages that could be for anyone. Those are the vague spots.' },
    { q: 'What objections or questions keep coming up that your messaging isn’t answering? List up to three.', hint: 'Think about what people ask in DMs or on calls before they buy, or don’t.' },
    { q: 'Give your clarity a score out of 10. What would make it a 10, and why?', hint: 'Go with your gut. Then name the one thing that would lift the score.' },
  ],
}

function HintIcon({ text }) {
  return (
    <span className="relative inline-flex group align-middle ml-1.5" tabIndex={0}>
      <span
        className="inline-flex items-center justify-center cursor-help"
        style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1px solid #b8a898', color: '#b8a898', fontSize: '9px', lineHeight: 1 }}
      >?</span>
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-20"
        style={{ backgroundColor: '#3d0c0c', color: '#f5ece0', fontSize: '11px', fontWeight: 300, lineHeight: 1.45, padding: '8px 10px', borderRadius: '4px' }}
      >{text}</span>
    </span>
  )
}

const CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'CAD', 'EUR']
const money = (n, cur) => `${cur} $${Math.round(n).toLocaleString()}`
function parseRevenue(v) { try { const o = JSON.parse(v); return o && o.monthly != null ? o : null } catch { return null } }
function parseList(v) { try { const a = JSON.parse(v); return Array.isArray(a) ? a : [] } catch { return [] } }
function formatAnswer(v, type) {
  if (type === 'list') return parseList(v).map(x => `•  ${x}`).join('\n')
  if (type === 'plan') return formatPlan(v)
  if (type === 'capacity') return formatCapacity(v)
  if (type === 'seasons') return formatSeasons(v)
  if (type === 'revenue') {
    const r = parseRevenue(v)
    if (r) { const m = Number(r.monthly); return `${money(m, r.currency)} / month\n${money(m * 3, r.currency)} / quarter\n${money(m * 12, r.currency)} / year` }
  }
  return v
}

function RevenueInput({ value, onChange }) {
  const r = parseRevenue(value) || { currency: 'AUD', monthly: '' }
  const m = Number(r.monthly) || 0
  const set = patch => onChange(JSON.stringify({ ...r, ...patch }))
  const box = { backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#3d0c0c' }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={r.currency} onChange={e => set({ currency: e.target.value })} style={box}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          type="number" min="0" inputMode="numeric"
          value={r.monthly}
          onChange={e => set({ monthly: e.target.value })}
          placeholder="Monthly revenue goal"
          className="flex-1 min-w-0 focus:outline-none" style={box}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[['Quarterly', m * 3], ['Annual', m * 12]].map(([l, v]) => (
          <div key={l} style={{ border: '1px dashed rgba(61,12,12,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: '#b8a898' }}>{l}</p>
            <p style={{ fontSize: '14px', color: '#3d0c0c', fontWeight: 600 }}>{m ? money(v, r.currency) : '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Choice (pick one) ─── */
function ChoiceInput({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = value === o
        return (
          <button key={o} type="button" onClick={() => onChange(o)}
            style={{ fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '999px', border: `1px solid ${on ? '#3d0c0c' : 'rgba(61,12,12,0.2)'}`, backgroundColor: on ? '#3d0c0c' : '#ffffff', color: on ? '#f5ece0' : '#3d0c0c' }}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Month-by-month plan ─── */
const SEASON_OPTIONS = [
  { key: 'Bloom', color: '#fde4ee', edge: '#f2b8cd', ink: '#9b3f5c', sub: 'Testing / Exploring', line: 'Test, explore & plant seeds' },
  { key: 'Integration', color: '#dbe9f3', edge: '#a9c8de', ink: '#3f5f93', sub: 'Stabilising / Systemising', line: 'Stabilise, systemise & rest' },
  { key: 'Sprint', color: '#e2ecdc', edge: '#a9c39a', ink: '#3f6b46', sub: 'Full Lock-In / Executing', line: 'Lock in, execute & maximise' },
]
const FOUR_PHASES = ['Influence', 'Visibility', 'Cash', 'Subconscious Mastery']
function parsePlan(v) { try { const o = JSON.parse(v); return o && o.periods ? o : null } catch { return null } }
function periodLabels(start, mode) {
  const [y, m] = start.split('-').map(Number)
  if (mode === 'quarter') {
    return [0, 3].map(o => {
      const a = new Date(y, m - 1 + o, 1), b = new Date(y, m - 1 + o + 2, 1)
      return `${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
    })
  }
  return [0, 1, 2, 3, 4, 5].map(o => { const d = new Date(y, m - 1 + o, 1); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}` })
}
const emptyPeriod = label => ({ label, season: '', focus: [], looks: ['', ''], actions: ['', '', ''], measure: ['', '', ''], saved: false })
const measureOf = x => (Array.isArray(x.measure) ? x.measure : [x.measure || '', '', ''])
const looksOf = x => (Array.isArray(x.looks) ? x.looks : [x.looks || '', ''])
function formatPlan(v) {
  const p = parsePlan(v)
  if (!p) return ''
  const head = `Starts ${sessionLabel(p.start)} · planning by ${p.mode === 'quarter' ? 'quarter' : 'month'}`
  const body = p.periods.map(x => {
    const acts = (x.actions || []).filter(Boolean)
    return [
      `${x.label}${x.season ? `  (${x.season})` : ''}`,
      ...(x.focus || []).map((f, i) => `Priority ${i + 1}: ${f}${looksOf(x)[i] ? `. ${looksOf(x)[i]}` : ''}`),
      acts.length ? `Key actions: ${acts.join('; ')}` : null,
      measureOf(x).filter(Boolean).length ? `How I’ll know it worked: ${measureOf(x).filter(Boolean).join('; ')}` : null,
    ].filter(Boolean).join('\n')
  })
  return [head, ...body].join('\n\n')
}
function planComplete(v) {
  const p = parsePlan(v)
  return !!p && p.periods.length > 0 && p.periods.every(x => x.saved)
}

function FieldLabel({ children, hint }) {
  return (
    <p className="mb-1.5" style={{ fontSize: '12px', fontWeight: 600, color: '#3d0c0c', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {children}{hint && <HintIcon text={hint} />}
    </p>
  )
}

function PeriodCard({ period, index, mode, priorities, onSave }) {
  const norm = pr => ({ ...pr, looks: looksOf(pr), measure: measureOf(pr) })
  const [draft, setDraft] = React.useState(() => norm(period))
  const [editing, setEditing] = React.useState(false)
  React.useEffect(() => { setDraft(norm(period)); setEditing(false) }, [period.label, period.saved])
  const up = patch => setDraft(d => ({ ...d, ...patch }))
  const unit = mode === 'quarter' ? 'quarter' : 'month'
  const box = { backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#3d0c0c', width: '100%' }
  const setFocus = (i, name) => {
    const f = [draft.focus[0] || '', draft.focus[1] || '']
    f[i] = name
    if (i === 0 && !name) { f[0] = f[1]; f[1] = '' }
    const l = [...draft.looks]
    if (!f[1]) l[1] = ''
    up({ focus: f.filter(Boolean), looks: l })
  }
  const setLooks = (i, v) => up({ looks: draft.looks.map((x, j) => (j === i ? v : x)) })
  const season = SEASON_OPTIONS.find(o => o.key === period.season)
  const seasonColor = season?.edge

  const cardBorder = edge => ({ border: `1px solid ${edge || '#e8e0d8'}`, borderRadius: '10px' })

  if (!editing && !period.saved) {
    return (
      <div className="card flex items-center justify-between gap-3" style={cardBorder()}>
        <div>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: '#b8a898' }}>{mode === 'quarter' ? `Quarter ${index + 1}` : `Month ${index + 1}`}</p>
          <p style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#3d0c0c' }}>{period.label}</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="btn-brand">Start</button>
      </div>
    )
  }

  if (!editing) {
    const acts = period.actions.filter(Boolean)
    const meas = measureOf(period).filter(Boolean)
    return (
      <div className="card group" style={cardBorder(seasonColor)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5" style={{ fontSize: '13px', color: '#3d0c0c' }}>
            <p style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600, fontSize: '15px' }}>
              {period.label}{season && <span className="ml-2 text-xs" style={{ backgroundColor: season.color, border: `1px solid ${season.edge}`, borderRadius: '999px', padding: '2px 10px', fontWeight: 600 }}>{season.key} Season</span>}
            </p>
            {period.focus.map((f, i) => (
              <p key={f} className="whitespace-pre-line">
                <span style={{ color: '#b8a898' }}>Priority {i + 1}: </span><span style={{ fontWeight: 600 }}>{f}</span>
                {looksOf(period)[i] && <span>. {looksOf(period)[i]}</span>}
              </p>
            ))}
            {acts.length > 0 && (
              <div><span style={{ color: '#b8a898' }}>Key actions:</span>
                <ul className="mt-0.5 space-y-0.5">{acts.map((a, i) => <li key={i}>• {a}</li>)}</ul>
              </div>
            )}
            {meas.length > 0 && (
              <div><span style={{ color: '#b8a898' }}>How you’ll know it worked:</span>
                <ul className="mt-0.5 space-y-0.5">{meas.map((a, i) => <li key={i}>• {a}</li>)}</ul>
              </div>
            )}
          </div>
          <button type="button" onClick={() => setEditing(true)} className="edit-btn" title="Edit"><EditIcon /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="card space-y-4" style={cardBorder(SEASON_OPTIONS.find(o => o.key === draft.season)?.edge)}>
      <div>
        <FieldLabel>{mode === 'quarter' ? `Quarter ${index + 1}` : `Month ${index + 1}`}</FieldLabel>
        <input value={draft.label} onChange={e => up({ label: e.target.value })} className="textarea-field" />
      </div>
      <div>
        <FieldLabel hint="Match the season to your energy and what’s happening in your life and business.">What season is this {unit}?</FieldLabel>
        {(() => {
          const ds = SEASON_OPTIONS.find(o => o.key === draft.season)
          return ds ? (
            <div className="inline-flex items-center gap-2" style={{ backgroundColor: ds.color, border: `1px solid ${ds.edge}`, borderRadius: '999px', padding: '7px 8px 7px 14px', color: '#3d0c0c' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>🔒 {ds.key} Season</span>
              <span style={{ fontSize: '11px', opacity: 0.65 }}>{ds.sub}</span>
              <button type="button" onClick={() => up({ season: '' })} title="Change season"
                style={{ fontSize: '11px', borderRadius: '999px', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.7)' }}>Change</button>
            </div>
          ) : (
            <select value="" onChange={e => up({ season: e.target.value })} style={{ ...box, width: 'auto', minWidth: '220px' }}>
              <option value="" disabled>Choose a season…</option>
              {SEASON_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.key} · {o.sub}</option>)}
            </select>
          )
        })()}
      </div>
      {[0, 1].map(i => {
        const chosen = draft.focus[i] || ''
        if (i === 1 && !draft.focus[0]) return null
        const ph = PHASES.find(x => x.name === chosen)
        return (
          <div key={i} className="space-y-2" style={i === 1 ? { borderTop: '1px dashed rgba(61,12,12,0.12)', paddingTop: '14px' } : undefined}>
            <FieldLabel hint={i === 0 ? 'Less is more. One clear focus beats four half-done ones.' : undefined}>
              {i === 0 ? `Priority 1 this ${unit}` : 'Priority 2'} {i === 1 && <span style={{ fontWeight: 400, color: '#b8a898' }}>(optional)</span>}
            </FieldLabel>
            <select value={chosen} onChange={e => setFocus(i, e.target.value)}
              style={{ ...box, backgroundColor: ph ? `${ph.color}80` : box.backgroundColor, borderColor: ph ? ph.border : 'rgba(61,12,12,0.12)' }}>
              <option value="">{i === 0 ? 'Choose a priority…' : 'No second priority'}</option>
              {FOUR_PHASES.filter(n => n !== draft.focus[1 - i]).map(n => (
                <option key={n} value={n}>{n}{priorities[n] ? `: ${priorities[n].length > 60 ? priorities[n].slice(0, 60) + '…' : priorities[n]}` : ''}</option>
              ))}
            </select>
            {chosen && (
              <>
                <FieldLabel hint={i === 0 ? 'Break it down. What’s the piece of this priority you’ll finish this month?' : undefined}>
                  What does {chosen} look like this {unit}?
                </FieldLabel>
                <textarea className="textarea-field" rows={2} value={draft.looks[i]} onChange={e => setLooks(i, e.target.value)} placeholder="Type your answer…" />
              </>
            )}
          </div>
        )
      })}
      <div>
        <FieldLabel hint="Make each action small and concise. Clarity wins. Example: Complete sales page & sale sequence rather than “work on launch stuff”.">What are the key actions for this {unit}? <span style={{ fontWeight: 400, color: '#b8a898' }}>(up to three)</span></FieldLabel>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <input key={i} value={draft.actions[i] || ''} placeholder={`Action ${i + 1}…`} className="textarea-field"
              onChange={e => up({ actions: draft.actions.map((a, j) => (j === i ? e.target.value : a)) })} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel hint="Pick one thing you can see or count, like “5 sales calls booked” or “offer live.”">How will you know this {unit} worked? <span style={{ fontWeight: 400, color: '#b8a898' }}>(optional)</span></FieldLabel>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <input key={i} value={draft.measure[i] || ''} placeholder="Type your answer…" className="textarea-field"
              onChange={e => up({ measure: draft.measure.map((a, j) => (j === i ? e.target.value : a)) })} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setDraft(norm(period)); setEditing(false) }} className="btn-cancel">Cancel</button>
        <button type="button" onClick={() => { onSave({ ...draft, saved: true }); setEditing(false) }} className="btn-brand">Save {draft.label}</button>
      </div>
    </div>
  )
}

function PlanBuilder({ sid, storageKey, onChange }) {
  const [plan, setPlan] = React.useState(() => parsePlan(ls.get(storageKey)))
  const now = new Date()
  const [start, setStart] = React.useState(plan?.start || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [mode, setMode] = React.useState(plan?.mode || 'month')
  const persist = p => { setPlan(p); ls.set(storageKey, JSON.stringify(p)); onChange?.() }
  const priorities = Object.fromEntries(FOUR_PHASES.map((n, i) => [n, ls.get(answerKey(sid, `six-month-priorities-partA-${i}`))]))
  const build = () => {
    const hasWork = plan?.periods?.some(x => x.saved)
    if (hasWork && !window.confirm('This will replace your current month-by-month plan. Continue?')) return
    persist({ start, mode, periods: periodLabels(start, mode).map(emptyPeriod) })
  }
  const box = { backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#3d0c0c' }
  const [sy, sm] = start.split('-')
  const years = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2]
  const changed = !plan || plan.start !== start || plan.mode !== mode
  const doneCount = plan ? plan.periods.filter(x => x.saved).length : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel hint="It doesn’t have to be now. Pick the month you’ll actually start, like January.">When does your six months start?</FieldLabel>
          <div className="flex gap-2">
            <select value={sm} onChange={e => setStart(`${sy}-${e.target.value}`)} style={box}>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
            <select value={sy} onChange={e => setStart(`${e.target.value}-${sm}`)} style={box}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel hint="Monthly gives you more detail. Quarterly gives you more room to move.">Do you want to plan by month or by quarter?</FieldLabel>
          <ChoiceInput value={mode === 'quarter' ? 'By quarter' : 'By month'} onChange={o => setMode(o === 'By quarter' ? 'quarter' : 'month')} options={['By month', 'By quarter']} />
        </div>
      </div>
      {changed && (
        <button type="button" onClick={build} className="btn-brand">{plan ? 'Update my plan' : 'Create my plan'}</button>
      )}
      {plan && (
        <div className="space-y-3 pt-1">
          <p className="text-xs" style={{ color: '#b8a898' }}>{doneCount} of {plan.periods.length} {plan.mode === 'quarter' ? 'quarters' : 'months'} planned</p>
          {plan.periods.map((period, i) => (
            <PeriodCard key={`${plan.start}-${plan.mode}-${i}`} period={period} index={i} mode={plan.mode} priorities={priorities}
              onSave={np => persist({ ...plan, periods: plan.periods.map((x, j) => (j === i ? np : x)) })} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Capacity calculator ─── */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const num = v => Math.max(0, Number(v) || 0)
function parseCapacity(v) { try { const o = JSON.parse(v); return o && o.days ? o : null } catch { return null } }
function capacityTotals(c) {
  const total = WEEKDAYS.reduce((a, d) => a + num(c.days[d]), 0)
  const delivery = num(c.delivery)
  const left = Math.max(0, total - delivery)
  const need = FOUR_PHASES.reduce((a, n) => a + num(c.needs?.[n]), 0)
  return { total, delivery, left, need, gap: left - need }
}
function capacityFits(v) {
  const c = parseCapacity(v)
  if (!c) return null
  const t = capacityTotals(c)
  if (!t.total || !t.need) return null
  return t.gap >= 0
}
const hrs = n => `${Math.round(n * 10) / 10} hr${n === 1 ? '' : 's'}`
function formatCapacity(v) {
  const c = parseCapacity(v)
  if (!c) return ''
  const t = capacityTotals(c)
  const days = WEEKDAYS.filter(d => num(c.days[d])).map(d => `${d} ${num(c.days[d])}`).join(' · ')
  const needs = FOUR_PHASES.filter(n => num(c.needs?.[n])).map(n => `${n} ${num(c.needs[n])}`).join(' · ')
  return [
    `Weekly hours: ${hrs(t.total)}${days ? `  (${days})` : ''}`,
    c.energy?.length ? `Highest-energy days: ${WEEKDAYS.filter(d => c.energy.includes(d)).join(', ')}` : null,
    `Client/customer work & delivery: ${hrs(t.delivery)}`,
    `Left for priorities: ${hrs(t.left)}`,
    `Plan needs: ${hrs(t.need)}${needs ? `  (${needs})` : ''}`,
    t.need ? (t.gap >= 0 ? `✓ Your plan fits, with ${hrs(t.gap)} to spare` : `✕ Your plan is ${hrs(-t.gap)} over capacity`) : '',
  ].filter(Boolean).join('\n')
}

function CapacitySummary({ t }) {
  const fits = t.gap >= 0
  const tile = { border: '1px dashed rgba(61,12,12,0.2)', borderRadius: '8px', padding: '8px 12px' }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[['Weekly hours', t.total], ['Client/customer work', t.delivery], ['Left for priorities', t.left], ['Plan needs', t.need]].map(([l, v]) => (
          <div key={l} style={tile}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: '#b8a898' }}>{l}</p>
            <p style={{ fontSize: '15px', color: '#3d0c0c', fontWeight: 600 }}>{hrs(v)}</p>
          </div>
        ))}
      </div>
      {t.total > 0 && t.need > 0 && (
        <div style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#3d0c0c', backgroundColor: fits ? '#e4ecd9' : '#f6d5d2', border: `1px solid ${fits ? '#a9b98a' : '#d98d86'}` }}>
          {fits ? `✓ Your plan fits, with ${hrs(t.gap)} to spare each week.` : `✕ Your plan is ${hrs(-t.gap)} a week over capacity. That’s fine. Better to know now than in March.`}
        </div>
      )}
    </div>
  )
}

function CapacityInput({ sid, value, onChange }) {
  const c = parseCapacity(value) || { days: {}, delivery: '', needs: {} }
  const set = patch => onChange(JSON.stringify({ ...c, ...patch }))
  const t = capacityTotals(c)
  const priorities = Object.fromEntries(FOUR_PHASES.map((n, i) => [n, ls.get(answerKey(sid, `six-month-priorities-partA-${i}`))]))
  const cell = { backgroundColor: '#faf7f3', border: '0.5px solid #e8e0d8', borderRadius: '6px', padding: '8px 6px', fontSize: '13px', color: '#3d0c0c', width: '100%', textAlign: 'center' }
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Hours per day</FieldLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map(d => {
            const hot = (c.energy || []).includes(d)
            return (
              <label key={d} className="block text-center">
                <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: hot ? '#8a4f45' : '#b8a898', fontWeight: hot ? 700 : 400 }}>{d}</span>
                <input type="number" min="0" max="24" step="0.5" inputMode="decimal" value={c.days[d] ?? ''} placeholder="0"
                  onChange={e => set({ days: { ...c.days, [d]: e.target.value } })}
                  style={{ ...cell, ...(hot ? { backgroundColor: '#f6d9d2', border: '1px solid #d9a497' } : {}) }} />
              </label>
            )
          })}
        </div>
      </div>
      <div>
        <FieldLabel hint="Think about the days with the most going on, inside or outside the business. Plan your hardest work around them.">Which days take the most energy? <span style={{ fontWeight: 400, color: '#b8a898' }}>(tap to highlight)</span></FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map(d => {
            const hot = (c.energy || []).includes(d)
            return (
              <button key={d} type="button"
                onClick={() => set({ energy: hot ? c.energy.filter(x => x !== d) : [...(c.energy || []), d] })}
                style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '999px', border: `1px solid ${hot ? '#d9a497' : 'rgba(61,12,12,0.15)'}`, backgroundColor: hot ? '#f6d9d2' : '#ffffff', color: '#3d0c0c' }}>
                {hot ? '⚡ ' : ''}{d}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <FieldLabel hint="The time you spend serving clients or customers and keeping things running, like delivering sessions or programs, fulfilling orders, customer support and admin. Not the time spent growing it.">How many of those hours already go to client/customer work and delivery?</FieldLabel>
        <input type="number" min="0" step="0.5" inputMode="decimal" value={c.delivery} placeholder="Type your answer…" className="textarea-field"
          onChange={e => set({ delivery: e.target.value })} style={{ maxWidth: '220px' }} />
      </div>
      <div>
        <FieldLabel hint="Make a rough guess. Writing, calls, building and learning all count.">How many hours a week will each priority need?</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOUR_PHASES.map(n => {
            const ph = PHASES.find(x => x.name === n)
            return (
              <div key={n} className="flex items-center gap-3" style={{ border: `1px dashed ${ph.border}`, backgroundColor: `${ph.color}55`, borderRadius: '8px', padding: '8px 10px' }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d0c0c' }}>{n}</p>
                  <p className="truncate" style={{ fontSize: '11px', fontWeight: 300, color: '#3d0c0c' }}>{priorities[n] || 'No priority saved yet'}</p>
                </div>
                <input type="number" min="0" step="0.5" inputMode="decimal" value={c.needs?.[n] ?? ''} placeholder="0"
                  onChange={e => set({ needs: { ...c.needs, [n]: e.target.value } })} style={{ ...cell, width: '64px' }} />
              </div>
            )
          })}
        </div>
      </div>
      <CapacitySummary t={t} />
    </div>
  )
}

/* ─── Your Seasons: 12-month season map ─── */
function parseSeasons(v) { try { const o = JSON.parse(v); return o && o.months ? o : null } catch { return null } }
function twelveMonths(start) {
  const [y, m] = start.split('-').map(Number)
  return Array.from({ length: 12 }, (_, o) => { const d = new Date(y, m - 1 + o, 1); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}` })
}
function seasonsComplete(v) { const o = parseSeasons(v); return !!o && o.months.every(x => x.season) }
function formatSeasons(v) {
  const o = parseSeasons(v)
  if (!o) return ''
  return o.months.map(x => [`${x.label}: ${x.season || '(no season yet)'}`, ...(x.notes || []).map(n => `   •  ${n}`)].join('\n')).join('\n')
}

function SeasonMonth({ month, onChange }) {
  const [adding, setAdding] = React.useState(false)
  const [text, setText] = React.useState('')
  const so = SEASON_OPTIONS.find(o => o.key === month.season)
  const notes = month.notes || []
  const add = () => { if (!text.trim() || notes.length >= 8) return; onChange({ ...month, notes: [...notes, text.trim()] }); setText(''); setAdding(false) }
  const box = { backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#3d0c0c' }
  return (
    <div style={{ border: `1px solid ${so ? so.edge : '#e8e0d8'}`, backgroundColor: so ? `${so.color}66` : '#ffffff', borderRadius: '10px', padding: '12px 14px' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: '#3d0c0c', minWidth: '90px' }}>{month.label}</p>
        {so ? (
          <div className="inline-flex items-center gap-2" style={{ backgroundColor: so.color, border: `1px solid ${so.edge}`, borderRadius: '999px', padding: '5px 6px 5px 12px', color: '#3d0c0c' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: so.ink }}>🔒 {so.key} Season</span>
            <button type="button" onClick={() => onChange({ ...month, season: '' })} style={{ fontSize: '11px', borderRadius: '999px', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.75)' }}>Change</button>
          </div>
        ) : (
          <select value="" onChange={e => onChange({ ...month, season: e.target.value })} style={{ ...box, minWidth: '200px' }}>
            <option value="" disabled>Choose a season…</option>
            {SEASON_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.key} · {o.line}</option>)}
          </select>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {notes.map((n, i) => (
            <li key={i} className="flex items-start gap-2" style={{ fontSize: '12.5px', color: '#3d0c0c' }}>
              <span style={{ color: '#b8a898' }}>•</span>
              <span className="flex-1">{n}</span>
              <button type="button" onClick={() => onChange({ ...month, notes: notes.filter((_, j) => j !== i) })} className="delete-btn" title="Delete note"><DeleteIcon size={12} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        {adding ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input autoFocus value={text} onChange={e => setText(e.target.value)} className="textarea-field flex-1" placeholder="Type your note…"
              onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className="btn-cancel">Cancel</button>
              <button type="button" onClick={add} className="btn-pdf">Save note</button>
            </div>
          </div>
        ) : notes.length < 8 ? (
          <button type="button" onClick={() => setAdding(true)} className="text-xs" style={{ color: '#b8a898' }}>+ Add note{notes.length ? ` (${notes.length}/8)` : ''}</button>
        ) : (
          <p className="text-xs" style={{ color: '#b8a898' }}>8 of 8 notes added</p>
        )}
      </div>
    </div>
  )
}

function SeasonsPlanner({ storageKey, onChange }) {
  const [data, setData] = React.useState(() => parseSeasons(ls.get(storageKey)))
  const now = new Date()
  const [start, setStart] = React.useState(data?.start || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const persist = d => { setData(d); ls.set(storageKey, JSON.stringify(d)); onChange?.() }
  const [sy, sm] = start.split('-')
  const years = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2]
  const box = { backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#3d0c0c' }
  const build = () => {
    const filled = data?.months?.some(x => x.season || x.notes?.length)
    if (filled && !window.confirm('Changing the start month will clear your current seasons and notes. Continue?')) return
    persist({ start, months: twelveMonths(start).map(label => ({ label, season: '', notes: [] })) })
  }
  const done = data ? data.months.filter(x => x.season).length : 0
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {SEASON_OPTIONS.map(o => (
          <div key={o.key} style={{ backgroundColor: o.color, border: `1px solid ${o.edge}`, borderRadius: '10px', padding: '10px 12px' }}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: o.ink, fontWeight: 700 }}>{o.key} Season</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#3d0c0c', fontFamily: "'Manrope', system-ui, sans-serif" }}>{o.line}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <FieldLabel>When do your 12 months start?</FieldLabel>
          <div className="flex gap-2">
            <select value={sm} onChange={e => setStart(`${sy}-${e.target.value}`)} style={box}>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
            <select value={sy} onChange={e => setStart(`${e.target.value}-${sm}`)} style={box}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {(!data || data.start !== start) && (
          <button type="button" onClick={build} className="btn-brand">{data ? 'Update my months' : 'Show my 12 months'}</button>
        )}
      </div>
      {data && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: '#b8a898' }}>{done} of 12 months have a season · saves automatically</p>
          {data.months.map((m, i) => (
            <SeasonMonth key={`${data.start}-${i}`} month={m} onChange={nm => persist({ ...data, months: data.months.map((x, j) => (j === i ? nm : x)) })} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListAnswer({ storageKey, min = 3, max = 5, unit = 'point', onChange }) {
  const Unit = unit[0].toUpperCase() + unit.slice(1)
  const [items, setItems] = React.useState(() => parseList(ls.get(storageKey)))
  const [text, setText] = React.useState('')
  const [editIdx, setEditIdx] = React.useState(null)
  const [editText, setEditText] = React.useState('')
  const persist = list => {
    setItems(list)
    if (list.length) ls.set(storageKey, JSON.stringify(list)); else ls.del(storageKey)
    onChange?.()
  }
  const add = () => { if (!text.trim() || items.length >= max) return; persist([...items, text.trim()]); setText('') }
  const saveEdit = () => { if (!editText.trim()) return; persist(items.map((x, i) => (i === editIdx ? editText.trim() : x))); setEditIdx(null) }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        editIdx === i ? (
          <div key={i} className="space-y-2">
            <textarea className="textarea-field" rows={2} value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditIdx(null)} className="btn-cancel">Cancel</button>
              <button type="button" onClick={saveEdit} className="btn-brand">Save</button>
            </div>
          </div>
        ) : (
          <SingleCard
            key={i}
            value={item}
            copyText={item}
            onEdit={() => { setEditIdx(i); setEditText(item) }}
            onDelete={() => persist(items.filter((_, j) => j !== i))}
            renderContent={v => (
              <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-line">
                <span style={{ color: '#b8a898', marginRight: '8px' }}>{i + 1}.</span>{v}
              </p>
            )}
          />
        )
      ))}
      {items.length < max ? (
        <div className="space-y-3 pt-1">
          <textarea
            className="textarea-field"
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`${Unit} ${items.length + 1}…`}
          />
          <div className="flex items-center gap-3">
            <button type="button" onClick={add} className="btn-brand">Save {unit} {items.length + 1}</button>
            <span className="text-xs" style={{ color: '#b8a898' }}>
              {min > 1 && items.length < min ? `${items.length} of ${min}–${max} ${unit}s` : `${items.length} added · you can add up to ${max}`}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs pt-1" style={{ color: '#8d9a5e' }}>✓ All {max} {unit}s saved</p>
      )}
    </div>
  )
}

function QuestionField({ sid, id, q, hint, note: helper, type, min, max, unit, options, noQuickNote, color, onChange, onAddNote, phaseName }) {
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [note, setNote] = React.useState('')
  const [noteSaved, setNoteSaved] = React.useState(false)
  const saveNote = () => {
    if (!note.trim()) return
    onAddNote?.({ text: note.trim(), source: `${phaseName} · ${q}` })
    setNote(''); setNoteOpen(false); setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }
  const key = answerKey(sid, id)
  const [saved, setSaved] = React.useState(() => { try { return localStorage.getItem(key) || null } catch { return null } })
  const [value, setValue] = React.useState('')
  const [editing, setEditing] = React.useState(false)
  const save = () => {
    if (!value.trim()) return
    if (type === 'revenue' && !(Number(parseRevenue(value)?.monthly) > 0)) return
    ls.set(key, value.trim())
    setSaved(value.trim()); setValue(''); setEditing(false); onChange?.()
  }
  const remove = () => {
    ls.del(key)
    setSaved(null); setValue(''); onChange?.()
  }
  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
        <span>{q}{hint && <HintIcon text={hint} />}</span>
      </h2>
      {helper && <p className="section-subtitle">{helper}</p>}
      <div className="mt-3">
        {type === 'list' ? (
          <ListAnswer storageKey={key} min={min} max={max} unit={unit} onChange={onChange} />
        ) : type === 'plan' ? (
          <PlanBuilder sid={sid} storageKey={key} onChange={onChange} />
        ) : type === 'seasons' ? (
          <SeasonsPlanner storageKey={key} onChange={onChange} />
        ) : saved && !editing ? (
          <SingleCard
            value={saved}
            copyText={formatAnswer(saved, type)}
            onEdit={() => { setValue(saved); setEditing(true) }}
            onDelete={remove}
            renderContent={v => type === 'capacity'
              ? (() => { const c = parseCapacity(v); return c ? (
                  <div className="space-y-2">
                    {c.energy?.length > 0 && <p className="text-xs" style={{ color: '#8a4f45', fontWeight: 600 }}>⚡ Highest-energy days: {WEEKDAYS.filter(d => c.energy.includes(d)).join(', ')}</p>}
                    <CapacitySummary t={capacityTotals(c)} />
                  </div>
                ) : null })()
              : <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-line">{type === 'revenue' ? formatAnswer(v, type) : `"${v}"`}</p>}
          />
        ) : (
          <div className="space-y-3">
            {type === 'revenue' ? (
              <RevenueInput value={value} onChange={setValue} />
            ) : type === 'capacity' ? (
              <CapacityInput sid={sid} value={value} onChange={setValue} />
            ) : type === 'choice' ? (
              <ChoiceInput value={value} onChange={setValue} options={options} />
            ) : (
              <textarea
                className="textarea-field"
                rows={3}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Type your answer…"
              />
            )}
            <div className="flex gap-2">
              {editing && <button onClick={() => setEditing(false)} className="btn-cancel py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
              <button onClick={save} className="btn-brand">Save Answer</button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3" style={noQuickNote ? { display: 'none' } : undefined}>
        {noteOpen ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') setNoteOpen(false) }}
              placeholder="Quick note…"
              className="flex-1 focus:outline-none"
              style={{ backgroundColor: '#faf7f3', border: '1px dashed rgba(61,12,12,0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#3d0c0c' }}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setNoteOpen(false)} className="btn-cancel">Cancel</button>
              <button type="button" onClick={saveNote} className="btn-pdf">Save note</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setNoteOpen(true)} className="text-xs" style={{ color: '#b8a898' }}>
            {noteSaved ? <span style={{ color: '#8d9a5e' }}>✓ Added to My Notes</span> : '+ Add quick note'}
          </button>
        )}
      </div>
    </div>
  )
}

function PhaseQuestions({ sid, phaseKey, name, color, questions, onChange, onAddNote }) {
  return (
    <div className="space-y-4">
      <h2 className="page-title" style={{ fontSize: '26px' }}>{name}</h2>
      {sectionsOf(questions).map(([k, label]) => {
        const shown = questions[k].map((item, i) => [item, i]).filter(([item]) => !item.showIf || item.showIf(sid))
        if (!shown.length) return null
        return (
          <div key={k} className="space-y-4">
            {label && <p className="text-[10px] uppercase tracking-widest pt-2" style={{ color: '#b8a898' }}>{name} · {label}</p>}
            {shown.map(([item, i]) => (
              <QuestionField key={i} sid={sid} phaseName={name} onAddNote={onAddNote} id={`${phaseKey}-${k}-${i}`} color={color} onChange={onChange} {...item} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

const VISIBILITY_QUESTIONS = {
  review: [
    { q: 'Which channels do you market on, and how often do you post in an average week?', hint: 'List each platform and roughly how many times a week you post there.' },
    { q: 'What was your best-performing piece of content or campaign in the last six months, and why do you think it worked?', hint: 'Pick the one that got the most leads, sales or replies, not just likes.' },
    { q: 'How many new followers, subscribers or leads came in over the last six months?', hint: 'Check your app insights or email list. A rough number is fine.' },
    { q: 'Which marketing channel brought in the most leads over the last six months?', hint: 'Where did most enquiries, sign-ups or DMs actually come from?' },
  ],
  diagnose: [
    { q: 'Is your content reaching your ideal buyer, or just people who like you?', hint: 'Look at who comments and messages. Could they actually buy from you?' },
    { q: 'In your content and marketing, what takes the most time for the least result?', hint: 'What do you spend hours on that rarely brings leads or sales?' },
    { q: 'Is there a clear next step after someone sees your content? What is it? Map out the pathway.', hint: 'Write down what happens after someone views a post, step by step, until they buy.' },
    { q: 'Give your visibility a score out of 10. What would make it a 10?', hint: 'Score how well you’re being seen by the right people. Then name the gap.' },
  ],
}

const CASH_QUESTIONS = {
  review: [
    { q: 'Which offers did you sell, at what price, and how many sales of each?', hint: 'List every offer, its price, and how many you sold. Check your sales records.' },
    { q: 'What was your revenue over the last six months? What is your unconscious revenue standard?', hint: 'Add up your sales. Your standard is the amount you keep landing on, even when you aim higher.' },
    { q: 'How does someone go from finding you to paying you? Map out the steps.', hint: 'Start from where they first see you and list each step until they pay.' },
    { q: 'What’s your average conversion rate from conversation or call to sale?', hint: 'Divide the number of sales by the number of calls or chats, then times by 100.' },
  ],
  diagnose: [
    { q: 'Where and when do leads drop off?', hint: 'Think about where people go quiet: after the DM, the call, or the price?' },
    { q: 'Which offer takes the most effort for the least return?', hint: 'Compare the time and energy each offer takes with the money it brings in.' },
    { q: 'Do your offers connect to each other, or does each sale start from zero?', hint: 'Does one offer lead buyers into the next, or do you have to find new buyers every time?' },
    { q: 'Give your cash a score out of 10. What would make it a 10?', hint: 'Score how steady and easy your sales feel. Then name what’s missing.' },
  ],
}

const SUBCONSCIOUS_QUESTIONS = {
  review: [
    { q: 'What did you say you’d do in the last six months that didn’t happen? Why?', hint: 'Think of plans, launches or goals that stalled. Be honest about why.' },
    { q: 'What have you been putting off “until next week”?', hint: 'What’s been on your list for weeks but never gets done?' },
    { q: 'Where do you feel stretched or at capacity right now, and why?', hint: 'Where does your time or energy run out? What’s taking up the most space?' },
  ],
  diagnose: [
    { q: 'What fear or story sits under the things you keep avoiding?', hint: 'Finish this sentence: “If I do this, I’m scared that...”' },
    { q: 'Where are you playing it safe in your business, and why?', hint: 'Where are you holding back, like on price, posting, or asking for the sale?' },
    { q: 'What decision would you make if you knew it would work?', hint: 'Don’t overthink it. Write the first answer that comes to mind.' },
    { q: 'Give your self-trust a score out of 10. What would make it a 10?', hint: 'Score how much you trust yourself to follow through. Then name what would help.' },
  ],
}

const PHASE_QUESTIONS = {
  Influence: INFLUENCE_QUESTIONS,
  Visibility: VISIBILITY_QUESTIONS,
  Cash: CASH_QUESTIONS,
  'Subconscious Mastery': SUBCONSCIOUS_QUESTIONS,
}

const MAROON = [61, 12, 12]
const MUTED = [150, 135, 120]
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const slug = name => name.toLowerCase().replace(/\s+/g, '-')

function downloadWorkshopPdf(sid, phaseNames, cfg = PART_ONE) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 50
  const CW = W - M * 2
  let y = 0

  const footer = () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED)
    doc.text('© 2026 Jessica Marie Holdings Pty Ltd. All rights reserved.', M, H - 25)
  }
  const header = () => {
    doc.setFillColor(...MAROON); doc.rect(0, 0, W, 6, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
    doc.text(`WMHQ BIANNUAL WORKSHOP ${sessionLabel(sid).toUpperCase()}  ·  ${cfg.title.toUpperCase()}`, M, 30)
    y = 60
  }
  const newPage = () => { footer(); doc.addPage(); header() }
  const ensure = h => { if (y + h > H - 50) newPage() }

  header()
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...MAROON)
  const title = phaseNames.length === 1 ? `${phaseNames[0]}: ${cfg.shortTitle}` : cfg.title
  doc.text(title, M, y); y += 18
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED)
  doc.text(cfg.tagline, M, y); y += 30

  phaseNames.forEach((name, pi) => {
    const phase = cfg.phases.find(p => p.name === name)
    const qs = cfg.questions[name] || {}
    if (pi > 0) { newPage() }
    doc.setFillColor(...hexToRgb(phase.color)); doc.rect(M, y - 14, CW, 26, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...MAROON)
    doc.text(name, M + 10, y + 4); y += 34

    ;sectionsOf(qs).forEach(([k, label]) => {
      if (label && qs[k].some(item => !item.showIf || item.showIf(sid))) {
        ensure(30)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...hexToRgb(phase.border))
        doc.text(label.toUpperCase(), M, y); y += 16
      }
      qs[k].forEach((item, i) => {
        if (item.showIf && !item.showIf(sid)) return
        let answer = ''
        try { answer = formatAnswer(localStorage.getItem(answerKey(sid, `${slug(name)}-${k}-${i}`)) || '', item.type) } catch {}
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
        const qLines = doc.splitTextToSize(item.q, CW)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        const aLines = answer ? doc.splitTextToSize(answer, CW - 20) : []
        const boxH = answer ? aLines.length * 14 + 16 : 60
        ensure(qLines.length * 14 + boxH + 20)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...MAROON)
        doc.text(qLines, M, y); y += qLines.length * 14 + 4
        doc.setDrawColor(220, 210, 200); doc.setFillColor(250, 247, 243)
        doc.roundedRect(M, y, CW, boxH, 3, 3, 'FD')
        if (answer) {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 30, 30)
          doc.text(aLines, M + 10, y + 16)
        }
        y += boxH + 18
      })
      y += 6
    })
  })
  // My Notes
  let notes = []
  try { notes = JSON.parse(localStorage.getItem(notesKey(sid, cfg)) || '[]') } catch {}
  if (phaseNames.length === 1) notes = notes.filter(n => n.source && n.source.startsWith(`${phaseNames[0]} · `))
  if (notes.length) {
    ensure(80)
    y += 10
    doc.setFillColor(...MAROON); doc.rect(M, y - 14, CW, 26, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(245, 236, 224)
    doc.text(phaseNames.length === 1 ? `My Notes: ${phaseNames[0]}` : 'My Notes', M + 10, y + 4); y += 34
    notes.forEach(n => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      const tLines = doc.splitTextToSize(`•  ${n.text}`, CW)
      doc.setFontSize(8)
      const sLines = n.source ? doc.splitTextToSize(`From: ${n.source}`, CW - 12) : []
      ensure(tLines.length * 14 + sLines.length * 11 + 12)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 30, 30)
      doc.text(tLines, M, y); y += tLines.length * 14
      if (sLines.length) { doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(sLines, M + 12, y - 2); y += sLines.length * 11 }
      y += 8
    })
  }

  footer()
  const tag = sessionLabel(sid).replace(' ', '-')
  const file = phaseNames.length === 1 ? `WMHQ-Workshop-${tag}-${slug(phaseNames[0])}.pdf` : `WMHQ-Workshop-${tag}-${cfg.fileTag}.pdf`
  doc.save(file)
}

function WorkshopPicker({ sessions, current, onPick, onCancel }) {
  const now = new Date()
  const [month, setMonth] = React.useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = React.useState(String(now.getFullYear()))
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2]
  const select = { backgroundColor: '#ffffff', border: '1px solid rgba(61,12,12,0.15)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: '#3d0c0c' }
  return (
    <div className="card-section max-w-lg mx-auto text-center">
      <p className="text-[10px] uppercase tracking-widest" style={{ color: '#b8a898' }}>WMHQ Biannual Workshop</p>
      <h2 className="page-title mt-1" style={{ fontSize: '24px' }}>Which workshop are you doing?</h2>
      <p className="text-sm text-gray-500 mt-1">Choose the month and year of this workshop.<br />Your answers are saved to it.</p>
      <div className="flex justify-center gap-2 mt-5">
        <select value={month} onChange={e => setMonth(e.target.value)} style={select}>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} style={select}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="flex justify-center gap-2 mt-5">
        {onCancel && <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>}
        <button type="button" onClick={() => onPick(`${year}-${month}`)} className="btn-brand">Start workshop</button>
      </div>
      {sessions.length > 0 && (
        <p className="text-xs mt-4" style={{ color: '#b8a898' }}>
          Your workshops: {sessions.map(sessionLabel).join(', ')}{current ? ` · current: ${sessionLabel(current)}` : ''}
        </p>
      )}
    </div>
  )
}

function CarryOverPrompt({ newSid, lastSid, onChoose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(42,8,8,0.45)' }}>
      <div className="card-section w-full max-w-md text-center" style={{ backgroundColor: '#ffffff' }}>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: '#b8a898' }}>Welcome back</p>
        <h2 className="page-title mt-1" style={{ fontSize: '22px' }}>Starting your {sessionLabel(newSid)} workshop</h2>
        <p className="text-sm text-gray-500 mt-2">
          You have answers from your {sessionLabel(lastSid)} workshop. Do you want to bring them in and edit them, or start fresh?
          Your {sessionLabel(lastSid)} answers stay saved either way.
        </p>
        <div className="flex flex-col gap-2 mt-5">
          <button type="button" onClick={() => onChoose('carry')} className="btn-brand justify-center">Keep my {sessionLabel(lastSid)} answers and edit them</button>
          <button type="button" onClick={() => onChoose('fresh')} className="btn-cancel">Start fresh</button>
          <button type="button" onClick={() => downloadWorkshopPdf(lastSid, PHASES.map(p => p.name))} className="btn-pdf">↓ Download {sessionLabel(lastSid)} answers (PDF)</button>
        </div>
      </div>
    </div>
  )
}

function notesKey(sid, cfg = PART_ONE) { return `wmhq-workshop:${sid}:${cfg.notesSuffix}` }
function loadNotes(sid, cfg) { try { return JSON.parse(ls.get(notesKey(sid, cfg)) || '[]') } catch { return [] } }

function MyNotes({ notes, onAdd, onDelete }) {
  const [text, setText] = React.useState('')
  const add = () => { if (!text.trim()) return; onAdd({ text: text.trim() }); setText('') }
  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: '#3d0c0c' }} />
        My Notes
      </h2>
      <p className="section-subtitle">Jot down quick thoughts as you work through each phase.</p>
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Add a quick note…"
          className="flex-1 focus:outline-none"
          style={{ backgroundColor: '#faf7f3', border: '1px solid rgba(61,12,12,0.12)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#3d0c0c' }}
        />
        <button type="button" onClick={add} className="btn-brand justify-center">Add note</button>
      </div>
      {notes.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {notes.map(n => (
            <li key={n.id} className="flex items-start gap-3" style={{ backgroundColor: '#faf7f3', borderRadius: '8px', padding: '10px 12px' }}>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '13px', color: '#3d0c0c', lineHeight: 1.5 }}>{n.text}</p>
                {n.source && <p className="mt-0.5 truncate" style={{ fontSize: '10px', color: '#b8a898' }}>From: {n.source}</p>}
              </div>
              <button type="button" onClick={() => onDelete(n.id)} className="delete-btn flex-shrink-0" title="Delete"><DeleteIcon /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs mt-3" style={{ color: '#b8a898' }}>No notes yet. You can also add one from any question with "+ Add quick note".</p>
      )}
    </div>
  )
}

const PART_ONE = {
  title: 'Part One: Review & Diagnose',
  shortTitle: 'Review & Diagnose',
  tagline: "What worked, what didn't, numbers, messaging, visibility, sales and bottlenecks.",
  steps: [
    { step: 'Step 1', title: 'Review', text: 'Look back at the last six months: your numbers, content, launches and sales. What worked, what didn\u2019t, and what actually happened.' },
    { step: 'Step 2', title: 'Diagnose', text: 'Find the real bottleneck. Is it your message, your reach, your offers or your mindset holding the business back?' },
  ],
  phases: PHASES,
  questions: PHASE_QUESTIONS,
  notesSuffix: 'notes',
  fileTag: 'Part-One',
  beginLabel: 'Begin Reviewing & Diagnosing',
  activeLabel: 'Reviewing & Diagnosing',
}

const PART_TWO = {
  title: 'Part Two: Decide & Build',
  shortTitle: 'Decide & Build',
  tagline: 'Where you\u2019re going, what matters most, and the plan to get there.',
  steps: [
    { step: 'Step 1', title: 'Decide', text: 'Choose where the business is going next. Use what Part One showed you to set your direction and the few priorities that matter most.' },
    { step: 'Step 2', title: 'Build', text: 'Turn your decisions into a plan. Map out the offers, marketing and support you need to make the next six months happen.' },
  ],
  phases: [
    { name: '2027 Direction', color: '#f0d0d0', border: '#b46a6a', def: 'The big picture for your business next year: what you want it to look like, earn and feel like.', check: 'Is your direction clear enough to guide every decision you make?' },
    { name: 'Six-Month Priorities', color: '#e8dccb', border: '#9c8566', def: 'What matters most in your business over the next six months. First you’ll set one priority for each phase. Then you’ll map them out month by month, so you know exactly what you’re focusing on and when.', check: null },
    { name: 'Capacity Check', color: '#e6cfc6', border: '#8a4f45', def: 'A good plan is one you can actually follow through on. This section checks your plan against real life before you fill your calendar with it.', check: 'Does your plan fit the hours and energy you really have?' },
    { name: 'Your Seasons', color: '#f6e9c8', border: '#b08a3e', def: 'Three seasons. One system that pays you in all of them. Map the next 12 months by season, so you know what to work on based on your energy, your season and your goals.', check: null },
  ],
  questions: {
    '2027 Direction': {
      questions: [
        { q: 'Where is your business heading in 2027? List three to five things.', type: 'list', min: 3, max: 5, hint: 'Think big picture, like the offers, the audience, the way you work and the business you’re building.' },
        { q: 'What will be different by the end of 2027 if this all works?', hint: 'Picture December 2027. What’s changed in your revenue, clients, time and how you feel running the business?' },
        { q: 'What monthly revenue are you aiming for in 2027?', type: 'revenue', note: 'Choose currency. Quarterly and annual totals fill in automatically.', hint: 'Start from your unconscious revenue standard, then pick a number that stretches you but still feels possible.' },
        { q: 'What does 2027 need you to stop being or doing? List three to five things.', type: 'list', min: 3, max: 5, hint: 'Think of the habits, roles or ways of working you’ve outgrown, like doing it all yourself or undercharging.' },
      ],
    },
    'Six-Month Priorities': {
      partA: [
        { q: 'Influence: What is your main priority for Influence over the next six months?', hint: 'Look at your Part 1 answers. What one change would make your message clearer?' },
        { q: 'Visibility: What is your main priority for Visibility over the next six months?', hint: 'What one change would get you in front of more of the right people?' },
        { q: 'Cash: What is your main priority for Cash over the next six months?', hint: 'What one change would make your sales steadier or easier?' },
        { q: 'Subconscious Mastery: What is your main priority for Subconscious Mastery over the next six months?', hint: 'What pattern or fear do you most need to work through to follow through on this plan?' },
        { q: 'Which phase is your lead priority?', type: 'choice', options: ['Influence', 'Visibility', 'Cash', 'Subconscious Mastery'], hint: 'Pick your Part 1 bottleneck. It gets your time and energy first when things get busy.' },
      ],
      partB: [
        { q: 'Your month-by-month plan', type: 'plan', note: 'Now let’s map your priorities across the next six months. You don’t have to work on everything at once. Choose what each month is for.' },
      ],
    },
    'Your Seasons': {
      questions: [
        { q: 'Choose your season for each month', type: 'seasons', noQuickNote: true, note: 'Pick when your 12 months start, then choose a season for each month. Add notes for anything important, like a birthday, holiday or launch.', hint: 'Match each season to your energy, your life and what the business needs that month.' },
      ],
    },
    'Capacity Check': {
      capA: [
        { q: 'How many hours can you genuinely give the business each week?', type: 'capacity', note: 'Go day by day. Then add how much of that time goes to client work, and how much each priority needs. We’ll do the maths.', hint: 'Count the hours you really have, not the hours you wish you had. Be honest.' },
        { q: 'What comes first outside the business, and are there any busy or low-energy weeks coming up?', hint: 'Think family, health, rest, travel or another job, plus holidays, events, school breaks or big life moments. Add them now so they don’t surprise you.' },
      ],
      capB: [
        { q: 'What can you cut, delay, hand off or say no to?', showIf: sid => capacityFits(ls.get(answerKey(sid, 'capacity-check-capA-0'))) === false, hint: 'Start with your lowest-impact priority. Push it to a later month, make it smaller, or get support with a VA, template or tool.' },
      ],
      capC: [
        { q: 'What are your early warning signs that you’re over capacity? Add one sign at a time.', type: 'list', unit: 'sign', min: 1, max: 5, hint: 'It might be skipping workouts, avoiding emails or feeling snappy. Name them so you catch them sooner.' },
        { q: 'What will you do when you notice those signs?', hint: 'Pick one simple action, like dropping back to your lead priority only for a week.' },
        { q: 'On a scale of 1 to 10, how confident are you that you can follow through on this plan?', type: 'choice', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], hint: 'If it’s under 7, adjust the plan until it feels doable. A smaller plan you finish beats a big one you don’t.' },
      ],
    },
  },
  notesSuffix: 'part-two-notes',
  fileTag: 'Part-Two',
  beginLabel: 'Begin Deciding & Building',
  activeLabel: 'In progress',
}

/* ─── Access code gate ─── */
// Only a SHA-256 hash of the code lives in the code, not the code itself.
const ACCESS_HASH = '0d4eb218c5aa51c8411acf9156d6a03ff3562a08bec23f7b02163a2b46b9f00d'
const UNLOCK_KEY = 'wmhq-workshop:unlocked'
export const WORKSHOP_UNLOCK_EVENT = 'wmhq-workshop-unlocked'
export function isWorkshopUnlocked() { return ls.get(UNLOCK_KEY) === ACCESS_HASH }
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function WorkshopGate() {
  const navigate = useNavigate()
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState('')
  const [checking, setChecking] = React.useState(false)
  const ready = useWorkshopReady()
  if (!ready) return <WorkshopLoading />
  if (isWorkshopUnlocked()) return <Navigate to="/workshop/review-and-diagnose" replace />
  const submit = async e => {
    e.preventDefault()
    if (!code.trim()) return
    setChecking(true)
    const h = await sha256(code.trim().toUpperCase())
    setChecking(false)
    if (h === ACCESS_HASH) {
      ls.set(UNLOCK_KEY, ACCESS_HASH)
      window.dispatchEvent(new Event(WORKSHOP_UNLOCK_EVENT))
      navigate('/workshop/review-and-diagnose')
    } else {
      setError('That code isn’t right. Check it and try again.')
    }
  }
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form onSubmit={submit} className="card-section w-full max-w-md text-center">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: '#b8a898' }}>WMHQ Biannual Workshop</p>
        <h1 className="page-title mt-1" style={{ fontSize: '26px' }}>Enter access code</h1>
        <p className="text-sm text-gray-500 mt-2">
          Next Biannual Workshop is November 17th, 2026.<br />
          Check WMHQ Community Meetups for full details. Access code granted then.
        </p>
        <input
          type="password"
          autoComplete="off"
          value={code}
          onChange={e => { setCode(e.target.value); setError('') }}
          placeholder="Access code"
          className="textarea-field mt-5 text-center"
          style={{ letterSpacing: '0.2em' }}
          aria-label="Access code"
        />
        {error && <p className="text-xs mt-2" style={{ color: '#b54a3c' }}>{error}</p>}
        <button type="submit" className="btn-brand mt-4 justify-center" disabled={checking}>{checking ? 'Checking…' : 'Unlock workshop'}</button>
      </form>
    </div>
  )
}

function LockedPart({ cfg }) {
  const ready = useWorkshopReady()
  if (!ready) return <WorkshopLoading />
  return isWorkshopUnlocked() ? <WorkshopPartPage cfg={cfg} /> : <Navigate to="/workshop" replace />
}
export function WorkshopPartOne() { return <LockedPart cfg={PART_ONE} /> }
export function WorkshopPartTwo() { return <LockedPart cfg={PART_TWO} /> }

function WorkshopPartPage({ cfg }) {
  const PHASES = cfg.phases
  const PHASE_QUESTIONS = cfg.questions
  const [sessions, setSessions] = React.useState(() => getSessions())
  const [sid, setSid] = React.useState(() => { getSessions(); return ls.get(CURRENT_KEY) })
  const [picking, setPicking] = React.useState(false)
  const [pending, setPending] = React.useState(null)
  const [active, setActive] = React.useState(null)
  const [notes, setNotes] = React.useState(() => (ls.get(CURRENT_KEY) ? loadNotes(ls.get(CURRENT_KEY), cfg) : []))
  React.useEffect(() => { if (sid) setNotes(loadNotes(sid, cfg)) }, [sid])
  const saveNotes = list => { setNotes(list); ls.set(notesKey(sid, cfg), JSON.stringify(list)) }
  const addNote = n => saveNotes([{ id: Date.now() + Math.random(), ...n }, ...loadNotes(sid, cfg)])
  const deleteNote = id => saveNotes(notes.filter(n => n.id !== id))
  const [, bump] = React.useState(0)
  const refresh = () => bump(n => n + 1)

  const activate = newSid => {
    addSession(newSid); setSessions(getSessions()); setSid(newSid); setPicking(false); setPending(null); setActive(null)
  }
  const pick = newSid => {
    const last = sessions.filter(x => x !== newSid && sessionHasAnswers(x)).sort().pop()
    if (!sessions.includes(newSid) && last) { setPending({ newSid, lastSid: last }); return }
    activate(newSid)
  }
  const choose = how => {
    if (how === 'carry') copyAnswers(pending.lastSid, pending.newSid)
    activate(pending.newSid)
  }

  if (!sid || picking) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="page-title">{cfg.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cfg.tagline}</p>
        </div>
        <WorkshopPicker sessions={sessions} current={sid} onPick={pick} onCancel={sid ? () => setPicking(false) : null} />
        {pending && <CarryOverPrompt {...pending} onChoose={choose} />}
      </div>
    )
  }
  const past = sessions.filter(x => x !== sid)
  const phase = PHASES.find(p => p.name === active)
  const close = () => {
    setActive(null)
    setTimeout(() => document.getElementById('phase-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const begin = name => {
    if (active === name) { close(); return }
    setActive(name)
    setTimeout(() => document.getElementById('phase-questions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#b8a898' }}>
            WMHQ Biannual Workshop {sessionLabel(sid)}
            <button type="button" onClick={() => setPicking(true)} className="ml-2 underline normal-case tracking-normal" style={{ color: '#3d0c0c' }}>Change</button>
          </p>
          <h1 className="page-title">{cfg.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cfg.tagline}</p>
        </div>
        <button type="button" onClick={() => downloadWorkshopPdf(sid, PHASES.map(p => p.name), cfg)} className="btn-brand-outline flex-shrink-0 mt-1">
          ↓ Download all phases (PDF)
        </button>
      </div>

      <div className="grid gap-1.5 md:gap-4 md:grid-cols-2">
        {cfg.steps.map(st => <StepCard key={st.title} {...st} />)}
      </div>

      <MyNotes notes={notes} onAdd={addNote} onDelete={deleteNote} />

      <div id="phase-cards" style={{ scrollMarginTop: '16px' }} className="grid gap-2 md:gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PHASES.map(p => <PhaseCard key={p.name} {...p} beginLabel={cfg.beginLabel} active={active === p.name} onBegin={() => begin(p.name)} progress={phaseProgress(sid, p.name.toLowerCase().replace(/\s+/g, '-'), PHASE_QUESTIONS[p.name])} />)}
      </div>

      <div id="phase-questions" style={{ scrollMarginTop: '16px' }}>
        {phase && (
          <div className="flex justify-end mb-2">
            <button type="button" onClick={close} className="btn-cancel py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Close {phase.name} ✕</button>
          </div>
        )}
        {phase && (PHASE_QUESTIONS[phase.name] ? (
          <PhaseQuestions key={`${sid}-${phase.name}`} sid={sid} phaseKey={phase.name.toLowerCase().replace(/\s+/g, '-')} name={phase.name} color={phase.color} questions={PHASE_QUESTIONS[phase.name]} onChange={refresh} onAddNote={addNote} />
        ) : (
          <div style={{ ...card, minHeight: '120px' }}>{phase.name} questions coming soon.</div>
        ))}
        {phase && (
          <div className="flex justify-center mt-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => downloadWorkshopPdf(sid, [phase.name], cfg)} className="btn-pdf">↓ Save {phase.name} as PDF</button>
              <button type="button" onClick={close} className="btn-brand">Done, close {phase.name}</button>
            </div>
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#b8a898' }}>Past workshops</p>
          <div className="flex flex-wrap gap-2">
            {past.map(x => (
              <button key={x} type="button" onClick={() => downloadWorkshopPdf(x, PHASES.map(p => p.name), cfg)} className="btn-pdf">↓ {sessionLabel(x)} (PDF)</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
