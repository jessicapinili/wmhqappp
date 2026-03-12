import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getQuarterFromMonth } from '../lib/utils'

const BRAND = '#6B1010'

const EVENT_TYPES = ['Live Launch', 'Evergreen Push', 'Limited Drop', 'Waitlist Build', 'Relaunch']
const CURRENCIES = ['AUD', 'NZD', 'USD', 'EUR', 'CAD', 'JPY', 'SEK', 'PLN']
const STATUS_CONFIG = {
  'Planning': { color: '#6B7280', bg: '#F3F4F6' },
  'Warming': { color: '#D97706', bg: '#FEF3C7' },
  'Live': { color: '#059669', bg: '#D1FAE5' },
  'Closed': { color: '#DC2626', bg: '#FEE2E2' },
  'Evergreen': { color: '#2563EB', bg: '#DBEAFE' },
}
const STATUSES = Object.keys(STATUS_CONFIG)
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const PRIMARY_FOCUS_OPTIONS = ['Grow Audience', 'Build Waitlist', 'Launch New Offer', 'Re-launch Existing', 'Generate Leads', 'Fill Program', 'Increase MRR']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]

function EventForm({ onSave, onCancel, initial }) {
  const defaultForm = {
    offer_name: '', event_type: '', status: 'Planning',
    start_date: '', end_date: '', currency: 'AUD',
    revenue_goal: '', primary_focus: '', revenue_achieved: '', notes: '',
    year: currentYear, quarter: getQuarterFromMonth(new Date().getMonth() + 1),
  }
  const [form, setForm] = useState(initial ? {
    ...defaultForm,
    ...initial,
    revenue_goal: initial.revenue_goal || '',
    revenue_achieved: initial.revenue_achieved || '',
  } : defaultForm)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box p-6 max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-900">{initial ? 'Edit Revenue Event' : 'Add Revenue Event'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Offer Name</label>
            <input className="input-field" value={form.offer_name} onChange={e => set('offer_name', e.target.value)} placeholder="e.g. 12-Week Group Coaching" />
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
            <label className="label">Year</label>
            <select className="input-field" value={form.year} onChange={e => set('year', parseInt(e.target.value))}>
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Quarter</label>
            <select className="input-field" value={form.quarter} onChange={e => set('quarter', e.target.value)}>
              {QUARTERS.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Launch Start Date (dd/mm/yyyy)</label>
            <input className="input-field" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>

          <div>
            <label className="label">Launch End Date (dd/mm/yyyy)</label>
            <input className="input-field" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>

          <div>
            <label className="label">Currency</label>
            <select className="input-field" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Revenue Goal (AUD)</label>
            <input className="input-field" type="number" value={form.revenue_goal} onChange={e => set('revenue_goal', e.target.value)} placeholder="0" />
          </div>

          <div className="col-span-2">
            <label className="label">Primary Focus</label>
            <select className="input-field" value={form.primary_focus} onChange={e => set('primary_focus', e.target.value)}>
              <option value="">Select...</option>
              {PRIMARY_FOCUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="label">Revenue Achieved at Close (AUD)</label>
            <input className="input-field" type="number" value={form.revenue_achieved} onChange={e => set('revenue_achieved', e.target.value)} placeholder="Enter final revenue once the event is completed" />
            <p className="text-xs text-gray-400 mt-1">Edit this at the end and input your revenue achieved.</p>
          </div>

          <div className="col-span-2">
            <label className="label">Short Notes (optional)</label>
            <textarea className="textarea-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 btn-brand" style={{ backgroundColor: BRAND }}>Save Event</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Planning']
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {status}
    </span>
  )
}

function EventCard({ event, onEdit, onDelete, onToggleClose }) {
  const formatDate = (d) => {
    if (!d) return '—'
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return (
    <div className={`card group border-l-4 ${event.is_closed ? 'opacity-80' : ''}`} style={{ borderLeftColor: STATUS_CONFIG[event.status]?.color || BRAND }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="font-bold text-gray-900">{event.offer_name}</p>
            <StatusBadge status={event.status} />
            {event.event_type && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{event.event_type}</span>}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
            <span>📅 {formatDate(event.start_date)} – {formatDate(event.end_date)}</span>
            {event.primary_focus && <span>🎯 {event.primary_focus}</span>}
            {event.currency && event.revenue_goal ? (
              <span>💰 Goal: {event.currency} ${Number(event.revenue_goal).toLocaleString()}</span>
            ) : null}
            {event.revenue_achieved ? (
              <span className="text-emerald-600 font-semibold">✓ Achieved: {event.currency} ${Number(event.revenue_achieved).toLocaleString()}</span>
            ) : null}
          </div>

          {event.notes && <p className="text-xs text-gray-500 italic">{event.notes}</p>}

          {event.is_closed && !event.revenue_achieved && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Don't forget to log your final revenue.</p>
          )}
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="edit-btn text-xs">✏️</button>
          <button onClick={onDelete} className="delete-btn text-xs">🗑️</button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
        <button
          onClick={onToggleClose}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={event.is_closed ? { backgroundColor: '#D1FAE5', color: '#059669' } : { backgroundColor: '#FEE2E2', color: '#DC2626' }}
        >
          {event.is_closed ? 'Reopen Event' : 'Mark as Closed'}
        </button>
      </div>
    </div>
  )
}

export default function RevenueEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadEvents = async () => {
    const twoYearsAgo = currentYear - 1
    const { data } = await supabase.from('revenue_events').select('*')
      .eq('user_id', user.id)
      .gte('year', twoYearsAgo)
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [user])

  const handleSave = async (form) => {
    if (editEvent) {
      const { data } = await supabase.from('revenue_events').update({ ...form }).eq('id', editEvent.id).select().single()
      setEvents(prev => prev.map(x => x.id === editEvent.id ? data : x))
    } else {
      const { data } = await supabase.from('revenue_events').insert({ user_id: user.id, ...form }).select().single()
      setEvents(prev => [data, ...prev])
    }
    setShowForm(false); setEditEvent(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return
    await supabase.from('revenue_events').delete().eq('id', id)
    setEvents(prev => prev.filter(x => x.id !== id))
  }

  const handleToggleClose = async (event) => {
    const { data } = await supabase.from('revenue_events')
      .update({ is_closed: !event.is_closed, status: !event.is_closed ? 'Closed' : 'Planning' })
      .eq('id', event.id).select().single()
    setEvents(prev => prev.map(x => x.id === event.id ? data : x))
  }

  const yearEvents = events.filter(e => e.year === selectedYear)
  const totalGoal = yearEvents.reduce((s, e) => s + (Number(e.revenue_goal) || 0), 0)
  const totalAchieved = yearEvents.filter(e => e.is_closed).reduce((s, e) => s + (Number(e.revenue_achieved) || 0), 0)
  const activeCount = yearEvents.filter(e => !e.is_closed && e.status === 'Live').length
  const nextLaunch = yearEvents.filter(e => e.start_date && !e.is_closed && e.status !== 'Closed')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0]

  const groupedByQuarter = QUARTERS.reduce((acc, q) => {
    acc[q] = yearEvents.filter(e => e.quarter === q)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full bg-emerald-500" />
            <h1 className="text-2xl font-black text-gray-900">Revenue Events</h1>
          </div>
          <p className="text-sm text-gray-500">Track launches, drops, and revenue goals.</p>
        </div>
        <button onClick={() => { setEditEvent(null); setShowForm(true) }} className="btn-brand" style={{ backgroundColor: BRAND }}>
          + Add Revenue Event
        </button>
      </div>

      {/* Year selector */}
      <div className="flex gap-2">
        {YEARS.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedYear === y ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={selectedYear === y ? { backgroundColor: BRAND } : {}}>
            {y}
          </button>
        ))}
      </div>

      {/* Snapshot bar */}
      <div className="rounded-2xl p-5 text-white grid grid-cols-4 gap-4" style={{ backgroundColor: BRAND }}>
        {[
          ['Total Revenue Goal', `$${totalGoal.toLocaleString()}`],
          ['Revenue Secured', `$${totalAchieved.toLocaleString()}`],
          ['Active Events', activeCount],
          ['Next Launch', nextLaunch?.offer_name || '—'],
        ].map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-black truncate">{val}</p>
            <p className="text-xs text-white/60 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Events by quarter */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading events...</p>
      ) : yearEvents.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm">No events for {selectedYear} yet.</p>
          <button onClick={() => { setEditEvent(null); setShowForm(true) }} className="btn-brand mt-3" style={{ backgroundColor: BRAND }}>Add First Event</button>
        </div>
      ) : (
        QUARTERS.map(q => {
          const qEvents = groupedByQuarter[q]
          if (!qEvents.length) return null
          return (
            <div key={q}>
              <p className="font-bold text-gray-700 text-sm mb-3">{q} {selectedYear}</p>
              <div className="space-y-3">
                {qEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => { setEditEvent(event); setShowForm(true) }}
                    onDelete={() => handleDelete(event.id)}
                    onToggleClose={() => handleToggleClose(event)}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {showForm && (
        <EventForm
          initial={editEvent}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditEvent(null) }}
        />
      )}
    </div>
  )
}
