import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  getWeekDates,
  getMoneyDashboardConstants,
  upsertMoneyDashboardConstants,
  getMoneyDashboardEntryForWeek,
  upsertMoneyDashboardEntry,
  getMoneyDashboardEntries,
} from '../lib/moneyDashboardService'
import {
  PRODUCT_CONSTANT_DEFAULTS,
  SERVICE_CONSTANT_DEFAULTS,
  PRODUCT_WEEKLY_DEFAULTS,
  SERVICE_WEEKLY_DEFAULTS,
  calcProduct,
  calcService,
  healthTag,
  computeStreak,
  generateWeeklyDebrief,
  fmt,
} from '../lib/moneyDashboardCalc'
import { EXPLANATIONS } from '../lib/wmhq-explanations'

const BRAND = '#6B1010'
const CURRENCIES = ['AUD', 'NZD', 'USD', 'EUR', 'CAD', 'GBP', 'SGD']

// ─── Shared input components ──────────────────────────────────────────────────

function CurrencyInput({ label, value, onChange, helper }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">$</span>
        <input
          type="number"
          className="input-field"
          style={{ paddingLeft: '1.6rem' }}
          value={value === '' ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          min="0"
        />
      </div>
      {helper && <p className="text-xs text-gray-400 mt-1">{helper}</p>}
    </div>
  )
}

function NumberInput({ label, value, onChange, helper, placeholder = '0' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input-field"
        value={value === '' ? '' : value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={placeholder}
        min="0"
      />
      {helper && <p className="text-xs text-gray-400 mt-1">{helper}</p>}
    </div>
  )
}

function SectionSummaryBar({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-4 mt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      {items.map(({ label, value }) => (
        <p key={label} className="text-xs text-gray-500">
          <span className="font-bold tracking-wide uppercase text-[10px] text-gray-400 mr-1">{label}</span>
          {value}
        </p>
      ))}
    </div>
  )
}

// ─── Financial snapshot cards ─────────────────────────────────────────────────

function SnapshotCard({ label, value, metricKey, metricValue, explanation, simpleMode }) {
  const tag = metricKey ? healthTag(metricKey, metricValue) : null
  const [expanded, setExpanded] = useState(false)
  const exp = explanation ? (simpleMode ? explanation.simple : explanation.expert) : null
  return (
    <div className="rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
      <div className="p-4 flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        {tag && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit" style={{ color: tag.color, backgroundColor: tag.bg }}>
            {tag.label}
          </span>
        )}
      </div>
      {exp && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <span className="text-[11px] font-semibold" style={{ color: BRAND }}>How is this calculated?</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9ca3af', flexShrink: 0 }}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-2">
              {exp.howItWorks && (
                <div className="rounded-lg p-3" style={{ backgroundColor: '#f9f7f5' }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1.5">How it works</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{exp.howItWorks}</p>
                </div>
              )}
              {exp.whyItMatters && (
                <div className="rounded-lg p-3" style={{ backgroundColor: '#f9f7f5' }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1.5">Why it matters</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{exp.whyItMatters}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBarChart({ entries, metric = 'revenue', currency = 'AUD' }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-gray-300 text-sm">
        No saved weeks yet
      </div>
    )
  }

  const getVal = (e) => Number(e.entry_json?.[metric] || 0)
  const values = entries.map(getVal)
  const max = Math.max(...values, 1)
  const display = [...entries].reverse() // oldest to newest

  return (
    <div className="flex items-end gap-1.5" style={{ height: '80px' }}>
      {display.map((entry, i) => {
        const val = getVal(entry)
        const h = max > 0 ? (val / max) * 100 : 0
        const label = entry.entry_week_start_date
          ? format(parseISO(entry.entry_week_start_date), 'd MMM')
          : ''
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ minWidth: 0 }}>
            <div className="w-full flex items-end" style={{ height: '60px' }}>
              <div
                title={`${label}: ${currency} $${val.toLocaleString()}`}
                style={{
                  width: '100%',
                  height: `${Math.max(h, val > 0 ? 4 : 0)}%`,
                  backgroundColor: BRAND,
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.85,
                  transition: 'height 0.3s ease',
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Health debrief ───────────────────────────────────────────────────────────

function WeeklyDebrief({ points }) {
  const iconMap = { positive: '↑', warning: '↗', watch: '→', risk: '!', neutral: '·' }
  const colorMap = {
    positive: '#059669',
    warning: '#D97706',
    watch: '#6B7280',
    risk: '#DC2626',
    neutral: '#9CA3AF',
  }
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="text-xs font-black mt-0.5 flex-shrink-0 w-4 text-center" style={{ color: colorMap[p.type] }}>
            {iconMap[p.type]}
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{p.text}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Constants section (product) ──────────────────────────────────────────────

function ProductConstants({ constants, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Per-Order Variable Costs</p>
        <div className="grid grid-cols-3 gap-3">
          <CurrencyInput label="Packaging Cost / Unit" value={constants.packaging_cost_per_unit} onChange={v => onChange('packaging_cost_per_unit', v)} />
          <CurrencyInput label="Fulfilment Cost / Unit" value={constants.fulfillment_cost_per_unit} onChange={v => onChange('fulfillment_cost_per_unit', v)} />
          <NumberInput label="Transaction Fee %" value={constants.transaction_fee_pct} onChange={v => onChange('transaction_fee_pct', v)} placeholder="2" helper="e.g. 2 for 2%" />
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Weekly Fixed Costs</p>
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput label="Team / Contractors" value={constants.opex_team} onChange={v => onChange('opex_team', v)} />
          <CurrencyInput label="Software / Subscriptions" value={constants.opex_software} onChange={v => onChange('opex_software', v)} />
          <CurrencyInput label="Rent / Overheads" value={constants.opex_rent} onChange={v => onChange('opex_rent', v)} />
          <CurrencyInput label="Other Fixed Costs" value={constants.opex_other} onChange={v => onChange('opex_other', v)} />
        </div>
      </div>
    </div>
  )
}

// ─── Constants section (service) ─────────────────────────────────────────────

function ServiceConstants({ constants, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Capacity Baseline</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Max Client Capacity" value={constants.max_client_capacity} onChange={v => onChange('max_client_capacity', v)} helper="Max clients at one time" />
          <NumberInput label="Available Hours / Week" value={constants.available_hours_per_week} onChange={v => onChange('available_hours_per_week', v)} helper="Your total working hours" />
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Weekly Fixed Costs</p>
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput label="Team / Contractors" value={constants.opex_team} onChange={v => onChange('opex_team', v)} />
          <CurrencyInput label="Software / Subscriptions" value={constants.opex_software} onChange={v => onChange('opex_software', v)} />
          <CurrencyInput label="Rent / Overheads" value={constants.opex_rent} onChange={v => onChange('opex_rent', v)} />
          <CurrencyInput label="Other Fixed Costs" value={constants.opex_other} onChange={v => onChange('opex_other', v)} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Weekly page ─────────────────────────────────────────────────────────

export default function MoneyDashboardWeekly({ settings, onViewTrends, simpleMode = false, onToggleSimpleMode }) {
  const { user_id, business_model: model, preferred_currency } = settings
  const isProduct = model === 'product'

  const week = useMemo(() => getWeekDates(), [])
  const currency = preferred_currency || 'AUD'

  const [constants, setConstants] = useState(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS)
  const [constSaved, setConstSaved] = useState(false)
  const [showConstants, setShowConstants] = useState(false)
  const [savingConst, setSavingConst] = useState(false)

  const [form, setForm] = useState(isProduct ? PRODUCT_WEEKLY_DEFAULTS : SERVICE_WEEKLY_DEFAULTS)
  const [notes, setNotes] = useState('')
  const [savingEntry, setSavingEntry] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  const [recentEntries, setRecentEntries] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Review flow state ──
  const [reviewInProgress, setReviewInProgress] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [weekDetailsExpanded, setWeekDetailsExpanded] = useState(false)

  // Load constants + current week entry + recent entries
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [savedConstants, weekEntry, recent] = await Promise.all([
        getMoneyDashboardConstants(user_id, model),
        getMoneyDashboardEntryForWeek(user_id, model, week.start),
        getMoneyDashboardEntries(user_id, model, 4),
      ])
      if (savedConstants) {
        setConstants({ ...(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS), ...savedConstants })
        setConstSaved(true)
      }
      if (weekEntry) {
        setForm({ ...(isProduct ? PRODUCT_WEEKLY_DEFAULTS : SERVICE_WEEKLY_DEFAULTS), ...(weekEntry.entry_json || {}) })
        setNotes(weekEntry.notes || '')
        setLastSaved(weekEntry.updated_at)
      }
      setRecentEntries(recent)
      setLoading(false)
    }
    load()
  }, [user_id, model, week.start])

  const streak = useMemo(() => computeStreak(recentEntries), [recentEntries])

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const setConst = (key, val) => setConstants(prev => ({ ...prev, [key]: val }))

  const snapshot = useMemo(() => {
    return isProduct ? calcProduct(constants, form) : calcService(constants, form)
  }, [constants, form, isProduct])

  const debrief = useMemo(() => generateWeeklyDebrief(snapshot, model), [snapshot, model])

  // ── View state derivations ──
  const isIdle = !lastSaved && !reviewInProgress
  const isEditing = (!lastSaved && reviewInProgress) || editMode
  const isSubmitted = !!lastSaved && !editMode

  const handleSaveConstants = async () => {
    setSavingConst(true)
    try {
      await upsertMoneyDashboardConstants(user_id, model, constants)
      setConstSaved(true)
      setShowConstants(false)
    } catch (err) {
      alert('Failed to save baseline settings.')
    } finally {
      setSavingConst(false)
    }
  }

  const handleSaveEntry = async () => {
    setSavingEntry(true)
    try {
      const saved = await upsertMoneyDashboardEntry(user_id, model, week.start, week.end, form, notes)
      setLastSaved(saved.updated_at)
      const recent = await getMoneyDashboardEntries(user_id, model, 4)
      setRecentEntries(recent)
      setEditMode(false)
      setReviewInProgress(false)
    } catch (err) {
      alert('Failed to save week. Please try again.')
    } finally {
      setSavingEntry(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${BRAND} transparent transparent transparent` }} />
      </div>
    )
  }

  const fmtC = (v) => v !== null && v !== undefined && v !== '' ? `${currency} $${Number(v || 0).toLocaleString()}` : '—'

  // ── Reusable: baseline constants block ──
  const baselineBlock = (
    <div className="card-section">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="font-black text-gray-900 text-base">Your Baseline Numbers</p>
          <p className="text-sm text-gray-400">Semi-fixed costs and capacity settings. Only update when they change.</p>
        </div>
        <button
          onClick={() => setShowConstants(!showConstants)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: BRAND, backgroundColor: '#fdf5f5' }}
        >
          {showConstants ? 'Collapse' : constSaved ? 'Edit Baseline' : 'Set Up Baseline'}
        </button>
      </div>

      {!constSaved && !showConstants && (
        <div className="mt-3 rounded-xl p-3 text-sm" style={{ backgroundColor: '#fef9ee', border: '1px solid #f0dfa0', color: '#7a5c10' }}>
          Set your baseline numbers once — packaging costs, fixed overheads, and capacity limits won't need re-entering each week.
        </div>
      )}

      {showConstants && (
        <div className="mt-4 space-y-4">
          {isProduct
            ? <ProductConstants constants={constants} onChange={setConst} />
            : <ServiceConstants constants={constants} onChange={setConst} />
          }
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowConstants(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSaveConstants} disabled={savingConst} className="btn-brand">
              {savingConst ? 'Saving…' : 'Save Baseline'}
            </button>
          </div>
        </div>
      )}

      {constSaved && !showConstants && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {isProduct ? (
            <>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Packaging</span>${Number(constants.packaging_cost_per_unit || 0).toLocaleString()}/unit</p>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Fulfilment</span>${Number(constants.fulfillment_cost_per_unit || 0).toLocaleString()}/unit</p>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Tx Fee</span>{constants.transaction_fee_pct || 2}%</p>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Fixed OPEX</span>{currency} ${(Number(constants.opex_team || 0) + Number(constants.opex_software || 0) + Number(constants.opex_rent || 0) + Number(constants.opex_other || 0)).toLocaleString()}/wk</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Max Clients</span>{constants.max_client_capacity}</p>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Hours/Wk</span>{constants.available_hours_per_week}</p>
              <p className="text-xs text-gray-500"><span className="text-gray-400 uppercase text-[10px] font-bold mr-1">Fixed OPEX</span>{currency} ${(Number(constants.opex_team || 0) + Number(constants.opex_software || 0) + Number(constants.opex_rent || 0) + Number(constants.opex_other || 0)).toLocaleString()}/wk</p>
            </>
          )}
        </div>
      )}
    </div>
  )

  // ── Reusable: product form sections ──
  const productFormSections = (
    <>
      {/* Revenue */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Revenue</p>
        <p className="section-subtitle">Total income generated this week.</p>
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput label="Revenue" value={form.revenue} onChange={v => setField('revenue', v)} />
          <NumberInput label="Number of Orders" value={form.num_orders} onChange={v => setField('num_orders', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'Revenue', value: fmtC(form.revenue) },
          { label: 'AOV', value: form.revenue && form.num_orders ? fmtC(Math.round(Number(form.revenue) / Number(form.num_orders))) : '—' },
        ]} />
      </div>

      {/* COGS */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Cost of Goods</p>
        <p className="section-subtitle">Direct product costs this week. Per-unit packaging and fulfilment come from your baseline.</p>
        <div className="grid grid-cols-1 gap-4">
          <CurrencyInput label="Total COGS (Cost of Goods Sold)" value={form.cogs} onChange={v => setField('cogs', v)} helper="Cost of the goods sold this week" />
        </div>
        <SectionSummaryBar items={[
          { label: 'COGS', value: fmtC(form.cogs) },
          { label: 'Gross Profit', value: fmtC(Math.round(snapshot.grossProfit)) },
          { label: 'Gross Margin', value: fmt.pct(snapshot.grossMargin) },
        ]} />
      </div>

      {/* Operating Expenses */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Operating Expenses</p>
        <p className="section-subtitle">Variable spend this week. Fixed costs from your baseline are included automatically.</p>
        <div className="grid grid-cols-1 gap-4">
          <CurrencyInput label="Marketing / Ad Spend" value={form.marketing_spend} onChange={v => setField('marketing_spend', v)} helper="Ads, sponsored posts, and paid marketing this week" />
        </div>
        <SectionSummaryBar items={[
          { label: 'Marketing', value: fmtC(form.marketing_spend) },
          { label: 'Total OPEX', value: fmtC(Math.round(snapshot.totalOpex)) },
          { label: 'Net Profit', value: fmtC(Math.round(snapshot.netProfit)) },
          { label: 'Net Margin', value: fmt.pct(snapshot.netMargin) },
        ]} />
      </div>

      {/* Customer Economics */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Customer Economics</p>
        <p className="section-subtitle">Who bought and what came back.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="New Customers Acquired" value={form.new_customers} onChange={v => setField('new_customers', v)} />
          <NumberInput label="Repeat Customers" value={form.repeat_customers} onChange={v => setField('repeat_customers', v)} />
          <CurrencyInput label="Refunds / Returns Value" value={form.refunds_value} onChange={v => setField('refunds_value', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'CAC', value: snapshot.cac !== null ? fmtC(Math.round(snapshot.cac)) : '—' },
          { label: 'Repeat Rate', value: snapshot.repeatRate !== null ? fmt.pct(snapshot.repeatRate) : '—' },
          { label: 'Refund Rate', value: snapshot.refundRate !== null ? fmt.pct(snapshot.refundRate) : '—' },
        ]} />
      </div>

      {/* Inventory */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Inventory & Cash Flow</p>
        <p className="section-subtitle">How your stock moves and where cash sits.</p>
        <div className="grid grid-cols-3 gap-4">
          <CurrencyInput label="Opening Inventory Value" value={form.opening_inventory_value} onChange={v => setField('opening_inventory_value', v)} />
          <CurrencyInput label="Closing Inventory Value" value={form.closing_inventory_value} onChange={v => setField('closing_inventory_value', v)} />
          <CurrencyInput label="Inventory Purchased" value={form.inventory_purchased} onChange={v => setField('inventory_purchased', v)} />
          <NumberInput label="Stock Sold (Units)" value={form.stock_sold_units} onChange={v => setField('stock_sold_units', v)} />
          <NumberInput label="Stock On Hand (Units)" value={form.stock_on_hand_units} onChange={v => setField('stock_on_hand_units', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'Avg Inventory', value: snapshot.avgInventory > 0 ? fmtC(Math.round(snapshot.avgInventory)) : '—' },
          { label: 'Turnover', value: snapshot.inventoryTurnover !== null ? fmt.x(snapshot.inventoryTurnover) : '—' },
          { label: 'Sell-Through', value: snapshot.sellThrough !== null ? fmt.pct(snapshot.sellThrough) : '—' },
        ]} />
      </div>
    </>
  )

  // ── Reusable: service form sections ──
  const serviceFormSections = (
    <>
      {/* Revenue */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Revenue</p>
        <p className="section-subtitle">Total income received this week.</p>
        <div className="grid grid-cols-1 gap-4">
          <CurrencyInput label="Revenue" value={form.revenue} onChange={v => setField('revenue', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'Revenue', value: fmtC(form.revenue) },
        ]} />
      </div>

      {/* Sales Activity */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Sales Activity</p>
        <p className="section-subtitle">Calls, closes, and client movements this week.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Sales Calls Booked" value={form.sales_calls_booked} onChange={v => setField('sales_calls_booked', v)} />
          <NumberInput label="Sales Closed" value={form.sales_closed} onChange={v => setField('sales_closed', v)} />
          <NumberInput label="New Clients Onboarded" value={form.new_clients} onChange={v => setField('new_clients', v)} />
          <NumberInput label="Total Active Clients" value={form.active_clients} onChange={v => setField('active_clients', v)} helper="All current active clients this week" />
          <NumberInput label="Renewals / Extensions" value={form.renewals} onChange={v => setField('renewals', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'Conversion', value: snapshot.conversionRate !== null ? fmt.pct(snapshot.conversionRate) : '—' },
          { label: 'Capacity', value: snapshot.capacityPressure !== null ? fmt.pct(snapshot.capacityPressure) : '—' },
        ]} />
      </div>

      {/* Delivery Costs */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Delivery Costs</p>
        <p className="section-subtitle">Direct cost to deliver your service this week.</p>
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput label="Delivery Costs" value={form.delivery_costs} onChange={v => setField('delivery_costs', v)} helper="Contractor, platform, or direct delivery costs" />
          <CurrencyInput label="Refunds / Churn Value" value={form.refunds_value} onChange={v => setField('refunds_value', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'Variable Costs', value: fmtC(Math.round(snapshot.variableCosts)) },
          { label: 'Gross Profit', value: fmtC(Math.round(snapshot.grossProfit)) },
          { label: 'Gross Margin', value: fmt.pct(snapshot.grossMargin) },
        ]} />
      </div>

      {/* Operating Expenses */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Operating Expenses</p>
        <p className="section-subtitle">Variable spend this week. Fixed costs from your baseline are included automatically.</p>
        <div className="grid grid-cols-1 gap-4">
          <CurrencyInput label="Marketing / Ad Spend" value={form.marketing_spend} onChange={v => setField('marketing_spend', v)} helper="Ads, paid placements, and outbound marketing" />
        </div>
        <SectionSummaryBar items={[
          { label: 'Total OPEX', value: fmtC(Math.round(snapshot.totalOpex)) },
          { label: 'Net Profit', value: fmtC(Math.round(snapshot.netProfit)) },
          { label: 'Net Margin', value: fmt.pct(snapshot.netMargin) },
        ]} />
      </div>

      {/* Capacity & Hours */}
      <div className="card-section">
        <p className="font-black text-gray-900 mb-0.5">Capacity & Delivery Hours</p>
        <p className="section-subtitle">How your time was spent this week.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Billable / Client Hours" value={form.billable_hours} onChange={v => setField('billable_hours', v)} />
          <NumberInput label="Admin / Non-Billable Hours" value={form.admin_hours} onChange={v => setField('admin_hours', v)} />
        </div>
        <SectionSummaryBar items={[
          { label: 'Utilisation', value: snapshot.utilisation !== null ? fmt.pct(snapshot.utilisation) : '—' },
          { label: 'Total Hours', value: snapshot.totalHours > 0 ? `${snapshot.totalHours}h` : '—' },
        ]} />
      </div>
    </>
  )

  // ── Reusable: notes block ──
  const notesBlock = (
    <div className="card-section">
      <p className="font-black text-gray-900 mb-1">Week Notes</p>
      <p className="section-subtitle">Optional context for this week.</p>
      <textarea
        className="textarea-field"
        rows={2}
        placeholder="Anything worth noting about this week…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
    </div>
  )

  // ── Reusable: snapshot section ──
  const snapshotSection = (
    <div className="card-section">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <p className="font-black text-gray-900 text-base">
            {isSubmitted ? 'This Week\'s Snapshot' : 'Financial Snapshot'}
          </p>
          <p className="section-subtitle">
            {isSubmitted ? 'Saved metrics for this week.' : 'Updates as you enter.'}
          </p>
        </div>
        {onToggleSimpleMode && (
          <button
            onClick={onToggleSimpleMode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors flex-shrink-0"
            style={{
              backgroundColor: simpleMode ? '#fdf5f5' : '#f3f4f6',
              color: simpleMode ? BRAND : '#6b7280',
              border: `1px solid ${simpleMode ? '#f0d0d0' : '#e5e7eb'}`,
            }}
          >
            Explain like I'm new
            <span
              className="w-7 h-4 rounded-full relative flex-shrink-0"
              style={{ backgroundColor: simpleMode ? BRAND : '#d1d5db', display: 'inline-block' }}
            >
              <span
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                style={{ left: simpleMode ? '14px' : '2px', transition: 'left 0.15s' }}
              />
            </span>
          </button>
        )}
      </div>

      {isProduct ? (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <SnapshotCard label="Revenue" value={fmtC(Math.round(snapshot.revenue))} metricKey="revenue" metricValue={snapshot.revenue} explanation={EXPLANATIONS.revenue} simpleMode={simpleMode} />
          <SnapshotCard label="Gross Profit" value={fmtC(Math.round(snapshot.grossProfit))} explanation={EXPLANATIONS.grossProfit} simpleMode={simpleMode} />
          <SnapshotCard label="Gross Margin" value={fmt.pct(snapshot.grossMargin)} metricKey="grossMargin" metricValue={snapshot.grossMargin} explanation={EXPLANATIONS.grossMargin} simpleMode={simpleMode} />
          <SnapshotCard label="Net Profit" value={fmtC(Math.round(snapshot.netProfit))} explanation={EXPLANATIONS.netProfit} simpleMode={simpleMode} />
          <SnapshotCard label="Net Margin" value={fmt.pct(snapshot.netMargin)} metricKey="netMargin" metricValue={snapshot.netMargin} explanation={EXPLANATIONS.netMargin} simpleMode={simpleMode} />
          <SnapshotCard label="Inventory Pressure" value={snapshot.inventoryTurnover !== null ? fmt.x(snapshot.inventoryTurnover) : '—'} metricKey="inventoryTurnover" metricValue={snapshot.inventoryTurnover} explanation={EXPLANATIONS.inventoryTurnover} simpleMode={simpleMode} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <SnapshotCard label="Revenue" value={fmtC(Math.round(snapshot.revenue))} metricKey="revenue" metricValue={snapshot.revenue} explanation={EXPLANATIONS.revenue} simpleMode={simpleMode} />
          <SnapshotCard label="Gross Profit" value={fmtC(Math.round(snapshot.grossProfit))} explanation={EXPLANATIONS.grossProfit} simpleMode={simpleMode} />
          <SnapshotCard label="Gross Margin" value={fmt.pct(snapshot.grossMargin)} metricKey="grossMargin" metricValue={snapshot.grossMargin} explanation={EXPLANATIONS.grossMargin} simpleMode={simpleMode} />
          <SnapshotCard label="Net Profit" value={fmtC(Math.round(snapshot.netProfit))} explanation={EXPLANATIONS.netProfit} simpleMode={simpleMode} />
          <SnapshotCard label="Net Margin" value={fmt.pct(snapshot.netMargin)} metricKey="netMargin" metricValue={snapshot.netMargin} explanation={EXPLANATIONS.netMargin} simpleMode={simpleMode} />
          <SnapshotCard label="Capacity Pressure" value={snapshot.capacityPressure !== null ? fmt.pct(snapshot.capacityPressure) : '—'} metricKey="capacityPressure" metricValue={snapshot.capacityPressure} explanation={EXPLANATIONS.capacityPressure} simpleMode={simpleMode} />
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Top strip ── */}
      <div className="card-section !p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Current Week</p>
              <p className="text-sm font-bold text-gray-900">{week.label}</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Model</p>
              <p className="text-sm font-bold text-gray-900">{isProduct ? 'Product-Based' : 'Service-Based'}</p>
            </div>
            {streak > 0 && (
              <>
                <div className="w-px h-8 bg-gray-100" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Streak</p>
                  <p className="text-sm font-bold" style={{ color: BRAND }}>{streak} {streak === 1 ? 'week' : 'week streak'}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <p className="text-xs text-gray-400">
                Saved {format(new Date(lastSaved), 'd MMM, h:mm a')}
              </p>
            )}
            <select
              className="input-field !w-auto text-xs"
              value={currency}
              readOnly
            >
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SUBMITTED STATE: Debrief hero → Snapshot → Week details → Trend
          ════════════════════════════════════════════════════════════════════════ */}
      {isSubmitted && (
        <>
          {/* ── Debrief Hero ── */}
          <div
            className="card-section"
            style={{
              background: 'linear-gradient(160deg, #fdf9f8 0%, #fff 60%)',
              borderTop: `3px solid ${BRAND}`,
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 mb-1">{week.label}</p>
                <p className="text-xl font-black text-gray-900">This Week's Read</p>
                <p className="text-sm text-gray-400 mt-0.5">Your numbers, interpreted.</p>
              </div>
              <button
                onClick={() => { setEditMode(true); setWeekDetailsExpanded(true) }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: BRAND, backgroundColor: '#fdf5f5', border: '1px solid rgba(107,16,16,0.12)' }}
              >
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                  <path d="M9 1.5L11.5 4L4 11.5H1.5V9L9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                Edit this week
              </button>
            </div>
            <WeeklyDebrief points={debrief} />
          </div>

          {/* ── Snapshot (second position in submitted view) ── */}
          {snapshotSection}

          {/* ── Week Details accordion ── */}
          <div className="card-section">
            <button
              onClick={() => setWeekDetailsExpanded(e => !e)}
              className="flex items-center justify-between w-full"
            >
              <div className="text-left">
                <p className="font-black text-gray-900 text-base">Week Details</p>
                <p className="text-sm text-gray-400">Your entries for {week.label}.</p>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 12 12" fill="none"
                style={{ transform: weekDetailsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9ca3af', flexShrink: 0 }}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {weekDetailsExpanded && (
              <div className="mt-5 space-y-5">
                {baselineBlock}
                {isProduct ? productFormSections : serviceFormSections}
                {notesBlock}
              </div>
            )}
          </div>

          {/* ── Revenue trend (full width in submitted view) ── */}
          <div className="card-section">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-black text-gray-900 text-base mb-0.5">Revenue Trend</p>
                <p className="text-sm text-gray-400">
                  {recentEntries.length > 0
                    ? `Your last ${recentEntries.length} saved week${recentEntries.length !== 1 ? 's' : ''}.`
                    : 'Appears here once you save your first week.'}
                </p>
              </div>
              {recentEntries.length > 0 && (
                <button
                  onClick={onViewTrends}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: BRAND, backgroundColor: '#fdf5f5' }}
                >
                  View full trends →
                </button>
              )}
            </div>
            <MiniBarChart entries={recentEntries} metric="revenue" currency={currency} />
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          IN PROGRESS / IDLE STATE: Status treatment → Form → Snapshot → Trend
          ════════════════════════════════════════════════════════════════════════ */}
      {!isSubmitted && (
        <>
          {/* ── Idle: begin review prompt ── */}
          {isIdle && (
            <div className="card-section !p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-gray-900 text-base">Ready when you are</p>
                  <p className="text-sm text-gray-400 mt-0.5">Enter your numbers for {week.label}.</p>
                </div>
                <button
                  onClick={() => setReviewInProgress(true)}
                  className="btn-brand flex-shrink-0"
                >
                  Begin Weekly Review
                </button>
              </div>
            </div>
          )}

          {/* ── In progress: review state banner ── */}
          {isEditing && !editMode && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ backgroundColor: '#fef9ee', border: '1px solid #f0dfa0' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: '#D97706' }} />
              <p className="text-xs font-semibold" style={{ color: '#7a5c10' }}>
                Weekly Review in Progress · {week.label}
              </p>
            </div>
          )}

          {/* ── Editing: edit mode banner ── */}
          {editMode && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ backgroundColor: '#f0f4ff', border: '1px solid #c7d2fe' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#4F46E5' }} />
              <p className="text-xs font-semibold" style={{ color: '#3730a3' }}>
                Editing {week.label}
              </p>
            </div>
          )}

          {/* ── Baseline ── */}
          {baselineBlock}

          {/* ── Form sections ── */}
          {isProduct ? productFormSections : serviceFormSections}

          {/* ── Notes ── */}
          {notesBlock}

          {/* ── Save / submit button ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {lastSaved ? `Saved ${format(new Date(lastSaved), 'd MMM, h:mm a')}` : 'Not yet saved'}
            </p>
            <button onClick={handleSaveEntry} disabled={savingEntry} className="btn-brand flex items-center gap-2">
              {savingEntry ? 'Saving…' : editMode ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 7l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Save changes
                </>
              ) : 'Save Week'}
            </button>
          </div>

          {/* ── Financial Snapshot (live preview) ── */}
          {snapshotSection}

          {/* ── Recent trend + debrief (side by side) ── */}
          <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: recentEntries.length > 0 ? '1fr 1fr' : '1fr' }}>

            {/* Trend chart */}
            <div className="card-section">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-gray-900 text-base mb-0.5">Revenue Trend</p>
                  <p className="text-sm text-gray-400">
                    {recentEntries.length > 0
                      ? `Your last ${recentEntries.length} saved week${recentEntries.length !== 1 ? 's' : ''}.`
                      : 'Appears here once you save your first week.'}
                  </p>
                </div>
                {recentEntries.length > 0 && (
                  <button
                    onClick={onViewTrends}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: BRAND, backgroundColor: '#fdf5f5' }}
                  >
                    View full trends →
                  </button>
                )}
              </div>
              <MiniBarChart entries={recentEntries} metric="revenue" currency={currency} />
            </div>

            {/* Weekly debrief */}
            <div className="card-section">
              <p className="font-black text-gray-900 text-base mb-1">This Week's Debrief</p>
              <p className="section-subtitle">Your numbers as you've entered them.</p>
              <div className="mt-2">
                <WeeklyDebrief points={debrief} />
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  )
}
