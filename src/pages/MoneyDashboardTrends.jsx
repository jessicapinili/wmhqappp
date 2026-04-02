import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import {
  getMoneyDashboardEntries,
  getMoneyDashboardConstants,
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

const BRAND = '#3d0c0c'

// ─── Comparison helpers ───────────────────────────────────────────────────────

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

const avgMetric = (entries, key) => {
  if (!entries.length) return 0
  return entries.reduce((s, e) => s + Number(e.entry_json?.[key] || 0), 0) / entries.length
}

const pctChange = (curr, prev) => {
  if (!prev || prev === 0) return null
  return (curr - prev) / prev
}

// ─── Comparison card ──────────────────────────────────────────────────────────

function ComparisonCard({ title, metrics, period }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 mb-3">{title}</p>
      <div className="space-y-2">
        {metrics.map(({ label, current, change }) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-600">{label}</p>
            <div className="flex items-center gap-2">
              <p className="section-title">{current}</p>
              {change !== null && change !== undefined && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={
                    change > 0
                      ? { color: '#059669', backgroundColor: '#D1FAE5' }
                      : change < 0
                      ? { color: '#DC2626', backgroundColor: '#FEE2E2' }
                      : { color: '#6B7280', backgroundColor: '#F3F4F6' }
                  }
                >
                  {change > 0 ? '+' : ''}{(change * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SVG Bar chart ────────────────────────────────────────────────────────────

function TrendBarChart({ data, color = BRAND }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data yet</div>
  }

  const values = data.map(d => Number(d.value || 0))
  const max = Math.max(...values, 1)
  const CHART_HEIGHT = 120
  const LABEL_HEIGHT = 20
  const totalH = CHART_HEIGHT + LABEL_HEIGHT

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: `${Math.max(data.length * 40, 320)}px` }}>
        <svg viewBox={`0 0 ${Math.max(data.length * 40, 320)} ${totalH}`} style={{ width: '100%', height: '140px' }}>
          {data.map((d, i) => {
            const barW = Math.max((320 / data.length) * 0.6, 20)
            const x = (320 / data.length) * i + (320 / data.length) * 0.2
            const val = Number(d.value || 0)
            const barH = max > 0 ? (val / max) * CHART_HEIGHT : 0
            const y = CHART_HEIGHT - barH

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(barH, val > 0 ? 2 : 0)}
                  rx={3}
                  fill={color}
                  opacity={0.85}
                />
                <text
                  x={x + barW / 2}
                  y={totalH - 2}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9CA3AF"
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── SVG Line chart ───────────────────────────────────────────────────────────

function TrendLineChart({ data, color = BRAND }) {
  if (!data || data.length < 2) {
    return <div className="flex items-center justify-center h-32 text-gray-300 text-sm">Not enough data yet</div>
  }

  const values = data.map(d => Number(d.value || 0))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const W = 600
  const H = 100
  const PAD = 16

  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - 2 * PAD),
    y: PAD + (1 - (Number(d.value || 0) - min) / range) * (H - 2 * PAD),
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: '120px' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={color} />
          <text x={p.x} y={H + 18} textAnchor="middle" fontSize={9} fill="#9CA3AF">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── WMHQ Debrief ─────────────────────────────────────────────────────────────

function TrendDebriefBlock({ strong, watch, nextMove }) {
  return (
    <div className="space-y-4">
      {strong.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#059669' }}>What's Strong</p>
          <div className="space-y-1.5">
            {strong.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-black" style={{ color: '#059669' }}>↑</span>
                <p className="text-sm text-gray-700">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {watch.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#D97706' }}>What Needs Attention</p>
          <div className="space-y-1.5">
            {watch.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-black" style={{ color: '#D97706' }}>→</span>
                <p className="text-sm text-gray-700">{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: BRAND }}>Next Best Move</p>
        <p className="text-sm text-gray-700">{nextMove}</p>
      </div>
    </div>
  )
}

// ─── Profit levers ────────────────────────────────────────────────────────────

function ProfitLeverCard({ title, description }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
      <p className="section-title mb-1">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

// ─── Metric options ───────────────────────────────────────────────────────────

const PRODUCT_METRICS = [
  { key: 'revenue', label: 'Revenue', type: 'bar' },
  { key: 'marketing_spend', label: 'Marketing Spend', type: 'bar' },
  { key: 'num_orders', label: 'Orders', type: 'bar' },
  { key: 'new_customers', label: 'New Customers', type: 'bar' },
  { key: 'refunds_value', label: 'Refunds', type: 'bar' },
  { key: 'cogs', label: 'COGS', type: 'bar' },
]

const SERVICE_METRICS = [
  { key: 'revenue', label: 'Revenue', type: 'bar' },
  { key: 'marketing_spend', label: 'Marketing Spend', type: 'bar' },
  { key: 'sales_closed', label: 'Sales Closed', type: 'bar' },
  { key: 'new_clients', label: 'New Clients', type: 'bar' },
  { key: 'active_clients', label: 'Active Clients', type: 'line' },
  { key: 'delivery_costs', label: 'Delivery Costs', type: 'bar' },
  { key: 'billable_hours', label: 'Billable Hours', type: 'bar' },
]

// ─── Main Trends page ─────────────────────────────────────────────────────────

export default function MoneyDashboardTrends({ settings }) {
  const { user_id, business_model: model, preferred_currency } = settings
  const isProduct = model === 'product'
  const currency = preferred_currency || 'AUD'

  const [entries, setEntries] = useState([])
  const [constants, setConstants] = useState(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState(isProduct ? PRODUCT_METRICS[0] : SERVICE_METRICS[0])

  const metrics = isProduct ? PRODUCT_METRICS : SERVICE_METRICS

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [allEntries, savedConstants] = await Promise.all([
        getMoneyDashboardEntries(user_id, model, 52),
        getMoneyDashboardConstants(user_id, model),
      ])
      setEntries(allEntries)
      if (savedConstants) {
        setConstants({ ...(isProduct ? PRODUCT_CONSTANT_DEFAULTS : SERVICE_CONSTANT_DEFAULTS), ...savedConstants })
      }
      setLoading(false)
    }
    load()
  }, [user_id, model])

  const today = new Date()

  // Period boundaries
  const thisWeek = { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) }
  const lastWeek = { start: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }) }
  const thisMonth = { start: startOfMonth(today), end: endOfMonth(today) }
  const lastMonth = { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) }
  const thisQ = { start: startOfQuarter(today), end: endOfQuarter(today) }
  const lastQ = { start: startOfQuarter(subQuarters(today, 1)), end: endOfQuarter(subQuarters(today, 1)) }
  const thisYear = { start: startOfYear(today), end: endOfYear(today) }
  const lastYear = { start: startOfYear(subYears(today, 1)), end: endOfYear(subYears(today, 1)) }

  const entriesIn = (range) => getEntriesInRange(entries, range.start, range.end)

  // Comparison data
  const comparisons = useMemo(() => {
    const makeComp = (curr, prev) => {
      const cRevenue = sumMetric(curr, 'revenue')
      const pRevenue = sumMetric(prev, 'revenue')
      const cMkt = sumMetric(curr, 'marketing_spend')
      const pMkt = sumMetric(prev, 'marketing_spend')
      const cSales = isProduct ? sumMetric(curr, 'num_orders') : sumMetric(curr, 'sales_closed')
      const pSales = isProduct ? sumMetric(prev, 'num_orders') : sumMetric(prev, 'sales_closed')
      const cNewCust = isProduct ? sumMetric(curr, 'new_customers') : sumMetric(curr, 'new_clients')
      const pNewCust = isProduct ? sumMetric(prev, 'new_customers') : sumMetric(prev, 'new_clients')
      return [
        { label: 'Revenue', current: fmt.currencyShort(cRevenue), change: pctChange(cRevenue, pRevenue) },
        { label: 'Ad Spend', current: fmt.currencyShort(cMkt), change: pctChange(cMkt, pMkt) },
        { label: isProduct ? 'Orders' : 'Sales', current: String(cSales), change: pctChange(cSales, pSales) },
        { label: isProduct ? 'New Customers' : 'New Clients', current: String(cNewCust), change: pctChange(cNewCust, pNewCust) },
      ]
    }
    return {
      weekly: makeComp(entriesIn(thisWeek), entriesIn(lastWeek)),
      monthly: makeComp(entriesIn(thisMonth), entriesIn(lastMonth)),
      quarterly: makeComp(entriesIn(thisQ), entriesIn(lastQ)),
      yearly: makeComp(entriesIn(thisYear), entriesIn(lastYear)),
    }
  }, [entries, isProduct])

  // Chart data (last 12 entries, oldest first for chart)
  const chartData = useMemo(() => {
    const recent = entries.slice(0, 12).reverse()
    return recent.map(e => ({
      label: e.entry_week_start_date ? format(parseISO(e.entry_week_start_date), 'd MMM') : '',
      value: Number(e.entry_json?.[selectedMetric.key] || 0),
    }))
  }, [entries, selectedMetric])

  // Snapshot-based trend debrief
  const snapshots = useMemo(() => {
    return entries.map(e => {
      const calc = isProduct ? calcProduct : calcService
      return calc(constants, e.entry_json || {})
    })
  }, [entries, constants, isProduct])

  const trendDebrief = useMemo(() =>
    generateTrendDebrief(entries, constants, model),
    [entries, constants, model]
  )

  const currentSnapshot = snapshots[0] || {}
  const profitLevers = useMemo(() => getProfitLevers(currentSnapshot, model), [currentSnapshot, model])
  const streak = useMemo(() => computeStreak(entries), [entries])

  const fmtC = (v) => `${currency} $${Number(v || 0).toLocaleString()}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${BRAND} transparent transparent transparent` }} />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card-section text-center py-12">
        <p className="text-2xl mb-3">📊</p>
        <p className="section-title mb-1">No data yet</p>
        <p className="text-sm text-gray-500">Save your first weekly entry on the Weekly tab to start seeing trends.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Stats strip ── */}
      <div className="card-section !p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Weeks Tracked</p>
            <p className="section-title">{entries.length}</p>
          </div>
          {streak > 0 && (
            <>
              <div className="w-px h-8 bg-gray-100" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Current Streak</p>
                <p className="text-sm font-bold" style={{ color: BRAND }}>{streak} week{streak !== 1 ? 's' : ''}</p>
              </div>
            </>
          )}
          {entries[0] && (
            <>
              <div className="w-px h-8 bg-gray-100" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Latest Entry</p>
                <p className="section-title">{format(parseISO(entries[0].entry_week_start_date), 'd MMM yyyy')}</p>
              </div>
            </>
          )}
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Model</p>
            <p className="section-title">{isProduct ? 'Product-Based' : 'Service-Based'}</p>
          </div>
        </div>
      </div>

      {/* ── Period comparisons ── */}
      <div className="card-section">
        <p className="section-title mb-1">Period Comparisons</p>
        <p className="section-subtitle">Current period vs previous, based on your saved data.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ComparisonCard title="This Week vs Last Week" metrics={comparisons.weekly} />
          <ComparisonCard title="This Month vs Last Month" metrics={comparisons.monthly} />
          <ComparisonCard title="This Quarter vs Last Quarter" metrics={comparisons.quarterly} />
          <ComparisonCard title="This Year vs Last Year" metrics={comparisons.yearly} />
        </div>
      </div>

      {/* ── Trend chart ── */}
      <div className="card-section">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-black text-gray-900 text-base mb-0.5">Trend Chart</p>
            <p className="text-sm text-gray-400">Last {Math.min(entries.length, 12)} weeks of data.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metrics.map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m)}
                className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                style={
                  selectedMetric.key === m.key
                    ? { backgroundColor: BRAND, color: '#fff' }
                    : { backgroundColor: '#f3f4f6', color: '#6B7280' }
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No data available for this metric.</div>
        ) : selectedMetric.type === 'bar' ? (
          <TrendBarChart data={chartData} />
        ) : (
          <TrendLineChart data={chartData} />
        )}
      </div>

      {/* ── WMHQ Trend Debrief ── */}
      <div className="card-section">
        <p className="section-title mb-1">WMHQ Trend Debrief</p>
        <p className="section-subtitle">A read of your recent trajectory.</p>
        <TrendDebriefBlock {...trendDebrief} />
      </div>

      {/* ── Profit Levers ── */}
      <div className="card-section">
        <p className="section-title mb-1">Profit Levers</p>
        <p className="section-subtitle">The highest-leverage moves for your business model right now.</p>
        <div className="grid grid-cols-1 gap-3 mt-3">
          {profitLevers.map((lever, i) => (
            <ProfitLeverCard key={i} title={lever.title} description={lever.description} />
          ))}
        </div>
      </div>

    </div>
  )
}
