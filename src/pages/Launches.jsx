import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EditIcon, HeartIcon } from '../lib/icons'

// ─── Constants ─────────────────────────────────────────────────────────────────

const BRAND = '#3d0c0c'

const LAUNCH_TYPES = [
  'Live Launch',
  'Evergreen Push',
  'Limited Drop',
  'Waitlist Build',
  'Relaunch',
]

const PRIMARY_FOCUS_OPTIONS = [
  'Lead Generation',
  'Sales Conversion',
  'Audience Growth',
  'Offer Validation',
  'Retention / Upsell',
]

const STATUSES = ['Planning', 'Warming', 'Live', 'Closed', 'Evergreen']
const STATUS_CONFIG = {
  'Planning':  { color: '#6B7280', bg: '#F3F4F6' },
  'Warming':   { color: '#D97706', bg: '#FEF3C7' },
  'Live':      { color: '#059669', bg: '#D1FAE5' },
  'Closed':    { color: '#6B7280', bg: '#F3F4F6' },
  'Evergreen': { color: '#2563EB', bg: '#DBEAFE' },
}

const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [THIS_YEAR - 1, THIS_YEAR]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtAUD = (n) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
  }).format(n || 0)

function fmtDateRange(start, end) {
  if (!start) return '—'
  const s = new Date(start + 'T00:00:00')
  const sStr = s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const yr = s.getFullYear()
  if (!end) return `${sStr} · ${yr}`
  const e = new Date(end + 'T00:00:00')
  const eStr = e.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return `${sStr} – ${eStr} · ${yr}`
}

function getQuarter(dateStr) {
  if (!dateStr) return null
  const m = new Date(dateStr + 'T00:00:00').getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

// Whole days from today to the given date (negative if past).
function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / 86400000)
}

// ─── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ status, onSet }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const cfg = STATUS_CONFIG[status] || { color: '#6B7280', bg: '#F3F4F6' }

  if (!onSet) {
    return (
      <span
        className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
        style={{ color: cfg.color, backgroundColor: cfg.bg }}
      >
        {status}
      </span>
    )
  }

  return (
    <span ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
        style={{ color: cfg.color, backgroundColor: cfg.bg }}
        title="Change status"
      >
        {status}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 left-0 mt-1"
          style={{ backgroundColor: '#fff', border: '0.5px solid #e8e0d8', borderRadius: 5, padding: 4, minWidth: 132 }}>
          {STATUSES.map(opt => (
            <button
              key={opt}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onSet(opt) }}
              className="block w-full text-left text-xs px-2 py-1.5 rounded transition-colors"
              style={{
                color: opt === status ? BRAND : '#6b6b6b',
                fontWeight: opt === status ? 600 : 400,
                backgroundColor: opt === status ? '#faf7f3' : 'transparent',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

// ─── Add Launch Form ───────────────────────────────────────────────────────────

const BLANK_FORM = {
  name: '', type: '', primaryFocus: '', startDate: '', endDate: '',
  revenueGoal: '', capacity: '', status: '',
}

function LaunchForm({ onSave, onCancel, initial }) {
  const [form, setForm] = useState(initial ? {
    name:         initial.offer_name || '',
    type:         initial.offer_type || '',
    primaryFocus: '',
    startDate:    initial.start_date || '',
    endDate:      initial.end_date || '',
    revenueGoal:  initial.revenue_goal != null ? String(initial.revenue_goal) : '',
    capacity:     initial.capacity != null ? String(initial.capacity) : '',
    status:       initial.status || '',
  } : BLANK_FORM)
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())
      e.name = 'Offer name is required'
    if (!form.startDate)
      e.startDate = 'Start date is required'
    if (!form.revenueGoal || isNaN(Number(form.revenueGoal)) || Number(form.revenueGoal) <= 0)
      e.revenueGoal = 'Enter a valid revenue goal'
    if (!form.type)
      e.type = 'Select a launch type'
    if (!form.status)
      e.status = 'Select a status'
    if (form.endDate && form.startDate && form.endDate < form.startDate)
      e.endDate = 'End date must be after start date'
    if (form.capacity) {
      const cap = Number(form.capacity)
      if (!Number.isInteger(cap) || cap <= 0)
        e.capacity = 'Enter a valid capacity'
    }
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave({
      name: form.name.trim(),
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate || null,
      revenueGoal: Number(form.revenueGoal),
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      status: form.status,
    })
  }

  return (
    <div className="form-card space-y-4 mb-5">
      <div className="flex justify-between items-center">
        <p className="font-bold text-sm text-gray-900">{initial ? 'Edit Launch' : 'Add Launch'}</p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="col-span-2">
          <label className="label">Offer Name</label>
          <input
            className="input-field"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. 6-Week Group Coaching"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Launch Type */}
        <div>
          <label className="label">Type</label>
          <select
            className="input-field"
            value={form.type}
            onChange={e => set('type', e.target.value)}
          >
            <option value="">Select...</option>
            {LAUNCH_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
        </div>

        {/* Primary Focus */}
        <div>
          <label className="label">Primary Focus</label>
          <select
            className="input-field"
            value={form.primaryFocus}
            onChange={e => set('primaryFocus', e.target.value)}
          >
            <option value="">Select...</option>
            {PRIMARY_FOCUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="">Select...</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
        </div>

        {/* Start Date */}
        <div>
          <label className="label">Start Date</label>
          <input
            className="input-field"
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
          {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
        </div>

        {/* End Date */}
        <div>
          <label className="label">End Date (optional)</label>
          <input
            className="input-field"
            type="date"
            value={form.endDate}
            onChange={e => set('endDate', e.target.value)}
          />
          {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
        </div>

        {/* Revenue Goal */}
        <div>
          <label className="label">Revenue Goal (AUD)</label>
          <input
            className="input-field"
            type="number"
            min="0"
            value={form.revenueGoal}
            onChange={e => set('revenueGoal', e.target.value)}
            placeholder="0"
          />
          {errors.revenueGoal && <p className="text-xs text-red-500 mt-1">{errors.revenueGoal}</p>}
        </div>

        {/* Capacity */}
        <div>
          <label className="label">Capacity (optional)</label>
          <input
            className="input-field"
            type="number"
            min="1"
            value={form.capacity}
            onChange={e => set('capacity', e.target.value)}
            placeholder="e.g. 20"
          />
          {errors.capacity && <p className="text-xs text-red-500 mt-1">{errors.capacity}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button onClick={handleSave} className="btn-brand">
          {initial ? 'Save Changes' : 'Save Launch'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Launches() {
  const { user } = useAuth()

  const [launches, setLaunches] = useState([])
  const [selectedYear, setSelectedYear] = useState(THIS_YEAR)
  const [filter, setFilter] = useState('all')
  const [openDetailId, setOpenDetailId] = useState(null)
  const [detailEdit, setDetailEdit] = useState({ revenueSecured: '', enrolled: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingLaunchId, setEditingLaunchId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // ── Load launches for selected year ─────────────────────────────────────────

  const loadLaunches = useCallback(async (year) => {
    if (!user) {
      console.log('[Launches] loadLaunches: no user, skipping')
      return
    }
    console.log('[Launches] loadLaunches start — userId:', user.id, 'year:', year)
    setLoading(true)
    setLoadError(null)

    const { data, error } = await supabase
      .from('launches')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .order('start_date', { ascending: true })

    if (error) {
      console.error('[Launches] fetch error:', error)
      setLoadError(`Failed to load launches: ${error.message}`)
      setLaunches([])
    } else {
      console.log('[Launches] fetch success — rows returned:', data?.length ?? 0, data)
      setLoadError(null)
      setLaunches(data || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadLaunches(selectedYear)
  }, [user, selectedYear, loadLaunches])

  // ── Year switch ──────────────────────────────────────────────────────────────

  const handleYearSwitch = (y) => {
    setSelectedYear(y)
    setOpenDetailId(null)
    setFilter('all')
    setShowForm(false)
  }

  // ── Add launch ───────────────────────────────────────────────────────────────

  const handleAddLaunch = async (formData) => {
    const year = new Date(formData.startDate + 'T00:00:00').getFullYear()

    const payload = {
      user_id:          user.id,
      year,
      offer_name:       formData.name,
      offer_type:       formData.type,
      start_date:       formData.startDate,
      end_date:         formData.endDate,
      revenue_goal:     formData.revenueGoal,
      capacity:         formData.capacity,
      status:           formData.status,
      revenue_achieved: 0,
      enrolled_count:   0,
      notes:            '',
    }

    console.log('[Launches] insert payload:', payload)

    const { data, error } = await supabase
      .from('launches')
      .insert(payload)
      .select()
      .single()

    if (error || !data) {
      console.error('[Launches] insert error:', error)
      alert(`Failed to save launch: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }

    console.log('[Launches] insert success:', data)

    if (year === selectedYear) {
      setLaunches(prev => [...prev, data])
    }
    setShowForm(false)
  }

  // ── Edit launch (updates the same record; never touches revenue/enrolments/notes) ──

  const handleEditLaunch = async (launchId, formData) => {
    const year = new Date(formData.startDate + 'T00:00:00').getFullYear()

    const payload = {
      offer_name:   formData.name,
      offer_type:   formData.type,
      start_date:   formData.startDate,
      end_date:     formData.endDate,
      revenue_goal: formData.revenueGoal,
      capacity:     formData.capacity,
      status:       formData.status,
      year,
    }

    const { data, error } = await supabase
      .from('launches')
      .update(payload)
      .eq('id', launchId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      console.error('[Launches] edit update error:', error)
      alert(`Failed to save changes: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }

    // If the new start date moved the launch to a different year, drop it from this view.
    setLaunches(prev => data.year !== selectedYear
      ? prev.filter(l => l.id !== launchId)
      : prev.map(l => l.id === launchId ? data : l))
    setEditingLaunchId(null)
  }

  // ── Set status from the card chip (writes the same field as the form) ─────────

  const handleSetStatus = async (launchId, status) => {
    const { data, error } = await supabase
      .from('launches')
      .update({ status })
      .eq('id', launchId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      console.error('[Launches] status update error:', error)
      alert(`Failed to update status: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }
    setLaunches(prev => prev.map(l => l.id === launchId ? data : l))
  }

  // ── Toggle detail panel ──────────────────────────────────────────────────────

  const handleToggleDetail = (launch) => {
    if (openDetailId === launch.id) {
      setOpenDetailId(null)
    } else {
      setOpenDetailId(launch.id)
      setDetailEdit({
        revenueSecured: launch.revenue_achieved ?? 0,
        enrolled:       launch.enrolled_count ?? 0,
        notes:          launch.notes ?? '',
      })
    }
  }

  // ── Save detail changes ──────────────────────────────────────────────────────

  const handleDetailSave = async (launchId) => {
    const updatePayload = {
      revenue_achieved: Number(detailEdit.revenueSecured) || 0,
      enrolled_count:   parseInt(detailEdit.enrolled, 10) || 0,
      notes:            detailEdit.notes || '',
    }

    console.log('[Launches] detail update payload:', updatePayload, 'id:', launchId)

    const { data, error } = await supabase
      .from('launches')
      .update(updatePayload)
      .eq('id', launchId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      console.error('[Launches] update error:', error)
      alert(`Failed to save changes: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }

    console.log('[Launches] update success:', data)
    setLaunches(prev => prev.map(l => l.id === launchId ? data : l))
    setDetailEdit({
      revenueSecured: data.revenue_achieved ?? 0,
      enrolled:       data.enrolled_count ?? 0,
      notes:          data.notes ?? '',
    })
  }

  // ── Delete launch ────────────────────────────────────────────────────────────

  const handleDelete = async (launchId) => {
    if (!window.confirm('Delete this launch? This cannot be undone.')) return

    console.log('[Launches] delete id:', launchId)

    const { error } = await supabase
      .from('launches')
      .delete()
      .eq('id', launchId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Launches] delete error:', error)
      alert(`Failed to delete: ${error.message}. Please try again.`)
      return
    }

    console.log('[Launches] delete success')
    setLaunches(prev => prev.filter(l => l.id !== launchId))
    setOpenDetailId(null)
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  // Filtered + sorted launches for the table
  // Year filter is applied at query time; status filter is applied here client-side
  const filteredLaunches = useMemo(() => {
    const statusMap = { live: 'Live', planning: 'Planning', warming: 'Warming', closed: 'Closed', evergreen: 'Evergreen' }
    const result = filter === 'all'
      ? [...launches]
      : launches.filter(l => l.status === statusMap[filter])

    // Sort ascending by start_date; null dates sort to bottom
    return result.sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0
      if (!a.start_date) return 1
      if (!b.start_date) return -1
      return a.start_date.localeCompare(b.start_date)
    })
  }, [launches, filter])

  // Snapshot card — always from full unfiltered year data
  const snapshot = useMemo(() => {
    const total = launches.length
    const revenueSecured = launches.reduce((s, l) => s + (l.revenue_achieved || 0), 0)
    const bestPerforming = launches.length > 0
      ? launches.reduce((best, l) =>
          (l.revenue_achieved || 0) > (best?.revenue_achieved || 0) ? l : best
        , launches[0])
      : null
    const nextLaunch = [...launches]
      .filter(l => (l.status === 'Planning' || l.status === 'Warming') && l.start_date)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null
    return { total, revenueSecured, bestPerforming, nextLaunch }
  }, [launches])

  // Insight strip — only when >= 2 launches
  const insights = useMemo(() => {
    if (launches.length < 2) return null
    const totalRev = launches.reduce((s, l) => s + (l.revenue_achieved || 0), 0)
    const totalEnrolled = launches.reduce((s, l) => s + (l.enrolled_count || 0), 0)
    const avgRevPerLaunch = Math.round(totalRev / launches.length)
    const avgEnrolments = (totalEnrolled / launches.length).toFixed(1)

    const qRevenue = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    launches.forEach(l => {
      const q = getQuarter(l.start_date)
      if (q) qRevenue[q] += (l.revenue_achieved || 0)
    })
    const [bestQKey, bestQVal] = Object.entries(qRevenue).sort((a, b) => b[1] - a[1])[0]
    const bestQuarter = bestQVal > 0 ? `${bestQKey} ${selectedYear}` : '—'

    const withGoals = launches.filter(l => l.revenue_goal > 0)
    const hitGoal = withGoals.filter(l => (l.revenue_achieved || 0) >= l.revenue_goal).length
    const goalHitRate = withGoals.length > 0
      ? `${Math.round((hitGoal / withGoals.length) * 100)}% of launches hit target`
      : '—'

    return { avgRevPerLaunch, avgEnrolments, bestQuarter, goalHitRate }
  }, [launches, selectedYear])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
            <h1 className="page-title">Launches</h1>
          </div>
          <p className="text-sm text-gray-500">
            Track every launch, see what's working, and plan what's next.
          </p>
        </div>

        {/* Year toggle */}
        <div className="flex gap-1.5 flex-shrink-0">
          {YEAR_OPTIONS.map(y => (
            <button
              key={y}
              onClick={() => handleYearSwitch(y)}
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

      {/* Error banner */}
      {loadError && (
        <div className="insight-box">
          {loadError}
        </div>
      )}

      {/* Snapshot card */}
      <div className="p-5 text-white" style={{ borderRadius: '5px', backgroundColor: BRAND }}>
        <div className="grid grid-cols-3 gap-4">

          {/* Total launches */}
          <div className="text-center">
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '30px', fontWeight: 300, fontStyle: 'italic' }}>{snapshot.total}</p>
            <p className="text-xs text-white/60 mt-1">Total Launches</p>
          </div>

          {/* Revenue secured */}
          <div className="text-center">
            <p className="truncate" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', fontWeight: 300, fontStyle: 'italic' }}>{fmtAUD(snapshot.revenueSecured)}</p>
            <p className="text-xs text-white/60 mt-1">Revenue Secured</p>
          </div>

          {/* Best performing */}
          <div className="text-center">
            {snapshot.bestPerforming && (snapshot.bestPerforming.revenue_achieved || 0) > 0 ? (
              <>
                <p className="text-base font-black leading-snug truncate px-1">
                  {snapshot.bestPerforming.offer_name}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  Best Performing · {fmtAUD(snapshot.bestPerforming.revenue_achieved)}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black">—</p>
                <p className="text-xs text-white/60 mt-1">Best Performing · no data yet</p>
              </>
            )}
          </div>

        </div>
      </div>

      {/* CEO training box */}
      <div style={{ backgroundColor: '#fdf8f5', border: '0.5px solid rgba(240,208,208,0.5)', borderLeft: '2px solid rgba(240,208,208,0.7)', borderRadius: '4px', padding: '13px 16px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '11px', fontWeight: 300, color: '#3d0c0c' }}>
        <HeartIcon /> Use: CEO Cash Dashboard → <a href="https://tools.womanmasteryhqportal.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3d0c0c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Launch Campaign</a>
      </div>

      {/* Main content card */}
      <div className="card-section">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'all',      label: 'All' },
              { key: 'live',     label: 'Live' },
              { key: 'planning', label: 'Planning' },
              { key: 'warming',  label: 'Warming' },
              { key: 'closed',   label: 'Closed' },
              { key: 'evergreen',label: 'Evergreen' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filter === key ? { backgroundColor: BRAND } : {}}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(p => !p)}
            className="btn-brand"
          >
            + Add Launch
          </button>
        </div>

        {/* Inline form — above list */}
        {showForm && (
          <LaunchForm
            onSave={handleAddLaunch}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Launch cards */}
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading launches…</p>
        ) : filteredLaunches.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400 italic">
            No launches recorded for this year. Add your first launch above.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredLaunches.map(launch => {
              const revSecured = launch.revenue_achieved || 0
              const enrolled   = launch.enrolled_count || 0
              const capacity   = launch.capacity || null
              const revGoal    = launch.revenue_goal || 0

              const goalPct = revGoal > 0
                ? (revSecured > 0 ? Math.min(Math.round((revSecured / revGoal) * 100), 100) : 0)
                : null
              const avgPerClient = revSecured > 0 && enrolled > 0
                ? Math.round(revSecured / enrolled)
                : null

              const isOpen = openDetailId === launch.id
              const started = ['Live', 'Closed', 'Evergreen'].includes(launch.status)
              const notStarted = ['Planning', 'Warming'].includes(launch.status)
              const endDays = daysUntil(launch.end_date)
              const startDays = daysUntil(launch.start_date)
              const meta = [launch.offer_type, fmtDateRange(launch.start_date, launch.end_date)].filter(Boolean).join(' · ')

              if (editingLaunchId === launch.id) {
                return (
                  <LaunchForm
                    key={launch.id}
                    initial={launch}
                    onSave={(fd) => handleEditLaunch(launch.id, fd)}
                    onCancel={() => setEditingLaunchId(null)}
                  />
                )
              }

              return (
                <div key={launch.id} className="rounded-xl px-4 py-3.5" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-900 leading-snug">{launch.offer_name}</p>
                        <StatusPill status={launch.status} onSet={(s) => handleSetStatus(launch.id, s)} />
                      </div>
                      {meta && <p className="text-xs text-gray-400">{meta}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingLaunchId(launch.id); setOpenDetailId(null) }}
                        className="edit-btn"
                        title="Edit launch"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleToggleDetail(launch)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        style={isOpen
                          ? { backgroundColor: BRAND, color: '#fff' }
                          : { backgroundColor: '#f7f7f7', color: '#6B7280' }
                        }
                      >
                        {isOpen ? 'Close ▴' : 'Detail ▾'}
                      </button>
                    </div>
                  </div>

                  {/* Started launches: goal, bar, performance stats */}
                  {started && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-700">
                          {revGoal > 0 ? `${fmtAUD(revSecured)} of ${fmtAUD(revGoal)} goal` : `${fmtAUD(revSecured)} secured`}
                        </span>
                        {goalPct !== null && (
                          <span className="text-xs font-bold" style={{ color: goalPct >= 100 ? '#059669' : BRAND }}>{goalPct}%</span>
                        )}
                      </div>
                      {revGoal > 0 && (
                        <div className="rounded-full overflow-hidden w-full" style={{ height: 6, backgroundColor: '#f0e0e0' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${goalPct || 0}%`, backgroundColor: BRAND }} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-gray-500">
                        <span>Enrolled {enrolled}{capacity ? ` of ${capacity}` : ''}</span>
                        {avgPerClient !== null && <span>Avg per client {fmtAUD(avgPerClient)}</span>}
                        {launch.status === 'Live' && endDays != null && endDays >= 0 && (
                          <span>{endDays} days remaining</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Not started launches: single muted line */}
                  {notStarted && (
                    <p className="text-xs text-gray-400 mt-2">
                      {[
                        `Goal ${fmtAUD(revGoal)}`,
                        capacity ? `${capacity} seats` : null,
                        startDays != null ? `starts in ${Math.max(0, startDays)} days` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {/* Detail panel (content unchanged) */}
                  {isOpen && (
                    <div className="mt-3 pt-4 space-y-4" style={{ borderTop: '1px solid #ede6e1' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          ['Revenue Secured', fmtAUD(revSecured)],
                          ['Revenue Goal',    fmtAUD(revGoal)],
                          ['Enrolled',        enrolled],
                          ['Avg per Client',  avgPerClient !== null ? fmtAUD(avgPerClient) : '—'],
                        ].map(([label, val]) => (
                          <div key={label} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                            <p className="stat-number">{val}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">Update Revenue (AUD)</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            value={detailEdit.revenueSecured}
                            onChange={e => setDetailEdit(p => ({ ...p, revenueSecured: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="label">Update Enrolments</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            value={detailEdit.enrolled}
                            onChange={e => setDetailEdit(p => ({ ...p, enrolled: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Notes &amp; Reflections</label>
                        <textarea
                          className="textarea-field"
                          rows={3}
                          value={detailEdit.notes}
                          onChange={e => setDetailEdit(p => ({ ...p, notes: e.target.value }))}
                          placeholder="What worked? What would you do differently? What will you carry forward?"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleDelete(launch.id)}
                          className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete launch
                        </button>
                        <button onClick={() => handleDetailSave(launch.id)} className="btn-brand">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Insight strip */}
      <div className="card-section">
        <p className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-3">Year Patterns</p>
        {!insights ? (
          <p className="text-sm text-gray-400 italic">
            Add more launches to see patterns across your year.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              ['Avg Revenue / Launch', fmtAUD(insights.avgRevPerLaunch)],
              ['Avg Enrolments',       insights.avgEnrolments],
              ['Best Quarter',         insights.bestQuarter],
              ['Goal Hit Rate',        insights.goalHitRate],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="stat-number">{val}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
