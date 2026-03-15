import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

// ─── Constants ─────────────────────────────────────────────────────────────────

const BRAND = '#6B1010'

const SERVICE_TIERS = [
  { key: 'free', label: 'Free',        descriptor: 'Lead magnets, freebies, discovery calls',   color: '#e8a8a8', bg: '#fdf7f7' },
  { key: 'low',  label: 'Low Ticket',  descriptor: 'Workshops, templates, mini sessions',        color: '#c96868', bg: '#fdf3f3' },
  { key: 'mid',  label: 'Mid Ticket',  descriptor: 'Group programs, courses, memberships',       color: '#a03838', bg: '#f9eded' },
  { key: 'high', label: 'High Ticket', descriptor: '1:1 coaching, VIP, premium containers',     color: '#6B1010', bg: '#f5e8e8' },
]

const PRODUCT_TIERS = [
  { key: 'entry',        label: 'Entry Product',     descriptor: 'Low-cost intro; gets clients into the ecosystem', color: '#e8a8a8', bg: '#fdf7f7' },
  { key: 'subscription', label: 'Subscription',      descriptor: 'Recurring access; community, content, tools',    color: '#c96868', bg: '#fdf3f3' },
  { key: 'signature',    label: 'Signature Product', descriptor: 'Core transformation; their method in a box',     color: '#a03838', bg: '#f9eded' },
  { key: 'hero',         label: 'Hero Product',      descriptor: "The flagship; the one they're known for",        color: '#6B1010', bg: '#f5e8e8' },
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
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

// ─── Offer card ────────────────────────────────────────────────────────────────

function OfferCard({ offer, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="bg-white rounded-xl px-4 py-3.5 border border-[var(--card-border)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 mb-0.5">{offer.name}</p>
          {offer.description && (
            <p className="text-xs text-gray-500 leading-relaxed mb-1.5">{offer.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {offer.price && (
              <span className="text-sm font-bold" style={{ color: BRAND }}>{offer.price}</span>
            )}
            {offer.format && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--card-bg)] text-gray-500 border border-[var(--card-border)]">
                {offer.format}
              </span>
            )}
            <StatusPill status={offer.status} />
          </div>
        </div>

        {/* Delete button / inline confirm */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {confirming ? (
            <>
              <button
                onClick={() => onDelete(offer.id)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Confirm delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors text-base leading-none"
              title="Delete offer"
            >
              ✕
            </button>
          )}
        </div>
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
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ border: '1.5px dashed var(--card-border)', backgroundColor: 'var(--form-bg)' }}
    >
      {/* Name */}
      <div>
        <label className="label">{noun} Name</label>
        <input
          className="input-field"
          value={name}
          onChange={e => { setName(e.target.value); setNameError(null) }}
          placeholder={isProduct ? 'e.g. My Flagship Course' : 'e.g. 1:1 Coaching'}
          autoFocus
        />
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="label">Short Description</label>
        <textarea
          className="textarea-field"
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this about?"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Price */}
        <div>
          <label className="label">Price</label>
          <input
            className="input-field"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g. $297/mo"
          />
        </div>

        {/* Format */}
        <div>
          <label className="label">Format</label>
          <select className="input-field" value={format} onChange={e => setFormat(e.target.value)}>
            <option value="">Select...</option>
            {formats?.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
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
        <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>
          Save {noun}
        </button>
      </div>
    </div>
  )
}

// ─── Tier section ──────────────────────────────────────────────────────────────

function TierSection({ tier, offers, isProduct, onAdd, onDelete }) {
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const noun = isProduct ? 'product' : 'offer'

  const handleSave = (fields) => {
    onAdd({ tierKey: tier.key, ...fields })
    setShowForm(false)
  }

  const count = offers.length

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
      {/* Header — clicking expands/collapses */}
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
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--card-bg)', color: '#888', border: '1px solid var(--card-border)' }}
            >
              {count} {noun}{count !== 1 ? 's' : ''}
            </span>
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

      {/* Expanded body */}
      {open && (
        <div
          className="border-t space-y-2.5 p-4"
          style={{ borderColor: 'var(--card-border)', backgroundColor: tier.bg }}
        >
          {/* Existing offers */}
          {offers.map(offer => (
            <OfferCard key={offer.id} offer={offer} onDelete={onDelete} />
          ))}

          {/* Add form */}
          {showForm ? (
            <AddForm
              tierKey={tier.key}
              isProduct={isProduct}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-center transition-colors"
              style={{
                border: '1.5px dashed var(--card-border)',
                backgroundColor: 'transparent',
                color: '#aaa',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = BRAND; e.currentTarget.style.borderColor = BRAND }}
              onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = 'var(--card-border)' }}
            >
              + Add {noun}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, descriptor }) {
  return (
    <div className="mb-3">
      <p className="font-black text-sm text-gray-900 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{descriptor}</p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OfferSuite() {
  const { user } = useAuth()

  const [offers, setOffers] = useState([])
  const [mode, setMode] = useState('services')           // 'services' | 'products' | 'both'
  const [yearNotice, setYearNotice] = useState(null)     // dismissible banner text or null
  const [saveErrorMsg, setSaveErrorMsg] = useState(null) // auto-dismiss banner
  const saveErrorTimer = useRef(null)

  const userId = user?.id

  // ── Load from localStorage on mount — single read, no re-fetch ──────────────

  useEffect(() => {
    if (!userId) return

    // Load persisted mode
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
            <h1 className="text-2xl font-black text-gray-900">Product & Service Suite</h1>
          </div>
          <p className="text-sm text-gray-500">
            Map your full offer stack across services and products.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-gray-100 flex-shrink-0">
          {[
            { key: 'services', label: 'Services' },
            { key: 'products', label: 'Products' },
            { key: 'both',     label: 'Both' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={mode === key
                ? { backgroundColor: '#fff', color: BRAND, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { backgroundColor: 'transparent', color: '#9CA3AF' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Year reset notice */}
      {yearNotice && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">{yearNotice}</p>
          <button
            onClick={() => setYearNotice(null)}
            className="text-amber-400 hover:text-amber-600 text-xl leading-none flex-shrink-0"
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
        <div className="card-section space-y-3">
          <SectionHeader
            label="Services"
            descriptor="Your time-for-value offers, coaching, and programs"
          />
          {SERVICE_TIERS.map(tier => (
            <TierSection
              key={tier.key}
              tier={tier}
              offers={offersFor('services', tier.key)}
              isProduct={false}
              onAdd={(fields) => handleAdd('services', fields)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Products tiers */}
      {(mode === 'products' || mode === 'both') && (
        <div className="card-section space-y-3">
          <SectionHeader
            label="Products"
            descriptor="Your scalable digital offers and recurring revenue streams"
          />
          {PRODUCT_TIERS.map(tier => (
            <TierSection
              key={tier.key}
              tier={tier}
              offers={offersFor('products', tier.key)}
              isProduct={true}
              onAdd={(fields) => handleAdd('products', fields)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

    </div>
  )
}
