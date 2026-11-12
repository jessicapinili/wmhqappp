import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DeleteIcon } from '../lib/icons'

// ─── Constants ─────────────────────────────────────────────────────────────────

const BRAND = '#3d0c0c'

const SERVICE_TIERS = [
  { key: 'free', label: 'Free',        descriptor: 'Lead magnets, freebies, discovery calls',   color: '#e8a8a8', bg: '#f7f7f7' },
  { key: 'low',  label: 'Low Ticket',  descriptor: 'Workshops, templates, mini sessions',        color: '#c96868', bg: '#f7f7f7' },
  { key: 'mid',  label: 'Mid Ticket',  descriptor: 'Group programs, courses, memberships',       color: '#a03838', bg: '#f7f7f7' },
  { key: 'high', label: 'High Ticket', descriptor: '1:1 coaching, VIP, premium containers',     color: '#3d0c0c', bg: '#f7f7f7' },
]

const PRODUCT_TIERS = [
  { key: 'entry',        label: 'Entry Product',     descriptor: 'Low-cost intro; gets clients into the ecosystem', color: '#e8a8a8', bg: '#f7f7f7' },
  { key: 'subscription', label: 'Subscription',      descriptor: 'Recurring access; community, content, tools',    color: '#c96868', bg: '#f7f7f7' },
  { key: 'signature',    label: 'Signature Product', descriptor: 'Core transformation; their method in a box',     color: '#a03838', bg: '#f7f7f7' },
  { key: 'hero',         label: 'Hero Product',      descriptor: "The flagship; the one they're known for",        color: '#3d0c0c', bg: '#f7f7f7' },
]

const SERVICE_FORMATS = {
  free:  ['Discovery call', 'Lead magnet', 'Free workshop', 'Email sequence', 'Other'],
  low:   ['Workshop', 'Mini course', 'Template', '1-hour session', 'Other'],
  mid:   ['Group program', 'Membership', 'Online course', 'Mastermind', 'Other'],
  high:  ['1:1 Coaching', 'VIP Day', 'Retainer', 'Premium container', 'Other'],
}

const PRODUCT_FORMATS = {
  hero:         ['Online course', 'Digital product', 'Toolkit', 'Framework', 'Other'],
  signature:    ['Workbook', 'Mini course', 'Bundle', 'Masterclass', 'Other'],
  subscription: ['Monthly', 'Quarterly', 'Annual', 'Lifetime'],
  entry:        ['PDF / Guide', 'Template pack', 'Ebook', 'Mini course', 'Other'],
}

const STATUS_OPTIONS = ['Active', 'Paused', 'Coming soon']
const STATUS_STYLES = {
  'Active':      { bg: '#E8F5EE', color: '#1a6b45' },
  'Paused':      { bg: '#FFF3DC', color: '#8A5E00' },
  'Coming soon': { bg: '#EEEDFE', color: '#3C3489' },
}

// ─── Storage helpers (localStorage under window.storage semantics) ─────────────

const ls = {
  get(key) {
    try { return localStorage.getItem(key) } catch { return null }
  },
  set(key, value) {
    localStorage.setItem(key, value)
  },
}

function genId() {
  try { return crypto.randomUUID() }
  catch { return `offer_${Date.now()}_${Math.random().toString(36).slice(2)}` }
}

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Active']
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

// ─── Offer card ────────────────────────────────────────────────────────────────

function OfferCard({ offer, onDelete }) {
  return (
    <div className="group py-2.5" style={{ borderBottom: '1px solid #f3ece8' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ fontWeight: 600, color: BRAND }}>{offer.name}</p>
          {offer.description && <p className="text-xs mt-0.5" style={{ color: '#6b5a5a', lineHeight: 1.45 }}>{offer.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {offer.price && <span className="text-xs font-bold" style={{ color: BRAND }}>{offer.price}</span>}
            {offer.format && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5efec', color: '#6b5a5a' }}>{offer.format}</span>}
            <StatusPill status={offer.status} />
          </div>
        </div>
        <button onClick={() => onDelete(offer.id)} className="delete-btn flex-shrink-0 opacity-60 group-hover:opacity-100" title="Delete offer"><DeleteIcon /></button>
      </div>
    </div>
  )
}

// ─── Add form ──────────────────────────────────────────────────────────────────

function AddForm({ tierKey, isProduct, onSave, onCancel }) {
  const formats = isProduct ? PRODUCT_FORMATS[tierKey] : SERVICE_FORMATS[tierKey]
  const noun = isProduct ? 'Product' : 'Offer'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [format, setFormat] = useState('')
  const [status, setStatus] = useState('Active')
  const [nameError, setNameError] = useState(null)

  const handleSave = () => {
    if (!name.trim()) { setNameError('Offer name is required'); return }
    onSave({ name: name.trim(), description, price, format, status })
  }

  return (
    <div className="rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #d9cec6' }}>
      <div className="px-4 py-3" style={{ backgroundColor: '#f3ece6', borderBottom: '1px solid #d9cec6', borderTopLeftRadius: 7, borderTopRightRadius: 7 }}>
        <p className="text-sm font-bold" style={{ color: '#1a0606' }}>{isProduct ? 'Product' : 'Offer'} details</p>
        <p className="text-xs mt-0.5" style={{ color: '#6b5a52' }}>The what, how much and where it’s at.</p>
      </div>
      <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">{noun} Name</label>
          <input className="input-field" value={name} onChange={e => { setName(e.target.value); setNameError(null) }} autoFocus />
          {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Short Description (optional)</label>
          <textarea className="textarea-field" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Format</label>
          <select className="input-field" value={format} onChange={e => setFormat(e.target.value)}>
            <option value="">Select...</option>
            {formats?.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Price (optional)</label>
          <input className="input-field" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end pt-1">
          <button onClick={onCancel} className="btn-cancel">Cancel</button>
          <button onClick={handleSave} className="btn-brand">Save {noun}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Tier section ──────────────────────────────────────────────────────────────

function TierSection({ tier, step, offers, isProduct, onAdd, onDelete, view }) {
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const noun = isProduct ? 'product' : 'offer'
  const count = offers.length
  const handleSave = (fields) => { onAdd({ tierKey: tier.key, ...fields }); setShowForm(false) }

  const header = (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600, fontSize: '15px', color: BRAND }}>{tier.label}</p>
        <p className="text-xs mt-0.5" style={{ color: '#b8a898' }}>{tier.descriptor}</p>
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#f5efec', color: '#9c7070' }}>
        {count} {noun}{count !== 1 ? 's' : ''}
      </span>
    </div>
  )

  const body = (
    <div className="mt-2">
      {offers.map(offer => <OfferCard key={offer.id} offer={offer} onDelete={onDelete} />)}
      {showForm ? (
        <div className="mt-3"><AddForm tierKey={tier.key} isProduct={isProduct} onSave={handleSave} onCancel={() => setShowForm(false)} /></div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-2 text-xs font-semibold hover:underline" style={{ color: '#9c7070', textUnderlineOffset: '2px' }}>
          + Add {noun}
        </button>
      )}
    </div>
  )

  if (view === 'cards') {
    return (
      <div className="flex flex-col" style={{ backgroundColor: `${tier.color}12`, border: `1.5px dashed ${tier.color}`, borderRadius: '8px', padding: '16px 18px' }}>
        {header}
        {body}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: `${tier.color}12`, border: `1.5px dashed ${tier.color}`, borderRadius: '8px', padding: '14px 16px' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left">
        <div className="flex items-center gap-2">
          <div className="flex-1">{header}</div>
          <span className="text-xs flex-shrink-0" style={{ color: '#b8a898' }}>{open ? '▴' : '▾'}</span>
        </div>
      </button>
      {open && body}
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, descriptor }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#b8a898' }}>{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{descriptor}</p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OfferSuite() {
  const { user } = useAuth()

  const [offers, setOffers] = useState([])
  const [mode, setMode] = useState('services')           // 'services' | 'products' | 'both'
  const [view, setView] = useState('cards')              // 'cards' | 'list'
  const [yearNotice, setYearNotice] = useState(null)     // dismissible banner text or null
  const [saveErrorMsg, setSaveErrorMsg] = useState(null) // auto-dismiss banner
  const saveErrorTimer = useRef(null)

  const userId = user?.id

  // ── Load from localStorage on mount — single read, no re-fetch ──────────────

  useEffect(() => {
    if (!userId) return

    // Load persisted mode
    const savedView = ls.get(`offerView:${userId}`)
    if (savedView === 'cards' || savedView === 'list') setView(savedView)
    const savedMode = ls.get(`offerMode:${userId}`)
    if (savedMode === 'services' || savedMode === 'products' || savedMode === 'both') {
      setMode(savedMode)
    }

    // Load offers
    let array = []
    try {
      const raw = ls.get(`offers:${userId}`)
      const parsed = raw ? JSON.parse(raw) : []
      // Defensive: filter out any offers that don't belong to this user
      array = parsed.filter(o => o.userId === userId)
    } catch {
      array = []
    }

    // Year reset check
    if (array.length > 0) {
      const sorted = [...array].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const lastYear = sorted[0]?.yearCreated
      const currentYear = new Date().getFullYear()

      if (lastYear && lastYear < currentYear) {
        // Clear all offers for this user — new year has started
        array = []
        try { ls.set(`offers:${userId}`, '[]') } catch { /* silent */ }
        setYearNotice(`A new year has started — your offer suite has been cleared. Time to build your ${currentYear} lineup.`)
      }
    }

    setOffers(array)
  }, [userId])

  // ── Persist offers to localStorage ──────────────────────────────────────────

  const persistOffers = (updated) => {
    try {
      ls.set(`offers:${userId}`, JSON.stringify(updated))
    } catch {
      // Show a 4-second save error banner
      if (saveErrorTimer.current) clearTimeout(saveErrorTimer.current)
      setSaveErrorMsg('Unable to save — please try again.')
      saveErrorTimer.current = setTimeout(() => setSaveErrorMsg(null), 4000)
    }
  }

  // ── Mode toggle with persistence ─────────────────────────────────────────────

  const handleViewChange = (v) => {
    setView(v)
    try { ls.set(`offerView:${userId}`, v) } catch { /* silent */ }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    try { ls.set(`offerMode:${userId}`, newMode) } catch { /* silent */ }
  }

  // ── Add offer ────────────────────────────────────────────────────────────────

  const handleAdd = (businessType, fields) => {
    const now = new Date()
    const offer = {
      id:           genId(),
      userId,
      businessType,
      tier:         fields.tierKey,
      name:         fields.name,
      description:  fields.description || '',
      price:        fields.price       || '',
      format:       fields.format      || '',
      status:       fields.status      || 'Active',
      createdAt:    now.toISOString(),
      yearCreated:  now.getFullYear(),
    }
    const updated = [...offers, offer]
    setOffers(updated)
    persistOffers(updated)
  }

  // ── Delete offer ─────────────────────────────────────────────────────────────

  const handleDelete = (id) => {
    const updated = offers.filter(o => o.id !== id)
    setOffers(updated)
    persistOffers(updated)
  }

  // ── Filtered helpers ─────────────────────────────────────────────────────────

  const offersFor = (businessType, tierKey) =>
    offers.filter(o => o.businessType === businessType && o.tier === tierKey)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
            <h1 className="page-title">Product & Service Suite</h1>
          </div>
          <p className="text-sm text-gray-500">
            Map your full offer stack across services and products.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {/* Mode toggle */}
        <div className="inline-flex rounded-full p-0.5" style={{ backgroundColor: '#ebe4e0' }}>
          {[
            { key: 'services', label: 'Services' },
            { key: 'products', label: 'Products' },
            { key: 'both',     label: 'Both' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              style={{ fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '999px', color: mode === key ? BRAND : '#9c8a80', backgroundColor: mode === key ? '#fff' : 'transparent', boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
            >
              {label}
            </button>
          ))}
        </div>
        {/* View toggle */}
        <div className="inline-flex rounded-full p-0.5" style={{ backgroundColor: '#ebe4e0' }}>
          {[['cards', 'Cards'], ['list', 'List']].map(([k, l]) => (
            <button key={k} onClick={() => handleViewChange(k)}
              style={{ fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '999px', color: view === k ? BRAND : '#9c8a80', backgroundColor: view === k ? '#fff' : 'transparent', boxShadow: view === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
          ))}
        </div>
        </div>
      </div>

      {/* Year reset notice */}
      {yearNotice && (
        <div className="insight-box flex items-center justify-between gap-3">
          <p>{yearNotice}</p>
          <button
            onClick={() => setYearNotice(null)}
            className="flex-shrink-0 opacity-40 hover:opacity-70 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Save error banner (auto-dismiss) */}
      {saveErrorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {saveErrorMsg}
        </div>
      )}

      {/* Services tiers */}
      {(mode === 'services' || mode === 'both') && (
        <div>
          <SectionHeader
            label="Services"
            descriptor="Your time-for-value offers, coaching, and programs"
          />
          <div className={view === 'cards' ? 'grid gap-3 md:grid-cols-2 items-start' : 'space-y-2.5'}>
          {SERVICE_TIERS.map((tier, i) => (
            <TierSection
              key={tier.key}
              tier={tier}
              step={i + 1}
              view={view}
              offers={offersFor('services', tier.key)}
              isProduct={false}
              onAdd={(fields) => handleAdd('services', fields)}
              onDelete={handleDelete}
            />
          ))}
          </div>
        </div>
      )}

      {/* Products tiers */}
      {(mode === 'products' || mode === 'both') && (
        <div>
          <SectionHeader
            label="Products"
            descriptor="Your scalable digital offers and recurring revenue streams"
          />
          <div className={view === 'cards' ? 'grid gap-3 md:grid-cols-2 items-start' : 'space-y-2.5'}>
          {PRODUCT_TIERS.map((tier, i) => (
            <TierSection
              key={tier.key}
              tier={tier}
              step={i + 1}
              view={view}
              offers={offersFor('products', tier.key)}
              isProduct={true}
              onAdd={(fields) => handleAdd('products', fields)}
              onDelete={handleDelete}
            />
          ))}
          </div>
        </div>
      )}

    </div>
  )
}
