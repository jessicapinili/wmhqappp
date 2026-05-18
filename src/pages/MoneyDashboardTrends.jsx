import { useState, useEffect, useMemo } from 'react'
import {
  format, parseISO,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
  startOfWeek, endOfWeek,
  subMonths, subQuarters, subYears, subWeeks,
  eachMonthOfInterval, eachWeekOfInterval,
} from 'date-fns'
import {
  getMoneyDashboardEntries,
  getMoneyDashboardConstants,
  getBaselineFixedCosts,
  getWeekDates,
} from '../lib/moneyDashboardService'
import {
  PRODUCT_CONSTANT_DEFAULTS,
  SERVICE_CONSTANT_DEFAULTS,
  calcProduct,
  calcService,
  computeStreak,
  generateTrendDebrief,
  getProfitLevers,
  healthTag,
  fmt,
} from '../lib/moneyDashboardCalc'

const BRAND = '#6B1020'
const BEIGE = '#FAF7F2'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => format(d, 'yyyy-MM-dd')

const getEntriesInRange = (entries, from, to) => {
  const fromStr = fmtDate(from)
  const toStr = fmtDate(to)
  return entries.filter(e =>
    e.entry_week_start_date >= fromStr && e.entry_week_start_date <= toStr
  )
}

const sumMetric = (entries, key) =>
  entries.reduce((s, e) => s + Number(e.entry_json?.[key] || 0), 0)

const pctChange = (curr, prev) => {
  if (!prev || prev === 0) return null
  return (curr - prev) / prev
}

const n = (v) => Number(v) || 0

// ─── Metric pill groups ───────────────────────────────────────────────────────

const SERVICE_METRIC_GROUPS = [
  {
    group: 'MONEY',
    metrics: [
      { key: 'revenue', label: 'Revenue', type: 'line' },
      { key: 'marketing_spend', label: 'Marketing spend', type: 'bar' },
      { key: 'net_profit_calc', label: 'Net profit', type: 'line', computed: true },
      { key: 'variable_expenses_total', label: 'Operating expenses', type: 'bar' },
    ],
  },
  {
    group: 'SALES',
    metrics: [
      { key: 'sales_closed', label: 'Sales closed', type: 'bar' },
      { key: 'new_clients', label: 'New clients', type: 'bar' },
      { key: 'active_clients', label: 'Active clients', type: 'line' },
    ],
  },
  {
    group: 'CAPACITY',
    metrics: [
      { key: 'billable_hours', label: 'Billable hours', type: 'bar' },
      { key: 'utilisation_calc', label: 'Utilisation', type: 'line', computed: true },
    ],
  },
]

const PRODUCT_METRIC_GROUPS = [
  {
    group: 'MONEY',
    metrics: [
      { key: 'revenue', label: 'Revenue', type: 'line' },
      { key: 'marketing_spend', label: 'Marketing spend', type: 'bar' },
      { key: 'net_profit_calc', label: 'Net profit', type: 'line', computed: true },
      { key: 'variable_expenses_total', label: 'Operating expenses', type: 'bar' },
    ],
  },
  {
    group: 'SALES',
    metrics: [
      { key: 'num_orders', label: 'Orders', type: 'bar' },
      { key: 'new_customers', label: 'New customers', type: 'bar' },
      { key: 'active_customers', label: 'Active customers', type: 'line' },
    ],
  },
  {
    group: 'CAPACITY',
    metrics: [
      { key: 'stock_sold_units', label: 'Stock sold', type: 'bar' },
      { key: 'inventory_turnover_calc', label: 'Inventory turnover', type: 'line', computed: true },
    ],
  },
]

// ─── Period definitions ───────────────────────────────────────────────────────

const getPeriods = (today) => {
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const prevWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })

  return {
    wtd: {
      label: `Week to date · ${format(thisWeekStart, 'd MMM')} – ${format(thisWeekEnd, 'd MMM yyyy')}`,
      current: { start: thisWeekStart, end: thisWeekEnd },
      previous: { start: prevWeekStart, end: prevWeekEnd },
    },
    mtd: {
      label: `Month to date · ${format(startOfMonth(today), 'd MMM')} – ${format(today, 'd MMM yyyy')}`,
      current: { start: startOfMonth(today), end: endOfMonth(today) },
      previous: { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) },
    },
    qtd: {
      label: `Quarter to date · ${format(startOfQuarter(today), 'd MMM')} – ${format(today, 'd MMM yyyy')}`,
      current: { start: startOfQuarter(today), end: endOfQuarter(today) },
      previous: { start: startOfQuarter(subQuarters(today, 1)), end: endOfQuarter(subQuarters(today, 1)) },
    },
    ytd: {
      label: `Year to date · ${format(startOfYear(today), 'd MMM')} – ${format(today, 'd MMM yyyy')}`,
      current: { start: startOfYear(today), end: endOfYear(today) },
      previous: { start: startOfYear(subYears(today, 1)), end: endOfYear(subYears(today, 1)) },
    },
  }
}

// ─── Compute metric value from entry ─────────────────────────────────────────

function getMetricValue(entry, metricKey, constants, isProduct) {
  if (!metricKey.endsWith('_calc')) {
    return n(entry.entry_json?.[metricKey] || 0)
  }
  const calc = isProduct ? calcProduct : calcService
  const snap = calc(constants, entry.entry_json || {})
  if (metricKey === 'net_profit_calc') return snap.netProfit
  if (metricKey === 'utilisation_calc') return (snap.utilisation || 0) * 100
  if (metricKey === 'inventory_turnover_calc') return snap.inventoryTurnover || 0
  return 0
}

// ─── SVG Line chart (with gridlines + dotted markers) ────────────────────────

function TrendLineChart({ data, color = BRAND }) {
  if (!data || data.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: '#d1d5db', fontSize: '14px' }}>No data for this period</div>
  }

  const values = data.map(d => n(d.value))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const W = 600
  const H = 120
  const PAD = { top: 16, right: 16, bottom: 24, left: 16 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const xOf = (i) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2)
  const yOf = (v) => PAD.top + (1 - (v - min) / range) * chartH

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(n(d.value))}`).join(' ')

  const gridLines = [0.25, 0.5, 0.75].map(f => min + f * range)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '140px' }}>
      {/* Dashed gridlines */}
      {gridLines.map((v, i) => (
        <line key={i} x1={PAD.left} y1={yOf(v)} x2={W - PAD.right} y2={yOf(v)}
          stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dotted markers + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(n(d.value))} r={4} fill="white" stroke={color} strokeWidth="2" strokeDasharray="2,2" />
          <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9CA3AF">{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Comparison card (tiered) ────────────────────────────────────────────────

function ComparisonCard({ title, subtitle, currentTotal, change, previousTotal, soft = false }) {
  const hasChange = change !== null && change !== undefined
  return (
    <div style={{
      borderRadius: '12px', padding: '16px 18px',
      background: soft ? BEIGE : '#FFFFFF',
      border: '0.5px solid rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: soft ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.45)', marginBottom: '8px' }}>
        {title}
      </p>
      <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', marginBottom: '8px' }}>{subtitle}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: soft ? '20px' : '24px', fontWeight: 500, color: soft ? 'rgba(0,0,0,0.55)' : '#1A1A1A' }}>
          {currentTotal}
        </p>
        {hasChange && (
          <span style={{
            fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '14px',
            color: change > 0 ? '#059669' : change < 0 ? '#DC2626' : '#6B7280',
            background: change > 0 ? '#D1FAE5' : change < 0 ? '#FEE2E2' : '#F3F4F6',
          }}>
            {change > 0 ? '+' : ''}{(change * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {previousTotal && (
        <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.35)', marginTop: '4px' }}>from {previousTotal}</p>
      )}
    </div>
  )
}

// ─── Trend debrief block ──────────────────────────────────────────────────────

function TrendDebriefBlock({ watch, nextMove }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {watch.length > 0 && (
        <div style={{ borderLeft: `3px solid #BA7517`, paddingLeft: '14px' }}>
          <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#BA7517', marginBottom: '8px' }}>
            What needs attention
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {watch.map((w, i) => (
              <div key={i}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A', marginBottom: '2px' }}>{w.headline}</p>
                <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6 }}>{w.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ borderLeft: `3px solid ${BRAND}`, paddingLeft: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: BRAND, marginBottom: '8px' }}>
          Next best move
        </p>
        <p style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.6 }}>{nextMove}</p>
      </div>
    </div>
  )
}

// ─── Profit lever card ────────────────────────────────────────────────────────

function ProfitLeverCard({ title, description }) {
  return (
    <div style={{ borderRadius: '12px', padding: '16px 18px', background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,0.08)' }}>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 500, marginBottom: '6px' }}>{title}</p>
      <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.55)', lineHeight: 1.6 }}>{description}</p>
    </div>
  )
}

// ─── Main Trends page ─────────────────────────────────────────────────────────

export default function MoneyDashboardTrends({ settings }) {
  const { user_id, business_model: model, preferred_currency } = settings
  const isProduct = model === 'product'
  const currency = preferred_currency || 'AUD'

  const [entries, setEntries] = useState([])
  const [constants, setConstants] = useState(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS)
  const [fixedCosts, setFixedCosts] = useState([])
  const [loading, setLoading] = useState(true)

  const [activePeriod, setActivePeriod] = useState('mtd')
  const [selectedMetric, setSelectedMetric] = useState(null)

  const metricGroups = isProduct ? PRODUCT_METRIC_GROUPS : SERVICE_METRIC_GROUPS

  // Init selected metric to first in first group
  useEffect(() => {
    if (!selectedMetric) {
      setSelectedMetric(metricGroups[0].metrics[0])
    }
  }, [isProduct])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [allEntries, savedConstants, costs] = await Promise.all([
        getMoneyDashboardEntries(user_id, model, 52),
        getMoneyDashboardConstants(user_id, model),
        getBaselineFixedCosts(user_id),
      ])
      setEntries(allEntries)
      if (savedConstants) {
        setConstants({ ...(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS), ...savedConstants })
      }
      setFixedCosts(costs)
      setLoading(false)
    }
    load()
  }, [user_id, model])

  const today = new Date()
  const periods = useMemo(() => getPeriods(today), [])

  const fmtC = (v) => `${currency} $${Math.round(n(v)).toLocaleString()}`
  const fmtCShort = (v) => fmt.currencyShort(v)

  // Period entries
  const periodEntries = useMemo(() => {
    const p = periods[activePeriod]
    return getEntriesInRange(entries, p.current.start, p.current.end)
  }, [entries, activePeriod, periods])

  const prevPeriodEntries = useMemo(() => {
    const p = periods[activePeriod]
    return getEntriesInRange(entries, p.previous.start, p.previous.end)
  }, [entries, activePeriod, periods])

  // Period stats
  const periodStats = useMemo(() => {
    const currentKey = selectedMetric?.key
    if (!currentKey) return { total: 0, vsPercent: null, weeklyAvg: 0 }
    const total = periodEntries.reduce((s, e) => s + getMetricValue(e, currentKey, constants, isProduct), 0)
    const prevTotal = prevPeriodEntries.reduce((s, e) => s + getMetricValue(e, currentKey, constants, isProduct), 0)
    const vsPercent = pctChange(total, prevTotal)
    const weeklyAvg = periodEntries.length > 0 ? total / periodEntries.length : 0
    return { total, vsPercent, weeklyAvg }
  }, [periodEntries, prevPeriodEntries, selectedMetric, constants, isProduct])

  // Chart data for active period
  const chartData = useMemo(() => {
    if (!selectedMetric) return []
    const sorted = [...periodEntries].sort((a, b) =>
      a.entry_week_start_date.localeCompare(b.entry_week_start_date)
    )
    return sorted.map(e => ({
      label: format(parseISO(e.entry_week_start_date), activePeriod === 'ytd' || activePeriod === 'qtd' ? 'MMM' : 'd MMM'),
      value: getMetricValue(e, selectedMetric.key, constants, isProduct),
    }))
  }, [periodEntries, selectedMetric, activePeriod, constants, isProduct])

  // Comparison cards data (always weekly/monthly/quarterly/yearly)
  const comparisons = useMemo(() => {
    const makeComp = (period) => {
      const curr = getEntriesInRange(entries, periods[period].current.start, periods[period].current.end)
      const prev = getEntriesInRange(entries, periods[period].previous.start, periods[period].previous.end)
      const cRev = sumMetric(curr, 'revenue')
      const pRev = sumMetric(prev, 'revenue')
      return {
        current: fmtCShort(cRev),
        change: pctChange(cRev, pRev),
        previous: fmtCShort(pRev),
      }
    }
    return {
      wtd: makeComp('wtd'),
      mtd: makeComp('mtd'),
      qtd: makeComp('qtd'),
      ytd: makeComp('ytd'),
    }
  }, [entries, periods])

  // Trend debrief
  const trendDebrief = useMemo(() =>
    generateTrendDebrief(entries, constants, model),
    [entries, constants, model]
  )

  // Current snapshot for profit levers
  const currentSnapshot = useMemo(() => {
    if (entries.length === 0) return {}
    const calc = isProduct ? calcProduct : calcService
    return calc(constants, entries[0]?.entry_json || {}, fixedCosts)
  }, [entries, constants, fixedCosts, isProduct])

  const profitLevers = useMemo(() => getProfitLevers(currentSnapshot, model), [currentSnapshot, model])
  const streak = useMemo(() => computeStreak(entries), [entries])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '32px', height: '32px', border: `4px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '40px 20px', border: '0.5px solid rgba(0,0,0,0.12)', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>No data yet</p>
        <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.5)' }}>Save your first weekly entry on the Weekly tab to start seeing trends.</p>
      </div>
    )
  }

  const isCurrencyMetric = (key) => ['revenue', 'marketing_spend', 'net_profit_calc', 'variable_expenses_total', 'delivery_costs', 'cogs'].includes(key)
  const periodStatLabel = selectedMetric
    ? (isCurrencyMetric(selectedMetric.key) ? fmtC(periodStats.total) : Math.round(periodStats.total).toLocaleString())
    : '—'
  const weeklyAvgLabel = selectedMetric
    ? (isCurrencyMetric(selectedMetric.key) ? fmtC(periodStats.weeklyAvg) : periodStats.weeklyAvg.toFixed(1))
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Momentum right now ── */}
      <div style={{ background: BEIGE, borderRadius: '12px', padding: '20px 22px', borderTop: '0.5px solid rgba(0,0,0,0.08)', borderRight: '0.5px solid rgba(0,0,0,0.08)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', borderLeft: `3px solid ${BRAND}` }}>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: BRAND, marginBottom: '8px' }}>
          MOMENTUM RIGHT NOW
        </p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 500, color: '#1A1A1A', marginBottom: '4px' }}>
          {trendDebrief.momentumHeadline}
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)', marginBottom: '8px' }}>{trendDebrief.momentumSubtitle}</p>
        {trendDebrief.momentumSentence && (
          <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.7)', lineHeight: 1.6 }}>{trendDebrief.momentumSentence}</p>
        )}
      </div>

      {/* ── Period comparison cards ── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '14px' }}>Compare periods</p>

        {/* Row 1: full weight */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <ComparisonCard title="This week" subtitle="vs last week" currentTotal={comparisons.wtd.current} change={comparisons.wtd.change} previousTotal={`from ${comparisons.wtd.previous}`} />
          <ComparisonCard title="This month" subtitle="vs last month" currentTotal={comparisons.mtd.current} change={comparisons.mtd.change} previousTotal={`from ${comparisons.mtd.previous}`} />
        </div>

        {/* Row 2: soft/muted */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <ComparisonCard title="This quarter" subtitle="vs last quarter" currentTotal={comparisons.qtd.current} change={comparisons.qtd.change} previousTotal={`from ${comparisons.qtd.previous}`} soft />
          <ComparisonCard title="This year" subtitle="vs last year" currentTotal={comparisons.ytd.current} change={comparisons.ytd.change} previousTotal={`from ${comparisons.ytd.previous}`} soft />
        </div>
      </div>

      {/* ── Trend chart card ── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>

        {/* Chart header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '4px' }}>Trend chart</p>
            <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)' }}>{periods[activePeriod].label}</p>
          </div>

          {/* WTD / MTD / QTD / YTD toggle */}
          <div style={{ display: 'flex', gap: '2px', background: '#F2F2F2', borderRadius: '10px', padding: '3px' }}>
            {['wtd', 'mtd', 'qtd', 'ytd'].map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                style={{
                  padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  border: 'none', cursor: 'pointer', letterSpacing: '0.02em', fontFamily: 'DM Sans, sans-serif',
                  background: activePeriod === p ? '#FFFFFF' : 'transparent',
                  color: activePeriod === p ? '#1A1A1A' : 'rgba(0,0,0,0.45)',
                  boxShadow: activePeriod === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Period stats strip */}
        <div style={{ background: BEIGE, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>Period total</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, color: '#1A1A1A' }}>{periodStatLabel}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>Vs previous</p>
            <p style={{
              fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500,
              color: periodStats.vsPercent === null ? '#9CA3AF' : periodStats.vsPercent >= 0 ? '#27500A' : '#A32D2D',
            }}>
              {periodStats.vsPercent === null ? '—' : `${periodStats.vsPercent >= 0 ? '↑' : '↓'} ${Math.abs(periodStats.vsPercent * 100).toFixed(0)}%`}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>Weekly avg</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, color: '#1A1A1A' }}>{weeklyAvgLabel}</p>
          </div>
        </div>

        {/* Metric pills grouped */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {metricGroups.map(({ group, metrics }) => (
            <div key={group} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', minWidth: '52px' }}>{group}</span>
              {metrics.map(m => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMetric(m)}
                  style={{
                    fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: '14px',
                    border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    background: selectedMetric?.key === m.key ? BRAND : '#F2F2F2',
                    color: selectedMetric?.key === m.key ? '#FFFFFF' : 'rgba(0,0,0,0.6)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(0,0,0,0.3)', fontSize: '14px' }}>No data for this period.</div>
        ) : (
          <TrendLineChart data={chartData} />
        )}
      </div>

      {/* ── WMHQ Trend Debrief ── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '4px' }}>WMHQ trend debrief</p>
        <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', marginBottom: '16px' }}>A read of your recent trajectory.</p>
        <TrendDebriefBlock watch={trendDebrief.watch} nextMove={trendDebrief.nextMove} />
      </div>

      {/* ── Profit Levers ── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px 22px', border: '0.5px solid rgba(0,0,0,0.12)' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '4px' }}>Profit levers</p>
        <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', marginBottom: '16px' }}>The highest-leverage moves for your business model right now.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profitLevers.map((lever, i) => (
            <ProfitLeverCard key={i} title={lever.title} description={lever.description} />
          ))}
        </div>
      </div>

    </div>
  )
}
