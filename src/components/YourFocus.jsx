import React, { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { getCurrentQuarter } from '../lib/utils'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#3d0c0c'

/* ── Phase colors (reused from the app's existing tokens) ── */
const TYPE_META = {
  offer:      { label: 'Offer',      bg: '#c6def2', text: '#1e4d78' },
  visibility: { label: 'Visibility', bg: '#fcc799', text: '#7a3c0a' },
  revenue:    { label: 'Revenue',    bg: '#cdd5ae', text: '#3d4a1c' },
}
const TYPE_ORDER = ['offer', 'visibility', 'revenue']

const AREA_OPTIONS = ['Relationships', 'Hobbies', 'Travel', 'Finances', 'Health']
const AREA_TAG = { bg: '#e7cee3', text: '#5a2d58' }

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const NOTE_MAX = 150
const TITLE_MAX = 60
const LEVER_MAX = 40
const LIFE_MAX = 80

/* ── Derived status palette (reused from the app's existing status styling) ── */
const STATUS_CHIP = {
  completed:     { label: 'Completed',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  in_progress:   { label: 'In progress',   cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  not_completed: { label: 'Not completed', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
}

/* ── Helpers ── */
// Parse the first number out of values like "$630 ($9x70)", "$10,000", "175000".
function num(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const m = String(v).match(/[\d][\d,]*(\.\d+)?/)
  return m ? parseFloat(m[0].replace(/,/g, '')) : 0
}

function formatVal(type, n) {
  const v = num(n)
  const s = v.toLocaleString('en-AU')
  return type === 'visibility' ? s : `$${s}`
}

function statusOf(f) {
  const t = num(f.target)
  const c = num(f.current)
  if (t > 0 && c >= t) return 'completed'
  // A focus the user declared completed but never set a target for stays completed.
  if (t <= 0 && f.legacyCompleted) return 'completed'
  if (f.completion_date) {
    const due = new Date(f.completion_date + 'T23:59:59')
    if (!isNaN(due.getTime()) && due < new Date() && c < t) return 'not_completed'
  }
  return 'in_progress'
}

function pctOf(f) {
  const t = num(f.target)
  if (t <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((num(f.current) / t) * 100)))
}

function fmtRange(begin, complete) {
  const f = (s) => {
    if (!s) return null
    const d = new Date(s + 'T00:00:00')
    return isNaN(d.getTime()) ? null : format(d, 'd MMM yyyy')
  }
  const a = f(begin), b = f(complete)
  if (a && b) return `${a} to ${b}`
  if (a) return `From ${a}`
  if (b) return `By ${b}`
  return ''
}

// Map a raw business_focus row into the new working shape (back-compatible).
function normalizeBiz(row) {
  const d = row.data || {}
  const type = row.focus_type
  const legacyTitle = d.offer ?? d.visibilityFocus ?? d.revenueFocusType ?? ''
  const legacyTarget = type === 'offer' ? d.revenueGoal : type === 'visibility' ? d.targetNumber : d.targetRevenue
  const legacyCurrent = type === 'offer' ? 0 : type === 'visibility' ? d.currentNumber : d.currentRevenue
  const target = num(d.target ?? legacyTarget)
  let current = num(d.current ?? legacyCurrent)
  // Migration mapping: a record the user marked Completed should read as completed.
  if (d.current == null && d.status === 'Completed') current = target
  return {
    id: row.id,
    type,
    title: d.title ?? legacyTitle ?? '',
    current,
    target,
    begin_date: d.begin_date || '',
    completion_date: d.completion_date || '',
    lever: d.lever ?? d.primaryLever ?? '',
    priority: d.priority == null ? null : Number(d.priority),
    legacyCompleted: d.status === 'Completed',
    created_at: row.created_at,
    raw: d,
  }
}

function sortBiz(list) {
  return [...list].sort((a, b) => {
    const pa = a.priority == null ? Infinity : a.priority
    const pb = b.priority == null ? Infinity : b.priority
    if (pa !== pb) return pa - pb
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

/* ── Small inline icons (scoped to this section) ── */
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}
function ChevronIcon({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/* ── Shared bits ── */
function TypeTag({ type }) {
  const m = TYPE_META[type] || TYPE_META.offer
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
      style={{ backgroundColor: m.bg, color: m.text }}>
      {m.label}
    </span>
  )
}

function StatusChip({ f }) {
  const s = STATUS_CHIP[statusOf(f)]
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  )
}

function ProgressBar({ f, height = 6 }) {
  const pct = pctOf(f)
  return (
    <div className="rounded-full overflow-hidden w-full" style={{ height, backgroundColor: '#f0e0e0' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: BRAND }} />
    </div>
  )
}

/* ── Progress update field ── */
function ProgressUpdate({ f, onSave }) {
  const [val, setVal] = useState(String(num(f.current)))
  // Keep the field in sync with the saved value (e.g. after an update).
  useEffect(() => { setVal(String(num(f.current))) }, [f.current])
  const submit = () => {
    if (val === '') return
    onSave(num(val))
  }
  return (
    <div>
      <label className="label">Update progress</label>
      <div className="flex gap-2">
        <input
          type="number"
          className="input-field"
          style={{ maxWidth: 160 }}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
        <button onClick={submit} className="btn-brand" disabled={val === ''}>Update</button>
      </div>
    </div>
  )
}

/* ── Notes thread ── */
function NotesThread({ notes, onAdd, onDelete }) {
  const [body, setBody] = useState('')
  const remaining = NOTE_MAX - body.length
  const add = () => {
    const t = body.trim()
    if (!t) return
    onAdd(t.slice(0, NOTE_MAX))
    setBody('')
  }
  return (
    <div>
      <label className="label">Notes</label>
      {notes.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {notes.map(n => (
            <div key={n.id} className="group flex items-start gap-2">
              <span className="text-[10px] font-semibold flex-shrink-0 mt-0.5" style={{ color: '#b8a898', minWidth: 38 }}>
                {format(new Date(n.created_at), 'd MMM')}
              </span>
              <span className="text-xs flex-1" style={{ color: '#1a0606' }}>{n.body}</span>
              <button onClick={() => onDelete(n.id)} className="delete-btn flex-shrink-0" style={{ width: 22, height: 22 }} title="Delete note">
                <DeleteIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            className="input-field"
            value={body}
            maxLength={NOTE_MAX}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            placeholder="Add a note"
          />
          <p className="text-[10px] mt-1" style={{ color: '#b8a898' }}>{remaining} characters left</p>
        </div>
        <button onClick={add} className="btn-brand" disabled={!body.trim()}>Add</button>
      </div>
    </div>
  )
}

/* ── Business focus field options ── */
const VISIBILITY_OPTIONS = [
  'Instagram followers',
  'TikTok followers',
  'YouTube subscribers',
  'Email list size',
  'Podcast downloads',
  'Website visits',
  'Other',
]
const REVENUE_TYPE_OPTIONS = [
  'Recurring revenue',
  'Total monthly revenue',
  'Launch revenue',
  'Cash collected',
  'Profit',
  'Other',
]
const LEVER_OPTIONS = [
  'New offer launch',
  'Renewals and extensions',
  'Content and organic',
  'Paid ads',
  'Email list',
  'Referrals',
  'Other',
]

// Resolve a stored value against a dropdown set: an exact match selects that
// option; anything else (legacy or custom) falls under "Other" with the value kept.
function initDropdown(value, options) {
  if (value && options.includes(value)) return { select: value, other: '' }
  if (value) return { select: 'Other', other: value }
  return { select: '', other: '' }
}

/* ── Business focus form (add + edit, in place) ── */
function BizForm({ initial, onSave, onCancel, onDelete }) {
  const [type, setType] = useState(initial?.type || 'offer')

  // Shared fields: preserved when switching type pills.
  const [current, setCurrent] = useState(initial != null ? String(initial.current ?? '') : '')
  const [target, setTarget] = useState(initial != null ? String(initial.target ?? '') : '')
  const [begin, setBegin] = useState(initial?.begin_date || '')
  const [complete, setComplete] = useState(initial?.completion_date || '')

  // Offer
  const [offerTitle, setOfferTitle] = useState(initial?.type === 'offer' ? (initial.title || '') : '')
  const [traffic, setTraffic] = useState(initial?.raw?.trafficNeeded || '')

  // Visibility
  const visInit = initDropdown(initial?.type === 'visibility' ? initial.title : '', VISIBILITY_OPTIONS)
  const [visSelect, setVisSelect] = useState(visInit.select)
  const [visOther, setVisOther] = useState(visInit.other)

  // Revenue
  const revInit = initDropdown(initial?.type === 'revenue' ? initial.title : '', REVENUE_TYPE_OPTIONS)
  const [revSelect, setRevSelect] = useState(revInit.select)
  const [revOther, setRevOther] = useState(revInit.other)
  const leverInit = initDropdown(initial?.type === 'revenue' ? initial.lever : '', LEVER_OPTIONS)
  const [leverSelect, setLeverSelect] = useState(leverInit.select)
  const [leverOther, setLeverOther] = useState(leverInit.other)

  const computeTitle = () => {
    if (type === 'offer') return offerTitle.trim()
    if (type === 'visibility') return visSelect === 'Other' ? visOther.trim() : visSelect
    return revSelect === 'Other' ? revOther.trim() : revSelect
  }
  const computeLever = () => {
    if (leverSelect === '') return ''
    return leverSelect === 'Other' ? leverOther.trim() : leverSelect
  }

  const title = computeTitle()
  const canSave = !!title

  const save = () => {
    if (!canSave) return
    const vals = {
      type,
      title: title.slice(0, TITLE_MAX),
      current: num(current),
      target: num(target),
      begin_date: begin,
      completion_date: complete,
      lever: type === 'revenue' ? computeLever().slice(0, LEVER_MAX) : '',
    }
    if (type === 'offer') vals.trafficNeeded = traffic.trim()
    onSave(vals)
  }

  const dates = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Begin date</label>
        <input className="input-field" type="date" value={begin} onChange={e => setBegin(e.target.value)} />
      </div>
      <div>
        <label className="label">Complete by</label>
        <input className="input-field" type="date" value={complete} onChange={e => setComplete(e.target.value)} />
      </div>
    </div>
  )

  return (
    <div className="form-card space-y-4">
      <div className="flex gap-2">
        {TYPE_ORDER.map(t => {
          const m = TYPE_META[t]
          const on = type === t
          return (
            <button key={t} onClick={() => setType(t)} className="tag-btn"
              style={on
                ? { backgroundColor: m.bg, color: m.text, borderColor: m.bg }
                : { backgroundColor: '#faf7f3', color: '#b8a898', borderColor: '#e8e0d8' }}>
              {m.label}
            </button>
          )
        })}
      </div>

      {type === 'offer' && (
        <>
          <div>
            <label className="label">Offer in focus</label>
            <input className="input-field" value={offerTitle} maxLength={TITLE_MAX}
              onChange={e => setOfferTitle(e.target.value)} placeholder="e.g. Spring workshop series" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current revenue ($)</label>
              <input className="input-field" type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Revenue goal ($)</label>
              <input className="input-field" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">Traffic needed (optional)</label>
            <input className="input-field" value={traffic}
              onChange={e => setTraffic(e.target.value)} placeholder="e.g. 500 website visits" />
          </div>
        </>
      )}

      {type === 'visibility' && (
        <>
          <div>
            <label className="label">Visibility focus</label>
            <select className="input-field" value={visSelect} onChange={e => setVisSelect(e.target.value)}>
              <option value="">Select...</option>
              {VISIBILITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {visSelect === 'Other' && (
            <div>
              <label className="label">Name it</label>
              <input className="input-field" value={visOther} maxLength={TITLE_MAX}
                onChange={e => setVisOther(e.target.value)} placeholder="Name your visibility focus" autoFocus />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current number</label>
              <input className="input-field" type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Target number</label>
              <input className="input-field" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" />
            </div>
          </div>
        </>
      )}

      {type === 'revenue' && (
        <>
          <div>
            <label className="label">Revenue focus type</label>
            <select className="input-field" value={revSelect} onChange={e => setRevSelect(e.target.value)}>
              <option value="">Select...</option>
              {REVENUE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {revSelect === 'Other' && (
            <div>
              <label className="label">Name it</label>
              <input className="input-field" value={revOther} maxLength={TITLE_MAX}
                onChange={e => setRevOther(e.target.value)} placeholder="Name your revenue focus" autoFocus />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current revenue ($)</label>
              <input className="input-field" type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Target revenue ($)</label>
              <input className="input-field" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">Primary lever (optional)</label>
            <select className="input-field" value={leverSelect} onChange={e => setLeverSelect(e.target.value)}>
              <option value="">Select...</option>
              {LEVER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {leverSelect === 'Other' && (
            <div>
              <label className="label">Name it</label>
              <input className="input-field" value={leverOther} maxLength={LEVER_MAX}
                onChange={e => setLeverOther(e.target.value)} placeholder="Name the lever" />
            </div>
          )}
        </>
      )}

      {dates}

      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button onClick={onDelete} className="text-xs font-semibold px-3 py-2 rounded transition-colors"
            style={{ color: '#9c3034' }}>
            Delete
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-brand-outline">Cancel</button>
          <button onClick={save} className="btn-brand" disabled={!canSave}>Save focus</button>
        </div>
      </div>
    </div>
  )
}

/* ── Hero card (priority 1) ── */
function HeroCard({ f, notes, open, onToggle, onGrip, onEdit, onProgress, onAddNote, onDeleteNote }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#faf7f5', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-start gap-3">
        <button
          onPointerDown={onGrip}
          className="flex-shrink-0 mt-1 cursor-grab"
          style={{ color: '#c4b5af', touchAction: 'none' }}
          title="Drag to reorder"
        >
          <GripIcon />
        </button>
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
          style={{ width: 26, height: 26, backgroundColor: BRAND, color: '#f5ece0', fontSize: '12px' }}
        >
          1
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <TypeTag type={f.type} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#b8a898' }}>Main focus</span>
            <StatusChip f={f} />
          </div>
          <p className="text-base font-semibold" style={{ color: '#1a0606' }}>{f.title || 'Untitled focus'}</p>
          {fmtRange(f.begin_date, f.completion_date) && (
            <p className="text-xs mt-0.5" style={{ color: '#b8a898' }}>{fmtRange(f.begin_date, f.completion_date)}</p>
          )}
          {f.lever && <p className="text-xs mt-1" style={{ color: '#8a8a8a' }}>Lever: {f.lever}</p>}
        </div>
        <button onClick={onEdit} className="edit-btn flex-shrink-0"><EditIcon /></button>
        <button onClick={onToggle} className="edit-btn flex-shrink-0" title={open ? 'Collapse' : 'Expand'}>
          <ChevronIcon open={open} />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold" style={{ color: '#1a0606' }}>
            {formatVal(f.type, f.current)} of {formatVal(f.type, f.target)}
          </span>
          <span className="text-xs font-bold" style={{ color: BRAND }}>{pctOf(f)}%</span>
        </div>
        <ProgressBar f={f} height={8} />
      </div>

      {open && (
        <>
          <div className="mt-4">
            <ProgressUpdate f={f} onSave={onProgress} />
          </div>

          {/* Notes */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #ede6e1' }}>
            <NotesThread notes={notes} onAdd={onAddNote} onDelete={onDeleteNote} />
          </div>
        </>
      )}
    </div>
  )
}

/* ── Compact row (priority 2+) ── */
function RowCard({ f, n, notes, expanded, dragging, onGrip, onToggle, onEdit, onProgress, onAddNote, onDeleteNote }) {
  return (
    <div className="rounded-xl" style={{ backgroundColor: dragging ? '#f3ece6' : '#faf7f5', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2.5 px-3 py-3">
        <button
          onPointerDown={onGrip}
          className="flex-shrink-0 cursor-grab"
          style={{ color: '#c4b5af', touchAction: 'none' }}
          title="Drag to reorder"
        >
          <GripIcon />
        </button>
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
          style={{ width: 22, height: 22, backgroundColor: '#ede6e1', color: '#6b6b6b', fontSize: '11px' }}
        >
          {n}
        </div>
        <TypeTag type={f.type} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#1a0606' }}>{f.title || 'Untitled focus'}</p>
          <p className="text-[11px] truncate" style={{ color: '#b8a898' }}>
            {formatVal(f.type, f.current)} of {formatVal(f.type, f.target)}
          </p>
        </div>
        <div className="hidden sm:block flex-shrink-0" style={{ width: 64 }}>
          <ProgressBar f={f} height={5} />
        </div>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: BRAND, minWidth: 34, textAlign: 'right' }}>{pctOf(f)}%</span>
        <button onClick={onEdit} className="edit-btn flex-shrink-0"><EditIcon /></button>
        <button onClick={onToggle} className="edit-btn flex-shrink-0" title={expanded ? 'Collapse' : 'Expand'}>
          <ChevronIcon open={expanded} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-4" style={{ borderTop: '1px solid #ede6e1', paddingTop: 14 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusChip f={f} />
            {fmtRange(f.begin_date, f.completion_date) && (
              <span className="text-xs" style={{ color: '#b8a898' }}>{fmtRange(f.begin_date, f.completion_date)}</span>
            )}
            {f.lever && <span className="text-xs" style={{ color: '#8a8a8a' }}>Lever: {f.lever}</span>}
          </div>
          <ProgressUpdate f={f} onSave={onProgress} />
          <NotesThread notes={notes} onAdd={onAddNote} onDelete={onDeleteNote} />
        </div>
      )}
    </div>
  )
}

/* ── Life focus row ── */
function LifeRow({ item, onToggleDone, onEdit }) {
  const done = !!item.done
  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        onClick={onToggleDone}
        className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 22, height: 22,
          border: `1.5px solid ${done ? BRAND : '#d8cfc6'}`,
          backgroundColor: done ? BRAND : 'transparent',
          color: '#f5ece0',
        }}
        title={done ? 'Mark not done' : 'Mark done'}
      >
        {done && <CheckIcon />}
      </button>
      {(item.areas || []).map(a => (
        <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: AREA_TAG.bg, color: AREA_TAG.text }}>{a}</span>
      ))}
      <span className={`flex-1 text-sm ${done ? 'line-through' : ''}`} style={{ color: done ? '#b8a898' : '#1a0606' }}>
        {item.notes}
      </span>
      <button onClick={onEdit} className="edit-btn flex-shrink-0"><EditIcon /></button>
    </div>
  )
}

/* ── Life focus form (add + edit, in place) ── */
function LifeForm({ initial, onSave, onCancel, onDelete }) {
  const [areas, setAreas] = useState(initial?.areas || [])
  const [text, setText] = useState(initial?.notes || '')
  const toggle = (a) => setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  const save = () => {
    if (!text.trim()) return
    onSave({ areas, notes: text.trim().slice(0, LIFE_MAX) })
  }
  return (
    <div className="form-card space-y-4">
      <div>
        <label className="label">Area of focus</label>
        <div className="flex flex-wrap gap-2">
          {AREA_OPTIONS.map(a => {
            const on = areas.includes(a)
            return (
              <button key={a} onClick={() => toggle(a)} className="tag-btn"
                style={on
                  ? { backgroundColor: AREA_TAG.bg, color: AREA_TAG.text, borderColor: AREA_TAG.bg }
                  : { backgroundColor: '#faf7f3', color: '#b8a898', borderColor: '#e8e0d8' }}>
                {a}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="label">What are you focusing on?</label>
        <input className="input-field" value={text} maxLength={LIFE_MAX}
          onChange={e => setText(e.target.value)} placeholder="e.g. Work out 3-4x and a walk every day" autoFocus />
      </div>
      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button onClick={onDelete} className="text-xs font-semibold px-3 py-2 rounded" style={{ color: '#9c3034' }}>Delete</button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-brand-outline">Cancel</button>
          <button onClick={save} className="btn-brand" disabled={!text.trim()}>Save</button>
        </div>
      </div>
    </div>
  )
}

/* ── Main section ── */
export default function YourFocus({ userId }) {
  const [biz, setBiz] = useState([])
  const [notesByFocus, setNotesByFocus] = useState({})
  const [life, setLife] = useState([])
  const [loaded, setLoaded] = useState(false)

  const [expandedId, setExpandedId] = useState(null)
  const [heroOpen, setHeroOpen] = useState(true)
  const [editingBizId, setEditingBizId] = useState(null)
  const [addingBiz, setAddingBiz] = useState(false)

  const [editingLifeId, setEditingLifeId] = useState(null)
  const [addingLife, setAddingLife] = useState(false)

  const [dragId, setDragId] = useState(null)
  const dragIdRef = useRef(null)
  const rowRefs = useRef({})
  const bizRef = useRef([])
  bizRef.current = biz

  const now = new Date()
  const headerLabel = `${format(now, 'MMMM yyyy')} · ${getCurrentQuarter()}`

  /* ── Load ── */
  useEffect(() => {
    if (!userId) return
    let active = true
    const load = async () => {
      const [{ data: bizRows }, { data: lifeRows }] = await Promise.all([
        supabase.from('business_focus').select('*').eq('user_id', userId),
        supabase.from('life_focus').select('*').eq('user_id', userId).order('created_at'),
      ])
      if (!active) return
      setBiz(sortBiz((bizRows || []).map(normalizeBiz)))
      setLife(lifeRows || [])

      // Notes table may not exist yet; fail soft.
      try {
        const { data: noteRows, error } = await supabase
          .from('business_focus_notes').select('*').eq('user_id', userId).order('created_at')
        if (!error && noteRows) {
          const grouped = {}
          noteRows.forEach(n => { (grouped[n.focus_id] ||= []).push(n) })
          if (active) setNotesByFocus(grouped)
        }
      } catch { /* notes unavailable */ }

      setLoaded(true)
    }
    load()
    return () => { active = false }
  }, [userId])

  /* ── Business focus persistence ── */
  const writeBizData = async (id, patch) => {
    const item = bizRef.current.find(b => b.id === id)
    if (!item) return
    const nextRaw = { ...item.raw, ...patch }
    setBiz(prev => prev.map(b => b.id === id ? normalizeBiz({ id, focus_type: patch.type || item.type, data: nextRaw, created_at: item.created_at }) : b))
    await supabase.from('business_focus').update({ focus_type: patch.type || item.type, data: nextRaw }).eq('id', id)
  }

  const saveBizForm = async (vals) => {
    if (editingBizId) {
      await writeBizData(editingBizId, vals)
      setEditingBizId(null)
    } else {
      const priority = biz.length
      const data = { ...vals, priority }
      const { data: row } = await supabase.from('business_focus')
        .insert({ user_id: userId, focus_type: vals.type, data }).select().single()
      if (row) setBiz(prev => sortBiz([...prev, normalizeBiz(row)]))
      setAddingBiz(false)
    }
  }

  const deleteBiz = async (id) => {
    if (!window.confirm('Delete this focus? This cannot be undone.')) return
    await supabase.from('business_focus').delete().eq('id', id)
    setBiz(prev => prev.filter(b => b.id !== id))
    setNotesByFocus(prev => { const n = { ...prev }; delete n[id]; return n })
    setEditingBizId(null)
  }

  /* ── Notes persistence ── */
  const addNote = async (focusId, body) => {
    const { data: row, error } = await supabase.from('business_focus_notes')
      .insert({ user_id: userId, focus_id: focusId, body }).select().single()
    if (error || !row) { console.error('Failed to add note:', error); return }
    setNotesByFocus(prev => ({ ...prev, [focusId]: [...(prev[focusId] || []), row] }))
  }
  const deleteNote = async (focusId, noteId) => {
    await supabase.from('business_focus_notes').delete().eq('id', noteId)
    setNotesByFocus(prev => ({ ...prev, [focusId]: (prev[focusId] || []).filter(n => n.id !== noteId) }))
  }

  /* ── Drag (pointer based via window listeners; works on mouse and touch) ── */
  // window listeners + refs keep the drag alive even when the dragged item
  // changes layout (hero to row) mid drag.
  const onGripMove = useCallback((e) => {
    if (dragIdRef.current == null) return
    e.preventDefault()
    const order = bizRef.current
    const y = e.clientY
    let target = order.length - 1
    for (let i = 0; i < order.length; i++) {
      const node = rowRefs.current[order[i].id]
      if (!node) continue
      const r = node.getBoundingClientRect()
      if (y < r.top + r.height / 2) { target = i; break }
    }
    const from = order.findIndex(o => o.id === dragIdRef.current)
    if (from === -1 || from === target) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(target, 0, moved)
    setBiz(next)
  }, [])

  const onGripUp = useCallback(() => {
    if (dragIdRef.current == null) return
    window.removeEventListener('pointermove', onGripMove)
    window.removeEventListener('pointerup', onGripUp)
    const ordered = bizRef.current.map((f, i) => ({ ...f, priority: i, raw: { ...f.raw, priority: i } }))
    dragIdRef.current = null
    setDragId(null)
    setBiz(ordered)
    Promise.all(ordered.map(f =>
      supabase.from('business_focus').update({ data: f.raw }).eq('id', f.id)
    )).catch(err => console.error('Failed to persist order:', err))
  }, [onGripMove])

  const onGrip = useCallback((e, id) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    dragIdRef.current = id
    setDragId(id)
    window.addEventListener('pointermove', onGripMove, { passive: false })
    window.addEventListener('pointerup', onGripUp)
  }, [onGripMove, onGripUp])

  useEffect(() => () => {
    window.removeEventListener('pointermove', onGripMove)
    window.removeEventListener('pointerup', onGripUp)
  }, [onGripMove, onGripUp])

  /* ── Life focus persistence ── */
  const saveLifeForm = async (vals) => {
    if (editingLifeId) {
      const { data: row } = await supabase.from('life_focus')
        .update({ areas: vals.areas, notes: vals.notes }).eq('id', editingLifeId).select().single()
      if (row) setLife(prev => prev.map(l => l.id === editingLifeId ? row : l))
      setEditingLifeId(null)
    } else {
      const payload = {
        user_id: userId,
        areas: vals.areas,
        notes: vals.notes,
        month: MONTH_NAMES[now.getMonth()],
        year: String(now.getFullYear()),
        quarter: getCurrentQuarter(),
        done: false,
      }
      const { data: row } = await supabase.from('life_focus').insert(payload).select().single()
      if (row) setLife(prev => [...prev, row])
      setAddingLife(false)
    }
  }
  const toggleLifeDone = async (id) => {
    const item = life.find(l => l.id === id)
    if (!item) return
    const next = !item.done
    setLife(prev => prev.map(l => l.id === id ? { ...l, done: next } : l))
    await supabase.from('life_focus').update({ done: next }).eq('id', id)
  }
  const deleteLife = async (id) => {
    if (!window.confirm('Delete this life focus? This cannot be undone.')) return
    await supabase.from('life_focus').delete().eq('id', id)
    setLife(prev => prev.filter(l => l.id !== id))
    setEditingLifeId(null)
  }

  if (!loaded) return null

  const dragging = dragId != null

  return (
    <div className="card-section">
      {/* Section header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="section-title">Your Focus</h2>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>{headerLabel}</p>
        </div>
      </div>

      {/* Business focuses */}
      <div className="space-y-2.5">
        {biz.map((f, idx) => {
          const setRef = (el) => { if (el) rowRefs.current[f.id] = el; else delete rowRefs.current[f.id] }
          if (editingBizId === f.id) {
            return (
              <div key={f.id} ref={setRef}>
                <BizForm
                  initial={f}
                  onSave={saveBizForm}
                  onCancel={() => setEditingBizId(null)}
                  onDelete={() => deleteBiz(f.id)}
                />
              </div>
            )
          }
          const notes = notesByFocus[f.id] || []
          const isHero = idx === 0 && !dragging
          return (
            <div key={f.id} ref={setRef}>
              {isHero ? (
                <HeroCard
                  f={f}
                  notes={notes}
                  open={heroOpen}
                  onToggle={() => setHeroOpen(o => !o)}
                  onGrip={(e) => onGrip(e, f.id)}
                  onEdit={() => { setEditingBizId(f.id); setAddingBiz(false) }}
                  onProgress={(n) => writeBizData(f.id, { current: n })}
                  onAddNote={(b) => addNote(f.id, b)}
                  onDeleteNote={(nid) => deleteNote(f.id, nid)}
                />
              ) : (
                <RowCard
                  f={f}
                  n={idx + 1}
                  notes={notes}
                  expanded={expandedId === f.id && !dragging}
                  dragging={dragId === f.id}
                  onGrip={(e) => onGrip(e, f.id)}
                  onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                  onEdit={() => { setEditingBizId(f.id); setAddingBiz(false) }}
                  onProgress={(n) => writeBizData(f.id, { current: n })}
                  onAddNote={(b) => addNote(f.id, b)}
                  onDeleteNote={(nid) => deleteNote(f.id, nid)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Add business focus */}
      <div className="mt-3">
        {addingBiz ? (
          <BizForm onSave={saveBizForm} onCancel={() => setAddingBiz(false)} />
        ) : (
          <button
            onClick={() => { setAddingBiz(true); setEditingBizId(null) }}
            className="w-full text-xs font-semibold flex items-center justify-center gap-1 py-2.5 rounded-lg transition-colors"
            style={{ color: BRAND, border: '1px dashed #e8e0d8' }}
          >
            + Add business focus
          </button>
        )}
        {biz.length === 0 && !addingBiz && (
          <p className="text-sm italic mt-3" style={{ color: '#b8a898' }}>No business focuses yet.</p>
        )}
      </div>

      {/* Life focuses */}
      <div className="mt-6 pt-5" style={{ borderTop: '1px solid #ede6e1' }}>
        <h3 className="section-title" style={{ fontSize: 15 }}>Life Focus</h3>
        <p className="section-subtitle">Current personal priorities and areas of attention.</p>

        <div className="divide-y" style={{ borderColor: '#f0ebe8' }}>
          {life.map(item => (
            editingLifeId === item.id ? (
              <div key={item.id} className="py-2.5">
                <LifeForm
                  initial={item}
                  onSave={saveLifeForm}
                  onCancel={() => setEditingLifeId(null)}
                  onDelete={() => deleteLife(item.id)}
                />
              </div>
            ) : (
              <LifeRow
                key={item.id}
                item={item}
                onToggleDone={() => toggleLifeDone(item.id)}
                onEdit={() => { setEditingLifeId(item.id); setAddingLife(false) }}
              />
            )
          ))}
        </div>

        <div className="mt-3">
          {addingLife ? (
            <LifeForm onSave={saveLifeForm} onCancel={() => setAddingLife(false)} />
          ) : (
            <button
              onClick={() => { setAddingLife(true); setEditingLifeId(null) }}
              className="w-full text-xs font-semibold flex items-center justify-center gap-1 py-2.5 rounded-lg transition-colors"
              style={{ color: BRAND, border: '1px dashed #e8e0d8' }}
            >
              + Add life focus
            </button>
          )}
          {life.length === 0 && !addingLife && (
            <p className="text-sm italic mt-3" style={{ color: '#b8a898' }}>No life focuses yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
