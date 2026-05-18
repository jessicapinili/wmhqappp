import { useState, useEffect, useMemo } from 'react'
import {
  getMoneyDashboardConstants,
  upsertMoneyDashboardConstants,
  getBaselineFixedCosts,
  saveBaselineFixedCosts,
} from '../lib/moneyDashboardService'
import {
  PRODUCT_CONSTANT_DEFAULTS,
  SERVICE_CONSTANT_DEFAULTS,
  baselineWeeklyTotal,
  toWeekly,
  fmt,
} from '../lib/moneyDashboardCalc'

const BRAND = '#6B1020'

const DEFAULT_FIXED_COSTS = [
  { name: 'Rent / workspace',            amount: 0, frequency: 'monthly' },
  { name: 'Software / subscriptions',    amount: 0, frequency: 'monthly' },
  { name: 'Team / contractors (retainer)', amount: 0, frequency: 'monthly' },
  { name: 'Insurance',                   amount: 0, frequency: 'annually' },
  { name: 'Accounting / bookkeeping',    amount: 0, frequency: 'monthly' },
  { name: 'Phone / internet',            amount: 0, frequency: 'monthly' },
]

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'annually']

// ─── Input components ─────────────────────────────────────────────────────────

function CurrencyInput({ label, hint, value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}>$</span>
        <input
          type="number"
          min="0"
          value={value === '' ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          style={{
            width: '100%', padding: '11px 14px 11px 26px', fontSize: '14px',
            background: '#FAF7F2', border: '0.5px solid rgba(0,0,0,0.12)',
            borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      {hint && <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

function NumberInput({ label, hint, value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
        {label}
      </label>
      <input
        type="number"
        min="0"
        value={value === '' ? '' : value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="0"
        style={{
          width: '100%', padding: '11px 14px', fontSize: '14px',
          background: '#FAF7F2', border: '0.5px solid rgba(0,0,0,0.12)',
          borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
      />
      {hint && <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

// ─── Fixed cost row ───────────────────────────────────────────────────────────

function FixedCostRow({ cost, onChange, onRemove }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 140px 28px', gap: '8px', alignItems: 'end' }}>
      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
          Cost name
        </label>
        <input
          type="text"
          value={cost.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="e.g. Software"
          style={{
            width: '100%', padding: '11px 14px', fontSize: '14px',
            background: '#FAF7F2', border: '0.5px solid rgba(0,0,0,0.12)',
            borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
          Amount
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}>$</span>
          <input
            type="number"
            min="0"
            value={cost.amount === '' ? '' : cost.amount}
            onChange={e => onChange('amount', e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            style={{
              width: '100%', padding: '11px 14px 11px 22px', fontSize: '14px',
              background: '#FAF7F2', border: '0.5px solid rgba(0,0,0,0.12)',
              borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
          Frequency
        </label>
        <select
          value={cost.frequency}
          onChange={e => onChange('frequency', e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', fontSize: '14px',
            background: '#FAF7F2', border: '0.5px solid rgba(0,0,0,0.12)',
            borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          {FREQUENCIES.map(f => (
            <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
          ))}
        </select>
      </div>
      <button
        onClick={onRemove}
        title="Remove"
        style={{
          width: '28px', height: '28px', borderRadius: '6px', border: '0.5px solid rgba(0,0,0,0.12)',
          background: '#FAF7F2', color: 'rgba(0,0,0,0.4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
          marginBottom: '1px',
        }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Weekly baseline summary banner ──────────────────────────────────────────

function WeeklyBaselineBanner({ costs, currency }) {
  const weeklyTotal = useMemo(() => baselineWeeklyTotal(costs), [costs])
  const monthlyTotal = weeklyTotal * (52 / 12)

  return (
    <div style={{
      background: '#FAF7F2', borderRadius: '12px', padding: '18px 20px',
      borderTop: '0.5px solid rgba(0,0,0,0.08)', borderRight: '0.5px solid rgba(0,0,0,0.08)',
      borderBottom: '0.5px solid rgba(0,0,0,0.08)', borderLeft: `3px solid ${BRAND}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '2px' }}>
          Your weekly baseline
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)' }}>Auto-includes in every weekly review.</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 500, color: '#1A1A1A' }}>
          {currency} ${Math.round(weeklyTotal).toLocaleString()} <span style={{ fontSize: '14px', color: 'rgba(0,0,0,0.5)' }}>/ week</span>
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', marginTop: '2px' }}>
          {currency} ${Math.round(monthlyTotal).toLocaleString()} / month
        </p>
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ eyebrow, children }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px',
      border: '0.5px solid rgba(0,0,0,0.12)',
    }}>
      {eyebrow && (
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '16px' }}>
          {eyebrow}
        </p>
      )}
      {children}
    </div>
  )
}

// ─── Main Baseline page ───────────────────────────────────────────────────────

export default function MoneyDashboardBaseline({ settings }) {
  const { user_id, business_model: model, preferred_currency } = settings
  const isProduct = model === 'product'
  const currency = preferred_currency || 'AUD'

  const [constants, setConstants] = useState(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS)
  const [fixedCosts, setFixedCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [originalConstants, setOriginalConstants] = useState(null)
  const [originalFixedCosts, setOriginalFixedCosts] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [savedConstants, existingCosts] = await Promise.all([
        getMoneyDashboardConstants(user_id, model),
        getBaselineFixedCosts(user_id),
      ])

      const mergedConstants = {
        ...(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS),
        ...(savedConstants || {}),
      }
      setConstants(mergedConstants)
      setOriginalConstants(mergedConstants)

      // Seed default rows for new users (no existing rows)
      if (existingCosts.length === 0) {
        setFixedCosts(DEFAULT_FIXED_COSTS.map((c, i) => ({ ...c, _key: i })))
        setOriginalFixedCosts([])
      } else {
        const withKeys = existingCosts.map((c, i) => ({ ...c, _key: c.id || i }))
        setFixedCosts(withKeys)
        setOriginalFixedCosts(withKeys)
      }
      setLoading(false)
    }
    load()
  }, [user_id, model])

  const setConst = (key, val) => setConstants(prev => ({ ...prev, [key]: val }))

  const updateCostRow = (index, field, value) => {
    setFixedCosts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const removeCostRow = (index) => {
    setFixedCosts(prev => prev.filter((_, i) => i !== index))
  }

  const addCostRow = () => {
    setFixedCosts(prev => [...prev, { name: '', amount: 0, frequency: 'monthly', _key: Date.now() }])
  }

  const handleCancel = () => {
    setConstants(originalConstants || (isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS))
    setFixedCosts(originalFixedCosts)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all([
        upsertMoneyDashboardConstants(user_id, model, constants),
        saveBaselineFixedCosts(user_id, fixedCosts.filter(c => c.name.trim())),
      ])
      const freshCosts = await getBaselineFixedCosts(user_id)
      const withKeys = freshCosts.map((c, i) => ({ ...c, _key: c.id || i }))
      setFixedCosts(withKeys)
      setOriginalFixedCosts(withKeys)
      setOriginalConstants(constants)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      alert('Failed to save baseline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '32px', height: '32px', border: `4px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
          WMHQ TOOLS · MONEY DASHBOARD
        </p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 500, color: '#1A1A1A', marginBottom: '4px' }}>
          Your baseline numbers
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6 }}>
          Set once. Update only when something changes. Pulls into every weekly review automatically.
        </p>
      </div>

      {/* ── Capacity baseline card ── */}
      <Card eyebrow="Capacity baseline">
        {isProduct ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <NumberInput
              label="Monthly unit capacity"
              hint="Max units you can ship per month"
              value={constants.monthly_unit_capacity}
              onChange={v => setConst('monthly_unit_capacity', v)}
            />
            <NumberInput
              label="Available hours / week"
              hint="Your total working hours per week"
              value={constants.available_hours_per_week}
              onChange={v => setConst('available_hours_per_week', v)}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <NumberInput
              label="Max clients at one time"
              hint="How many active clients you can hold at once"
              value={constants.max_client_capacity}
              onChange={v => setConst('max_client_capacity', v)}
            />
            <NumberInput
              label="Available hours / week"
              hint="Your total working hours per week"
              value={constants.available_hours_per_week}
              onChange={v => setConst('available_hours_per_week', v)}
            />
          </div>
        )}
      </Card>

      {/* ── Per-unit costs (product only) ── */}
      {isProduct && (
        <Card eyebrow="Per-unit costs">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <CurrencyInput
              label="Packaging / unit"
              hint="Boxes, labels, inserts, tape"
              value={constants.packaging_cost_per_unit}
              onChange={v => setConst('packaging_cost_per_unit', v)}
            />
            <CurrencyInput
              label="Fulfilment / unit"
              hint="Pick, pack, ship, courier"
              value={constants.fulfillment_cost_per_unit}
              onChange={v => setConst('fulfillment_cost_per_unit', v)}
            />
          </div>
        </Card>
      )}

      {/* ── Fixed running costs card ── */}
      <Card eyebrow="Fixed running costs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {fixedCosts.map((cost, i) => (
            <FixedCostRow
              key={cost._key ?? i}
              cost={cost}
              onChange={(field, val) => updateCostRow(i, field, val)}
              onRemove={() => removeCostRow(i)}
            />
          ))}
        </div>

        <button
          onClick={addCostRow}
          style={{
            marginTop: '14px', fontSize: '13px', fontWeight: 500,
            color: BRAND, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          + Add another fixed cost
        </button>
      </Card>

      {/* ── Weekly baseline summary ── */}
      <WeeklyBaselineBanner costs={fixedCosts} currency={currency} />

      {/* ── Save / Cancel ── */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
        <button
          onClick={handleCancel}
          style={{
            background: 'white', color: 'rgba(0,0,0,0.6)', border: '0.5px solid rgba(0,0,0,0.12)',
            fontSize: '13px', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#9B7E85' : BRAND, color: 'white', border: 'none',
            fontSize: '13px', fontWeight: 500, padding: '10px 24px',
            borderRadius: '8px', letterSpacing: '0.04em', textTransform: 'uppercase',
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {saved ? (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 7l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </>
          ) : saving ? 'Saving…' : 'Save baseline'}
        </button>
      </div>

    </div>
  )
}
