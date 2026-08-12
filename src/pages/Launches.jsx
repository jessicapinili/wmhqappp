import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HeartIcon } from '../lib/icons'

// ─── Constants ─────────────────────────────────────────────────────────────────

const BRAND = '#3d0c0c'

const CAMPAIGN_MODELS = [
  'Live launch',
  'Evergreen campaign',
  'Limited drop',
  'Waitlist campaign',
  'Relaunch',
]

const PRIMARY_GOALS = [
  'Generate leads',
  'Build waitlist',
  'Launch new offer',
  'Sell existing offer',
  'Fill a program',
  'Increase recurring revenue',
  'Retain or renew clients',
]

const STAGES = ['Planning', 'Pre-launch', 'Open', 'Closed', 'Reviewing']

const STAGE_CONFIG = {
  'Planning':   { color: '#6D3FC0', bg: '#F1EAFE', border: '#D8C5F5' },
  'Pre-launch': { color: '#A86600', bg: '#FFF4D6', border: '#F4D38A' },
  'Open':       { color: '#267447', bg: '#E7F5EC', border: '#B8DDC6' },
  'Closed':     { color: '#A83232', bg: '#FBE8E8', border: '#EDBABA' },
  'Reviewing':  { color: '#346A9A', bg: '#E8F1FA', border: '#BCD3E8' },
}

const PAYMENT_STRUCTURES = ['Pay in full', 'Payment plan', 'Deposit', 'Custom']
const PAYMENT_FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly']
const CURRENCIES = ['AUD', 'NZD', 'USD', 'EUR', 'GBP', 'CAD']

// ── Legacy mapping (display layer — legacy columns are never overwritten) ──
// Existing member launches store a lifecycle value in `status` and a model-like
// value in `offer_type`. Both keep their original values in the database.
const LEGACY_STATUS_TO_STAGE = {
  'Planning':  'Planning',
  'Upcoming':  'Planning',
  'Warming':   'Pre-launch',
  'Live':      'Open',
  'Closed':    'Closed',
  'Evergreen': 'Open',      // Evergreen was a model, not a lifecycle stage
}
// Written alongside campaign_stage so the legacy column stays meaningful.
const STAGE_TO_LEGACY_STATUS = {
  'Planning':   'Planning',
  'Pre-launch': 'Warming',
  'Open':       'Live',
  'Closed':     'Closed',
  'Reviewing':  'Closed',
}
const LEGACY_TYPE_TO_MODEL = {
  'Live Launch':    'Live launch',
  'Evergreen Push': 'Evergreen campaign',
  'Limited Drop':   'Limited drop',
  'Waitlist Build': 'Waitlist campaign',
  'Relaunch':       'Relaunch',
}

const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [THIS_YEAR - 1, THIS_YEAR]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtMoney = (n, currency = 'AUD') =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: currency || 'AUD', maximumFractionDigits: 0,
  }).format(Number(n) || 0)

const numOrNull = (v) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return isFinite(n) ? n : null
}
const num0 = (v) => {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

function fmtDate(d) {
  if (!d) return null
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return null
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function fmtDateRange(start, end) {
  const s = fmtDate(start)
  const e = fmtDate(end)
  if (s && e) return `${s} – ${e}`
  if (s) return `From ${s}`
  if (e) return `Until ${e}`
  return null
}

// Whole days from today to the given date (negative once the date has passed).
function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  if (isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / 86400000)
}

// ── Derived campaign values (legacy safe) ──
const stageOf = (l) => l.campaign_stage || LEGACY_STATUS_TO_STAGE[l.status] || 'Planning'
const modelOf = (l) =>
  l.campaign_model ||
  LEGACY_TYPE_TO_MODEL[l.offer_type] ||
  (l.status === 'Evergreen' ? 'Evergreen campaign' : null)
const currencyOf = (l) => l.currency || 'AUD'
const salesRevenueOf = (l) => num0(l.revenue_achieved)   // legacy revenue field
const salesMadeOf = (l) => num0(l.enrolled_count)        // legacy enrolments field

// Sales Revenue ÷ Sales Made. Null when there are no sales yet.
const avgSaleValue = (l) => {
  const made = salesMadeOf(l)
  if (made <= 0) return null
  return salesRevenueOf(l) / made
}

// Sales Revenue ÷ Revenue Goal × 100. Not capped (over-goal must be visible).
// Multiplies before dividing so values like 8550/30000 round to 29%, not 28%.
const goalPct = (l) => {
  const goal = num0(l.revenue_goal)
  if (goal <= 0) return null
  return Math.round((salesRevenueOf(l) * 100) / goal)
}

// Revenue Goal ÷ Primary Purchase Option TOTAL SALE VALUE, rounded up.
// Deliberately uses the full contracted value, never the amount due today.
function estimatedSalesNeeded(revenueGoal, primaryOption) {
  const goal = num0(revenueGoal)
  const total = num0(primaryOption?.total_sale_value)
  if (goal <= 0 || total <= 0) return null
  // Epsilon guards against float artefacts turning an exact 20 into 21.
  return Math.ceil(goal / total - 1e-9)
}

const RESULT_STAGES = ['Open', 'Closed', 'Reviewing']
const REVIEW_STAGES = ['Closed', 'Reviewing']

const REVIEW_PROMPTS = [
  ['review_what_worked', 'What worked?'],
  ['review_most_sales', 'What created the most sales?'],
  ['review_hesitation', 'Where did buyers hesitate?'],
  ['review_repeat', 'What would you repeat?'],
  ['review_change', 'What would you change next time?'],
]

// ─── Stage badge ───────────────────────────────────────────────────────────────

function StageBadge({ stage }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG['Planning']
  return (
    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap border flex-shrink-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {stage}
    </span>
  )
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function GoalBar({ pct }) {
  const width = Math.max(0, Math.min(100, pct || 0))
  return (
    <div className="rounded-full overflow-hidden w-full" style={{ height: 6, backgroundColor: '#f0e0e0' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${width}%`, backgroundColor: BRAND }} />
    </div>
  )
}

// ─── Purchase option helpers ───────────────────────────────────────────────────

function optionSummary(o) {
  const cur = o.currency || 'AUD'
  const parts = [o.payment_structure || 'Custom']
  if (o.payment_structure === 'Payment plan' && o.number_of_payments && o.amount_per_payment) {
    parts.push(`${o.number_of_payments} × ${fmtMoney(o.amount_per_payment, cur)}${o.payment_frequency ? ` ${o.payment_frequency.toLowerCase()}` : ''}`)
  }
  if (o.payment_structure === 'Deposit') {
    if (o.deposit_amount != null) parts.push(`Deposit ${fmtMoney(o.deposit_amount, cur)}`)
    if (o.remaining_balance != null) parts.push(`Balance ${fmtMoney(o.remaining_balance, cur)}`)
  }
  return parts.filter(Boolean).join(' · ')
}

// ─── Purchase option modal ─────────────────────────────────────────────────────

const BLANK_OPTION = {
  name: '', payment_structure: 'Pay in full', total_sale_value: '', amount_due_today: '',
  number_of_payments: '', amount_per_payment: '', payment_frequency: 'Monthly',
  deposit_amount: '', remaining_balance_due_date: '', custom_description: '',
}

function PurchaseOptionModal({ initial, currency, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? {
    ...BLANK_OPTION,
    ...initial,
    total_sale_value: initial.total_sale_value ?? '',
    amount_due_today: initial.amount_due_today ?? '',
    number_of_payments: initial.number_of_payments ?? '',
    amount_per_payment: initial.amount_per_payment ?? '',
    deposit_amount: initial.deposit_amount ?? '',
    remaining_balance_due_date: initial.remaining_balance_due_date ?? '',
    custom_description: initial.custom_description ?? '',
  } : BLANK_OPTION)
  const [error, setError] = useState('')

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError('') }

  const structure = form.payment_structure

  // Payment plan: payments × amount = total (total stays overridable).
  const setPlanField = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      const count = num0(k === 'number_of_payments' ? v : p.number_of_payments)
      const each = num0(k === 'amount_per_payment' ? v : p.amount_per_payment)
      if (count > 0 && each > 0) next.total_sale_value = String(count * each)
      if (k === 'amount_per_payment' && (p.amount_due_today === '' || num0(p.amount_due_today) === num0(p.amount_per_payment))) {
        next.amount_due_today = v
      }
      return next
    })
    setError('')
  }

  const remainingBalance = Math.max(0, num0(form.total_sale_value) - num0(form.deposit_amount))
  const payInFullDue = structure === 'Pay in full' ? num0(form.total_sale_value) : num0(form.amount_due_today)

  const save = () => {
    if (!form.name.trim()) { setError('Give this purchase option a name.'); return }
    const total = numOrNull(form.total_sale_value)
    if (total == null || total <= 0) { setError('Add the total sale value for this option.'); return }
    if (structure === 'Payment plan') {
      const count = numOrNull(form.number_of_payments)
      const each = numOrNull(form.amount_per_payment)
      if (!count || count <= 0 || !each || each <= 0) {
        setError('Add the number of payments and the amount per payment.')
        return
      }
    }
    if (structure === 'Deposit' && (numOrNull(form.deposit_amount) == null || num0(form.deposit_amount) < 0)) {
      setError('Add the deposit amount.')
      return
    }

    onSave({
      name: form.name.trim(),
      payment_structure: structure,
      total_sale_value: total,
      amount_due_today: structure === 'Pay in full' ? total : numOrNull(form.amount_due_today),
      number_of_payments: structure === 'Payment plan' ? numOrNull(form.number_of_payments) : null,
      amount_per_payment: structure === 'Payment plan' ? numOrNull(form.amount_per_payment) : null,
      payment_frequency: structure === 'Payment plan' ? form.payment_frequency : null,
      deposit_amount: structure === 'Deposit' ? numOrNull(form.deposit_amount) : null,
      remaining_balance: structure === 'Deposit' ? remainingBalance : null,
      remaining_balance_due_date: structure === 'Deposit' ? (form.remaining_balance_due_date || null) : null,
      custom_description: structure === 'Custom' ? (form.custom_description || null) : null,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label="Purchase option">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-bold text-sm text-gray-900">{initial ? 'Edit Purchase Option' : 'Add Purchase Option'}</p>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
          </div>

          <div>
            <label className="label" htmlFor="po-name">Purchase Option Name</label>
            <input id="po-name" className="input-field" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="e.g. 3-Month Payment Plan" autoFocus />
          </div>

          <div>
            <label className="label" htmlFor="po-total">Total Sale Value ({currency})</label>
            <input id="po-total" className="input-field" type="number" min="0" value={form.total_sale_value}
              onChange={e => set('total_sale_value', e.target.value)} placeholder="0" />
            <p className="text-xs text-gray-400 mt-1">The full contracted value of the purchase.</p>
          </div>

          <div>
            <label className="label" htmlFor="po-structure">Payment Structure</label>
            <select id="po-structure" className="input-field" value={structure}
              onChange={e => set('payment_structure', e.target.value)}>
              {PAYMENT_STRUCTURES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {structure === 'Pay in full' && (
            <div>
              <label className="label">Amount Due Today</label>
              <p className="text-sm font-semibold text-gray-800">{fmtMoney(payInFullDue, currency)}</p>
              <p className="text-xs text-gray-400 mt-1">Matches the total sale value.</p>
            </div>
          )}

          {structure === 'Payment plan' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="po-count">Number of Payments</label>
                  <input id="po-count" className="input-field" type="number" min="1" value={form.number_of_payments}
                    onChange={e => setPlanField('number_of_payments', e.target.value)} placeholder="3" />
                </div>
                <div>
                  <label className="label" htmlFor="po-each">Amount Per Payment</label>
                  <input id="po-each" className="input-field" type="number" min="0" value={form.amount_per_payment}
                    onChange={e => setPlanField('amount_per_payment', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="po-freq">Payment Frequency</label>
                  <select id="po-freq" className="input-field" value={form.payment_frequency}
                    onChange={e => set('payment_frequency', e.target.value)}>
                    {PAYMENT_FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="po-due">Amount Due Today</label>
                  <input id="po-due" className="input-field" type="number" min="0" value={form.amount_due_today}
                    onChange={e => set('amount_due_today', e.target.value)} placeholder="0" />
                </div>
              </div>
              {num0(form.number_of_payments) > 0 && num0(form.amount_per_payment) > 0 && (
                <p className="text-xs text-gray-500">
                  {form.number_of_payments} × {fmtMoney(form.amount_per_payment, currency)} = {fmtMoney(num0(form.number_of_payments) * num0(form.amount_per_payment), currency)} total sale value
                </p>
              )}
            </>
          )}

          {structure === 'Deposit' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="po-dep">Deposit Amount</label>
                  <input id="po-dep" className="input-field" type="number" min="0" value={form.deposit_amount}
                    onChange={e => set('deposit_amount', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="label">Remaining Balance</label>
                  <p className="text-sm font-semibold text-gray-800 pt-2">{fmtMoney(remainingBalance, currency)}</p>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="po-baldate">Remaining Balance Due Date (optional)</label>
                <input id="po-baldate" className="input-field" type="date" value={form.remaining_balance_due_date}
                  onChange={e => set('remaining_balance_due_date', e.target.value)} />
              </div>
            </>
          )}

          {structure === 'Custom' && (
            <>
              <div>
                <label className="label" htmlFor="po-custdue">Amount Due Today</label>
                <input id="po-custdue" className="input-field" type="number" min="0" value={form.amount_due_today}
                  onChange={e => set('amount_due_today', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label" htmlFor="po-cust">Structure Notes (optional)</label>
                <textarea id="po-cust" className="textarea-field" rows={2} value={form.custom_description}
                  onChange={e => set('custom_description', e.target.value)} />
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={onCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={save} className="btn-brand">Save Option</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Purchase options list (shared by workspace + create wizard) ───────────────

function PurchaseOptionsList({ options, currency, onAdd, onEdit, onRemove, onMakePrimary }) {
  const [confirmRemove, setConfirmRemove] = useState(null)
  return (
    <div className="space-y-2">
      {options.length === 0 ? (
        <div className="rounded-xl px-4 py-5 text-center" style={{ border: '1px dashed #e8e0d8', backgroundColor: '#fdfcfb' }}>
          <p className="text-sm text-gray-400 mb-3">No purchase options added yet.</p>
          <button onClick={onAdd} className="btn-brand">+ Add Purchase Option</button>
        </div>
      ) : (
        <>
          {options.map((o, i) => (
            <div key={o.id ?? i} className="rounded-xl px-3.5 py-3"
              style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{o.name}</p>
                    {o.is_primary && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{ color: BRAND, backgroundColor: '#faf7f3', borderColor: '#e8e0d8' }}>
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{optionSummary(o)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total {fmtMoney(o.total_sale_value, currency)}
                    {o.amount_due_today != null && ` · Today ${fmtMoney(o.amount_due_today, currency)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {confirmRemove === o ? (
                    <>
                      <span className="text-xs text-gray-500">Remove?</span>
                      <button onClick={() => setConfirmRemove(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                        Keep
                      </button>
                      <button onClick={() => { setConfirmRemove(null); onRemove(o) }}
                        className="text-xs font-semibold text-white py-1 px-2.5 rounded" style={{ backgroundColor: '#9c3034' }}>
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      {!o.is_primary && (
                        <button onClick={() => onMakePrimary(o)} className="text-xs font-semibold" style={{ color: BRAND }}>
                          Make primary
                        </button>
                      )}
                      <button onClick={() => onEdit(o)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                        Edit
                      </button>
                      <button onClick={() => setConfirmRemove(o)} className="text-xs font-semibold" style={{ color: '#9c3034' }}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button onClick={onAdd}
            className="w-full text-xs font-semibold py-2.5 rounded-lg transition-colors"
            style={{ color: BRAND, border: '1px dashed #e8e0d8' }}>
            + Add Purchase Option
          </button>
        </>
      )}
    </div>
  )
}

// ─── Estimated sales needed block ──────────────────────────────────────────────

function EstimatedSales({ revenueGoal, options, currency }) {
  const primary = options.find(o => o.is_primary) || null
  const est = estimatedSalesNeeded(revenueGoal, primary)

  let body
  if (options.length === 0) {
    body = <p className="text-xs text-gray-400">Add a Purchase Option and choose a primary option to calculate Estimated Sales Needed.</p>
  } else if (!primary) {
    body = <p className="text-xs text-gray-400">Choose a Primary Purchase Option to calculate Estimated Sales Needed.</p>
  } else if (est == null) {
    body = <p className="text-xs text-gray-400">Add a revenue goal to calculate Estimated Sales Needed.</p>
  } else {
    body = (
      <>
        <p className="stat-number">{est}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {fmtMoney(revenueGoal, currency)} ÷ {fmtMoney(primary.total_sale_value, currency)} ({primary.name})
        </p>
      </>
    )
  }

  return (
    <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
      <p className="label" style={{ marginBottom: 4 }}>Estimated Sales Needed</p>
      {body}
    </div>
  )
}

// ─── Campaign card (overview) ──────────────────────────────────────────────────

function CampaignCard({ campaign, onOpen }) {
  const stage = stageOf(campaign)
  const model = modelOf(campaign)
  const cur = currencyOf(campaign)
  const goal = num0(campaign.revenue_goal)
  const revenue = salesRevenueOf(campaign)
  const made = salesMadeOf(campaign)
  const pct = goalPct(campaign)
  const range = fmtDateRange(campaign.start_date, campaign.end_date)
  const endDays = daysUntil(campaign.end_date)
  const startDays = daysUntil(campaign.start_date)

  const started = RESULT_STAGES.includes(stage)
  const meta = [model || 'Campaign model not set', campaign.primary_goal || 'Goal not set'].join(' · ')

  // Footer note under the bar: sales and time left, or the pre-launch countdown.
  const statusNote = started
    ? [
        `${made} sale${made !== 1 ? 's' : ''}`,
        stage === 'Open' && endDays != null
          ? (endDays >= 0 ? `${endDays} days left` : 'End date passed')
          : null,
      ].filter(Boolean).join(' · ')
    : stage === 'Pre-launch'
      ? (startDays != null
          ? (startDays > 0 ? `Opens in ${startDays} days` : 'Start date reached')
          : 'Pre-launch')
      : 'In planning'

  return (
    <div className="rounded-xl px-4 py-4 flex flex-col" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
      {/* Title + stage */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-gray-900 leading-snug min-w-0">{campaign.offer_name || 'Untitled campaign'}</p>
        <StageBadge stage={stage} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{meta}</p>
      <p className="text-xs text-gray-400 mt-0.5">{range || 'No fixed dates'}</p>

      {/* Figures */}
      <div className="mt-3 flex items-baseline justify-between gap-3 flex-wrap">
        <p className="stat-number">{started ? fmtMoney(revenue, cur) : fmtMoney(goal, cur)}</p>
        <p className="text-xs text-gray-400">
          {started ? (goal > 0 ? `of ${fmtMoney(goal, cur)}` : 'secured') : 'revenue goal'}
        </p>
      </div>

      {started && goal > 0 && <div className="mt-2"><GoalBar pct={pct} /></div>}

      <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
        <span className="text-xs text-gray-500">{statusNote}</span>
        {started && pct != null && (
          <span className="text-xs font-bold" style={{ color: pct >= 100 ? '#267447' : BRAND }}>{pct}% of goal</span>
        )}
      </div>

      {/* mt-auto keeps the buttons aligned across cards of differing height */}
      <div className="mt-auto pt-4">
        <button onClick={onOpen} className="btn-brand-outline w-full">
          View Campaign
        </button>
      </div>
    </div>
  )
}

// ─── Create campaign wizard (two steps) ────────────────────────────────────────

const BLANK_CAMPAIGN = {
  offer_name: '', offer_one_liner: '', campaign_link: '',
  campaign_model: 'Live launch', primary_goal: '', campaign_stage: 'Planning',
  start_date: '', end_date: '', currency: 'AUD', revenue_goal: '',
}

function CreateWizard({ onCreate, onCancel, defaultCurrency }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ ...BLANK_CAMPAIGN, currency: defaultCurrency || 'AUD' })
  const [draftOptions, setDraftOptions] = useState([])
  const [modalOption, setModalOption] = useState(null)   // { option, index } | 'new'
  const [error, setError] = useState('')

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError('') }

  const next = () => {
    if (!form.offer_name.trim()) { setError('Give this campaign a name.'); return }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('The end date needs to be after the start date.'); return
    }
    setError('')
    setStep(2)
  }

  const saveOption = (values) => {
    if (modalOption === 'new') {
      setDraftOptions(prev => [...prev, { ...values, is_primary: prev.length === 0 }])
    } else {
      setDraftOptions(prev => prev.map((o, i) => i === modalOption.index ? { ...o, ...values } : o))
    }
    setModalOption(null)
  }

  const removeOption = (target) => {
    setDraftOptions(prev => {
      const next = prev.filter(o => o !== target)
      if (target.is_primary && next.length > 0 && !next.some(o => o.is_primary)) next[0].is_primary = true
      return [...next]
    })
  }

  const makePrimary = (target) => {
    setDraftOptions(prev => prev.map(o => ({ ...o, is_primary: o === target })))
  }

  return (
    <div className="form-card space-y-4 mb-5">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-gray-900">Add Launch Campaign</p>
          <p className="text-xs text-gray-400 mt-0.5">Step {step} of 2 · {step === 1 ? 'Campaign' : 'Target'}</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
      </div>

      {step === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cw-name">Campaign Name</label>
            <input id="cw-name" className="input-field" value={form.offer_name}
              onChange={e => set('offer_name', e.target.value)} autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cw-liner">Launch Offer One-Liner (optional)</label>
            <textarea id="cw-liner" className="textarea-field" rows={2} value={form.offer_one_liner}
              onChange={e => set('offer_one_liner', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cw-link">Primary Campaign Link (optional)</label>
            <input id="cw-link" className="input-field" value={form.campaign_link}
              onChange={e => set('campaign_link', e.target.value)} placeholder="https://..." />
            <p className="text-xs text-gray-400 mt-1">Add your sales page, checkout, application or registration link.</p>
          </div>
          <div>
            <label className="label" htmlFor="cw-model">Campaign Model</label>
            <select id="cw-model" className="input-field" value={form.campaign_model}
              onChange={e => set('campaign_model', e.target.value)}>
              {CAMPAIGN_MODELS.map(m => <option key={m}>{m}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">How this campaign is being run.</p>
          </div>
          <div>
            <label className="label" htmlFor="cw-goal">Primary Goal</label>
            <select id="cw-goal" className="input-field" value={form.primary_goal}
              onChange={e => set('primary_goal', e.target.value)}>
              <option value="">Select...</option>
              {PRIMARY_GOALS.map(g => <option key={g}>{g}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">What result this campaign is meant to create.</p>
          </div>
          <div>
            <label className="label" htmlFor="cw-stage">Campaign Stage</label>
            <select id="cw-stage" className="input-field" value={form.campaign_stage}
              onChange={e => set('campaign_stage', e.target.value)}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label className="label" htmlFor="cw-start">Start Date (optional)</label>
            <input id="cw-start" className="input-field" type="date" value={form.start_date}
              onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="cw-end">End Date (optional)</label>
            <input id="cw-end" className="input-field" type="date" value={form.end_date}
              onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cw-cur">Currency</label>
              <select id="cw-cur" className="input-field" value={form.currency}
                onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="cw-rev">Revenue Goal</label>
              <input id="cw-rev" className="input-field" type="number" min="0" value={form.revenue_goal}
                onChange={e => set('revenue_goal', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <p className="label" style={{ marginBottom: 8 }}>Purchase Options</p>
            <PurchaseOptionsList
              options={draftOptions}
              currency={form.currency}
              onAdd={() => setModalOption('new')}
              onEdit={(o) => setModalOption({ option: o, index: draftOptions.indexOf(o) })}
              onRemove={removeOption}
              onMakePrimary={makePrimary}
            />
          </div>

          <EstimatedSales revenueGoal={form.revenue_goal} options={draftOptions} currency={form.currency} />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 pt-1">
        {step === 2 && (
          <button onClick={() => setStep(1)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Back
          </button>
        )}
        {step === 1 ? (
          <>
            <button onClick={onCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={next} className="btn-brand">Continue</button>
          </>
        ) : (
          <button onClick={() => onCreate(form, draftOptions)} className="btn-brand">Create Campaign</button>
        )}
      </div>

      {modalOption && (
        <PurchaseOptionModal
          initial={modalOption === 'new' ? null : modalOption.option}
          currency={form.currency}
          onSave={saveOption}
          onCancel={() => setModalOption(null)}
        />
      )}
    </div>
  )
}

// ─── Campaign workspace ────────────────────────────────────────────────────────

const TABS = ['Campaign', 'Target', 'Results', 'Review']

// Saved (read) value with a neutral fallback for anything not filled in yet.
function ReadField({ label, value, muted = 'Not set', full }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <p className="label" style={{ marginBottom: 2 }}>{label}</p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: value ? '#1a0606' : '#b8a898' }}>
        {value || muted}
      </p>
    </div>
  )
}

// "Edit" affordance shown above a saved section.
function EditBar({ onEdit, label = 'Edit' }) {
  return (
    <div className="flex justify-end mb-3">
      <button onClick={onEdit} className="btn-brand-outline">{label}</button>
    </div>
  )
}

function Workspace({
  campaign, options, onBack, onSaveCampaign, onSetStage, onDelete,
  onAddOption, onEditOption, onRemoveOption, onMakePrimary,
}) {
  const stage = stageOf(campaign)
  const [tab, setTab] = useState(stage === 'Reviewing' ? 'Review' : 'Campaign')
  const [draft, setDraft] = useState(null)
  // Sections read as saved until the member opens one for editing.
  const [editing, setEditing] = useState(null)   // 'campaign' | 'target' | 'results' | 'review'
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modalOption, setModalOption] = useState(null)
  const [error, setError] = useState('')

  // Reset the draft whenever a different campaign is opened.
  useEffect(() => {
    setDraft({
      offer_name: campaign.offer_name || '',
      offer_one_liner: campaign.offer_one_liner || '',
      campaign_link: campaign.campaign_link || '',
      campaign_model: modelOf(campaign) || '',
      primary_goal: campaign.primary_goal || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      currency: currencyOf(campaign),
      revenue_goal: campaign.revenue_goal ?? '',
      revenue_achieved: campaign.revenue_achieved ?? '',
      enrolled_count: campaign.enrolled_count ?? '',
      review_what_worked: campaign.review_what_worked || '',
      review_most_sales: campaign.review_most_sales || '',
      review_hesitation: campaign.review_hesitation || '',
      review_repeat: campaign.review_repeat || '',
      review_change: campaign.review_change || '',
    })
    setEditing(null)
    setConfirmDelete(false)
    setError('')
  }, [campaign.id])

  // Follow the stage into Review when the member moves the campaign to Reviewing.
  useEffect(() => {
    if (stage === 'Reviewing') setTab('Review')
  }, [stage])

  if (!draft) return null

  const set = (k, v) => { setDraft(p => ({ ...p, [k]: v })); setSaved(false); setError('') }

  // Discard any unsaved edits in the open section.
  const cancelEdit = () => {
    setDraft({
      offer_name: campaign.offer_name || '',
      offer_one_liner: campaign.offer_one_liner || '',
      campaign_link: campaign.campaign_link || '',
      campaign_model: modelOf(campaign) || '',
      primary_goal: campaign.primary_goal || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      currency: currencyOf(campaign),
      revenue_goal: campaign.revenue_goal ?? '',
      revenue_achieved: campaign.revenue_achieved ?? '',
      enrolled_count: campaign.enrolled_count ?? '',
      review_what_worked: campaign.review_what_worked || '',
      review_most_sales: campaign.review_most_sales || '',
      review_hesitation: campaign.review_hesitation || '',
      review_repeat: campaign.review_repeat || '',
      review_change: campaign.review_change || '',
    })
    setEditing(null)
    setError('')
  }

  const cur = draft.currency || 'AUD'
  const resultsActive = RESULT_STAGES.includes(stage)
  const reviewActive = REVIEW_STAGES.includes(stage)

  // Live figures come from the draft so calculations update as the member types.
  const liveCampaign = {
    ...campaign,
    revenue_goal: draft.revenue_goal,
    revenue_achieved: draft.revenue_achieved,
    enrolled_count: draft.enrolled_count,
  }
  const pct = goalPct(liveCampaign)
  const asv = avgSaleValue(liveCampaign)
  const endDays = daysUntil(draft.end_date)
  const startDays = daysUntil(draft.start_date)

  const saveSection = () => {
    if (!draft.offer_name.trim()) { setError('Give this campaign a name.'); return }
    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) {
      setError('The end date needs to be after the start date.'); return
    }
    onSaveCampaign(draft)
    setEditing(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Cancel / Save pair shown at the bottom of an open section.
  const EditActions = () => (
    <div className="flex gap-3 pt-1">
      <button onClick={cancelEdit} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
        Cancel
      </button>
      <button onClick={saveSection} className="btn-brand">Save Changes</button>
    </div>
  )

  const linkHref = draft.campaign_link && /^https?:\/\//i.test(draft.campaign_link)
    ? draft.campaign_link
    : draft.campaign_link ? `https://${draft.campaign_link}` : null

  const tabDisabled = (t) => (t === 'Review' && !reviewActive)

  return (
    <div className="space-y-5">
      {/* Workspace header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-gray-700 mb-1">
            ← All campaigns
          </button>
          <h2 className="section-title" style={{ marginBottom: 2 }}>{campaign.offer_name || 'Untitled campaign'}</h2>
          <p className="text-xs text-gray-400">
            {[modelOf(campaign) || 'Campaign model not set', fmtDateRange(campaign.start_date, campaign.end_date) || 'No fixed dates'].join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && <span className="text-xs" style={{ color: '#267447' }}>Saved</span>}
          {linkHref && (
            <a href={linkHref} target="_blank" rel="noopener noreferrer" className="btn-brand-outline">
              Open Campaign Link
            </a>
          )}
        </div>
      </div>

      {/* Stage switcher */}
      <div className="card-section" style={{ marginBottom: 0 }}>
        <p className="label" style={{ marginBottom: 8 }}>Campaign Stage</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Campaign stage">
          {STAGES.map(s => {
            const on = s === stage
            const cfg = STAGE_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => onSetStage(s)}
                aria-pressed={on}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 border"
                style={on
                  ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }
                  : { backgroundColor: 'white', color: '#6B7280', borderColor: 'var(--card-border)' }}
              >
                {on ? `✓ ${s}` : s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4" role="tablist" aria-label="Campaign sections">
          {TABS.map(t => {
            const disabled = tabDisabled(t)
            const active = tab === t
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => !disabled && setTab(t)}
                title={disabled ? 'Available once the campaign is closed' : undefined}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0"
                style={active
                  ? { backgroundColor: BRAND, color: '#fff' }
                  : disabled
                    ? { color: '#c4b5af', backgroundColor: 'transparent', cursor: 'not-allowed' }
                    : { color: '#6B7280', backgroundColor: '#f7f7f7' }}
              >
                {t}{t === 'Review' && disabled ? ' · locked' : ''}
              </button>
            )
          })}
        </div>

        {/* ── Campaign tab ── */}
        {tab === 'Campaign' && editing !== 'campaign' && (
          <div role="tabpanel">
            <EditBar onEdit={() => setEditing('campaign')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="Launch Campaign Name" value={campaign.offer_name} muted="Not set" />
              <ReadField label="Campaign Model" value={modelOf(campaign)} muted="Campaign model not set" />
              <ReadField full label="Launch Offer One-Liner" value={campaign.offer_one_liner} muted="Offer one-liner not set" />
              <ReadField label="Primary Goal" value={campaign.primary_goal} muted="Goal not set" />
              <ReadField label="Primary Campaign Link" value={campaign.campaign_link} muted="Campaign link not set" />
              <ReadField label="Launch Start Date" value={fmtDate(campaign.start_date)} muted="Date not set" />
              <ReadField label="Launch End Date" value={fmtDate(campaign.end_date)} muted="Date not set" />
            </div>
            <div className="pt-3 mt-4" style={{ borderTop: '1px solid #ede6e1' }}>
              {confirmDelete ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-600">Delete this campaign? This cannot be undone.</span>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={onDelete}
                    className="text-xs font-semibold text-white py-1.5 px-3 rounded-lg"
                    style={{ backgroundColor: '#9c3034' }}>
                    Delete campaign
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-xs font-semibold" style={{ color: '#9c3034' }}>
                  Delete campaign
                </button>
              )}
            </div>
          </div>
        )}
        {tab === 'Campaign' && editing === 'campaign' && (
          <div role="tabpanel" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ws-name">Launch Campaign Name</label>
              <input id="ws-name" className="input-field" value={draft.offer_name}
                onChange={e => set('offer_name', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ws-liner">Launch Offer One-Liner</label>
              <textarea id="ws-liner" className="textarea-field" rows={2} value={draft.offer_one_liner}
                onChange={e => set('offer_one_liner', e.target.value)}
                placeholder="A short statement describing the offer." />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ws-link">Primary Campaign Link</label>
              <input id="ws-link" className="input-field" value={draft.campaign_link}
                onChange={e => set('campaign_link', e.target.value)} placeholder="https://..." />
              <p className="text-xs text-gray-400 mt-1">Add your sales page, checkout, application or registration link.</p>
            </div>
            <div>
              <label className="label" htmlFor="ws-model">Campaign Model</label>
              <select id="ws-model" className="input-field" value={draft.campaign_model}
                onChange={e => set('campaign_model', e.target.value)}>
                <option value="">Not set</option>
                {(CAMPAIGN_MODELS.includes(draft.campaign_model) || !draft.campaign_model
                  ? CAMPAIGN_MODELS
                  : [draft.campaign_model, ...CAMPAIGN_MODELS]).map(m => <option key={m}>{m}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">How this campaign is being run.</p>
            </div>
            <div>
              <label className="label" htmlFor="ws-goal">Primary Goal</label>
              <select id="ws-goal" className="input-field" value={draft.primary_goal}
                onChange={e => set('primary_goal', e.target.value)}>
                <option value="">Not set</option>
                {(PRIMARY_GOALS.includes(draft.primary_goal) || !draft.primary_goal
                  ? PRIMARY_GOALS
                  : [draft.primary_goal, ...PRIMARY_GOALS]).map(g => <option key={g}>{g}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">What result this campaign is meant to create.</p>
            </div>
            <div>
              <label className="label" htmlFor="ws-start">Launch Start Date</label>
              <input id="ws-start" className="input-field" type="date" value={draft.start_date}
                onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ws-end">Launch End Date</label>
              <input id="ws-end" className="input-field" type="date" value={draft.end_date}
                onChange={e => set('end_date', e.target.value)} />
            </div>
            {!draft.start_date && !draft.end_date && (
              <p className="text-xs text-gray-400 sm:col-span-2">No fixed dates. Evergreen campaigns can run without them.</p>
            )}
            <div className="sm:col-span-2"><EditActions /></div>
          </div>
        )}

        {/* ── Target tab ── */}
        {tab === 'Target' && (
          <div role="tabpanel" className="space-y-4">
            {editing === 'target' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="ws-cur">Currency</label>
                    <select id="ws-cur" className="input-field" value={cur}
                      onChange={e => set('currency', e.target.value)}>
                      {(CURRENCIES.includes(cur) ? CURRENCIES : [cur, ...CURRENCIES]).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="ws-rev">Revenue Goal</label>
                    <input id="ws-rev" className="input-field" type="number" min="0" value={draft.revenue_goal}
                      onChange={e => set('revenue_goal', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <EditActions />
              </>
            ) : (
              <>
                <EditBar onEdit={() => setEditing('target')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadField label="Currency" value={currencyOf(campaign)} />
                  <ReadField label="Revenue Goal"
                    value={num0(campaign.revenue_goal) > 0 ? fmtMoney(campaign.revenue_goal, currencyOf(campaign)) : ''}
                    muted="Revenue goal not set" />
                </div>
              </>
            )}

            <div>
              <p className="label" style={{ marginBottom: 8 }}>Purchase Options</p>
              <PurchaseOptionsList
                options={options}
                currency={cur}
                onAdd={() => setModalOption('new')}
                onEdit={(o) => setModalOption({ option: o })}
                onRemove={onRemoveOption}
                onMakePrimary={onMakePrimary}
              />
            </div>

            <EstimatedSales revenueGoal={draft.revenue_goal} options={options} currency={cur} />
          </div>
        )}

        {/* ── Results tab ── */}
        {tab === 'Results' && (
          <div role="tabpanel">
            {!resultsActive ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-1">Results will appear once your campaign begins.</p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Move the campaign to Open to start tracking sales revenue, sales made and progress toward your goal.
                </p>
                {stage === 'Pre-launch' && startDays != null && (
                  <p className="text-xs mt-3" style={{ color: BRAND }}>
                    {startDays > 0 ? `Opens in ${startDays} days` : 'Start date reached'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {editing === 'results' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="ws-sales-rev">Sales Revenue</label>
                    <input id="ws-sales-rev" className="input-field" type="number" min="0" value={draft.revenue_achieved}
                      onChange={e => set('revenue_achieved', e.target.value)} placeholder="0" />
                    <p className="text-xs text-gray-400 mt-1">Total contracted value of purchases made through this campaign.</p>
                  </div>
                  <div>
                    <label className="label" htmlFor="ws-sales-made">Sales Made</label>
                    <input id="ws-sales-made" className="input-field" type="number" min="0" step="1" value={draft.enrolled_count}
                      onChange={e => set('enrolled_count', e.target.value)} placeholder="0" />
                  </div>
                </div>
                ) : (
                  <EditBar onEdit={() => setEditing('results')} label="Update results" />
                )}

                <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
                  <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">
                      {fmtMoney(draft.revenue_achieved, cur)}{num0(draft.revenue_goal) > 0 && ` of ${fmtMoney(draft.revenue_goal, cur)}`}
                    </span>
                    {pct != null && (
                      <span className="text-sm font-bold" style={{ color: pct >= 100 ? '#267447' : BRAND }}>{pct}% of goal</span>
                    )}
                  </div>
                  {num0(draft.revenue_goal) > 0 && <GoalBar pct={pct} />}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="label" style={{ marginBottom: 2 }}>Sales Made</p>
                      <p className="text-sm font-semibold text-gray-800">{num0(draft.enrolled_count)}</p>
                    </div>
                    <div>
                      <p className="label" style={{ marginBottom: 2 }}>Average Sale Value</p>
                      <p className="text-sm font-semibold text-gray-800">{asv == null ? '—' : fmtMoney(asv, cur)}</p>
                    </div>
                    {stage === 'Open' && endDays != null && (
                      <div>
                        <p className="label" style={{ marginBottom: 2 }}>Time Left</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {endDays >= 0 ? `${endDays} days remaining` : 'End date passed'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {editing === 'results' && <EditActions />}
              </div>
            )}
          </div>
        )}

        {/* ── Review tab ── */}
        {tab === 'Review' && (
          <div role="tabpanel" className="space-y-4">
            {editing === 'review' ? (
              <>
                {REVIEW_PROMPTS.map(([key, label]) => (
                  <div key={key}>
                    <label className="label" htmlFor={`ws-${key}`}>{label}</label>
                    <textarea id={`ws-${key}`} className="textarea-field" rows={2} value={draft[key]}
                      onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
                <EditActions />
              </>
            ) : (
              <>
                <EditBar onEdit={() => setEditing('review')} />
                {REVIEW_PROMPTS.map(([key, label]) => (
                  <ReadField key={key} label={label} value={campaign[key]} muted="Not answered yet" />
                ))}
              </>
            )}

            {campaign.notes && (
              <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
                <p className="label" style={{ marginBottom: 4 }}>Previous Notes &amp; Reflections</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{campaign.notes}</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {modalOption && (
        <PurchaseOptionModal
          initial={modalOption === 'new' ? null : modalOption.option}
          currency={cur}
          onSave={(values) => {
            if (modalOption === 'new') onAddOption(values)
            else onEditOption(modalOption.option, values)
            setModalOption(null)
          }}
          onCancel={() => setModalOption(null)}
        />
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Launches() {
  const { user } = useAuth()

  const [launches, setLaunches] = useState([])
  const [optionsByLaunch, setOptionsByLaunch] = useState({})
  const [selectedYear, setSelectedYear] = useState(THIS_YEAR)
  const [filter, setFilter] = useState('All')
  const [openId, setOpenId] = useState(null)
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // ── Load launches (and their purchase options) for the selected year ─────────
  const loadLaunches = useCallback(async (year) => {
    if (!user) return
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
      setLoadError(`Failed to load campaigns: ${error.message}`)
      setLaunches([])
      setLoading(false)
      return
    }

    setLaunches(data || [])

    // One extra query for every option in the year — avoids a per-campaign fetch.
    const ids = (data || []).map(l => l.id)
    if (ids.length > 0) {
      const { data: opts, error: optErr } = await supabase
        .from('launch_purchase_options')
        .select('*')
        .eq('user_id', user.id)
        .in('launch_id', ids)
        .order('created_at', { ascending: true })

      if (optErr) {
        // Purchase options are additive; the page still works without them.
        console.error('[Launches] purchase options fetch error:', optErr)
        setOptionsByLaunch({})
      } else {
        const grouped = {}
        ;(opts || []).forEach(o => { (grouped[o.launch_id] ||= []).push(o) })
        setOptionsByLaunch(grouped)
      }
    } else {
      setOptionsByLaunch({})
    }

    setLoading(false)
  }, [user])

  useEffect(() => { loadLaunches(selectedYear) }, [user, selectedYear, loadLaunches])

  const handleYearSwitch = (y) => {
    setSelectedYear(y)
    setOpenId(null)
    setFilter('All')
    setShowWizard(false)
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async (form, draftOptions) => {
    const year = form.start_date
      ? new Date(form.start_date + 'T00:00:00').getFullYear()
      : selectedYear

    const payload = {
      user_id:          user.id,
      year,
      offer_name:       form.offer_name.trim(),
      offer_one_liner:  form.offer_one_liner || null,
      campaign_link:    form.campaign_link || null,
      campaign_model:   form.campaign_model || null,
      primary_goal:     form.primary_goal || null,
      campaign_stage:   form.campaign_stage || 'Planning',
      // Legacy columns stay populated so nothing that reads them regresses.
      status:           STAGE_TO_LEGACY_STATUS[form.campaign_stage] || 'Planning',
      offer_type:       form.campaign_model || null,
      start_date:       form.start_date || null,
      end_date:         form.end_date || null,
      currency:         form.currency || 'AUD',
      revenue_goal:     numOrNull(form.revenue_goal) ?? 0,
      revenue_achieved: 0,
      enrolled_count:   0,
      notes:            '',
    }

    const { data, error } = await supabase.from('launches').insert(payload).select().single()

    if (error || !data) {
      console.error('[Launches] insert error:', error)
      alert(`Failed to save campaign: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }

    // Persist any purchase options captured during creation.
    if (draftOptions.length > 0) {
      const rows = draftOptions.map(o => ({
        user_id: user.id, launch_id: data.id,
        name: o.name, payment_structure: o.payment_structure,
        total_sale_value: o.total_sale_value, amount_due_today: o.amount_due_today,
        number_of_payments: o.number_of_payments, amount_per_payment: o.amount_per_payment,
        payment_frequency: o.payment_frequency, deposit_amount: o.deposit_amount,
        remaining_balance: o.remaining_balance, remaining_balance_due_date: o.remaining_balance_due_date,
        custom_description: o.custom_description, is_primary: !!o.is_primary,
      }))
      const { data: savedOpts, error: optErr } = await supabase
        .from('launch_purchase_options').insert(rows).select()
      if (optErr) console.error('[Launches] purchase options insert error:', optErr)
      else setOptionsByLaunch(prev => ({ ...prev, [data.id]: savedOpts || [] }))
    }

    if (year === selectedYear) setLaunches(prev => [...prev, data])
    setShowWizard(false)
    setOpenId(year === selectedYear ? data.id : null)
    if (year !== selectedYear) setSelectedYear(year)
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  const handleSaveCampaign = async (id, draft) => {
    const year = draft.start_date
      ? new Date(draft.start_date + 'T00:00:00').getFullYear()
      : (launches.find(l => l.id === id)?.year ?? selectedYear)

    const payload = {
      offer_name:       draft.offer_name.trim(),
      offer_one_liner:  draft.offer_one_liner || null,
      campaign_link:    draft.campaign_link || null,
      campaign_model:   draft.campaign_model || null,
      primary_goal:     draft.primary_goal || null,
      offer_type:       draft.campaign_model || null,   // keep legacy column aligned
      start_date:       draft.start_date || null,
      end_date:         draft.end_date || null,
      currency:         draft.currency || 'AUD',
      revenue_goal:     numOrNull(draft.revenue_goal) ?? 0,
      revenue_achieved: numOrNull(draft.revenue_achieved) ?? 0,
      enrolled_count:   Math.max(0, Math.round(num0(draft.enrolled_count))),
      review_what_worked: draft.review_what_worked || null,
      review_most_sales:  draft.review_most_sales || null,
      review_hesitation:  draft.review_hesitation || null,
      review_repeat:      draft.review_repeat || null,
      review_change:      draft.review_change || null,
      year,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('launches').update(payload).eq('id', id).eq('user_id', user.id).select().single()

    if (error || !data) {
      console.error('[Launches] update error:', error)
      alert(`Failed to save changes: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }

    if (data.year !== selectedYear) {
      setLaunches(prev => prev.filter(l => l.id !== id))
      setOpenId(null)
    } else {
      setLaunches(prev => prev.map(l => l.id === id ? data : l))
    }
  }

  const handleSetStage = async (id, stage) => {
    const { data, error } = await supabase
      .from('launches')
      .update({
        campaign_stage: stage,
        // Mirror into the legacy status column without discarding its meaning.
        status: STAGE_TO_LEGACY_STATUS[stage] || 'Planning',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('user_id', user.id).select().single()

    if (error || !data) {
      console.error('[Launches] stage update error:', error)
      alert(`Failed to update stage: ${error?.message || 'Unknown error'}. Please try again.`)
      return
    }
    setLaunches(prev => prev.map(l => l.id === id ? data : l))
  }

  // Confirmed inline in the campaign workspace before this runs.
  const handleDelete = async (id) => {
    const { error } = await supabase.from('launches').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      console.error('[Launches] delete error:', error)
      alert(`Failed to delete: ${error.message}. Please try again.`)
      return
    }
    setLaunches(prev => prev.filter(l => l.id !== id))
    setOptionsByLaunch(prev => { const n = { ...prev }; delete n[id]; return n })
    setOpenId(null)
  }

  // ── Purchase options ─────────────────────────────────────────────────────────

  const setOptionsFor = (launchId, updater) =>
    setOptionsByLaunch(prev => ({ ...prev, [launchId]: updater(prev[launchId] || []) }))

  const handleAddOption = async (launchId, values) => {
    const existing = optionsByLaunch[launchId] || []
    const isPrimary = existing.length === 0     // first option is primary
    const { data, error } = await supabase.from('launch_purchase_options')
      .insert({ user_id: user.id, launch_id: launchId, ...values, is_primary: isPrimary })
      .select().single()
    if (error || !data) {
      console.error('[Launches] option insert error:', error)
      alert(`Failed to save purchase option: ${error?.message || 'Unknown error'}.`)
      return
    }
    setOptionsFor(launchId, list => [...list, data])
  }

  const handleEditOption = async (launchId, option, values) => {
    const { data, error } = await supabase.from('launch_purchase_options')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', option.id).eq('user_id', user.id).select().single()
    if (error || !data) {
      console.error('[Launches] option update error:', error)
      alert(`Failed to save purchase option: ${error?.message || 'Unknown error'}.`)
      return
    }
    setOptionsFor(launchId, list => list.map(o => o.id === option.id ? data : o))
  }

  // Confirmed inline on the purchase option row before this runs.
  const handleRemoveOption = async (launchId, option) => {
    const { error } = await supabase.from('launch_purchase_options')
      .delete().eq('id', option.id).eq('user_id', user.id)
    if (error) {
      console.error('[Launches] option delete error:', error)
      alert(`Failed to remove purchase option: ${error.message}.`)
      return
    }
    const remaining = (optionsByLaunch[launchId] || []).filter(o => o.id !== option.id)
    setOptionsFor(launchId, () => remaining)
    // Hand Primary to another option when the primary one is removed.
    if (option.is_primary && remaining.length > 0) {
      await handleMakePrimary(launchId, remaining[0], remaining)
    }
  }

  const handleMakePrimary = async (launchId, option, listOverride) => {
    const list = listOverride || optionsByLaunch[launchId] || []
    const updates = list.map(o =>
      supabase.from('launch_purchase_options')
        .update({ is_primary: o.id === option.id, updated_at: new Date().toISOString() })
        .eq('id', o.id).eq('user_id', user.id)
    )
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed) {
      console.error('[Launches] primary update error:', failed.error)
      alert('Failed to update the primary purchase option. Please try again.')
      return
    }
    setOptionsFor(launchId, l => l.map(o => ({ ...o, is_primary: o.id === option.id })))
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredLaunches = useMemo(() => {
    const list = filter === 'All' ? [...launches] : launches.filter(l => stageOf(l) === filter)
    return list.sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0
      if (!a.start_date) return 1
      if (!b.start_date) return -1
      return a.start_date.localeCompare(b.start_date)
    })
  }, [launches, filter])

  // Yearly summary — always from the full unfiltered year.
  const summary = useMemo(() => {
    const currencies = [...new Set(launches.map(currencyOf))]
    const displayCurrency = currencies[0] || 'AUD'
    const mixed = currencies.length > 1
    const revenueGoal = launches.reduce((s, l) => s + num0(l.revenue_goal), 0)
    const salesRevenue = launches.reduce((s, l) => s + salesRevenueOf(l), 0)
    const salesMade = launches.reduce((s, l) => s + salesMadeOf(l), 0)
    const next = [...launches]
      .filter(l => ['Planning', 'Pre-launch'].includes(stageOf(l)) && l.start_date && daysUntil(l.start_date) >= 0)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null
    return { total: launches.length, revenueGoal, salesRevenue, salesMade, next, displayCurrency, mixed }
  }, [launches])

  const openCampaign = launches.find(l => l.id === openId) || null
  const defaultCurrency = launches.length > 0 ? currencyOf(launches[0]) : 'AUD'

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
      {loadError && <div className="insight-box">{loadError}</div>}

      {/* Snapshot */}
      <div className="p-5 text-white" style={{ borderRadius: '5px', backgroundColor: BRAND }}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            ['Total Campaigns', summary.total],
            ['Revenue Goal', fmtMoney(summary.revenueGoal, summary.displayCurrency)],
            ['Sales Revenue', fmtMoney(summary.salesRevenue, summary.displayCurrency)],
            ['Sales Made', summary.salesMade],
            ['Next Campaign', summary.next?.offer_name || 'None scheduled'],
          ].map(([label, value]) => (
            <div key={label} className="text-center min-w-0">
              <p className="truncate" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 300, fontStyle: 'italic' }}>
                {value}
              </p>
              <p className="text-xs text-white/60 mt-1">{label}</p>
            </div>
          ))}
        </div>
        {summary.mixed && (
          <p className="text-xs text-white/50 mt-3 text-center">
            Campaigns use more than one currency. Totals are shown in {summary.displayCurrency}.
          </p>
        )}
      </div>

      {/* CEO training box */}
      <div style={{ backgroundColor: '#fdf8f5', border: '0.5px solid rgba(240,208,208,0.5)', borderLeft: '2px solid rgba(240,208,208,0.7)', borderRadius: '4px', padding: '13px 16px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '11px', fontWeight: 300, color: '#3d0c0c' }}>
        <HeartIcon /> Use: CEO Cash Dashboard → <a href="https://tools.womanmasteryhqportal.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3d0c0c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Launch Campaign</a>
      </div>

      {openCampaign ? (
        <Workspace
          campaign={openCampaign}
          options={optionsByLaunch[openCampaign.id] || []}
          onBack={() => setOpenId(null)}
          onSaveCampaign={(draft) => handleSaveCampaign(openCampaign.id, draft)}
          onSetStage={(stage) => handleSetStage(openCampaign.id, stage)}
          onDelete={() => handleDelete(openCampaign.id)}
          onAddOption={(values) => handleAddOption(openCampaign.id, values)}
          onEditOption={(option, values) => handleEditOption(openCampaign.id, option, values)}
          onRemoveOption={(option) => handleRemoveOption(openCampaign.id, option)}
          onMakePrimary={(option) => handleMakePrimary(openCampaign.id, option)}
        />
      ) : (
        <>
          {/* Main content card */}
          <div className="card-section">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1" role="group" aria-label="Filter by campaign stage">
                {['All', ...STAGES].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    aria-pressed={filter === s}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                      filter === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={filter === s ? { backgroundColor: BRAND } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!showWizard && (
                <button onClick={() => setShowWizard(true)} className="btn-brand flex-shrink-0">
                  + Add Launch Campaign
                </button>
              )}
            </div>

            {/* Create wizard */}
            {showWizard && (
              <CreateWizard
                onCreate={handleCreate}
                onCancel={() => setShowWizard(false)}
                defaultCurrency={defaultCurrency}
              />
            )}

            {/* Campaign list */}
            {loading ? (
              <p className="text-sm text-gray-400 py-10 text-center">Loading campaigns…</p>
            ) : launches.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-500 mb-1">No Launch Campaigns yet.</p>
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                  Create your first campaign to set a target, track sales and review what worked.
                </p>
                {!showWizard && (
                  <button onClick={() => setShowWizard(true)} className="btn-brand">+ Add Launch Campaign</button>
                )}
              </div>
            ) : filteredLaunches.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-8 text-center">No campaigns in {filter}.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredLaunches.map(l => (
                  <CampaignCard key={l.id} campaign={l} onOpen={() => setOpenId(l.id)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
