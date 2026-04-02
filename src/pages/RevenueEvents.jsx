import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getQuarterFromMonth } from '../lib/utils'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#6B1010'
const ACTIVE_STATUSES = ['Planning', 'Warming', 'Live', 'Evergreen']

const EVENT_TYPES = [
  'Launch (live or evergreen push)',
  'Offer Relaunch / Reposition',
  'New Offer Creation',
  'Price Increase / Repackaging',
  'Sales Campaign (non-launch push)',
  'Lead Magnet Release',
  'Email Nurture Build or Overhaul',
  'Funnel Build / Optimisation',
  'Paid Ads Campaign Launch',
  'Audience Growth Sprint (visibility push tied to revenue)',
  'Collaboration / Partnership Campaign',
  'Webinar / Masterclass / Training Event',
  'Waitlist Build + Conversion Push',
  'Seasonal Campaign (EOFY, Black Friday, New Year etc)',
]
const CURRENCIES = ['AUD', 'NZD', 'USD', 'EUR', 'CAD', 'JPY', 'SEK', 'PLN']
const STATUS_CONFIG = {
  'Planning':  { color: '#6B7280', bg: '#F3F4F6' },
  'Warming':   { color: '#D97706', bg: '#FEF3C7' },
  'Live':      { color: '#059669', bg: '#D1FAE5' },
  'Closed':    { color: '#9c3034', bg: '#FEE2E2' },
  'Evergreen': { color: '#2563EB', bg: '#DBEAFE' },
}
const STATUSES = Object.keys(STATUS_CONFIG)
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const PRIMARY_FOCUS_OPTIONS = [
  'Grow Audience', 'Build Waitlist', 'Launch New Offer',
  'Re-launch Existing', 'Generate Leads', 'Fill Program', 'Increase MRR',
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const currentQuarter = getQuarterFromMonth(currentMonth)
const todayStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

/**
 * Derive year and quarter from a start_date string ('YYYY-MM-DD').
 * Falls back to fallbackYear + currentQuarter if no date provided.
 */
function deriveYearQuarter(startDate, fallbackYear = currentYear) {
  if (!startDate) return { year: fallbackYear, quarter: currentQuarter }
  // Use 'T00:00:00' to avoid timezone-shifting the date to the previous day
  const d = new Date(startDate + 'T00:00:00')
  return { year: d.getFullYear(), quarter: getQuarterFromMonth(d.getMonth() + 1) }
}

// ─── EVENT FORM ────────────────────────────────────────────────────────────────

function EventForm({ onSave, onCancel, initial, selectedYear }) {
  const blank = {
    offer_name: '', event_type: '', status: 'Planning',
    start_date: '', end_date: '', currency: 'AUD',
    revenue_goal: '', primary_focus: '', revenue_achieved: '', notes: '',
  }
  const [form, setForm] = useState(initial
    ? { ...blank, ...initial, revenue_goal: initial.revenue_goal ?? '', revenue_achieved: initial.revenue_achieved ?? '' }
    : blank
  )

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const derived = deriveYearQuarter(form.start_date, selectedYear)

  return (
    <div className="form-card space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-bold text-sm text-gray-900">
          {initial ? 'Edit Revenue Event' : 'Add Revenue Event'}
        </p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Offer Name</label>
          <input
            className="input-field"
            value={form.offer_name}
            onChange={e => set('offer_name', e.target.value)}
            placeholder="e.g. 12-Week Group Coaching"
          />
        </div>

        <div>
          <label className="label">Type</label>
          <select className="input-field" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
            <option value="">Select...</option>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Launch Start Date</label>
          <input className="input-field" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          {form.start_date && (
            <p className="text-xs text-gray-400 mt-1">→ Saved as {derived.year} / {derived.quarter}</p>
          )}
        </div>

        <div>
          <label className="label">Launch End Date</label>
          <input className="input-field" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>

        <div>
          <label className="label">Currency</label>
          <select className="input-field" value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Revenue Goal</label>
          <input
            className="input-field"
            type="number"
            value={form.revenue_goal}
            onChange={e => set('revenue_goal', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="col-span-2">
          <label className="label">Primary Focus</label>
          <select className="input-field" value={form.primary_focus} onChange={e => set('primary_focus', e.target.value)}>
            <option value="">Select...</option>
            {PRIMARY_FOCUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Revenue Achieved at Close</label>
          <input
            className="input-field"
            type="number"
            value={form.revenue_achieved}
            onChange={e => set('revenue_achieved', e.target.value)}
            placeholder="Enter final revenue once the event is completed"
          />
          <p className="text-xs text-gray-400 mt-1">Update this after the event closes.</p>
        </div>

        <div className="col-span-2">
          <label className="label">Short Notes (optional)</label>
          <textarea className="textarea-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="btn-brand">
          Save Event
        </button>
      </div>
    </div>
  )
}

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Planning']
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: cfg.border || 'none' }}>
      {status}
    </span>
  )
}

// ─── EVENT CARD ────────────────────────────────────────────────────────────────

function EventCard({ event, onEdit, onDelete, onToggleClose }) {
  const fmt = (d) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const isClosed = event.status === 'Closed' || event.is_closed

  // Build compact date range string without emojis
  const dateRange = (event.start_date || event.end_date)
    ? `${fmt(event.start_date)} – ${fmt(event.end_date)}`
    : null

  // Dot-separated meta line: type · dates · focus
  const metaParts = [event.event_type, dateRange, event.primary_focus].filter(Boolean)

  return (
    <div className={`card group ${isClosed ? 'opacity-90' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <p className="font-bold text-gray-900">{event.offer_name || 'Untitled Event'}</p>
            <StatusBadge status={event.status} />
            {isClosed && event.revenue_achieved && (
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#059669' }}>
                COMPLETED
              </span>
            )}
          </div>

          {/* Dot-separated meta line */}
          {metaParts.length > 0 && (
            <p className="text-xs text-gray-400 mb-2">{metaParts.join(' · ')}</p>
          )}

          {/* Revenue lines */}
          <div className="space-y-0.5">
            {event.revenue_goal ? (
              <p className="text-xs text-gray-500">Goal: {event.currency || 'AUD'} ${Number(event.revenue_goal).toLocaleString()}</p>
            ) : null}
            {event.revenue_achieved ? (
              <p className="text-xs font-semibold" style={{ color: '#059669' }}>
                Achieved: {event.currency || 'AUD'} ${Number(event.revenue_achieved).toLocaleString()} ✓
              </p>
            ) : null}
          </div>

          {event.notes && <p className="text-xs text-gray-400 italic mt-1.5">{event.notes}</p>}

          {isClosed && !event.revenue_achieved && (
            <p className="text-xs text-amber-600 mt-1.5">Don't forget to log your final revenue.</p>
          )}
        </div>

        {/* Action icons — visible on hover */}
        <div className="flex flex-col gap-1 transition-opacity">
          <button onClick={onEdit} className="edit-btn"><EditIcon /></button>
          <button onClick={onDelete} className="delete-btn"><DeleteIcon /></button>
        </div>
      </div>

      {/* Bottom action */}
      <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={onToggleClose}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={isClosed
            ? { border: '1px solid rgba(0,0,0,0.1)', color: '#6b7280', backgroundColor: 'transparent' }
            : { backgroundColor: '#FEE2E2', color: '#DC2626' }
          }
        >
          {isClosed ? 'Reopen Event' : 'Mark as Closed'}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function RevenueEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [viewMode, setViewMode] = useState('year')          // 'year' | 'quarter'
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter)
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

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

  // ── CRUD handlers ─────────────────────────────────────────────────────────────

  const handleSave = async (form) => {
    // Quarter and year are always derived from start_date — never manually stored
    const { year, quarter } = deriveYearQuarter(form.start_date, selectedYear)

    const payload = {
      offer_name:       form.offer_name       || null,
      event_type:       form.event_type       || null,
      status:           form.status           || 'Planning',
      start_date:       form.start_date       || null,
      end_date:         form.end_date         || null,
      currency:         form.currency         || 'AUD',
      revenue_goal:     form.revenue_goal     !== '' ? Number(form.revenue_goal)     : null,
      primary_focus:    form.primary_focus    || null,
      revenue_achieved: form.revenue_achieved !== '' ? Number(form.revenue_achieved) : null,
      notes:            form.notes            || null,
      year,
      quarter,
      // Keep is_closed in sync with status so both columns stay consistent
      is_closed: form.status === 'Closed',
    }

    if (editEvent) {
      const { data, error } = await supabase
        .from('revenue_events')
        .update(payload)
        .eq('id', editEvent.id)
        .eq('user_id', user.id)   // safety guard: user can only edit own rows
        .select()
        .single()

      if (error || !data) {
        console.error('revenue_events update failed:', error)
        alert('Failed to save changes. Please try again.')
        return
      }
      setEvents(prev => prev.map(x => x.id === editEvent.id ? data : x))
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
    setEditEvent(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return

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
  }

  const handleToggleClose = async (event) => {
    // Determine new closed state: treat either flag as authoritative
    const alreadyClosed = event.status === 'Closed' || event.is_closed
    const nowClosed = !alreadyClosed

    const { data, error } = await supabase
      .from('revenue_events')
      .update({ is_closed: nowClosed, status: nowClosed ? 'Closed' : 'Planning' })
      .eq('id', event.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      console.error('revenue_events toggle failed:', error)
      alert('Failed to update status. Please try again.')
      return
    }
    setEvents(prev => prev.map(x => x.id === event.id ? data : x))
  }

  // ── Derived / memoized values ─────────────────────────────────────────────────

  const yearEvents = useMemo(
    () => events.filter(e => e.year === selectedYear),
    [events, selectedYear]
  )

  const quarterEvents = useMemo(
    () => yearEvents.filter(e => e.quarter === selectedQuarter),
    [yearEvents, selectedQuarter]
  )

  // Snapshot metrics apply to the currently active view
  const visibleEvents = viewMode === 'quarter' ? quarterEvents : yearEvents

  const totalGoal = useMemo(
    () => visibleEvents.reduce((s, e) => s + (Number(e.revenue_goal) || 0), 0),
    [visibleEvents]
  )

  const totalAchieved = useMemo(
    () => visibleEvents
      .filter(e => e.status === 'Closed' || e.is_closed)
      .reduce((s, e) => s + (Number(e.revenue_achieved) || 0), 0),
    [visibleEvents]
  )

  // Active = Planning | Warming | Live | Evergreen (not closed)
  const activeCount = useMemo(
    () => visibleEvents.filter(e => ACTIVE_STATUSES.includes(e.status) && !e.is_closed).length,
    [visibleEvents]
  )

  // Next Launch = earliest upcoming active event (start_date >= today)
  const nextLaunch = useMemo(
    () => visibleEvents
      .filter(e => e.start_date && e.start_date >= todayStr && ACTIVE_STATUSES.includes(e.status) && !e.is_closed)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null,
    [visibleEvents]
  )

  const groupedByQuarter = useMemo(
    () => QUARTERS.reduce((acc, q) => {
      acc[q] = yearEvents.filter(e => e.quarter === q)
      return acc
    }, {}),
    [yearEvents]
  )

  // Year view: show a quarter if it has events OR it's the current Q in the current year
  const quartersToShow = useMemo(
    () => QUARTERS.filter(q =>
      groupedByQuarter[q]?.length > 0 ||
      (q === currentQuarter && selectedYear === currentYear)
    ),
    [groupedByQuarter, selectedYear]
  )

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const openAdd = () => { setEditEvent(null); setShowForm(true) }
  const openEdit = (event) => { setEditEvent(event); setShowForm(true) }
  const fmtNum = (n) => `$${Number(n || 0).toLocaleString()}`

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
            <h1 className="text-2xl font-black text-gray-900">Revenue Events</h1>
          </div>
          <p className="text-sm text-gray-500">Plan and track your revenue-driving launches in one clear snapshot.</p>
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
      <div className="rounded-2xl p-5 text-white" style={{ backgroundColor: BRAND }}>
        {/* Year / Quarter toggle inside snapshot */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5 flex-wrap">
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'year' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setViewMode('quarter')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'quarter' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
              }`}
            >
              Quarter
            </button>
            {viewMode === 'quarter' && QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedQuarter === q ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          {[
            ['Total Revenue Goal', fmtNum(totalGoal)],
            ['Revenue Secured',    fmtNum(totalAchieved)],
            ['Active Events',      activeCount],
            ['Next Launch',        nextLaunch?.offer_name || '—'],
          ].map(([label, val]) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-black truncate">{val}</p>
              <p className="text-xs text-white/60 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Muted explanatory strip ── */}
      <p className="text-xs text-gray-400 text-center -mt-2">
        {viewMode === 'year'
          ? `All ${selectedYear} events grouped by quarter. Snapshot reflects the full year.`
          : `${selectedQuarter} ${selectedYear} events only. Snapshot reflects this quarter.`
        }
      </p>

      {/* ── Main list card ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-sm text-gray-600">
            {viewMode === 'year'
              ? `${yearEvents.length} revenue event${yearEvents.length !== 1 ? 's' : ''} in ${selectedYear}.`
              : `${quarterEvents.length} revenue event${quarterEvents.length !== 1 ? 's' : ''} in ${selectedQuarter}.`
            }
          </p>
          <button onClick={openAdd} className="btn-brand text-sm">
            + Add Revenue Event
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading events…</p>
        ) : loadError ? (
          <p className="text-sm text-red-500 py-6 text-center">{loadError}</p>
        ) : viewMode === 'year' ? (
          quartersToShow.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No events for {selectedYear} yet.</p>
              <button onClick={openAdd} className="btn-brand">
                Add First Event
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {quartersToShow.map(q => (
                <div key={q}>
                  <p className="font-bold text-gray-500 text-xs uppercase tracking-wide mb-3">
                    {q} {selectedYear}
                  </p>
                  {groupedByQuarter[q].length === 0 ? (
                    <p className="text-xs text-gray-400 italic pl-1">No events this quarter yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {groupedByQuarter[q].map(event => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEdit={() => openEdit(event)}
                          onDelete={() => handleDelete(event.id)}
                          onToggleClose={() => handleToggleClose(event)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          // Quarter view — flat list
          quarterEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No events for {selectedQuarter} {selectedYear} yet.</p>
              <button onClick={openAdd} className="btn-brand">
                Add First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {quarterEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={() => openEdit(event)}
                  onDelete={() => handleDelete(event.id)}
                  onToggleClose={() => handleToggleClose(event)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Event form (inline below list) ── */}
      {showForm && (
        <EventForm
          initial={editEvent}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditEvent(null) }}
          selectedYear={selectedYear}
        />
      )}
    </div>
  )
}
