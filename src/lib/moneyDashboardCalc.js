import { format, startOfWeek, parseISO, differenceInDays } from 'date-fns'

// ─── Safe helpers ─────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0
const safe = (v) => (isFinite(v) && !isNaN(v) ? v : 0)
const pct = (a, b) => (b > 0 ? safe(a / b) : 0)

// ─── Default constants ────────────────────────────────────────────────────────

export const PRODUCT_CONSTANT_DEFAULTS = {
  packaging_cost_per_unit: 0,
  fulfillment_cost_per_unit: 0,
  transaction_fee_pct: 2,
  opex_team: 0,
  opex_software: 0,
  opex_rent: 0,
  opex_other: 0,
}

export const SERVICE_CONSTANT_DEFAULTS = {
  max_client_capacity: 10,
  available_hours_per_week: 40,
  opex_team: 0,
  opex_software: 0,
  opex_rent: 0,
  opex_other: 0,
}

export const PRODUCT_WEEKLY_DEFAULTS = {
  revenue: '',
  num_orders: '',
  cogs: '',
  new_customers: '',
  repeat_customers: '',
  refunds_value: '',
  marketing_spend: '',
  opening_inventory_value: '',
  closing_inventory_value: '',
  inventory_purchased: '',
  stock_sold_units: '',
  stock_on_hand_units: '',
  notes: '',
}

export const SERVICE_WEEKLY_DEFAULTS = {
  revenue: '',
  sales_calls_booked: '',
  sales_closed: '',
  new_clients: '',
  active_clients: '',
  renewals: '',
  refunds_value: '',
  marketing_spend: '',
  delivery_costs: '',
  billable_hours: '',
  admin_hours: '',
  notes: '',
}

// ─── Product snapshot ─────────────────────────────────────────────────────────

export const calcProduct = (constants = {}, weekly = {}) => {
  const c = { ...PRODUCT_CONSTANT_DEFAULTS, ...constants }
  const w = weekly

  const revenue = n(w.revenue)
  const numOrders = n(w.num_orders)
  const cogs = n(w.cogs)
  const newCustomers = n(w.new_customers)
  const repeatCustomers = n(w.repeat_customers)
  const refundsValue = n(w.refunds_value)
  const marketingSpend = n(w.marketing_spend)
  const openingInventory = n(w.opening_inventory_value)
  const closingInventory = n(w.closing_inventory_value)
  const stockSoldUnits = n(w.stock_sold_units)
  const stockOnHandUnits = n(w.stock_on_hand_units)

  const perOrderVarCosts = numOrders * (n(c.packaging_cost_per_unit) + n(c.fulfillment_cost_per_unit))
  const transactionFees = revenue * (n(c.transaction_fee_pct) / 100)
  const totalVariableCosts = cogs + perOrderVarCosts + transactionFees + refundsValue

  const grossProfit = revenue - cogs - perOrderVarCosts - transactionFees - refundsValue
  const fixedOpex = n(c.opex_team) + n(c.opex_software) + n(c.opex_rent) + n(c.opex_other)
  const totalOpex = marketingSpend + fixedOpex
  const netProfit = grossProfit - totalOpex

  const grossMargin = pct(grossProfit, revenue)
  const netMargin = pct(netProfit, revenue)

  const totalCustomers = newCustomers + repeatCustomers
  const aov = numOrders > 0 ? safe(revenue / numOrders) : null
  const cac = newCustomers > 0 ? safe(marketingSpend / newCustomers) : null
  const repeatRate = totalCustomers > 0 ? pct(repeatCustomers, totalCustomers) : null
  const refundRate = revenue > 0 ? pct(refundsValue, revenue) : null
  const ltv = aov && repeatRate ? safe(aov / (1 - repeatRate)) : null
  const ltvCac = ltv && cac && cac > 0 ? safe(ltv / cac) : null

  const avgInventory = (openingInventory + closingInventory) / 2
  const inventoryTurnover = avgInventory > 0 ? safe(cogs / avgInventory) : null
  const totalStock = stockSoldUnits + stockOnHandUnits
  const sellThrough = totalStock > 0 ? pct(stockSoldUnits, totalStock) : null

  return {
    revenue, grossProfit, grossMargin, netProfit, netMargin,
    totalOpex, fixedOpex, totalVariableCosts,
    aov, cac, repeatRate, refundRate, ltv, ltvCac,
    avgInventory, inventoryTurnover, sellThrough,
    totalCustomers, newCustomers, repeatCustomers,
  }
}

// ─── Service snapshot ─────────────────────────────────────────────────────────

export const calcService = (constants = {}, weekly = {}) => {
  const c = { ...SERVICE_CONSTANT_DEFAULTS, ...constants }
  const w = weekly

  const revenue = n(w.revenue)
  const salesCallsBooked = n(w.sales_calls_booked)
  const salesClosed = n(w.sales_closed)
  const newClients = n(w.new_clients)
  const activeClients = n(w.active_clients)
  const renewals = n(w.renewals)
  const refundsValue = n(w.refunds_value)
  const marketingSpend = n(w.marketing_spend)
  const deliveryCosts = n(w.delivery_costs)
  const billableHours = n(w.billable_hours)
  const adminHours = n(w.admin_hours)

  const variableCosts = deliveryCosts + refundsValue
  const grossProfit = revenue - variableCosts
  const fixedOpex = n(c.opex_team) + n(c.opex_software) + n(c.opex_rent) + n(c.opex_other)
  const totalOpex = marketingSpend + fixedOpex
  const netProfit = grossProfit - totalOpex

  const grossMargin = pct(grossProfit, revenue)
  const netMargin = pct(netProfit, revenue)

  const conversionRate = salesCallsBooked > 0 ? pct(salesClosed, salesCallsBooked) : null
  const cac = newClients > 0 ? safe(marketingSpend / newClients) : null
  const maxCapacity = n(c.max_client_capacity)
  const capacityPressure = maxCapacity > 0 ? pct(activeClients, maxCapacity) : null
  const availableHours = n(c.available_hours_per_week)
  const utilisation = availableHours > 0 ? pct(billableHours, availableHours) : null
  const refundRate = revenue > 0 ? pct(refundsValue, revenue) : null
  const totalHours = billableHours + adminHours

  return {
    revenue, grossProfit, grossMargin, netProfit, netMargin,
    totalOpex, fixedOpex, variableCosts,
    conversionRate, cac, capacityPressure, utilisation, refundRate,
    totalHours, billableHours, adminHours,
    activeClients, newClients, renewals,
  }
}

// ─── Health tags ──────────────────────────────────────────────────────────────

const COLORS = {
  strong:   { color: '#059669', bg: '#D1FAE5' },
  healthy:  { color: '#059669', bg: '#D1FAE5' },
  moderate: { color: '#D97706', bg: '#FEF3C7' },
  warning:  { color: '#EA580C', bg: '#FFF7ED' },
  risk:     { color: '#DC2626', bg: '#FEE2E2' },
  neutral:  { color: '#6B7280', bg: '#F3F4F6' },
}

const tag = (label, style) => ({ label, ...COLORS[style] })

export const healthTag = (metric, value) => {
  if (value === null || value === undefined || isNaN(value)) return null

  switch (metric) {
    case 'revenue':
      return value > 0 ? tag('Revenue flowing', 'healthy') : tag('No revenue', 'neutral')

    case 'gross_margin':
    case 'grossMargin':
      if (value >= 0.6) return tag('Strong margin', 'strong')
      if (value >= 0.4) return tag('Healthy margin', 'healthy')
      if (value >= 0.2) return tag('Moderate', 'moderate')
      return tag('Needs attention', 'risk')

    case 'net_margin':
    case 'netMargin':
      if (value >= 0.3) return tag('Strong', 'strong')
      if (value >= 0.15) return tag('Healthy retention', 'healthy')
      if (value >= 0.05) return tag('Moderate', 'moderate')
      if (value >= 0) return tag('Tightening', 'warning')
      return tag('Loss', 'risk')

    case 'inventoryTurnover':
      if (value === null) return null
      if (value >= 4) return tag('Fast', 'strong')
      if (value >= 2) return tag('Healthy', 'healthy')
      if (value >= 1) return tag('Moderate', 'moderate')
      return tag('Cash tied up in stock', 'warning')

    case 'sellThrough':
      if (value === null) return null
      if (value >= 0.8) return tag('Strong', 'strong')
      if (value >= 0.6) return tag('Healthy', 'healthy')
      if (value >= 0.4) return tag('Moderate', 'moderate')
      return tag('Slow', 'warning')

    case 'repeatRate':
      if (value === null) return null
      if (value >= 0.6) return tag('Strong', 'strong')
      if (value >= 0.3) return tag('Healthy', 'healthy')
      return tag('Low', 'neutral')

    case 'refundRate':
      if (value === null) return null
      if (value <= 0.01) return tag('Low', 'strong')
      if (value <= 0.03) return tag('Moderate', 'moderate')
      if (value <= 0.05) return tag('High', 'warning')
      return tag('Risk', 'risk')

    case 'conversionRate':
      if (value === null) return null
      if (value >= 0.5) return tag('Strong close rate', 'strong')
      if (value >= 0.25) return tag('Healthy', 'healthy')
      if (value >= 0.1) return tag('Moderate', 'moderate')
      return tag('Low', 'warning')

    case 'capacityPressure':
      if (value === null) return null
      if (value >= 0.9) return tag('At capacity', 'risk')
      if (value >= 0.7) return tag('Healthy', 'healthy')
      if (value >= 0.5) return tag('Moderate', 'moderate')
      return tag('Low utilisation', 'neutral')

    case 'utilisation':
      if (value === null) return null
      if (value >= 0.8) return tag('Strong', 'strong')
      if (value >= 0.6) return tag('Healthy', 'healthy')
      if (value >= 0.4) return tag('Moderate', 'moderate')
      return tag('Low', 'neutral')

    default:
      return null
  }
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export const computeStreak = (entries) => {
  if (!entries || entries.length === 0) return 0

  const sorted = [...entries].sort((a, b) =>
    b.entry_week_start_date.localeCompare(a.entry_week_start_date)
  )

  const today = new Date()
  const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const prevWeekStart = format(startOfWeek(
    new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    { weekStartsOn: 1 }
  ), 'yyyy-MM-dd')

  const latest = sorted[0]
  // Streak only active if most recent entry is this week or last week
  if (latest.entry_week_start_date !== currentWeekStart && latest.entry_week_start_date !== prevWeekStart) {
    return 0
  }

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const curr = parseISO(sorted[i - 1].entry_week_start_date)
    const prev = parseISO(sorted[i].entry_week_start_date)
    if (differenceInDays(curr, prev) === 7) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ─── Debrief generation ───────────────────────────────────────────────────────

export const generateWeeklyDebrief = (snapshot, model) => {
  const points = []

  if (!snapshot || snapshot.revenue === 0) {
    return [{ type: 'neutral', text: 'Enter your weekly numbers above to see your personalised financial debrief.' }]
  }

  if (model === 'product') {
    if (snapshot.grossMargin >= 0.5) {
      points.push({ type: 'positive', text: `Gross margin is at ${fmt.pct(snapshot.grossMargin)} — your pricing is holding strong.` })
    } else if (snapshot.grossMargin < 0.3 && snapshot.grossMargin >= 0) {
      points.push({ type: 'warning', text: `Gross margin is tight at ${fmt.pct(snapshot.grossMargin)}. Review COGS or consider a price adjustment.` })
    }

    if (snapshot.netProfit < 0) {
      points.push({ type: 'risk', text: 'The business ran at a loss this week. Identify your largest cost driver and act on it.' })
    } else if (snapshot.netMargin >= 0.25) {
      points.push({ type: 'positive', text: `Net margin is ${fmt.pct(snapshot.netMargin)} — the business is keeping a healthy portion of every dollar.` })
    } else if (snapshot.netMargin < 0.1) {
      points.push({ type: 'warning', text: `Net margin is ${fmt.pct(snapshot.netMargin)}. Operating costs may be eroding your profit.` })
    }

    if (snapshot.inventoryTurnover !== null && snapshot.inventoryTurnover < 1) {
      points.push({ type: 'watch', text: 'Inventory turnover is slow. Cash may be sitting in stock — consider a promotion or clearance move.' })
    }

    if (snapshot.repeatRate !== null && snapshot.repeatRate >= 0.4) {
      points.push({ type: 'positive', text: `${fmt.pct(snapshot.repeatRate)} of customers are returning — strong retention signal.` })
    }

  } else {
    if (snapshot.grossMargin >= 0.6) {
      points.push({ type: 'positive', text: `Strong delivery margin at ${fmt.pct(snapshot.grossMargin)} — your service structure is profitable.` })
    } else if (snapshot.grossMargin < 0.4) {
      points.push({ type: 'warning', text: `Delivery costs are eating into margin (${fmt.pct(snapshot.grossMargin)} gross). Review how you deliver.` })
    }

    if (snapshot.netProfit < 0) {
      points.push({ type: 'risk', text: 'Operating at a loss this week. Pinpoint your biggest spend and review it.' })
    } else if (snapshot.netMargin >= 0.25) {
      points.push({ type: 'positive', text: `Net margin is ${fmt.pct(snapshot.netMargin)} — the business is retaining well.` })
    }

    if (snapshot.capacityPressure !== null && snapshot.capacityPressure >= 0.9) {
      points.push({ type: 'watch', text: 'You\'re at or near capacity. Growth from here requires a system, team, or pricing change.' })
    } else if (snapshot.capacityPressure !== null && snapshot.capacityPressure < 0.5) {
      points.push({ type: 'watch', text: 'Capacity is underused. Focus on filling the pipeline this week.' })
    }

    if (snapshot.conversionRate !== null && snapshot.conversionRate >= 0.4) {
      points.push({ type: 'positive', text: `${fmt.pct(snapshot.conversionRate)} sales conversion — solid close rate.` })
    } else if (snapshot.conversionRate !== null && snapshot.conversionRate > 0 && snapshot.conversionRate < 0.2) {
      points.push({ type: 'watch', text: 'Conversion rate is under 20%. Review your offer, positioning, or sales process.' })
    }
  }

  if (points.length === 0) {
    points.push({ type: 'neutral', text: 'Keep logging your weekly numbers to build richer trend insights over time.' })
  }

  return points
}

// ─── Trend debrief (from multiple entries) ────────────────────────────────────

export const generateTrendDebrief = (entries, constants, model) => {
  if (!entries || entries.length < 2) {
    return {
      strong: ['Keep logging weekly to unlock trend insights.'],
      watch: [],
      nextMove: 'Log at least 2 weeks of data to see what\'s trending.',
    }
  }

  const snapshots = entries.map(e => {
    const calc = model === 'product' ? calcProduct : calcService
    return { ...calc(constants, e.entry_json || {}), weekStart: e.entry_week_start_date }
  })

  const recent = snapshots.slice(0, 4)
  const avgRevenue = recent.reduce((s, x) => s + x.revenue, 0) / recent.length
  const avgNetMargin = recent.reduce((s, x) => s + x.netMargin, 0) / recent.length

  const strong = []
  const watch = []
  let nextMove = ''

  if (avgNetMargin >= 0.2) {
    strong.push(`Net margin has averaged ${fmt.pct(avgNetMargin)} over the last ${recent.length} weeks.`)
  } else if (avgNetMargin < 0.05) {
    watch.push(`Net margin has averaged only ${fmt.pct(avgNetMargin)} recently. Operating costs may need a review.`)
  }

  if (snapshots.length >= 4) {
    const revenueGrowth = snapshots[0].revenue > snapshots[3].revenue
    if (revenueGrowth) {
      strong.push('Revenue has been growing over the last 4 weeks.')
    } else {
      watch.push('Revenue has been flat or declining over the last 4 weeks.')
    }
  }

  if (model === 'product') {
    const avgTurnover = recent.filter(s => s.inventoryTurnover !== null).reduce((s, x) => s + (x.inventoryTurnover || 0), 0) / recent.length
    if (avgTurnover > 0 && avgTurnover < 1) {
      watch.push(`Inventory turnover has averaged ${avgTurnover.toFixed(1)}x — cash may be sitting in stock.`)
    }
    nextMove = avgNetMargin < 0.1
      ? 'Review your biggest cost this week and identify one thing you can reduce or negotiate.'
      : 'Consider whether your pricing reflects your current demand and margin level.'
  } else {
    const avgCapacity = recent.filter(s => s.capacityPressure !== null).reduce((s, x) => s + (x.capacityPressure || 0), 0) / recent.length
    if (avgCapacity >= 0.85) {
      watch.push(`Capacity has averaged ${fmt.pct(avgCapacity)} over recent weeks — growth may be constrained.`)
      nextMove = 'Evaluate whether you can raise prices, delegate delivery, or increase capacity.'
    } else if (avgCapacity < 0.5 && avgCapacity > 0) {
      watch.push(`Capacity is underused at ${fmt.pct(avgCapacity)} on average.`)
      nextMove = 'Focus on lead generation and pipeline activity this week.'
    } else {
      nextMove = avgNetMargin < 0.1
        ? 'Review your delivery costs — look for inefficiencies or underpriced work.'
        : 'Strong position. Consider how you can increase revenue per client or expand capacity.'
    }
  }

  if (!nextMove) nextMove = 'Continue logging weekly data to unlock more specific recommendations.'

  return { strong, watch, nextMove }
}

// ─── Profit levers ────────────────────────────────────────────────────────────

export const getProfitLevers = (snapshot, model) => {
  if (model === 'product') {
    return [
      {
        title: 'Increase Average Order Value',
        description: 'Bundles, upsells, or tiered offers can raise revenue without extra acquisition cost.',
        relevant: snapshot.aov !== null && snapshot.aov < 100,
      },
      {
        title: 'Improve Gross Margin',
        description: 'Negotiate COGS, reduce packaging costs, or review your pricing model.',
        relevant: snapshot.grossMargin < 0.5,
      },
      {
        title: 'Reduce Customer Acquisition Cost',
        description: 'Optimise your best-performing channel before scaling spend.',
        relevant: snapshot.cac !== null && snapshot.aov !== null && snapshot.cac > snapshot.aov * 0.3,
      },
      {
        title: 'Increase Repeat Purchase Rate',
        description: 'Email sequences, loyalty offers, and post-purchase nurture increase LTV.',
        relevant: snapshot.repeatRate !== null && snapshot.repeatRate < 0.3,
      },
      {
        title: 'Improve Inventory Turnover',
        description: 'Slow stock ties up cash. Consider promotions, bundles, or adjusted reorder points.',
        relevant: snapshot.inventoryTurnover !== null && snapshot.inventoryTurnover < 2,
      },
    ].filter(l => l.relevant || !Object.values(snapshot).some(v => v !== null))
  } else {
    return [
      {
        title: 'Raise Revenue Per Client',
        description: 'Review whether your pricing reflects the transformation and outcome you deliver.',
        relevant: snapshot.grossMargin < 0.6,
      },
      {
        title: 'Improve Conversion Rate',
        description: 'A small lift in close rate can significantly increase revenue without more leads.',
        relevant: snapshot.conversionRate !== null && snapshot.conversionRate < 0.3,
      },
      {
        title: 'Reduce Delivery Cost Leakage',
        description: 'Identify time and resource waste in how you deliver. Systemise or delegate.',
        relevant: snapshot.grossMargin < 0.5,
      },
      {
        title: 'Improve Retention',
        description: 'Renewals and continuity revenue are your most cost-efficient growth lever.',
        relevant: snapshot.renewals !== undefined && snapshot.renewals === 0,
      },
      {
        title: 'Reduce Capacity Strain',
        description: 'Group programs, productised services, or async delivery can scale your output.',
        relevant: snapshot.capacityPressure !== null && snapshot.capacityPressure >= 0.85,
      },
    ]
  }
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

export const aggregateByMetric = (entries, metricFn) => {
  return entries.map(e => ({
    label: e.entry_week_start_date ? format(parseISO(e.entry_week_start_date), 'd MMM') : '',
    value: metricFn(e),
    weekStart: e.entry_week_start_date,
  })).reverse()
}

export const sumByMonth = (entries, metricFn) => {
  const months = {}
  entries.forEach(e => {
    const key = e.entry_week_start_date?.slice(0, 7)
    if (!key) return
    if (!months[key]) months[key] = { label: format(parseISO(e.entry_week_start_date), 'MMM yy'), value: 0, count: 0 }
    months[key].value += metricFn(e)
    months[key].count++
  })
  return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export const fmt = {
  currency: (v, currency = 'AUD') => {
    if (v === null || v === undefined) return '—'
    const abs = Math.abs(n(v))
    const prefix = n(v) < 0 ? '-' : ''
    if (abs >= 1000000) return `${prefix}${currency} ${(abs / 1000000).toFixed(1)}M`
    if (abs >= 1000) return `${prefix}${currency} $${(abs / 1000).toFixed(1)}k`
    return `${prefix}${currency} $${abs.toLocaleString()}`
  },
  currencyShort: (v, currency = 'AUD') => {
    if (v === null || v === undefined || v === '') return '—'
    const num = n(v)
    const abs = Math.abs(num)
    const prefix = num < 0 ? '-' : ''
    if (abs >= 1000) return `${prefix}$${(abs / 1000).toFixed(0)}k`
    return `${prefix}$${abs.toLocaleString()}`
  },
  pct: (v) => {
    if (v === null || v === undefined) return '—'
    return `${(n(v) * 100).toFixed(1)}%`
  },
  num: (v, decimals = 1) => {
    if (v === null || v === undefined) return '—'
    return n(v).toFixed(decimals)
  },
  x: (v) => {
    if (v === null || v === undefined) return '—'
    return `${n(v).toFixed(1)}x`
  },
}
