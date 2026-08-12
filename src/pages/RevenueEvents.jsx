import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getQuarterFromMonth } from '../lib/utils'

const BRAND = '#3d0c0c'

// New event types (current form options). Legacy values saved by members are
// preserved and shown alongside these wherever they appear.
const EVENT_TYPES = [
  'Lead generation activity',
  'Workshop or event',
  'Offer launch',
  'Promotion',
  'Evergreen campaign',
  'Partnership',
  'New offer development',
  'Other',
]

const PRIMARY_GOALS = [
  'Grow audience',
  'Generate leads',
  'Build waitlist',
  'Launch new offer',
  'Sell existing offer',
  'Fill a program',
  'Increase recurring revenue',
  'Retain or renew clients',
]

const CURRENCIES = ['AUD', 'NZD', 'USD', 'EUR', 'CAD', 'JPY', 'SEK', 'PLN']

// Visible statuses for new events. Legacy statuses keep displaying as stored.
const VISIBLE_STATUSES = ['Planned', 'Live', 'Complete', 'Cancelled']
const CLOSED_STATUSES = ['Closed', 'Complete', 'Cancelled']

const STATUS_CONFIG = {
  // Current set
  'Planned':   { color: '#6D3FC0', bg: '#F1EAFE', border: '#D8C5F5' },
  'Live':      { color: '#267447', bg: '#E7F5EC', border: '#B8DDC6' },
  'Complete':  { color: '#346A9A', bg: '#E8F1FA', border: '#BCD3E8' },
  'Cancelled': { color: '#A83232', bg: '#FBE8E8', border: '#EDBABA' },
  // Legacy set (existing member data keeps displaying unchanged)
  'Planning':  { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  'Warming':   { color: '#A86600', bg: '#FFF4D6', border: '#F4D38A' },
  'Closed':    { color: '#9c3034', bg: '#FEE2E2', border: '#F5C6C6' },
  'Evergreen': { color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const UNSCHEDULED = 'Unscheduled'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const currentQuarter = getQuarterFromMonth(currentMonth)
const todayStr = new Date().toISOString().split('T')[0]
const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches

// Include a stored legacy value in a dropdown list so editing never destroys it.
function withStored(list, value) {
  return value && !list.includes(value) ? [value, ...list] : list
}

/**
 * Derive year and quarter from a start_date string ('YYYY-MM-DD').
 * No usable date: keep the fallback year and leave quarter unset (Unscheduled).
 */
function deriveYearQuarter(startDate, fallbackYear = currentYear) {
  if (!startDate) return { year: fallbackYear, quarter: null }
  // Use 'T00:00:00' to avoid timezone-shifting the date to the previous day
  const d = new Date(startDate + 'T00:00:00')
  if (isNaN(d.getTime())) return { year: fallbackYear, quarter: null }
  return { year: d.getFullYear(), quarter: getQuarterFromMonth(d.getMonth() + 1) }
}

function isClosedEvent(e) {
  return e.is_closed || CLOSED_STATUSES.includes(e.status)
}

function fmtShortDate(d) {
  if (!d) return null
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return null
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function dateRangeLabel(e) {
  const s = fmtShortDate(e.start_date)
  const en = fmtShortDate(e.end_date)
  if (s && en && s !== en) return `${s} – ${en}`
  if (s) return s
  return null
}

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Planned']
  return (
    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap border flex-shrink-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {status || 'Planned'}
    </span>
  )
}

// ─── THREE-DOT MENU ────────────────────────────────────────────────────────────

function DotMenu({ event, onEdit, onMarkComplete, onReopen, onConvert, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef(null)

  const close = () => { setOpen(false); setConfirming(false) }

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close() }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const closed = isClosedEvent(event)
  const item = (label, fn, danger = false) => (
    <button
      key={label}
      onClick={(e) => { e.stopPropagation(); close(); fn() }}
      className="block w-full text-left text-xs px-3 py-2 rounded transition-colors hover:bg-gray-50"
      style={{ color: danger ? '#9c3034' : '#4b5563' }}
    >
      {label}
    </button>
  )

  return (
    <span ref={ref} className="relative inline-block flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); if (open) { close() } else { setOpen(true) } }}
        className="edit-btn"
        title="Event actions"
        aria-label="Event actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 right-0 mt-1" role="menu"
          style={{ backgroundColor: '#fff', border: '0.5px solid #e8e0d8', borderRadius: 6, padding: 4, minWidth: 200 }}>
          {confirming ? (
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-800 mb-2">Delete this event?</p>
              <p className="text-xs text-gray-400 mb-2.5">This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); close() }}
                  className="flex-1 text-xs py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); close(); onDelete() }}
                  className="flex-1 text-xs font-semibold py-1.5 rounded text-white"
                  style={{ backgroundColor: '#9c3034' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              {item('Edit event', onEdit)}
              {closed ? item('Reopen event', onReopen) : item('Mark complete', onMarkComplete)}
              {item('Convert to Launch Campaign', onConvert)}
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                className="block w-full text-left text-xs px-3 py-2 rounded transition-colors hover:bg-gray-50"
                style={{ color: '#9c3034' }}
              >
                Delete event
              </button>
            </>
          )}
        </div>
      )}
    </span>
  )
}

// ─── EVENT FORM (add + edit in place) ──────────────────────────────────────────

function EventForm({ onSave, onCancel, onConvert, initial, selectedYear }) {
  const blank = {
    offer_name: '', event_type: '', status: 'Planned',
    start_date: '', end_date: '', currency: 'AUD',
    revenue_goal: '', primary_focus: '', revenue_achieved: '', notes: '',
  }
  const [form, setForm] = useState(initial
    ? { ...blank, ...initial, revenue_goal: initial.revenue_goal ?? '', revenue_achieved: initial.revenue_achieved ?? '', event_type: initial.event_type ?? '', primary_focus: initial.primary_focus ?? '', notes: initial.notes ?? '', start_date: initial.start_date ?? '', end_date: initial.end_date ?? '' }
    : blank
  )

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const derived = deriveYearQuarter(form.start_date, selectedYear)

  const typeOptions = withStored(EVENT_TYPES, initial?.event_type)
  const goalOptions = withStored(PRIMARY_GOALS, initial?.primary_focus)
  const statusOptions = withStored(VISIBLE_STATUSES, initial?.status)

  const save = () => {
    if (!form.offer_name.trim()) { alert('Please enter a name for this event.'); return }
    // Type is required for new events; editing a legacy event never forces it.
    if (!initial && !form.event_type) { alert('Please choose an event type.'); return }
    onSave(form)
  }

  return (
    <div className="form-card space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-bold text-sm text-gray-900">
          {initial ? 'Edit Revenue Event' : 'Add Revenue Event'}
        </p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="re-name">Revenue Event Name</label>
          <input
            id="re-name"
            className="input-field"
            value={form.offer_name}
            onChange={e => set('offer_name', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="re-type">Revenue Event Type</label>
          <select id="re-type" className="input-field" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
            <option value="">Select...</option>
            {typeOptions.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="re-status">Status</label>
          <select id="re-status" className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <p className="label" style={{ marginBottom: 6 }}>Planned Dates</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="re-start">Start Date</label>
              <input id="re-start" className="input-field" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              {form.start_date && derived.quarter && (
                <p className="text-xs text-gray-400 mt-1">Saved as {derived.year} / {derived.quarter}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="re-end">End Date (optional)</label>
              <input id="re-end" className="input-field" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="re-goal">Primary Goal</label>
          <select id="re-goal" className="input-field" value={form.primary_focus} onChange={e => set('primary_focus', e.target.value)}>
            <option value="">Select...</option>
            {goalOptions.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="re-currency">Currency</label>
          <select id="re-currency" className="input-field" value={form.currency || 'AUD'} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="re-revgoal">Revenue Goal (optional)</label>
          <input
            id="re-revgoal"
            className="input-field"
            type="number"
            value={form.revenue_goal}
            onChange={e => set('revenue_goal', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="re-achieved">Revenue Achieved (optional)</label>
          <input
            id="re-achieved"
            className="input-field"
            type="number"
            value={form.revenue_achieved}
            onChange={e => set('revenue_achieved', e.target.value)}
            placeholder="Log final revenue once the event completes"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="re-notes">Revenue Event Notes (optional)</label>
          <textarea id="re-notes" className="textarea-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {initial && onConvert ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">Is this becoming a structured sales campaign?</p>
            <button onClick={onConvert} className="text-xs font-semibold" style={{ color: BRAND }}>
              Convert to Launch Campaign →
            </button>
          </div>
        ) : <span />}
        <div className="flex gap-3">
          <button onClick={onCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} className="btn-brand">
            Save Event
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── COMPACT EVENT ROW ─────────────────────────────────────────────────────────

function EventRow({ event, onOpen, onEdit, onMarkComplete, onReopen, onConvert, onDelete }) {
  const meta = [
    event.event_type || 'Type not set',
    dateRangeLabel(event) || 'Date not set',
    event.primary_focus || 'Goal not set',
  ].join(' · ')

  return (
    <div className="rounded-xl px-3.5 py-2.5" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
      <div className="flex items-center gap-2.5">
        <button onClick={onOpen} className="flex-1 min-w-0 text-left py-0.5">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{event.offer_name || 'Untitled event'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{meta}</p>
          {event.notes && (
            <p className="text-xs text-gray-400 italic truncate mt-0.5">{event.notes}</p>
          )}
        </button>
        <StatusBadge status={event.status} />
        <DotMenu
          event={event}
          onEdit={onEdit}
          onMarkComplete={onMarkComplete}
          onReopen={onReopen}
          onConvert={onConvert}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function RevenueEvents() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [quarterFilter, setQuarterFilter] = useState('all')     // 'all' | 'Q1'..'Q4'
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded, setExpanded] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const addFormRef = useRef(null)

  // Scroll the add form into view when it opens at the top.
  useEffect(() => {
    if (showForm && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm])

  // ── Load all events for this user (client-side year/quarter filtering) ────────
  const loadEvents = async () => {
    if (!user) return
    setLoading(true)
    setLoadError(null)

    const { data, error } = await supabase
      .from('revenue_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true })
      .limit(200)

    if (error) {
      console.error('revenue_events load failed:', error)
      setLoadError('Failed to load events. Please refresh.')
    }

    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadEvents()
  }, [user])

  // ── Dynamic year list from actual event years + always include currentYear ────
  const yearOptions = useMemo(() => {
    const fromEvents = events.map(e => e.year).filter(Boolean)
    const all = [...new Set([...fromEvents, currentYear])]
    return all.sort((a, b) => b - a) // descending
  }, [events])

  // Keep selectedYear valid as yearOptions changes
  useEffect(() => {
    if (yearOptions.length > 0 && !yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0])
    }
  }, [yearOptions])

  // ── Grouping ──────────────────────────────────────────────────────────────────

  // Year events; events with no year are never hidden (they join Unscheduled).
  const yearEvents = useMemo(
    () => events.filter(e => e.year === selectedYear || e.year == null),
    [events, selectedYear]
  )

  const typeOptionsForFilter = useMemo(() => {
    const present = [...new Set(events.map(e => e.event_type).filter(Boolean))]
    const extras = present.filter(t => !EVENT_TYPES.includes(t)).sort()
    return [...EVENT_TYPES, ...extras]
  }, [events])

  const matchesType = (e) => typeFilter === 'all' || e.event_type === typeFilter

  const groups = useMemo(() => {
    const g = { Q1: [], Q2: [], Q3: [], Q4: [], [UNSCHEDULED]: [] }
    yearEvents.filter(matchesType).forEach(e => {
      if (e.year != null && QUARTERS.includes(e.quarter)) g[e.quarter].push(e)
      else g[UNSCHEDULED].push(e)
    })
    return g
  }, [yearEvents, typeFilter])

  // Default expansion: current quarter open; others open on desktop when small.
  useEffect(() => {
    if (loading) return
    const next = {}
    QUARTERS.forEach(q => {
      const count = yearEvents.filter(e => e.quarter === q && e.year != null).length
      const isCurrent = q === currentQuarter && selectedYear === currentYear
      next[q] = isCurrent || (isDesktop && count > 0 && count <= 3)
    })
    const unsCount = yearEvents.filter(e => e.year == null || !QUARTERS.includes(e.quarter)).length
    next[UNSCHEDULED] = isDesktop && unsCount > 0
    setExpanded(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, loading])

  const toggleQuarter = (q) => setExpanded(prev => ({ ...prev, [q]: !prev[q] }))

  // ── Snapshot metrics (reflect the active filters) ─────────────────────────────

  const visibleEvents = useMemo(() => {
    let list = yearEvents.filter(matchesType)
    if (quarterFilter !== 'all') list = list.filter(e => e.quarter === quarterFilter && e.year != null)
    return list
  }, [yearEvents, quarterFilter, typeFilter])

  const totalGoal = useMemo(
    () => visibleEvents.reduce((s, e) => s + (Number(e.revenue_goal) || 0), 0),
    [visibleEvents]
  )

  const totalAchieved = useMemo(
    () => visibleEvents
      .filter(isClosedEvent)
      .reduce((s, e) => s + (Number(e.revenue_achieved) || 0), 0),
    [visibleEvents]
  )

  const securedPct = totalGoal > 0 ? Math.min(100, Math.round((totalAchieved / totalGoal) * 100)) : 0
  const remaining = Math.max(0, totalGoal - totalAchieved)

  const activeCount = useMemo(
    () => visibleEvents.filter(e => !isClosedEvent(e)).length,
    [visibleEvents]
  )

  const nextEvent = useMemo(
    () => visibleEvents
      .filter(e => e.start_date && e.start_date >= todayStr && !isClosedEvent(e))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null,
    [visibleEvents]
  )

  // ── CRUD handlers ─────────────────────────────────────────────────────────────

  const handleSave = async (form) => {
    // Quarter and year are always derived from start_date — never manually stored
    const { year, quarter } = deriveYearQuarter(form.start_date, selectedYear)
    const editing = editingId ? events.find(e => e.id === editingId) : null

    const payload = {
      offer_name:       form.offer_name       || null,
      event_type:       form.event_type       || null,
      status:           form.status           || 'Planned',
      start_date:       form.start_date       || null,
      end_date:         form.end_date         || null,
      currency:         form.currency         || 'AUD',
      revenue_goal:     form.revenue_goal     !== '' ? Number(form.revenue_goal)     : null,
      primary_focus:    form.primary_focus    || null,
      revenue_achieved: form.revenue_achieved !== '' ? Number(form.revenue_achieved) : null,
      notes:            form.notes            || null,
      year,
      quarter,
      // Keep is_closed in sync with the status so both columns stay consistent
      is_closed: CLOSED_STATUSES.includes(form.status),
    }

    if (editing) {
      const { data, error } = await supabase
        .from('revenue_events')
        .update(payload)
        .eq('id', editing.id)
        .eq('user_id', user.id)   // safety guard: user can only edit own rows
        .select()
        .single()

      if (error || !data) {
        console.error('revenue_events update failed:', error)
        alert('Failed to save changes. Please try again.')
        return
      }
      setEvents(prev => prev.map(x => x.id === editing.id ? data : x))
    } else {
      const { data, error } = await supabase
        .from('revenue_events')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single()

      if (error || !data) {
        console.error('revenue_events insert failed:', error)
        alert('Failed to create event. Please try again.')
        return
      }
      setEvents(prev => [...prev, data])
    }

    setShowForm(false)
    setEditingId(null)
  }

  // Deletion is confirmed inline inside the event menu before this runs.
  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('revenue_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)   // safety guard

    if (error) {
      console.error('revenue_events delete failed:', error)
      alert('Failed to delete. Please try again.')
      return
    }
    setEvents(prev => prev.filter(x => x.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const setEventStatus = async (event, status) => {
    const { data, error } = await supabase
      .from('revenue_events')
      .update({ status, is_closed: CLOSED_STATUSES.includes(status) })
      .eq('id', event.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      console.error('revenue_events status update failed:', error)
      alert('Failed to update status. Please try again.')
      return
    }
    setEvents(prev => prev.map(x => x.id === event.id ? data : x))
  }

  // Conversion into Launch Campaigns is not built yet; this action connects the
  // member to the existing Launches page without changing the Launch system.
  const handleConvert = () => {
    navigate('/cash/launches')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const openAdd = () => { setEditingId(null); setShowForm(true) }
  const fmtNum = (n) => `$${Number(n || 0).toLocaleString()}`

  const groupsToRender = quarterFilter === 'all'
    ? [...QUARTERS, UNSCHEDULED]
    : [quarterFilter]

  const totalListed = groupsToRender.reduce((s, g) => s + (groups[g]?.length || 0), 0)
  const yearHasNoEvents = yearEvents.length === 0

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
            <h1 className="page-title">Revenue Events</h1>
          </div>
          <p className="text-sm text-gray-500">Map the activities that grow your audience, leads and revenue across the year.</p>
        </div>

        {/* Year selector — top right */}
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {yearOptions.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                selectedYear === y ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedYear === y ? { backgroundColor: BRAND } : {}}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ── Snapshot card ── */}
      <div className="p-5 text-white" style={{ borderRadius: '5px', backgroundColor: BRAND }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Total Revenue Goal', fmtNum(totalGoal)],
            ['Revenue Secured',    fmtNum(totalAchieved)],
            ['Active Events',      activeCount],
            ['Next Event',         nextEvent?.offer_name || '—'],
          ].map(([label, val]) => (
            <div key={label} className="text-center">
              <p className="truncate" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', fontWeight: 300, fontStyle: 'italic' }}>{val}</p>
              <p className="text-xs text-white/60 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {totalGoal > 0 && (
          <div className="mt-5">
            <div className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${securedPct}%`, backgroundColor: '#cdd5ae' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-white/60">{securedPct}% secured</span>
              <span className="text-xs text-white/60">{fmtNum(remaining)} to go</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Muted explanatory strip ── */}
      <p className="text-xs text-gray-400 text-center -mt-2">
        {quarterFilter === 'all'
          ? `All ${selectedYear} events grouped by quarter. Snapshot reflects the current filters.`
          : `${quarterFilter} ${selectedYear} events only. Snapshot reflects the current filters.`
        }
      </p>

      {/* ── Add form (opens at top, below the snapshot) ── */}
      {showForm && (
        <div ref={addFormRef}>
          <EventForm
            initial={null}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            selectedYear={selectedYear}
          />
        </div>
      )}

      {/* ── Main list card ── */}
      <div className="card">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {['all', ...QUARTERS].map(q => (
              <button
                key={q}
                onClick={() => setQuarterFilter(q)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  quarterFilter === q ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={quarterFilter === q ? { backgroundColor: BRAND } : {}}
              >
                {q === 'all' ? 'All' : q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="sr-only" htmlFor="re-type-filter">Event type filter</label>
            <select
              id="re-type-filter"
              className="input-field"
              style={{ width: 'auto', maxWidth: 220, paddingTop: 8, paddingBottom: 8 }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {typeOptionsForFilter.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {!showForm && (
              <button onClick={openAdd} className="btn-brand">
                + Add Revenue Event
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading events…</p>
        ) : loadError ? (
          <p className="text-sm text-red-500 py-6 text-center">{loadError}</p>
        ) : yearHasNoEvents ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-3 max-w-md mx-auto">
              No Revenue Events planned yet. Start mapping the activities that will grow your audience, leads and revenue this year.
            </p>
            <button onClick={openAdd} className="btn-brand">
              + Add Revenue Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groupsToRender.map(g => {
              const list = groups[g] || []
              // Unscheduled only renders when it has events
              if (g === UNSCHEDULED && list.length === 0) return null
              const isOpen = quarterFilter !== 'all' ? true : !!expanded[g]
              const label = g === UNSCHEDULED ? UNSCHEDULED : `${g} ${selectedYear}`

              return (
                <div key={g} className="rounded-xl" style={{ border: '0.5px solid #e8e0d8' }}>
                  <button
                    onClick={() => toggleQuarter(g)}
                    className={`w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left ${isOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {label}
                      <span className="text-gray-400 font-normal"> · {list.length} event{list.length !== 1 ? 's' : ''}</span>
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 space-y-2 rounded-b-xl" style={{ backgroundColor: '#fdfcfb' }}>
                      {list.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-gray-400 italic mb-2">
                            {typeFilter !== 'all'
                              ? `No matching events in ${g}.`
                              : `No Revenue Events planned for ${g} yet.`}
                          </p>
                          {typeFilter === 'all' && (
                            <button onClick={openAdd} className="text-xs font-semibold" style={{ color: BRAND }}>
                              + Add Revenue Event
                            </button>
                          )}
                        </div>
                      ) : (
                        list.map(event => (
                          editingId === event.id ? (
                            <EventForm
                              key={event.id}
                              initial={event}
                              onSave={handleSave}
                              onCancel={() => setEditingId(null)}
                              onConvert={handleConvert}
                              selectedYear={selectedYear}
                            />
                          ) : (
                            <EventRow
                              key={event.id}
                              event={event}
                              onOpen={() => { setEditingId(event.id); setShowForm(false) }}
                              onEdit={() => { setEditingId(event.id); setShowForm(false) }}
                              onMarkComplete={() => setEventStatus(event, 'Complete')}
                              onReopen={() => setEventStatus(event, 'Planned')}
                              onConvert={handleConvert}
                              onDelete={() => handleDelete(event.id)}
                            />
                          )
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {totalListed === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4">No events match the current filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
