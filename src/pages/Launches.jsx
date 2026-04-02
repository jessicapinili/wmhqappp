import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

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

// ─── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {status}
    </span>
  )
}

// ─── Add Launch Form ───────────────────────────────────────────────────────────

const BLANK_FORM = {
  name: '', type: '', primaryFocus: '', startDate: '', endDate: '',
  revenueGoal: '', capacity: '', status: '',
}

function LaunchForm({ onSave, onCancel }) {
  const [form, setForm] = useState(BLANK_FORM)
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
        <p className="font-bold text-sm text-gray-900">Add Launch</p>
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
          Save Launch
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

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

          {/* Next launch */}
          <div className="text-center">
            {snapshot.nextLaunch ? (
              <>
                <p className="text-base font-black leading-snug truncate px-1">
                  {snapshot.nextLaunch.offer_name}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  Next Launch · {fmtAUD(snapshot.nextLaunch.revenue_goal)} target
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black">—</p>
                <p className="text-xs text-white/60 mt-1">Next Launch · none planned</p>
              </>
            )}
          </div>

        </div>
      </div>

      {/* CEO training box */}
      <div style={{ backgroundColor: '#fdf8f5', border: '0.5px solid rgba(240,208,208,0.5)', borderLeft: '2px solid rgba(240,208,208,0.7)', borderRadius: '4px', padding: '13px 16px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '11px', fontWeight: 300, color: '#3d0c0c' }}>
        ✦ Use: CEO Cash Dashboard → <a href="https://tools.womanmasteryhqportal.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3d0c0c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Launch Campaign</a>
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
            className="btn-brand text-sm"
          >
            + Add Launch
          </button>
        </div>

        {/* Inline form — above table */}
        {showForm && (
          <LaunchForm
            onSave={handleAddLaunch}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Table */}
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading launches…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Offer
                  </th>
                  <th className="text-left py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Dates
                  </th>
                  <th className="text-left py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Revenue
                  </th>
                  <th className="text-right py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Enrolled
                  </th>
                  <th className="text-right py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Goal %
                  </th>
                  <th className="text-right py-2 pr-4 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Avg/Client
                  </th>
                  <th className="py-2 pb-3" />
                </tr>
              </thead>
              <tbody>
                {filteredLaunches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-gray-400 italic">
                      No launches recorded for this year. Add your first launch above.
                    </td>
                  </tr>
                ) : (
                  filteredLaunches.map(launch => {
                    const revSecured = launch.revenue_achieved || 0
                    const enrolled   = launch.enrolled_count || 0
                    const capacity   = launch.capacity || null
                    const revGoal    = launch.revenue_goal || 0

                    const goalPct = revGoal > 0 && revSecured > 0
                      ? Math.min(Math.round((revSecured / revGoal) * 100), 100)
                      : null

                    const avgPerClient = revSecured > 0 && enrolled > 0
                      ? Math.round(revSecured / enrolled)
                      : null

                    // Show "— / —" if enrolled=0, no capacity, and status=Upcoming
                    const showDash = enrolled === 0 && !capacity && launch.status === 'Upcoming'

                    const isOpen = openDetailId === launch.id

                    return (
                      <React.Fragment key={launch.id}>
                        {/* Main row */}
                        <tr className={`border-b border-gray-50 transition-colors ${
                          isOpen ? 'bg-[#f7f7f7]' : 'hover:bg-gray-50/50'
                        }`}>

                          {/* Offer name + type */}
                          <td className="py-3.5 pr-4">
                            <p className="font-bold text-gray-900 leading-snug tracking-tight">{launch.offer_name}</p>
                            {launch.offer_type && (
                              <span className="inline-block text-[11px] font-medium text-gray-400 bg-[#f7f7f7] rounded-md px-1.5 py-0.5 mt-1">
                                {launch.offer_type}
                              </span>
                            )}
                          </td>

                          {/* Date range */}
                          <td className="py-3.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
                            {fmtDateRange(launch.start_date, launch.end_date)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 pr-4">
                            <StatusPill status={launch.status} />
                          </td>

                          {/* Revenue */}
                          <td className="py-3.5 pr-4 text-right">
                            <p className="font-bold text-gray-900">{fmtAUD(revSecured)}</p>
                            {revGoal > 0 && (
                              <p className="text-[11px] text-gray-400 mt-0.5">goal {fmtAUD(revGoal)}</p>
                            )}
                          </td>

                          {/* Enrolled */}
                          <td className="py-3.5 pr-4 text-right">
                            {showDash ? (
                              <span className="text-gray-300 font-medium">— / —</span>
                            ) : (
                              <p className="font-semibold text-gray-900">
                                {enrolled}
                                {capacity
                                  ? <span className="text-gray-400 font-normal"> / {capacity}</span>
                                  : null
                                }
                              </p>
                            )}
                          </td>

                          {/* Goal % */}
                          <td className="py-3.5 pr-4 text-right">
                            {goalPct !== null ? (
                              <span className={`font-semibold ${goalPct >= 100 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {goalPct}%
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Avg per client */}
                          <td className="py-3.5 pr-4 text-right">
                            {avgPerClient !== null ? (
                              <span className="font-semibold text-gray-900">{fmtAUD(avgPerClient)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Detail toggle */}
                          <td className="py-3.5 text-right">
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
                          </td>
                        </tr>

                        {/* Detail panel */}
                        {isOpen && (
                          <tr>
                            <td colSpan={8} className="pb-4 pt-0 px-0">
                              <div className="mx-0 bg-[#f7f7f7] border-x border-b border-[#ede6e1] rounded-b-xl px-5 py-5 space-y-4">

                                {/* Read-only metric tiles */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {[
                                    ['Revenue Secured', fmtAUD(revSecured)],
                                    ['Revenue Goal',    fmtAUD(revGoal)],
                                    ['Enrolled',        enrolled],
                                    ['Avg per Client',  avgPerClient !== null ? fmtAUD(avgPerClient) : '—'],
                                  ].map(([label, val]) => (
                                    <div
                                      key={label}
                                      className="bg-white rounded-xl p-3 border border-gray-100 text-center"
                                    >
                                      <p className="stat-number">{val}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Editable fields */}
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

                                {/* Notes */}
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

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    onClick={() => handleDelete(launch.id)}
                                    className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    Delete launch
                                  </button>
                                  <button
                                    onClick={() => handleDetailSave(launch.id)}
                                    className="btn-brand"
                                  >
                                    Save Changes
                                  </button>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
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
