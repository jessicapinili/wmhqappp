import { useState, useEffect, useMemo, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import {
  getWeekDates,
  getPreviousWeekDates,
  getMoneyDashboardConstants,
  getMoneyDashboardEntryForWeek,
  upsertMoneyDashboardEntry,
  getMoneyDashboardEntries,
  getBaselineFixedCosts,
  getWeeklyVariableExpenses,
  saveWeeklyVariableExpenses,
  upsertMoneyDashboardSettings,
} from '../lib/moneyDashboardService'
import {
  PRODUCT_CONSTANT_DEFAULTS,
  SERVICE_CONSTANT_DEFAULTS,
  PRODUCT_WEEKLY_DEFAULTS,
  SERVICE_WEEKLY_DEFAULTS,
  calcProduct,
  calcService,
  baselineWeeklyTotal,
  toWeekly,
  healthTag,
  computeStreak,
  generateWeeklyDebrief,
  fmt,
} from '../lib/moneyDashboardCalc'
import { EXPLANATIONS } from '../lib/wmhq-explanations'

const BRAND = '#6B1020'
const BEIGE = '#FAF7F2'
const CURRENCIES = ['AUD', 'NZD', 'USD', 'EUR', 'CAD', 'GBP', 'SGD']

const VARIABLE_CATEGORIES = [
  'Travel',
  'Professional development',
  'Contractor (one-off)',
  'Equipment',
  'Meals + entertainment',
  'Banking + fees',
  'Tax / GST set-aside',
  'Other',
]

// ─── Shared input primitives ──────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: '14px', background: BEIGE,
  border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '8px',
  fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
}

function CurrencyInput({ label, hint, value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}>$</span>
        <input
          type="number" min="0"
          value={value === '' ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          style={{ ...inputStyle, paddingLeft: '26px' }}
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
        type="number" min="0"
        value={value === '' ? '' : value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="0"
        style={inputStyle}
        onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
      />
      {hint && <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

// ─── Step card wrapper ────────────────────────────────────────────────────────

function StepCard({ step, title, subtitle, children, extraLabel, extraChildren }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, color: '#1A1A1A', marginBottom: '4px' }}>
            {step}. {title}
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)' }}>{subtitle}</p>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
          STEP {step} / 4
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
      {extraChildren && (
        <div style={{ marginTop: '14px' }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ fontSize: '13px', fontWeight: 500, color: BRAND, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? '− Show less' : `+ ${extraLabel || 'Add more details'}`}
          </button>
          {expanded && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {extraChildren}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Live "at a glance" panel ─────────────────────────────────────────────────

function AtAGlancePanel({ revenue, grossProfit, netProfit, netMargin, directCosts, operatingExpenses, totalCosts, currency }) {
  const fmtC = (v) => {
    const num = Number(v || 0)
    return `${currency} $${Math.round(Math.abs(num)).toLocaleString()}`
  }
  const fmtPct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`

  const metricStyle = (val, isNet = false) => ({
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '20px',
    fontWeight: 500,
    color: isNet ? (val >= 0 ? '#27500A' : '#A32D2D') : '#1A1A1A',
  })

  return (
    <div style={{
      background: BEIGE, borderRadius: '12px', padding: '18px 20px',
      borderTop: '0.5px solid rgba(0,0,0,0.08)',
      borderRight: '0.5px solid rgba(0,0,0,0.08)',
      borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      borderLeft: `3px solid ${BRAND}`,
    }}>
      <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: BRAND, marginBottom: '14px' }}>
        YOUR WEEK AT A GLANCE
      </p>

      {/* Top row: 4 key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'Revenue', value: fmtC(revenue), raw: revenue },
          { label: 'Gross profit', value: fmtC(grossProfit), raw: grossProfit },
          { label: 'Net profit', value: fmtC(netProfit), raw: netProfit, isNet: true },
          { label: 'Net margin', value: fmtPct(netMargin), raw: netProfit, isNet: true },
        ].map(({ label, value, raw, isNet }) => (
          <div key={label}>
            <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>{label}</p>
            <p style={metricStyle(raw, isNet)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: `rgba(107,16,32,0.12)`, margin: '12px 0' }} />

      {/* Bottom row: 3 cost metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Direct costs', value: fmtC(directCosts) },
          { label: 'Operating expenses', value: fmtC(operatingExpenses) },
          { label: 'Total costs', value: fmtC(totalCosts) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, color: '#1A1A1A' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Financial snapshot card (unchanged visually) ─────────────────────────────

function SnapshotCard({ label, value, metricKey, metricValue, explanation, simpleMode }) {
  const htag = metricKey ? healthTag(metricKey, metricValue) : null
  const [expanded, setExpanded] = useState(false)
  const exp = explanation ? (simpleMode ? explanation.simple : explanation.expert) : null
  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9ca3af' }}>{label}</p>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 500, color: '#1A1A1A' }}>{value}</p>
        {htag && (
          <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '14px', width: 'fit-content', color: htag.color, background: htag.bg }}>
            {htag.label}
          </span>
        )}
      </div>
      {exp && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.06)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <span style={{ fontSize: '11px', fontWeight: 500, color: BRAND }}>How is this calculated?</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9ca3af', flexShrink: 0 }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {expanded && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {exp.howItWorks && (
                <div style={{ borderRadius: '8px', padding: '12px', background: '#f9f7f5' }}>
                  <p style={{ fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', marginBottom: '6px' }}>How it works</p>
                  <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6 }}>{exp.howItWorks}</p>
                </div>
              )}
              {exp.whyItMatters && (
                <div style={{ borderRadius: '8px', padding: '12px', background: '#f9f7f5' }}>
                  <p style={{ fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', marginBottom: '6px' }}>Why it matters</p>
                  <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6 }}>{exp.whyItMatters}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Mini bar chart (unchanged) ───────────────────────────────────────────────

function MiniBarChart({ entries, metric = 'revenue', currency = 'AUD' }) {
  if (!entries || entries.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: '#d1d5db', fontSize: '14px' }}>No saved weeks yet</div>
  }
  const getVal = (e) => Number(e.entry_json?.[metric] || 0)
  const values = entries.map(getVal)
  const max = Math.max(...values, 1)
  const display = [...entries].reverse()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
      {display.map((entry, i) => {
        const val = getVal(entry)
        const h = max > 0 ? (val / max) * 100 : 0
        const label = entry.entry_week_start_date ? format(parseISO(entry.entry_week_start_date), 'd MMM') : ''
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '60px' }}>
              <div
                title={`${label}: ${currency} $${val.toLocaleString()}`}
                style={{ width: '100%', height: `${Math.max(h, val > 0 ? 4 : 0)}%`, background: BRAND, borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height 0.3s ease' }}
              />
            </div>
            <span style={{ fontSize: '9px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Weekly debrief (unchanged visually) ─────────────────────────────────────

function WeeklyDebrief({ points }) {
  const iconMap = { positive: '↑', warning: '↗', watch: '→', risk: '!', neutral: '·' }
  const colorMap = { positive: '#059669', warning: '#D97706', watch: '#6B7280', risk: '#DC2626', neutral: '#9CA3AF' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {points.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 900, marginTop: '2px', flexShrink: 0, width: '16px', textAlign: 'center', color: colorMap[p.type] }}>{iconMap[p.type]}</span>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{p.text}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Step 4: Operating expenses ───────────────────────────────────────────────

function OperatingExpensesStep({ baselineCosts, variableExpenses, onAddExpense, onUpdateExpense, onRemoveExpense, onGoToBaseline }) {
  const weeklyTotal = useMemo(() => baselineWeeklyTotal(baselineCosts), [baselineCosts])
  const variableTotal = useMemo(() => variableExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [variableExpenses])
  const totalOpex = weeklyTotal + variableTotal
  const amountRefs = useRef([])

  const handleQuickAdd = (category) => {
    onAddExpense(category)
    // Focus will be handled after state update
    setTimeout(() => {
      const lastRef = amountRefs.current[variableExpenses.length]
      if (lastRef) lastRef.focus()
    }, 50)
  }

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, color: '#1A1A1A', marginBottom: '4px' }}>
            4. Operating expenses
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)' }}>Everything else it costs to run the business.</p>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>STEP 4 / 4</span>
      </div>

      {/* Block A: Baseline reminder banner */}
      <div style={{ background: '#FAEEDA', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '13px', color: '#7a5c10' }}>
          From your baseline: auto-included in your total.
        </p>
        <button
          onClick={onGoToBaseline}
          style={{ fontSize: '12px', fontWeight: 500, color: BRAND, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', marginLeft: '12px' }}
        >
          Edit baseline →
        </button>
      </div>

      {/* Block B: Baseline cost list (read-only) */}
      {baselineCosts.length > 0 ? (
        <div style={{ marginBottom: '16px' }}>
          {baselineCosts.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < baselineCosts.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)' }}>{c.name}</span>
              <span style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                ${Math.round(toWeekly(c.amount, c.frequency)).toLocaleString()} / wk
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', marginTop: '4px', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>Baseline total / week</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>${Math.round(weeklyTotal).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 0', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)' }}>No baseline costs set. <button onClick={onGoToBaseline} style={{ color: BRAND, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}>Set up baseline →</button></p>
        </div>
      )}

      {/* Block C: Variable expenses */}
      <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '10px' }}>
          Variable expenses this week
        </p>

        {variableExpenses.map((exp, i) => (
          <div key={exp._key ?? i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 28px', gap: '8px', alignItems: 'end', marginBottom: '8px' }}>
            <div>
              <select
                value={exp.category}
                onChange={e => onUpdateExpense(i, 'category', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {VARIABLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}>$</span>
              <input
                ref={el => amountRefs.current[i] = el}
                type="number" min="0"
                value={exp.amount === '' ? '' : exp.amount}
                onChange={e => onUpdateExpense(i, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={{ ...inputStyle, paddingLeft: '26px' }}
                onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <button
              onClick={() => onRemoveExpense(i)}
              style={{ width: '28px', height: '28px', borderRadius: '6px', border: '0.5px solid rgba(0,0,0,0.12)', background: BEIGE, color: 'rgba(0,0,0,0.4)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1px' }}
            >×</button>
          </div>
        ))}

        {/* Quick-add tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {['Travel', 'Dev', 'Contractor', 'Equipment', 'Other'].map(tag => (
            <button
              key={tag}
              onClick={() => handleQuickAdd(tag === 'Dev' ? 'Professional development' : tag === 'Contractor' ? 'Contractor (one-off)' : tag)}
              style={{ fontSize: '12px', fontWeight: 500, color: BRAND, background: '#fdf5f5', border: '0.5px solid rgba(107,16,32,0.15)', borderRadius: '14px', padding: '4px 10px', cursor: 'pointer' }}
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Block D: Section totals */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)' }}>Variable subtotal</span>
          <span style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)' }}>${Math.round(variableTotal).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>Total operating expenses</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>${Math.round(totalOpex).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main weekly component ────────────────────────────────────────────────────

export default function MoneyDashboardWeekly({ settings, onViewTrends, onGoToBaseline, simpleMode = false, onToggleSimpleMode }) {
  const { user_id, business_model: model, preferred_currency } = settings
  const isProduct = model === 'product'

  const currentWeek = useMemo(() => getWeekDates(), [])
  const [activeWeek, setActiveWeek] = useState(currentWeek)
  const [showBackfillModal, setShowBackfillModal] = useState(false)
  const [currency, setCurrency] = useState(preferred_currency || 'AUD')

  const [constants, setConstants] = useState(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS)
  const [baselineCosts, setBaselineCosts] = useState([])
  const [form, setForm] = useState(isProduct ? PRODUCT_WEEKLY_DEFAULTS : SERVICE_WEEKLY_DEFAULTS)
  const [notes, setNotes] = useState('')
  const [variableExpenses, setVariableExpenses] = useState([])
  const [entryId, setEntryId] = useState(null)

  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [saveConfirmed, setSaveConfirmed] = useState(false)
  const [recentEntries, setRecentEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const [reviewStarted, setReviewStarted] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Load all data on mount or when active week changes
  useEffect(() => {
    setForm(isProduct ? PRODUCT_WEEKLY_DEFAULTS : SERVICE_WEEKLY_DEFAULTS)
    setNotes('')
    setVariableExpenses([])
    setEntryId(null)
    setLastSaved(null)

    const load = async () => {
      setLoading(true)
      const [savedConstants, existingCosts, weekEntry, recent] = await Promise.all([
        getMoneyDashboardConstants(user_id, model),
        getBaselineFixedCosts(user_id),
        getMoneyDashboardEntryForWeek(user_id, model, activeWeek.start),
        getMoneyDashboardEntries(user_id, model, 8),
      ])

      if (savedConstants) {
        setConstants({ ...(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS), ...savedConstants })
      }
      setBaselineCosts(existingCosts)

      if (weekEntry) {
        setForm({ ...(isProduct ? PRODUCT_WEEKLY_DEFAULTS : SERVICE_WEEKLY_DEFAULTS), ...(weekEntry.entry_json || {}) })
        setNotes(weekEntry.notes || '')
        setLastSaved(weekEntry.updated_at)
        setEntryId(weekEntry.id)
        const varExp = await getWeeklyVariableExpenses(weekEntry.id)
        setVariableExpenses(varExp.map((e, i) => ({ ...e, _key: e.id || i })))
      }
      setRecentEntries(recent)
      setLoading(false)
    }
    load()
  }, [user_id, model, activeWeek.start])

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Live snapshot using live baseline costs
  const snapshot = useMemo(() => {
    const varTotal = variableExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const enriched = { ...form, variable_expenses_total: varTotal }
    return isProduct
      ? calcProduct(constants, enriched, baselineCosts)
      : calcService(constants, enriched, baselineCosts)
  }, [constants, form, variableExpenses, baselineCosts, isProduct])

  const debrief = useMemo(() => generateWeeklyDebrief(snapshot, model), [snapshot, model])
  const streak = useMemo(() => computeStreak(recentEntries), [recentEntries])

  const missedWeeks = useMemo(() => {
    const result = []
    for (let i = 1; i <= 4; i++) {
      const w = getPreviousWeekDates(i)
      if (!recentEntries.some(e => e.entry_week_start_date === w.start)) {
        result.push({ ...w, weeksAgo: i })
      }
    }
    return result
  }, [recentEntries])

  const isPastWeek = activeWeek.start !== currentWeek.start

  // At-a-glance values (derived from snapshot)
  const atAGlance = useMemo(() => {
    const revenue = snapshot.grossRevenue - (Number(form.refunds_value) || 0)
    const directCosts = snapshot.directCosts
    const operatingExpenses = snapshot.fixedOpex + snapshot.variableOpex
    const grossProfit = snapshot.grossProfit
    const netProfit = snapshot.netProfit
    const netMargin = snapshot.netMargin
    const totalCosts = directCosts + operatingExpenses
    return { revenue, grossProfit, netProfit, netMargin, directCosts, operatingExpenses, totalCosts }
  }, [snapshot, form.refunds_value])

  const fmtC = (v) => v !== null && v !== undefined && v !== ''
    ? `${currency} $${Math.round(Number(v || 0)).toLocaleString()}` : '—'

  const handlePickMissedWeek = (week) => {
    setActiveWeek(week)
    setShowBackfillModal(false)
    setReviewStarted(true)
    setEditMode(false)
  }

  const handleBackToCurrentWeek = () => {
    setActiveWeek(currentWeek)
    setReviewStarted(false)
    setEditMode(false)
  }

  const handleCurrencyChange = async (newCurrency) => {
    setCurrency(newCurrency)
    try {
      await upsertMoneyDashboardSettings(user_id, {
        business_model: model,
        preferred_currency: newCurrency,
      })
    } catch {}
  }

  const handleAddExpense = (category = VARIABLE_CATEGORIES[0]) => {
    setVariableExpenses(prev => [...prev, { category, amount: '', _key: Date.now() }])
  }

  const handleUpdateExpense = (index, field, value) => {
    setVariableExpenses(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const handleRemoveExpense = (index) => {
    setVariableExpenses(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveEntry = async () => {
    setSaving(true)
    try {
      const varTotal = variableExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      const bwTotal = baselineWeeklyTotal(baselineCosts)
      const enrichedForm = {
        ...form,
        variable_expenses_total: varTotal,
        baseline_weekly_total: bwTotal,
      }

      const saved = await upsertMoneyDashboardEntry(user_id, model, activeWeek.start, activeWeek.end, enrichedForm, notes)
      setEntryId(saved.id)
      setLastSaved(saved.updated_at)

      await saveWeeklyVariableExpenses(saved.id, user_id, variableExpenses)

      const recent = await getMoneyDashboardEntries(user_id, model, 4)
      setRecentEntries(recent)
      setEditMode(false)
      setReviewStarted(false)
      setSaveConfirmed(true)
      setTimeout(() => setSaveConfirmed(false), 1500)
    } catch (err) {
      alert('Failed to save week. Please try again.')
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

  const isSubmitted = !!lastSaved && !editMode
  const isEditing = (!lastSaved && reviewStarted) || editMode

  // ── Submitted state ──────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {showBackfillModal && <BackfillModal missedWeeks={missedWeeks} onConfirm={handlePickMissedWeek} onCancel={() => setShowBackfillModal(false)} />}

        {/* Context strip */}
        <ContextStrip week={activeWeek} model={model} currency={currency} onCurrencyChange={handleCurrencyChange} streak={streak} lastSaved={lastSaved} isPast={isPastWeek} onBackToCurrent={handleBackToCurrentWeek} />

        {!isPastWeek && missedWeeks.length > 0 && (
          <MissedWeeksBanner missedWeeks={missedWeeks} onChoose={() => setShowBackfillModal(true)} />
        )}

        {/* Debrief hero */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)', borderTop: `3px solid ${BRAND}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>{activeWeek.label}</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, color: '#1A1A1A', marginBottom: '2px' }}>This week's read</p>
              <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)' }}>Your numbers, interpreted.</p>
            </div>
            <button
              onClick={() => { setEditMode(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', color: BRAND, background: '#fdf5f5', border: '0.5px solid rgba(107,16,32,0.12)', cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                <path d="M9 1.5L11.5 4L4 11.5H1.5V9L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              Edit this week
            </button>
          </div>
          <WeeklyDebrief points={debrief} />
        </div>

        {/* Financial Snapshot */}
        <FinancialSnapshot snapshot={snapshot} isProduct={isProduct} currency={currency} fmtC={fmtC} simpleMode={simpleMode} onToggleSimpleMode={onToggleSimpleMode} />

        {/* Revenue trend */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 500, marginBottom: '2px' }}>Revenue trend</p>
              <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)' }}>
                {recentEntries.length > 0 ? `Your last ${recentEntries.length} saved week${recentEntries.length !== 1 ? 's' : ''}.` : 'Appears here once you save your first week.'}
              </p>
            </div>
            {recentEntries.length > 0 && (
              <button onClick={onViewTrends} style={{ fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', color: BRAND, background: '#fdf5f5', border: 'none', cursor: 'pointer' }}>
                View full trends →
              </button>
            )}
          </div>
          <MiniBarChart entries={recentEntries.slice(0, 4)} metric="revenue" currency={currency} />
        </div>
      </div>
    )
  }

  // ── Idle state ───────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {showBackfillModal && <BackfillModal missedWeeks={missedWeeks} onConfirm={handlePickMissedWeek} onCancel={() => setShowBackfillModal(false)} />}
        <ContextStrip week={activeWeek} model={model} currency={currency} onCurrencyChange={handleCurrencyChange} streak={streak} lastSaved={null} isPast={isPastWeek} onBackToCurrent={handleBackToCurrentWeek} />
        {!isPastWeek && missedWeeks.length > 0 && (
          <MissedWeeksBanner missedWeeks={missedWeeks} onChoose={() => setShowBackfillModal(true)} />
        )}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '4px' }}>Ready when you are</p>
              <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)' }}>Enter your numbers for {activeWeek.label}.</p>
            </div>
            <button onClick={() => setReviewStarted(true)} style={{ background: BRAND, color: 'white', border: 'none', fontSize: '13px', fontWeight: 500, padding: '10px 24px', borderRadius: '8px', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}>
              Begin weekly review
            </button>
          </div>
        </div>

        {recentEntries.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 500 }}>Revenue trend</p>
              <button onClick={onViewTrends} style={{ fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', color: BRAND, background: '#fdf5f5', border: 'none', cursor: 'pointer' }}>
                View full trends →
              </button>
            </div>
            <MiniBarChart entries={recentEntries.slice(0, 4)} metric="revenue" currency={currency} />
          </div>
        )}
      </div>
    )
  }

  // ── Editing state: 4-step form ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {showBackfillModal && <BackfillModal missedWeeks={missedWeeks} onConfirm={handlePickMissedWeek} onCancel={() => setShowBackfillModal(false)} />}

      {/* Context strip */}
      <ContextStrip week={activeWeek} model={model} currency={currency} onCurrencyChange={handleCurrencyChange} streak={streak} lastSaved={lastSaved} isPast={isPastWeek} onBackToCurrent={handleBackToCurrentWeek} />

      {!isPastWeek && missedWeeks.length > 0 && (
        <MissedWeeksBanner missedWeeks={missedWeeks} onChoose={() => setShowBackfillModal(true)} />
      )}

      {/* Edit mode banner */}
      {editMode && !isPastWeek && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: '#f0f4ff', border: '1px solid #c7d2fe' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#3730a3' }}>Editing {activeWeek.label}</p>
        </div>
      )}

      {/* ── Step 1: Money in ── */}
      <StepCard
        step={1}
        title="Money in"
        subtitle="What you actually received this week."
        extraLabel="Add more details"
        extraChildren={isProduct ? (
          <>
            <NumberInput
              label="Number of orders"
              hint={form.revenue && form.num_orders ? `AOV: $${Math.round(Number(form.revenue) / Number(form.num_orders)).toLocaleString()}` : undefined}
              value={form.num_orders}
              onChange={v => setField('num_orders', v)}
            />
            <CurrencyInput label="Refunds / returns" value={form.refunds_value} onChange={v => setField('refunds_value', v)} />
          </>
        ) : (
          <>
            <NumberInput
              label="Number of invoices"
              hint={form.revenue && form.num_invoices ? `AOV: $${Math.round(Number(form.revenue) / Number(form.num_invoices)).toLocaleString()}` : undefined}
              value={form.num_invoices}
              onChange={v => setField('num_invoices', v)}
            />
            <CurrencyInput label="Refunds / churn" value={form.refunds_value} onChange={v => setField('refunds_value', v)} />
          </>
        )}
      >
        <CurrencyInput label="Revenue this week" value={form.revenue} onChange={v => setField('revenue', v)} />
      </StepCard>

      {/* ── Step 2: Sales activity ── */}
      <StepCard
        step={2}
        title="Sales activity"
        subtitle="Did the pipeline actually move this week?"
        extraLabel="Add more details"
        extraChildren={isProduct ? (
          <>
            <NumberInput label="Repeat customers" value={form.repeat_customers} onChange={v => setField('repeat_customers', v)} />
            <NumberInput label="Stock sold (units)" value={form.stock_sold_units} onChange={v => setField('stock_sold_units', v)} />
            <NumberInput label="Total active customers" value={form.active_customers} onChange={v => setField('active_customers', v)} />
          </>
        ) : (
          <>
            <NumberInput label="Sales calls booked" value={form.sales_calls_booked} onChange={v => setField('sales_calls_booked', v)} />
            <NumberInput label="Renewals / extensions" value={form.renewals} onChange={v => setField('renewals', v)} />
            <NumberInput label="Total active clients" value={form.active_clients} onChange={v => setField('active_clients', v)} />
          </>
        )}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {isProduct ? (
            <>
              <NumberInput label="Orders placed" value={form.num_orders} onChange={v => setField('num_orders', v)} />
              <NumberInput label="New customers" value={form.new_customers} onChange={v => setField('new_customers', v)} />
            </>
          ) : (
            <>
              <NumberInput label="Sales closed" value={form.sales_closed} onChange={v => setField('sales_closed', v)} />
              <NumberInput label="New clients" value={form.new_clients} onChange={v => setField('new_clients', v)} />
            </>
          )}
        </div>
      </StepCard>

      {/* ── Step 3: Direct costs ── */}
      <StepCard
        step={3}
        title="Direct costs"
        subtitle={isProduct ? 'COGS + marketing for what sold.' : 'What it costs you to deliver and market this week.'}
        extraLabel="Add more details"
        extraChildren={isProduct ? (
          <>
            <CurrencyInput label="Opening inventory ($)" value={form.opening_inventory_value} onChange={v => setField('opening_inventory_value', v)} />
            <CurrencyInput label="Closing inventory ($)" value={form.closing_inventory_value} onChange={v => setField('closing_inventory_value', v)} />
            <CurrencyInput label="Inventory purchased this week" value={form.inventory_purchased} onChange={v => setField('inventory_purchased', v)} />
          </>
        ) : (
          <>
            <NumberInput label="Billable / client hours" value={form.billable_hours} onChange={v => setField('billable_hours', v)} />
            <NumberInput label="Admin / non-billable hours" value={form.admin_hours} onChange={v => setField('admin_hours', v)} />
          </>
        )}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <CurrencyInput
            label={isProduct ? 'Cost of goods (COGS)' : 'Delivery costs'}
            hint={isProduct ? 'Direct cost of products sold' : 'Contractor, platform, tools'}
            value={isProduct ? form.cogs : form.delivery_costs}
            onChange={v => setField(isProduct ? 'cogs' : 'delivery_costs', v)}
          />
          <CurrencyInput
            label="Marketing spend"
            hint="Ads, sponsorships, paid posts"
            value={form.marketing_spend}
            onChange={v => setField('marketing_spend', v)}
          />
        </div>
      </StepCard>

      {/* ── Step 4: Operating expenses ── */}
      <OperatingExpensesStep
        baselineCosts={baselineCosts}
        variableExpenses={variableExpenses}
        onAddExpense={handleAddExpense}
        onUpdateExpense={handleUpdateExpense}
        onRemoveExpense={handleRemoveExpense}
        onGoToBaseline={onGoToBaseline}
      />

      {/* ── At a glance panel ── */}
      <AtAGlancePanel
        revenue={atAGlance.revenue}
        grossProfit={atAGlance.grossProfit}
        netProfit={atAGlance.netProfit}
        netMargin={atAGlance.netMargin}
        directCosts={atAGlance.directCosts}
        operatingExpenses={atAGlance.operatingExpenses}
        totalCosts={atAGlance.totalCosts}
        currency={currency}
      />

      {/* ── Week notes ── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>Week notes</p>
        <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)', marginBottom: '12px' }}>Optional context for this week.</p>
        <textarea
          rows={2}
          placeholder="Anything worth noting about this week…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 2px rgba(107,16,32,0.1)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* ── Status strip + Save ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>
          {lastSaved ? `Saved ${format(new Date(lastSaved), 'd MMM, h:mm a')}` : 'Not yet saved'}
        </p>
        <button
          onClick={handleSaveEntry}
          disabled={saving}
          style={{
            background: saving ? '#9B7E85' : BRAND, color: 'white', border: 'none',
            fontSize: '13px', fontWeight: 500, padding: '10px 24px', borderRadius: '8px',
            letterSpacing: '0.04em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {saveConfirmed ? (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 7l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </>
          ) : saving ? 'Saving…' : editMode ? 'Save changes' : 'Save week'}
        </button>
      </div>

      {/* ── Financial Snapshot (unchanged) ── */}
      <FinancialSnapshot snapshot={snapshot} isProduct={isProduct} currency={currency} fmtC={fmtC} simpleMode={simpleMode} onToggleSimpleMode={onToggleSimpleMode} />

    </div>
  )
}

// ─── Missed weeks banner ──────────────────────────────────────────────────────

function MissedWeeksBanner({ missedWeeks, onChoose }) {
  const weekList = missedWeeks.map(w => w.label).join(', ')
  return (
    <div style={{
      background: '#FAEEDA', borderRadius: '10px', padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
      border: '0.5px solid rgba(122,92,16,0.2)',
    }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#7a5c10', marginBottom: '4px' }}>
          You've got missed weeks.
        </p>
        <p style={{ fontSize: '13px', color: '#7a5c10', lineHeight: 1.5 }}>
          You haven't logged: {weekList}. Catch up so your trends stay accurate.
        </p>
      </div>
      <button
        onClick={onChoose}
        style={{
          fontSize: '12px', fontWeight: 500, color: BRAND,
          background: 'white', border: '0.5px solid rgba(107,16,32,0.15)',
          borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
        }}
      >
        Choose a week to log →
      </button>
    </div>
  )
}

// ─── Backfill modal ───────────────────────────────────────────────────────────

function BackfillModal({ missedWeeks, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(missedWeeks[0] || null)
  const agoLabel = (n) => n === 1 ? 'last week' : `${n} weeks ago`
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 500, marginBottom: '6px' }}>Log a missed week</p>
        <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)', marginBottom: '20px' }}>Pick which one you want to add.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {missedWeeks.map((w) => (
            <label
              key={w.start}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${selected?.start === w.start ? BRAND : 'rgba(0,0,0,0.1)'}`,
                background: selected?.start === w.start ? '#fdf5f5' : 'white',
              }}
            >
              <input
                type="radio"
                name="missed-week"
                checked={selected?.start === w.start}
                onChange={() => setSelected(w)}
                style={{ accentColor: BRAND }}
              />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>Week of {w.label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>{agoLabel(w.weeksAgo)}</p>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '0.5px solid rgba(0,0,0,0.12)', fontSize: '13px', fontWeight: 500, color: 'rgba(0,0,0,0.6)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, color: 'white', background: selected ? BRAND : '#9B7E85', cursor: selected ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}
          >
            Open this week →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Context strip ────────────────────────────────────────────────────────────

function ContextStrip({ week, model, currency, onCurrencyChange, streak, lastSaved, isPast, onBackToCurrent }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: isPast ? '#D97706' : 'rgba(0,0,0,0.4)', marginBottom: '2px' }}>
              {isPast ? 'Logging' : 'Current week'}
            </p>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>{week.label}</p>
          </div>
          {isPast ? (
            <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '14px', background: '#FAEEDA', color: '#7a5c10', border: '0.5px solid rgba(122,92,16,0.2)' }}>
              Catching up — this is a past week
            </span>
          ) : (
            <>
              <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.08)' }} />
              <div>
                <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '2px' }}>Model</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>{model === 'product' ? 'Product-based' : 'Service-based'}</p>
              </div>
              {streak > 0 && (
                <>
                  <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.08)' }} />
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '2px' }}>Streak</p>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B1020' }}>{streak} {streak === 1 ? 'week' : 'week streak'}</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isPast && onBackToCurrent && (
            <button
              onClick={onBackToCurrent}
              style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'DM Sans, sans-serif' }}
            >
              ← Back to current week
            </button>
          )}
          {lastSaved && !isPast && (
            <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>
              Saved {format(new Date(lastSaved), 'd MMM, h:mm a')}
            </p>
          )}
          <select
            value={currency}
            onChange={e => onCurrencyChange(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', background: '#FAF7F2', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Financial Snapshot (unchanged visually) ──────────────────────────────────

function FinancialSnapshot({ snapshot, isProduct, currency, fmtC, simpleMode, onToggleSimpleMode }) {
  const BRAND = '#6B1020'
  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
        <div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '2px' }}>Financial snapshot</p>
          <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)' }}>Updates as you enter.</p>
        </div>
        {onToggleSimpleMode && (
          <button
            onClick={onToggleSimpleMode}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '14px',
              fontSize: '11px', fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              background: simpleMode ? '#fdf5f5' : '#f3f4f6',
              color: simpleMode ? BRAND : '#6b7280',
              border: `1px solid ${simpleMode ? '#f0d0d0' : '#e5e7eb'}`,
            }}
          >
            Explain like I'm new
            <span style={{ width: '28px', height: '16px', borderRadius: '8px', background: simpleMode ? BRAND : '#d1d5db', position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: 'white', left: simpleMode ? '14px' : '2px', transition: 'left 0.15s' }} />
            </span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}
        className="sm:grid-cols-3">
        {isProduct ? (
          <>
            <SnapshotCard label="Revenue" value={fmtC(Math.round(snapshot.revenue))} metricKey="revenue" metricValue={snapshot.revenue} explanation={EXPLANATIONS.revenue} simpleMode={simpleMode} />
            <SnapshotCard label="Gross profit" value={fmtC(Math.round(snapshot.grossProfit))} explanation={EXPLANATIONS.grossProfit} simpleMode={simpleMode} />
            <SnapshotCard label="Gross margin" value={fmt.pct(snapshot.grossMargin)} metricKey="grossMargin" metricValue={snapshot.grossMargin} explanation={EXPLANATIONS.grossMargin} simpleMode={simpleMode} />
            <SnapshotCard label="Net profit" value={fmtC(Math.round(snapshot.netProfit))} explanation={EXPLANATIONS.netProfit} simpleMode={simpleMode} />
            <SnapshotCard label="Net margin" value={fmt.pct(snapshot.netMargin)} metricKey="netMargin" metricValue={snapshot.netMargin} explanation={EXPLANATIONS.netMargin} simpleMode={simpleMode} />
            <SnapshotCard label="Inventory pressure" value={snapshot.inventoryTurnover !== null ? fmt.x(snapshot.inventoryTurnover) : '—'} metricKey="inventoryTurnover" metricValue={snapshot.inventoryTurnover} explanation={EXPLANATIONS.inventoryTurnover} simpleMode={simpleMode} />
          </>
        ) : (
          <>
            <SnapshotCard label="Revenue" value={fmtC(Math.round(snapshot.revenue))} metricKey="revenue" metricValue={snapshot.revenue} explanation={EXPLANATIONS.revenue} simpleMode={simpleMode} />
            <SnapshotCard label="Gross profit" value={fmtC(Math.round(snapshot.grossProfit))} explanation={EXPLANATIONS.grossProfit} simpleMode={simpleMode} />
            <SnapshotCard label="Gross margin" value={fmt.pct(snapshot.grossMargin)} metricKey="grossMargin" metricValue={snapshot.grossMargin} explanation={EXPLANATIONS.grossMargin} simpleMode={simpleMode} />
            <SnapshotCard label="Net profit" value={fmtC(Math.round(snapshot.netProfit))} explanation={EXPLANATIONS.netProfit} simpleMode={simpleMode} />
            <SnapshotCard label="Net margin" value={fmt.pct(snapshot.netMargin)} metricKey="netMargin" metricValue={snapshot.netMargin} explanation={EXPLANATIONS.netMargin} simpleMode={simpleMode} />
            <SnapshotCard label="Capacity pressure" value={snapshot.capacityPressure !== null ? fmt.pct(snapshot.capacityPressure) : '—'} metricKey="capacityPressure" metricValue={snapshot.capacityPressure} explanation={EXPLANATIONS.capacityPressure} simpleMode={simpleMode} />
          </>
        )}
      </div>
    </div>
  )
}
