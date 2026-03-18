import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCurrentQuarter } from '../lib/utils'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#6B1010'

/* ── Tier config ────────────────────────────────────────── */
const SERVICE_TIERS = [
  { key: 'free',  label: 'Free',        descriptor: 'Lead magnets, freebies, discovery calls',    color: '#e8a8a8', bg: '#f7f7f7' },
  { key: 'low',   label: 'Low Ticket',  descriptor: 'Workshops, templates, mini sessions',         color: '#c96868', bg: '#f7f7f7' },
  { key: 'mid',   label: 'Mid Ticket',  descriptor: 'Group programs, courses, memberships',        color: '#a03838', bg: '#f7f7f7' },
  { key: 'high',  label: 'High Ticket', descriptor: '1:1 coaching, VIP, premium containers',      color: '#6B1010', bg: '#f7f7f7' },
]

const PRODUCT_TIERS = [
  { key: 'entry',        label: 'Entry Product',     descriptor: 'Low-cost intro; gets clients into the ecosystem', color: '#e8a8a8', bg: '#f7f7f7' },
  { key: 'subscription', label: 'Subscription',      descriptor: 'Recurring access; community, content, tools',     color: '#c96868', bg: '#f7f7f7' },
  { key: 'signature',    label: 'Signature Product', descriptor: 'Core transformation; their method in a box',      color: '#a03838', bg: '#f7f7f7' },
  { key: 'hero',         label: 'Hero Product',      descriptor: "The flagship; the one they're known for",         color: '#6B1010', bg: '#f7f7f7' },
]

const SERVICE_FORMATS = {
  free:  ['Discovery call', 'Lead magnet', 'Free workshop', 'Email sequence', 'Other'],
  low:   ['Workshop', 'Mini course', 'Template', '1-hour session', 'Other'],
  mid:   ['Group program', 'Membership', 'Online course', 'Mastermind', 'Other'],
  high:  ['1:1 Coaching', 'VIP Day', 'Retainer', 'Premium container', 'Other'],
}

const PRODUCT_FORMATS = {
  hero:         ['Flagship product', 'Signature collection', 'Premium release', 'Best-selling line', 'Exclusive drop', 'Other'],
  signature:    ['Core collection', 'Best seller', 'Limited edition', 'Seasonal release', 'Bundle / set', 'Other'],
  subscription: ['Monthly', 'Quarterly', 'Annual', 'Lifetime'],
  entry:        ['Ready-to-ship', 'Pre-order', 'Limited drop', 'Core item', 'Seasonal item', 'Other'],
}

const STATUS_OPTIONS = ['Active', 'Paused', 'Coming soon']

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const INCOME_CATEGORIES = [
  { key: 'recurring', label: 'Recurring',          sublabel: 'Revenue that comes in on an ongoing basis through repeat payments or retained access.',              color: '#6B1A1A' },
  { key: 'onetime',   label: 'One-Time / Launch',   sublabel: 'Revenue earned through single purchases, launches, or fixed-time sales periods.',                  color: '#a85050' },
  { key: 'passive',   label: 'Passive',             sublabel: 'Revenue generated without direct delivery each time, often through assets that sell repeatedly.',   color: '#d4a0a0' },
]

/* ── Revenue Snapshot ────────────────────────────────────── */
function RevenueSnapshot({ userId }) {
  const [mrrData, setMrrData] = useState(null)
  const [ilnData, setIlnData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ current_mrr: '', iln: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('mrr_goal').select('*').eq('user_id', userId).single(),
      supabase.from('iln').select('*').eq('user_id', userId).single(),
    ]).then(([{ data: mrr }, { data: iln }]) => {
      if (mrr) setMrrData(mrr)
      if (iln) setIlnData(iln)
      setForm({
        current_mrr: mrr?.current_mrr ?? '',
        iln:         iln?.ideal_lifestyle_number ?? '',
      })
      if (!mrr && !iln) setEditing(true)
    })
  }, [userId])

  const handleSave = async () => {
    const currentMrr = parseFloat(form.current_mrr) || 0
    const ilnTarget  = parseFloat(form.iln)          || 0
    const now = new Date().toISOString()
    const [{ data: mrrSaved }, { data: ilnSaved }] = await Promise.all([
      supabase.from('mrr_goal')
        .upsert({ user_id: userId, current_mrr: currentMrr, updated_at: now }, { onConflict: 'user_id' })
        .select().single(),
      supabase.from('iln')
        .upsert({ user_id: userId, ideal_lifestyle_number: ilnTarget, current_monthly_revenue: currentMrr, updated_at: now }, { onConflict: 'user_id' })
        .select().single(),
    ])
    if (mrrSaved) setMrrData(mrrSaved)
    if (ilnSaved) setIlnData(ilnSaved)
    setEditing(false)
  }

  const currentMrr = parseFloat(mrrData?.current_mrr) || 0
  const ilnTarget  = parseFloat(ilnData?.ideal_lifestyle_number) || 0
  const ilnAnnual  = ilnTarget * 12
  const gap = Math.max(0, ilnTarget - currentMrr)
  const pct = ilnTarget > 0 ? Math.min(100, Math.round((currentMrr / ilnTarget) * 100)) : 0

  const fmt = (n) => {
    if (!n && n !== 0) return '—'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
    return `$${n.toLocaleString()}`
  }

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: BRAND }}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Revenue Snapshot
          </h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{pct}% to ILN</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Update every 30 days</p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}
              title="Update metrics"
            >
              <EditIcon />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { key: 'current_mrr', label: 'Current MRR' },
              { key: 'iln',         label: 'ILN (Monthly)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label
                  className="block text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {label}
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                  }}
                  type="number"
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder="0"
                  autoFocus={key === 'current_mrr'}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            {(mrrData || ilnData) && (
              <button
                onClick={() => setEditing(false)}
                className="py-1.5 px-4 rounded-lg text-sm font-semibold transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              className="py-1.5 px-4 rounded-lg text-sm font-semibold transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              Update
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-5 mb-5">
            {[
              { label: 'Current MRR',  value: fmt(currentMrr) },
              { label: 'ILN (Monthly)', value: fmt(ilnTarget) },
              { label: 'ILN (Annual)', value: fmt(ilnAnnual) },
              { label: 'Gap to ILN',   value: gap > 0 ? fmt(gap) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {label}
                </p>
                <p className="text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: 'rgba(255,255,255,0.65)' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{pct}% to ILN</p>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Insight card ───────────────────────────────────────── */
function InsightCard() {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#FDF6EE', border: '1px solid #f0dfa0' }}>
      <p className="text-sm italic font-medium" style={{ color: '#7a5c10' }}>
        "Master the season you're in. Clarity defines the vision; strategy + subconscious drives the scale."
      </p>
    </div>
  )
}

/* ── Status tag ─────────────────────────────────────────── */
function StatusTag({ status }) {
  const map = {
    'Active':      { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    'Paused':      { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    'Coming soon': { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  }
  const s = map[status] || map['Active']
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  )
}

/* ── Offer card ─────────────────────────────────────────── */
function OfferCard({ offer, onEdit, onDelete }) {
  return (
    <div className="card group rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 mb-1">{offer.offer_name}</p>
          {offer.offer_description && (
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">{offer.offer_description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {offer.one_time_price && (
              <span className="text-sm font-bold" style={{ color: BRAND }}>
                ${parseFloat(offer.one_time_price).toLocaleString('en-AU')} AUD
              </span>
            )}
            {offer.offer_type && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--card-bg)', color: '#777', border: '1px solid var(--card-border)' }}
              >
                {offer.offer_type}
              </span>
            )}
            {offer.offer_status && <StatusTag status={offer.offer_status} />}
          </div>
        </div>
        <div className="flex gap-1 transition-opacity shrink-0">
          <button onClick={onEdit} className="edit-btn"><EditIcon /></button>
          <button onClick={onDelete} className="delete-btn"><DeleteIcon /></button>
        </div>
      </div>
    </div>
  )
}

/* ── Inline offer/product form ──────────────────────────── */
function OfferFormInline({ tierKey, isProduct, initial, onSave, onCancel }) {
  const formats = isProduct ? PRODUCT_FORMATS[tierKey] : SERVICE_FORMATS[tierKey]
  const noun = isProduct ? 'Product' : 'Offer'
  const [form, setForm] = useState({
    offer_name:        initial?.offer_name        || '',
    offer_type:        initial?.offer_type        || '',
    offer_description: initial?.offer_description || '',
    one_time_price:    initial?.one_time_price     || '',
    offer_status:      initial?.offer_status      || 'Active',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ border: '1.5px dashed var(--card-border)', backgroundColor: 'var(--form-bg)' }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{noun} Name</label>
          <input
            className="input-field"
            value={form.offer_name}
            onChange={e => set('offer_name', e.target.value)}
            placeholder={isProduct ? 'e.g. My Flagship Course' : 'e.g. 1:1 Coaching'}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Price (AUD)</label>
          <input
            className="input-field"
            type="number"
            value={form.one_time_price}
            onChange={e => set('one_time_price', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="label">Short Description</label>
        <textarea
          className="textarea-field"
          rows={2}
          value={form.offer_description}
          onChange={e => set('offer_description', e.target.value)}
          placeholder="What is this about?"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Format</label>
          <select className="input-field" value={form.offer_type} onChange={e => set('offer_type', e.target.value)}>
            <option value="">Select...</option>
            {formats?.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.offer_status} onChange={e => set('offer_status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="py-1.5 px-4 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--card-border)' }}
        >
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="btn-brand">Save {noun}</button>
      </div>
    </div>
  )
}

/* ── Collapsible tier section ───────────────────────────── */
function TierSection({ tier, userId, isProduct }) {
  const [offers, setOffers]    = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]    = useState(null)
  const [open, setOpen]        = useState(false)
  const noun = isProduct ? 'product' : 'offer'

  useEffect(() => {
    supabase.from('product_suite').select('*').eq('user_id', userId).eq('tier', tier.key).order('created_at')
      .then(({ data }) => setOffers(data || []))
  }, [userId, tier.key])

  const handleSave = async (form) => {
    if (editId) {
      const { data, error } = await supabase.from('product_suite').update({ ...form }).eq('id', editId).select().single()
      if (error || !data) { console.error('Failed to update offer:', error); return }
      setOffers(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('product_suite').insert({ user_id: userId, tier: tier.key, ...form }).select().single()
      if (error || !data) { console.error('Failed to save offer:', error); return }
      setOffers(prev => [...prev, data])
    }
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('product_suite').delete().eq('id', id)
    if (error) { console.error('Failed to delete offer:', error); return }
    setOffers(prev => prev.filter(x => x.id !== id))
  }

  const startEdit = (offer) => {
    setEditId(offer.id)
    setShowForm(false)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditId(null)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: tier.color }} />
        <div className="flex-1 flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="font-bold text-sm text-gray-900">{tier.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{tier.descriptor}</p>
          </div>
          <div className="flex items-center gap-3">
            {offers.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--card-bg)', color: '#888', border: '1px solid var(--card-border)' }}
              >
                {offers.length} {noun}{offers.length !== 1 ? 's' : ''}
              </span>
            )}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div
          className="border-t space-y-2.5 p-4"
          style={{ borderColor: 'var(--card-border)', backgroundColor: tier.bg }}
        >
          {offers.map(offer =>
            editId === offer.id ? (
              <OfferFormInline
                key={offer.id}
                tierKey={tier.key}
                isProduct={isProduct}
                initial={offer}
                onSave={handleSave}
                onCancel={cancelForm}
              />
            ) : (
              <OfferCard
                key={offer.id}
                offer={offer}
                onEdit={() => startEdit(offer)}
                onDelete={() => handleDelete(offer.id)}
              />
            )
          )}

          {showForm && !editId ? (
            <OfferFormInline
              tierKey={tier.key}
              isProduct={isProduct}
              onSave={handleSave}
              onCancel={cancelForm}
            />
          ) : !editId && (
            <button
              onClick={() => { setEditId(null); setShowForm(true) }}
              className="w-full text-xs font-semibold flex items-center justify-center gap-1 py-2.5 px-3 rounded-lg transition-colors hover:bg-white"
              style={{ color: BRAND, border: '1px dashed var(--card-border)' }}
            >
              + Add {noun}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Product & Service Suite ────────────────────────────── */
function ProductServiceSuite({ userId }) {
  const [mode, setMode]       = useState('services')
  const [bothTab, setBothTab] = useState('services')

  const showServices = mode === 'services' || (mode === 'both' && bothTab === 'services')
  const showProducts = mode === 'products' || (mode === 'both' && bothTab === 'products')

  return (
    <div className="card-section mb-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="section-title flex items-center gap-2 mb-0">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
            Product & Service Suite
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Update every 30 days · click a tier to expand</p>
        </div>
      </div>

      <div
        className="flex gap-0.5 p-1 rounded-lg mb-5 w-fit"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        {['Services', 'Products', 'Both'].map(opt => {
          const key = opt.toLowerCase()
          return (
            <button
              key={key}
              onClick={() => setMode(key)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
              style={mode === key
                ? { backgroundColor: BRAND, color: 'white' }
                : { color: '#888', backgroundColor: 'transparent' }
              }
            >
              {opt}
            </button>
          )
        })}
      </div>

      {mode === 'both' && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-3">Switch between tabs below to manage each</p>
          <div className="flex gap-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
            {['Services', 'Products'].map(tab => {
              const key = tab.toLowerCase()
              return (
                <button
                  key={key}
                  onClick={() => setBothTab(key)}
                  className="pb-2 px-4 text-sm font-semibold transition-colors"
                  style={bothTab === key
                    ? { color: BRAND, borderBottom: `2px solid ${BRAND}`, marginBottom: '-1px' }
                    : { color: '#aaa', borderBottom: '2px solid transparent', marginBottom: '-1px' }
                  }
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {showServices && SERVICE_TIERS.map(tier => (
          <TierSection key={`svc-${tier.key}`} tier={tier} userId={userId} isProduct={false} />
        ))}
        {showProducts && PRODUCT_TIERS.map(tier => (
          <TierSection key={`prd-${tier.key}`} tier={tier} userId={userId} isProduct={true} />
        ))}
      </div>
    </div>
  )
}

/* ── Donut chart ─────────────────────────────────────────── */
function DonutChart({ segments }) {
  const r = 36
  const cx = 50
  const cy = 50
  const circumference = 2 * Math.PI * r
  const sw = 13

  const totalPct = segments.reduce((s, seg) => s + (seg.pct || 0), 0)
  const hasData  = totalPct > 0

  let cumulativeAngle = 0

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Background ring — always visible as track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0e0e0" strokeWidth={sw} />

        {hasData && segments.map((seg, i) => {
          if (!seg.pct || seg.pct <= 0) return null
          const arc = (seg.pct / 100) * circumference
          const rotation = cumulativeAngle
          cumulativeAngle += (seg.pct / 100) * 360
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={sw}
              strokeDasharray={`${arc} ${circumference - arc}`}
              strokeDashoffset={circumference / 4}
              transform={`rotate(${rotation}, ${cx}, ${cy})`}
              strokeLinecap="butt"
            />
          )
        })}
      </svg>

      {/* Center text overlay */}
      {!hasData && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: '10px', color: '#c4b5af', textAlign: 'center', fontWeight: 500, lineHeight: 1.35, maxWidth: '55%' }}>
            Set up<br />your mix
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Income Structure ────────────────────────────────────── */
function IncomeStructure({ userId }) {
  const [data, setData]     = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm]     = useState({ recurring: '', onetime: '', passive: '' })

  useEffect(() => {
    supabase.from('income_structure').select('*').eq('user_id', userId).single()
      .then(({ data: d, error }) => {
        if (d) {
          setData(d)
          setForm({
            recurring: d.recurring_pct ?? '',
            onetime:   d.onetime_pct   ?? '',
            passive:   d.passive_pct   ?? '',
          })
        } else if (!error || error.code === 'PGRST116') {
          // PGRST116 = no rows found (first time user) — open blank form
          setEditing(true)
        } else {
          console.error('[IncomeStructure] load error:', error)
        }
      })
  }, [userId])

  const formTotal = [form.recurring, form.onetime, form.passive]
    .reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const isValid = Math.abs(formTotal - 100) < 0.01

  const hasData = data && (
    (parseFloat(data.recurring_pct) || 0) +
    (parseFloat(data.onetime_pct) || 0) +
    (parseFloat(data.passive_pct) || 0)
  ) > 0

  const handleSave = async () => {
    if (!isValid) return
    const payload = {
      user_id:       userId,
      recurring_pct: parseFloat(form.recurring) || 0,
      onetime_pct:   parseFloat(form.onetime)   || 0,
      passive_pct:   parseFloat(form.passive)   || 0,
      updated_at:    new Date().toISOString(),
    }
    const { data: saved, error } = await supabase.from('income_structure')
      .upsert(payload, { onConflict: 'user_id' }).select().single()
    if (error || !saved) { console.error('Failed to save income structure:', error); return }
    setData(saved)
    setEditing(false)
  }

  const displaySegments = (src) => INCOME_CATEGORIES.map(cat => ({
    color: cat.color,
    pct:   parseFloat(src[cat.key === 'onetime' ? 'onetime_pct' : cat.key === 'recurring' ? 'recurring_pct' : 'passive_pct']) || 0,
  }))

  const editSegments = INCOME_CATEGORIES.map(cat => ({
    color: cat.color,
    pct:   parseFloat(form[cat.key]) || 0,
  }))

  const viewSegments = hasData ? displaySegments(data) : []

  const getPct = (cat) => {
    if (!data) return 0
    if (cat.key === 'recurring') return parseFloat(data.recurring_pct) || 0
    if (cat.key === 'onetime')   return parseFloat(data.onetime_pct)   || 0
    return parseFloat(data.passive_pct) || 0
  }

  return (
    <div
      className="rounded-[14px] p-6"
      style={{ backgroundColor: 'white', border: '0.5px solid var(--card-border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-0.5">Income Structure</h2>
          <p className="text-xs text-gray-400">How your revenue is structured — recurring, one-time, and passive. Update monthly.</p>
        </div>
        {hasData && !editing && (
          <button onClick={() => setEditing(true)} className="edit-btn" title="Edit income structure">
            <EditIcon />
          </button>
        )}
      </div>

      {/* Helper copy */}
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Estimate how your total revenue is currently split across these three income types. Percentages must add up to 100%.
      </p>

      {/* Donut + legend */}
      <div className="flex gap-5 mb-4">
        <div style={{ width: 88, height: 88, flexShrink: 0 }}>
          <DonutChart segments={editing ? editSegments : viewSegments} />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          {INCOME_CATEGORIES.map(cat => (
            <div key={cat.key} className="flex items-start gap-2">
              <div
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{cat.label}</p>
                <p className="text-xs text-gray-400 leading-tight">{cat.sublabel}</p>
              </div>
              {editing ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    className="rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-brand"
                    style={{ width: 48, border: '1px solid var(--card-border)' }}
                    type="number"
                    min="0"
                    max="100"
                    value={form[cat.key]}
                    onChange={e => setForm(p => ({ ...p, [cat.key]: e.target.value }))}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              ) : (
                <p className="text-sm font-bold flex-shrink-0" style={{ color: BRAND }}>
                  {getPct(cat)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Validation */}
      {editing && formTotal > 0 && !isValid && (
        <p className="text-xs mb-3 font-medium" style={{ color: '#d97706' }}>
          Total must equal 100% — currently {Math.round(formTotal)}%
        </p>
      )}

      {/* Actions */}
      {editing && (
        <div className="flex gap-2 justify-end mb-4">
          {hasData && (
            <button
              onClick={() => {
                setForm({
                  recurring: data?.recurring_pct ?? '',
                  onetime:   data?.onetime_pct   ?? '',
                  passive:   data?.passive_pct   ?? '',
                })
                setEditing(false)
              }}
              className="py-1.5 px-4 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--card-border)' }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn-brand"
            disabled={!isValid}
            style={!isValid ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
          >
            {hasData ? 'Update' : 'Save Mix'}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--card-border)' }}>
        <p className="text-xs text-gray-400">Update monthly — your mix tells you how stable your business is.</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold"
            style={{ color: BRAND }}
          >
            + Log your income streams ↗
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Cash Forecast ───────────────────────────────────────── */
function CashForecast({ userId }) {
  const [period, setPeriod]       = useState(3)
  const [ilnTarget, setIlnTarget] = useState(0)
  const [forecastData, setForecastData] = useState({}) // key "year-month" → row
  const [revenueEvents, setRevenueEvents] = useState([])
  const [editingKey, setEditingKey]   = useState(null)
  const [editValue, setEditValue]     = useState('')
  const [overrideMode, setOverrideMode] = useState(false)
  const [loading, setLoading]         = useState(true)

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const getCalendarMonths = () => {
    if (period === 3) {
      // True calendar quarter: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
      const qStart = Math.floor((currentMonth - 1) / 3) * 3 + 1
      return [0, 1, 2].map(i => ({ year: currentYear, month: qStart + i }))
    }
    if (period === 6) {
      // Calendar half-year: H1=Jan-Jun, H2=Jul-Dec
      const hStart = currentMonth <= 6 ? 1 : 7
      return [0, 1, 2, 3, 4, 5].map(i => ({ year: currentYear, month: hStart + i }))
    }
    // Full calendar year: Jan–Dec
    return [1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ year: currentYear, month: m }))
  }
  const months = getCalendarMonths()

  useEffect(() => {
    const load = async () => {
      const { data: iln } = await supabase
        .from('iln').select('ideal_lifestyle_number').eq('user_id', userId).single()
      if (iln) setIlnTarget(parseFloat(iln.ideal_lifestyle_number) || 0)

      const { data: events } = await supabase
        .from('revenue_events')
        .select('start_date, revenue_goal, revenue_achieved, is_closed')
        .eq('user_id', userId)
      setRevenueEvents(events || [])

      const { data: forecast } = await supabase
        .from('cash_forecast_months').select('*').eq('user_id', userId)
      if (forecast) {
        const map = {}
        forecast.forEach(row => { map[`${row.year}-${row.month}`] = row })
        setForecastData(map)
      }

      setLoading(false)
    }
    load()
  }, [userId])

  const isPast = (year, month) =>
    year < currentYear || (year === currentYear && month < currentMonth)

  const getActual = (year, month) =>
    revenueEvents
      .filter(e => e.is_closed && e.revenue_achieved && e.start_date)
      .reduce((sum, e) => {
        const d = new Date(e.start_date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
          ? sum + (parseFloat(e.revenue_achieved) || 0) : sum
      }, 0)

  const getEventsPlanned = (year, month) =>
    revenueEvents
      .filter(e => !e.is_closed && e.revenue_goal && e.start_date)
      .reduce((sum, e) => {
        const d = new Date(e.start_date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
          ? sum + (parseFloat(e.revenue_goal) || 0) : sum
      }, 0)

  const handleSave = async (year, month) => {
    const amount = parseFloat(editValue) || 0
    const key = `${year}-${month}`
    const { data: saved, error } = await supabase.from('cash_forecast_months')
      .upsert(
        { user_id: userId, year, month, planned_amount: amount, is_manual: true, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,year,month' }
      ).select().single()
    if (error) {
      console.error('[CashForecast] save error:', error)
      return // keep editing open so the user's value isn't lost
    }
    if (saved) setForecastData(prev => ({ ...prev, [key]: saved }))
    setEditingKey(null)
    setEditValue('')
  }

  const fmt = (n) => {
    if (!n && n !== 0) return '$—'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
    return `$${n.toLocaleString()}`
  }

  const forecastTotal = months.reduce((sum, { year, month }) => {
    const key = `${year}-${month}`
    if (isPast(year, month)) return sum + getActual(year, month)
    const saved = forecastData[key]
    return sum + (saved ? (saved.planned_amount || 0) : getEventsPlanned(year, month))
  }, 0)

  return (
    <div
      className="rounded-[14px] p-6"
      style={{ backgroundColor: 'white', border: '0.5px solid var(--card-border)' }}
    >
      {/* Header with period toggle */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 mb-0.5">Cash Forecast</h2>
          <p className="text-xs text-gray-400">Plan your revenue across the year — see gaps before they arrive.</p>
        </div>
        <div
          className="flex gap-0.5 p-0.5 rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          {[
            { label: 'Quarter', value: 3 },
            { label: '6 Mo', value: 6 },
            { label: '12 Mo', value: 12 },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={period === value
                ? { backgroundColor: BRAND, color: 'white' }
                : { color: '#888', backgroundColor: 'transparent' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual override action */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 italic">
          Planned revenue pulls from Revenue Events. Override any month manually.
        </p>
        <button
          onClick={() => setOverrideMode(m => !m)}
          className="text-xs font-semibold px-2.5 py-1 rounded-md transition-all flex-shrink-0 ml-3"
          style={overrideMode
            ? { backgroundColor: BRAND, color: 'white' }
            : { color: BRAND, backgroundColor: 'var(--card-bg)', border: `1px solid var(--card-border)` }
          }
        >
          {overrideMode ? 'Done' : 'Manual override'}
        </button>
      </div>

      {/* Month rows */}
      {loading ? (
        <p className="text-xs text-gray-400 py-4">Loading...</p>
      ) : (
        <div className="space-y-2 mb-4">
          {months.map(({ year, month }) => {
            const key        = `${year}-${month}`
            const past       = isPast(year, month)
            const actual     = past ? getActual(year, month) : 0
            const saved      = forecastData[key]
            const evtPlanned = !past ? getEventsPlanned(year, month) : 0
            const amount     = past ? actual : (saved ? (saved.planned_amount || 0) : evtPlanned)
            const isManual   = !past && saved?.is_manual
            const pct        = ilnTarget > 0 ? Math.min(100, ((amount || 0) / ilnTarget) * 100) : 0
            const isEditing  = editingKey === key

            return (
              <div key={key} className="flex items-center gap-2.5">
                {/* Month label */}
                <div style={{ width: 52, flexShrink: 0 }}>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">
                    {MONTH_NAMES[month - 1].slice(0, 3)}
                  </p>
                  {year !== currentYear && (
                    <p className="text-xs text-gray-400">{year}</p>
                  )}
                </div>

                {/* Bar track */}
                <div
                  className="flex-1 rounded-full overflow-hidden relative"
                  style={{ height: 14, backgroundColor: 'var(--card-border)' }}
                >
                  {amount > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: past ? '#a85050' : BRAND,
                      }}
                    />
                  )}
                </div>

                {/* Amount */}
                <div style={{ width: 72, flexShrink: 0, textAlign: 'right' }}>
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        className="rounded px-1.5 py-0.5 text-xs text-right focus:outline-none"
                        style={{ width: 52, border: `1px solid ${BRAND}`, color: '#1a1a1a' }}
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter')  handleSave(year, month)
                          if (e.key === 'Escape') { setEditingKey(null); setEditValue('') }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(year, month)}
                        className="text-xs font-bold"
                        style={{ color: BRAND }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          if (!past) {
                            setEditingKey(key)
                            setEditValue(amount > 0 ? Math.round(amount).toString() : '')
                          }
                        }}
                        className="text-xs font-semibold"
                        style={{
                          color: amount > 0 ? '#1a1a1a' : '#bbb',
                          cursor: past ? 'default' : 'pointer',
                        }}
                      >
                        {amount > 0 ? fmt(amount) : '$—'}
                      </button>
                      {!past && overrideMode && (
                        <button
                          onClick={() => { setEditingKey(key); setEditValue(amount > 0 ? Math.round(amount).toString() : '') }}
                          title="Override this month"
                          className="flex items-center justify-center rounded transition-colors"
                          style={{ color: '#bbb', width: 16, height: 16 }}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Manual override indicator */}
                <div style={{ width: 16, flexShrink: 0, textAlign: 'center' }}>
                  {isManual && (
                    <span
                      title="Manually adjusted"
                      className="text-xs font-semibold"
                      style={{ color: '#a85050' }}
                    >
                      M
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
          <span className="text-xs text-gray-500">Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a85050' }} />
          <span className="text-xs text-gray-500">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: '#a85050' }}>M</span>
          <span className="text-xs text-gray-500">Manual override</span>
        </div>
      </div>

      {/* Discrepancy notice */}
      {(() => {
        const mismatchedMonths = months.filter(({ year, month }) => {
          if (isPast(year, month)) return false
          const key = `${year}-${month}`
          const saved = forecastData[key]
          if (!saved?.is_manual) return false
          const evtTotal = getEventsPlanned(year, month)
          return Math.abs((saved.planned_amount || 0) - evtTotal) > 1
        })
        if (mismatchedMonths.length === 0) return null
        const labels = mismatchedMonths.map(({ month }) => MONTH_NAMES[month - 1].slice(0, 3)).join(', ')
        return (
          <div
            className="mb-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed"
            style={{ backgroundColor: '#FFF8ED', border: '1px solid #F0DFAA', color: '#7A5C10' }}
          >
            <span className="font-semibold">Heads up:</span> Your Cash Forecast includes a manual override for{' '}
            <strong>{labels}</strong> that doesn't match your Revenue Events for that period.
            Review your Revenue Events to keep your forecast and event planning aligned.
          </div>
        )
      })()}

      {/* Footer */}
      <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
        Forecast total:{' '}
        <span style={{ color: BRAND }}>{fmt(forecastTotal)}</span>
      </p>
    </div>
  )
}

/* ── Quarterly Revenue Review ───────────────────────────── */
const Q_QUESTIONS = [
  'What is the one thing I sell that most people want, and why do they love it?',
  'Where do people get confused or stop buying, and how can I make it easier?',
  'Which job takes the least amount of work but makes the most amount of money?',
  'What went surprisingly well this time, and how can we make it happen on purpose next time?',
  'How much monthly revenue did I have at the start of the quarter, and how much at the end?',
]

function QuarterlyReview({ userId }) {
  const currentQ    = getCurrentQuarter()
  const currentYear = new Date().getFullYear().toString()
  const [quarter, setQuarter] = useState(currentQ)
  const [year, setYear]       = useState(currentYear)
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [current, setCurrent] = useState(null)
  const [past, setPast]       = useState([])
  const [showForm, setShowForm] = useState(false)

  const loadReviews = async () => {
    const { data } = await supabase.from('quarterly_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) {
      const curr        = data.find(r => r.quarter === currentQ && r.year === currentYear && r.is_current)
      const pastReviews = data.filter(r => !(r.quarter === currentQ && r.year === currentYear && r.is_current))
      setCurrent(curr || null)
      setPast(pastReviews.slice(0, 8))
      if (curr) setAnswers({ q1: curr.q1||'', q2: curr.q2||'', q3: curr.q3||'', q4: curr.q4||'', q5: curr.q5||'' })
    }
  }

  useEffect(() => { loadReviews() }, [userId])

  const handleSave = async () => {
    if (current) {
      const { data, error } = await supabase.from('quarterly_reviews').update({ ...answers, quarter, year }).eq('id', current.id).select().single()
      if (error || !data) { console.error('Failed to update quarterly review:', error); return }
      setCurrent(data)
    } else {
      const { data, error } = await supabase.from('quarterly_reviews').insert({ user_id: userId, quarter, year, ...answers, is_current: true }).select().single()
      if (error || !data) { console.error('Failed to save quarterly review:', error); return }
      setCurrent(data)
    }
    setShowForm(false)
  }

  const handleReset = async () => {
    if (!window.confirm('Reset this quarterly review? The current review will be archived.')) return
    if (current) await supabase.from('quarterly_reviews').update({ is_current: false }).eq('id', current.id)
    setAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' })
    setCurrent(null)
    loadReviews()
  }

  const handleDeletePast = async (id) => {
    await supabase.from('quarterly_reviews').delete().eq('id', id)
    setPast(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="card-section mb-0">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
        Quarterly Revenue Review
      </h2>
      <p className="section-subtitle">Resets each quarter — past reviews saved below.</p>

      {current && !showForm ? (
        <div className="card mb-4">
          <div className="flex justify-between items-start mb-3">
            <p className="font-bold text-gray-900">{current.quarter} {current.year} Review</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowForm(true)
                  setAnswers({ q1: current.q1||'', q2: current.q2||'', q3: current.q3||'', q4: current.q4||'', q5: current.q5||'' })
                }}
                className="edit-btn"
              >
                <EditIcon />
              </button>
              <button onClick={handleReset} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded">
                ↺ Reset
              </button>
            </div>
          </div>
          {Q_QUESTIONS.map((q, i) => (
            <div key={i} className="mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{q}</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {answers[`q${i+1}`] || <span className="text-gray-300 italic">Not answered</span>}
              </p>
            </div>
          ))}
        </div>
      ) : showForm ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quarter</label>
              <select className="input-field" value={quarter} onChange={e => setQuarter(e.target.value)}>
                {['Q1','Q2','Q3','Q4'].map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input className="input-field" value={year} onChange={e => setYear(e.target.value)} />
            </div>
          </div>
          {Q_QUESTIONS.map((q, i) => (
            <div key={i}>
              <label className="label">{i + 1}. {q}</label>
              <textarea
                className="textarea-field"
                rows={3}
                value={answers[`q${i+1}`]}
                onChange={e => setAnswers(p => ({ ...p, [`q${i+1}`]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
            <button onClick={handleSave} className="btn-brand">Save Review</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-brand">
          + Start {currentQ} {currentYear} Review
        </button>
      )}

      {past.length > 0 && (
        <div className="mt-6">
          <p className="font-bold text-sm text-gray-700 mb-3">Past Reviews</p>
          <div className="space-y-2">
            {past.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 bg-white">
                  <p className="font-semibold text-sm text-gray-900">{r.quarter} {r.year}</p>
                  <button onClick={() => handleDeletePast(r.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Launch Overview ─────────────────────────────────────── */
function LaunchOverview({ userId }) {
  const now         = new Date()
  const currentYear = now.getFullYear()

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [statusFilter, setStatusFilter] = useState('All')
  const [launches, setLaunches]         = useState([])
  const [expandedId, setExpandedId]     = useState(null)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [editForm, setEditForm]         = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteValue, setNoteValue]       = useState('')

  const blankAdd = { offer_name: '', offer_type: '', start_date: '', end_date: '', revenue_goal: '', capacity: '', status: 'Upcoming' }
  const [addForm, setAddForm] = useState(blankAdd)

  useEffect(() => {
    supabase.from('launches').select('*').eq('user_id', userId).order('start_date', { ascending: true })
      .then(({ data }) => setLaunches(data || []))
  }, [userId])

  const fmt = (n) => {
    if (!n && n !== 0) return '$—'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
    return `$${n.toLocaleString()}`
  }

  const fmtDate = (s) => {
    if (!s) return '—'
    const d = new Date(s + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  // Year-filtered (always; snapshot ignores filter pill)
  const yearLaunches = launches.filter(l => {
    if (!l.start_date) return false
    return new Date(l.start_date + 'T00:00:00').getFullYear() === selectedYear
  })

  // Table-filtered
  const filtered = statusFilter === 'All' ? yearLaunches : yearLaunches.filter(l => l.status === statusFilter)

  // ── Snapshot calculations ──────────────────────────────────
  const totalLaunches   = yearLaunches.length
  const revenueSecured  = yearLaunches.reduce((s, l) => s + (parseFloat(l.revenue_achieved) || 0), 0)
  const best = yearLaunches.reduce((b, l) => {
    const rev = parseFloat(l.revenue_achieved) || 0
    return rev > (parseFloat(b?.revenue_achieved) || 0) ? l : b
  }, null)
  const nextLaunch = yearLaunches
    .filter(l => l.start_date && new Date(l.start_date + 'T00:00:00') >= now && l.status !== 'Closed')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0] || null

  // ── Insight calculations ───────────────────────────────────
  const closedLaunches = yearLaunches.filter(l => l.status === 'Closed' || l.status === 'Evergreen')
  const avgRevPerLaunch = closedLaunches.length > 0
    ? closedLaunches.reduce((s, l) => s + (parseFloat(l.revenue_achieved) || 0), 0) / closedLaunches.length : 0
  const enrolledLaunches = closedLaunches.filter(l => parseFloat(l.enrolled_count) > 0)
  const avgEnrolPerLaunch = enrolledLaunches.length > 0
    ? enrolledLaunches.reduce((s, l) => s + (parseFloat(l.enrolled_count) || 0), 0) / enrolledLaunches.length : 0
  const quarterRevenue = [1, 2, 3, 4].map(q => {
    const qStart = (q - 1) * 3 + 1
    return {
      q,
      revenue: yearLaunches
        .filter(l => { if (!l.start_date) return false; const m = new Date(l.start_date + 'T00:00:00').getMonth() + 1; return m >= qStart && m < qStart + 3 })
        .reduce((s, l) => s + (parseFloat(l.revenue_achieved) || 0), 0),
    }
  })
  const bestQ = quarterRevenue.reduce((b, q) => q.revenue > b.revenue ? q : b, { q: 0, revenue: 0 })
  const goalHitCount = closedLaunches.filter(l => {
    const achieved = parseFloat(l.revenue_achieved) || 0
    const goal     = parseFloat(l.revenue_goal) || 0
    return goal > 0 && achieved >= goal
  }).length
  const goalHitRate = closedLaunches.length > 0 ? Math.round((goalHitCount / closedLaunches.length) * 100) : null

  // ── Handlers ──────────────────────────────────────────────
  const handleAddSave = async () => {
    if (!addForm.offer_name.trim()) return
    const payload = {
      user_id:          userId,
      offer_name:       addForm.offer_name.trim(),
      offer_type:       addForm.offer_type || null,
      start_date:       addForm.start_date || null,
      end_date:         addForm.end_date   || null,
      revenue_goal:     parseFloat(addForm.revenue_goal) || null,
      capacity:         parseInt(addForm.capacity)       || null,
      status:           addForm.status,
      revenue_achieved: null,
      enrolled_count:   null,
      notes:            null,
      updated_at:       new Date().toISOString(),
    }
    const { data, error } = await supabase.from('launches').insert(payload).select().single()
    if (error || !data) { console.error('Failed to save launch:', error); return }
    setLaunches(prev => [...prev, data].sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0)))
    setAddForm(blankAdd)
    setShowAddForm(false)
  }

  const handleEditSave = async () => {
    if (!editForm || !editingId) return
    const payload = {
      offer_name:       editForm.offer_name,
      offer_type:       editForm.offer_type || null,
      start_date:       editForm.start_date || null,
      end_date:         editForm.end_date   || null,
      revenue_goal:     parseFloat(editForm.revenue_goal)     || null,
      revenue_achieved: parseFloat(editForm.revenue_achieved) || null,
      capacity:         parseInt(editForm.capacity)           || null,
      enrolled_count:   parseInt(editForm.enrolled_count)     || null,
      status:           editForm.status,
      updated_at:       new Date().toISOString(),
    }
    const { data, error } = await supabase.from('launches').update(payload).eq('id', editingId).select().single()
    if (error || !data) { console.error('Failed to update launch:', error); return }
    setLaunches(prev => prev.map(l => l.id === editingId ? data : l))
    setEditingId(null)
    setEditForm(null)
  }

  const handleNoteSave = async (id) => {
    const { data, error } = await supabase.from('launches')
      .update({ notes: noteValue, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error || !data) { console.error('Failed to save note:', error); return }
    setLaunches(prev => prev.map(l => l.id === id ? data : l))
    setEditingNoteId(null)
    setNoteValue('')
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('launches').delete().eq('id', id)
    if (error) { console.error('Failed to delete launch:', error); return }
    setLaunches(prev => prev.filter(l => l.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const COL = '2fr 1fr 1fr 1fr 1.4fr 1fr 120px'

  return (
    <div className="space-y-4">

      {/* ── Section header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2 mb-0">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
            Launch Overview
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Track launches, results, and patterns across the year.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Year toggle — only current and previous year */}
          <div
            className="flex gap-0.5 p-0.5 rounded-lg"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            {[currentYear - 1, currentYear].map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={selectedYear === y
                  ? { backgroundColor: BRAND, color: 'white' }
                  : { color: '#888', backgroundColor: 'transparent' }
                }
              >
                {y}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); setExpandedId(null) }}
            className="btn-brand text-xs"
          >
            + Add launch
          </button>
        </div>
      </div>

      {/* ── Snapshot card ── */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: BRAND }}>
        <div className="grid grid-cols-4">
          {[
            {
              label: 'Total Launches',
              value: totalLaunches > 0 ? totalLaunches : '—',
              sub:   `in ${selectedYear}`,
            },
            {
              label: 'Revenue Secured',
              value: fmt(revenueSecured),
              sub:   'across all launches',
            },
            {
              label: 'Best Performing',
              value: best?.offer_name || '—',
              sub:   best ? fmt(parseFloat(best.revenue_achieved) || 0) : 'no data yet',
            },
            {
              label: 'Next Launch',
              value: nextLaunch?.offer_name || '—',
              sub:   nextLaunch ? `Goal: ${fmt(parseFloat(nextLaunch.revenue_goal) || 0)}` : 'none planned',
            },
          ].map(({ label, value, sub }, i) => (
            <div
              key={label}
              className="px-5 first:pl-0 last:pr-0"
              style={i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.15)' } : {}}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {label}
              </p>
              <p className="text-lg font-black text-white truncate">{value}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex gap-1.5 flex-wrap">
        {LAUNCH_FILTERS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
            style={statusFilter === tab
              ? { backgroundColor: BRAND, color: 'white' }
              : { color: '#888', backgroundColor: 'transparent', border: '1px solid var(--card-border)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Add launch inline form ── */}
      {showAddForm && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ border: '1.5px dashed var(--card-border)', backgroundColor: 'var(--form-bg)' }}
        >
          <p className="text-sm font-bold text-gray-900">New Launch</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Offer Name</label>
              <input
                className="input-field" autoFocus
                value={addForm.offer_name}
                onChange={e => setAddForm(p => ({ ...p, offer_name: e.target.value }))}
                placeholder="e.g. Group Coaching Round 3"
              />
            </div>
            <div>
              <label className="label">Type / Format</label>
              <select className="input-field" value={addForm.offer_type} onChange={e => setAddForm(p => ({ ...p, offer_type: e.target.value }))}>
                <option value="">Select...</option>
                {LAUNCH_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input className="input-field" type="date" value={addForm.start_date} onChange={e => setAddForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input-field" type="date" value={addForm.end_date} onChange={e => setAddForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Revenue Goal (AUD)</label>
              <input className="input-field" type="number" value={addForm.revenue_goal} onChange={e => setAddForm(p => ({ ...p, revenue_goal: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="label">Capacity (optional)</label>
              <input className="input-field" type="number" value={addForm.capacity} onChange={e => setAddForm(p => ({ ...p, capacity: e.target.value }))} placeholder="—" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))}>
                {LAUNCH_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setAddForm(blankAdd) }}
              className="py-1.5 px-4 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--card-border)' }}
            >
              Cancel
            </button>
            <button onClick={handleAddSave} className="btn-brand" disabled={!addForm.offer_name.trim()}>
              Save Launch
            </button>
          </div>
        </div>
      )}

      {/* ── Launch table ── */}
      <div className="space-y-1.5">

        {/* Table header */}
        <div
          className="grid px-4 py-2.5"
          style={{ gridTemplateColumns: COL }}
        >
          {['Offer', 'Status', 'Revenue', 'Enrolled', 'Goal %', 'Avg / client', ''].map((h, i) => (
            <p
              key={i}
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: '#aaa', textAlign: i === 0 ? 'left' : 'right' }}
            >
              {h}
            </p>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">
              {yearLaunches.length === 0
                ? 'No launches recorded for this year. Add your first launch above.'
                : 'No launches match the selected filter.'}
            </p>
          </div>
        ) : (
          filtered.map((launch) => {
            const revenue      = parseFloat(launch.revenue_achieved) || 0
            const goal         = parseFloat(launch.revenue_goal)     || 0
            const enrolled     = parseFloat(launch.enrolled_count)   || 0
            const capacity     = parseFloat(launch.capacity)         || 0
            const goalPct      = goal > 0 && revenue > 0 ? Math.min(100, Math.round((revenue / goal) * 100)) : null
            const avgPerClient = revenue > 0 && enrolled > 0 ? Math.round(revenue / enrolled) : null
            const isExpanded   = expandedId === launch.id
            const isEditing    = editingId  === launch.id

            return (
              <div
                key={launch.id}
                className="launch-card"
              >
                {/* ── Edit form row ── */}
                {isEditing ? (
                  <div className="p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Offer Name</label>
                        <input className="input-field" value={editForm.offer_name} onChange={e => setEditForm(p => ({ ...p, offer_name: e.target.value }))} autoFocus />
                      </div>
                      <div>
                        <label className="label">Type / Format</label>
                        <select className="input-field" value={editForm.offer_type || ''} onChange={e => setEditForm(p => ({ ...p, offer_type: e.target.value }))}>
                          <option value="">Select...</option>
                          {LAUNCH_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Start Date</label>
                        <input className="input-field" type="date" value={editForm.start_date || ''} onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">End Date</label>
                        <input className="input-field" type="date" value={editForm.end_date || ''} onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="label">Revenue Achieved</label>
                        <input className="input-field" type="number" value={editForm.revenue_achieved || ''} onChange={e => setEditForm(p => ({ ...p, revenue_achieved: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <label className="label">Revenue Goal</label>
                        <input className="input-field" type="number" value={editForm.revenue_goal || ''} onChange={e => setEditForm(p => ({ ...p, revenue_goal: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <label className="label">Enrolled</label>
                        <input className="input-field" type="number" value={editForm.enrolled_count || ''} onChange={e => setEditForm(p => ({ ...p, enrolled_count: e.target.value }))} placeholder="—" />
                      </div>
                      <div>
                        <label className="label">Capacity</label>
                        <input className="input-field" type="number" value={editForm.capacity || ''} onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value }))} placeholder="—" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input-field" style={{ maxWidth: 160 }} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                        {LAUNCH_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingId(null); setEditForm(null) }}
                        className="py-1.5 px-4 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        Cancel
                      </button>
                      <button onClick={handleEditSave} className="btn-brand">Update Launch</button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal row ── */
                  <div
                    className="group grid items-center px-4 py-3"
                    style={{ gridTemplateColumns: COL }}
                  >
                    {/* Offer */}
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">{launch.offer_name}</p>
                      {launch.offer_type && <p className="text-xs text-gray-400 mt-0.5">{launch.offer_type}</p>}
                      {(launch.start_date || launch.end_date) && (
                        <p className="text-xs text-gray-400">
                          {fmtDate(launch.start_date)}{launch.end_date ? ` – ${fmtDate(launch.end_date)}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      <LaunchStatusTag status={launch.status} />
                    </div>

                    {/* Revenue */}
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: revenue > 0 ? '#1a1a1a' : '#bbb' }}>
                        {revenue > 0 ? fmt(revenue) : '$—'}
                      </p>
                      {goal > 0 && <p className="text-xs text-gray-400 mt-0.5">Goal: {fmt(goal)}</p>}
                    </div>

                    {/* Enrolled */}
                    <div className="text-right">
                      {(enrolled > 0 || capacity > 0) ? (
                        <p className="text-sm font-semibold text-gray-800">
                          {enrolled > 0 ? enrolled : '—'}{capacity > 0 ? ` / ${capacity}` : ''}
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: '#bbb' }}>—</p>
                      )}
                    </div>

                    {/* Goal % */}
                    <div className="text-right pl-2">
                      {goalPct !== null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className="rounded-full overflow-hidden flex-shrink-0"
                            style={{ width: 48, height: 5, backgroundColor: 'var(--card-border)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${goalPct}%`, backgroundColor: BRAND }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{goalPct}%</span>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: '#bbb' }}>—</p>
                      )}
                    </div>

                    {/* Avg per client */}
                    <div className="text-right">
                      {avgPerClient !== null ? (
                        <p className="text-sm font-semibold text-gray-800">{fmt(avgPerClient)}</p>
                      ) : (
                        <p className="text-sm" style={{ color: '#bbb' }}>—</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 pl-2">
                      <div className="flex gap-1 transition-opacity">
                        <button
                          onClick={() => { setEditingId(launch.id); setEditForm({ ...launch }); setExpandedId(null) }}
                          className="edit-btn"
                        >
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(launch.id)} className="delete-btn">
                          <DeleteIcon />
                        </button>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : launch.id)}
                        className="text-xs font-semibold ml-1 flex-shrink-0 transition-colors"
                        style={{ color: isExpanded ? BRAND : '#aaa' }}
                      >
                        {isExpanded ? 'Close ▲' : 'Detail ▾'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Expandable detail panel ── */}
                {isExpanded && !isEditing && (
                  <div
                    className="px-4 py-4 space-y-4"
                    style={{ backgroundColor: '#fdf8f8', borderTop: '1px solid var(--card-border)' }}
                  >
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Revenue Secured', value: revenue > 0 ? fmt(revenue) : '$—' },
                        { label: 'Goal',            value: goal > 0 ? fmt(goal) : '$—' },
                        { label: 'Enrolled',        value: enrolled > 0 ? `${enrolled}${capacity > 0 ? ` of ${capacity}` : ''}` : '—' },
                        { label: 'Avg per Client',  value: avgPerClient !== null ? fmt(avgPerClient) : '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Notes & Reflections */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Notes & Reflections</p>
                      {editingNoteId === launch.id ? (
                        <div className="space-y-2">
                          <textarea
                            className="textarea-field"
                            rows={3}
                            value={noteValue}
                            onChange={e => setNoteValue(e.target.value)}
                            placeholder="What worked? What would you do differently? What will you carry forward?"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingNoteId(null); setNoteValue('') }}
                              className="py-1.5 px-3 border rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                              style={{ borderColor: 'var(--card-border)' }}
                            >
                              Cancel
                            </button>
                            <button onClick={() => handleNoteSave(launch.id)} className="btn-brand text-xs">
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {launch.notes || (
                              <span className="text-gray-300 italic">
                                What worked? What would you do differently? What will you carry forward?
                              </span>
                            )}
                          </p>
                          <button
                            onClick={() => { setEditingNoteId(launch.id); setNoteValue(launch.notes || '') }}
                            className="text-xs font-semibold mt-2"
                            style={{ color: BRAND }}
                          >
                            {launch.notes ? 'Edit note ↗' : '+ Add note ↗'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Insight strip ── */}
      {yearLaunches.length < 2 ? (
        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <p className="text-xs text-gray-400 italic">Add more launches to see patterns across your year.</p>
        </div>
      ) : (
        <div
          className="rounded-xl px-5 py-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Year Insights</p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Avg revenue / launch',   value: fmt(avgRevPerLaunch) },
              { label: 'Avg enrolments / launch', value: avgEnrolPerLaunch > 0 ? Math.round(avgEnrolPerLaunch).toString() : '—' },
              { label: 'Best performing quarter', value: bestQ.revenue > 0 ? `Q${bestQ.q}` : '—' },
              { label: 'Goal hit rate',           value: goalHitRate !== null ? `${goalHitRate}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-base font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────── */
export default function Cash() {
  const { user } = useAuth()

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
          <h1 className="text-2xl font-black text-gray-900">Cash</h1>
        </div>
        <p className="text-sm text-gray-500">
          Your offers, systems, and conversion processes: how visibility translates into consistent, scalable income.
        </p>
      </div>

      <RevenueSnapshot userId={user.id} />

      {/* Income Structure + Cash Forecast — 2-col grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <IncomeStructure userId={user.id} />
        <CashForecast userId={user.id} />
      </div>

      <QuarterlyReview userId={user.id} />
    </div>
  )
}
