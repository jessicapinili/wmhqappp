import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCurrentQuarter } from '../lib/utils'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#6B1010'

const OFFER_TYPES = ['Hero Product', 'New Product', 'Group Coaching', 'Mastermind', 'Membership', 'Recurring Subscription', 'Digital Product', 'Service']
const TIERS = [
  { key: 'free', label: 'Free Tier' },
  { key: 'low', label: 'Low Ticket' },
  { key: 'mid', label: 'Mid Ticket' },
  { key: 'high', label: 'High Ticket' },
]

/* ── MRR Goal ── */
function MRRGoal({ userId }) {
  const [form, setForm] = useState({ current_mrr: '', goal_mrr: '' })
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    supabase.from('mrr_goal').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) { setSaved(data); setForm({ current_mrr: data.current_mrr || '', goal_mrr: data.goal_mrr || '' }) } })
  }, [userId])

  const handleSave = async () => {
    const { data } = await supabase.from('mrr_goal')
      .upsert({ user_id: userId, current_mrr: parseFloat(form.current_mrr) || 0, goal_mrr: parseFloat(form.goal_mrr) || 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select().single()
    setSaved(data); setEditing(false)
  }

  const pct = saved && saved.goal_mrr > 0 ? Math.min(100, Math.round((saved.current_mrr / saved.goal_mrr) * 100)) : 0

  return (
    <div className="rounded-2xl p-6 text-white mb-5" style={{ backgroundColor: BRAND }}>
      <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">WMHQ Goal MRR</p>
      {saved && !editing ? (
        <>
          <p className="text-4xl font-black mb-1">${(saved.current_mrr || 0).toLocaleString()}</p>
          <p className="text-white/70 text-sm mb-1">Current MRR</p>
          <p className="text-white/70 text-sm mb-3">Goal: ${(saved.goal_mrr || 0).toLocaleString()}</p>
          <div className="bg-white/20 rounded-full h-2 mb-1">
            <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/60 mt-1">{pct}% to goal</p>
          <button onClick={() => setEditing(true)} className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">Update MRR</button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 uppercase tracking-wide mb-1">Current MRR (AUD)</label>
            <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40" type="number" value={form.current_mrr} onChange={e => setForm(p => ({ ...p, current_mrr: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-white/60 uppercase tracking-wide mb-1">Goal MRR (AUD)</label>
            <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40" type="number" value={form.goal_mrr} onChange={e => setForm(p => ({ ...p, goal_mrr: e.target.value }))} placeholder="0" />
          </div>
          <div className="flex gap-2">
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">Cancel</button>}
            <button onClick={handleSave} className="bg-white text-brand font-bold py-2 px-4 rounded-lg text-sm hover:bg-white/90 transition-colors" style={{ color: BRAND }}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Ideal Lifestyle Number ── */
function ILN({ userId }) {
  const [form, setForm] = useState({ ideal_lifestyle_number: '', current_monthly_revenue: '' })
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    supabase.from('iln').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) { setSaved(data); setForm({ ideal_lifestyle_number: data.ideal_lifestyle_number || '', current_monthly_revenue: data.current_monthly_revenue || '' }) } })
  }, [userId])

  const handleSave = async () => {
    const { data } = await supabase.from('iln')
      .upsert({ user_id: userId, ideal_lifestyle_number: parseFloat(form.ideal_lifestyle_number) || 0, current_monthly_revenue: parseFloat(form.current_monthly_revenue) || 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select().single()
    setSaved(data); setEditing(false)
  }

  const pct = saved && saved.ideal_lifestyle_number > 0 ? Math.min(100, Math.round((saved.current_monthly_revenue / saved.ideal_lifestyle_number) * 100)) : 0

  return (
    <>
      <div className="rounded-2xl p-6 text-white mb-5" style={{ backgroundColor: BRAND }}>
        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Ideal Lifestyle Number (ILN)</p>
        {saved && !editing ? (
          <>
            <p className="text-3xl font-black mb-1">${(saved.ideal_lifestyle_number || 0).toLocaleString()} <span className="text-base font-normal text-white/70">/ month AUD</span></p>
            <p className="text-white/70 text-sm mb-1">Current: ${(saved.current_monthly_revenue || 0).toLocaleString()} / month</p>
            <div className="bg-white/20 rounded-full h-2 mt-3 mb-1">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-white/60">{pct}% to your ideal lifestyle number</p>
            <p className="text-xs text-white/40 mt-2">Update these every 30 days</p>
            <button onClick={() => setEditing(true)} className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">Update ILN</button>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-wide mb-1">Ideal Lifestyle Number (per month AUD)</label>
              <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40" type="number" value={form.ideal_lifestyle_number} onChange={e => setForm(p => ({ ...p, ideal_lifestyle_number: e.target.value }))} placeholder="e.g. 25000" />
            </div>
            <div>
              <label className="block text-xs text-white/60 uppercase tracking-wide mb-1">Current Monthly Revenue (AUD)</label>
              <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40" type="number" value={form.current_monthly_revenue} onChange={e => setForm(p => ({ ...p, current_monthly_revenue: e.target.value }))} placeholder="0" />
            </div>
            <div className="flex gap-2">
              {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">Cancel</button>}
              <button onClick={handleSave} className="bg-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-white/90 transition-colors" style={{ color: BRAND }}>Save ILN</button>
            </div>
          </div>
        )}
      </div>

      {/* Static insight card */}
      <div className="rounded-xl p-5 mb-5 border border-gray-200" style={{ backgroundColor: '#FDF6EE' }}>
        <p className="text-sm text-gray-700 italic font-medium">
          "Master the season you're in. Clarity defines the vision; strategy + subconscious drives the scale."
        </p>
      </div>
    </>
  )
}

/* ── Product & Service Suite ── */
function OfferForm({ tier, onSave, onCancel, initial }) {
  const [form, setForm] = useState(initial || { offer_name: '', offer_type: '', offer_description: '', one_time_price: '', payment_plan_1: '', payment_plan_2: '', monthly_revenue: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Offer Name</label><input className="input-field" value={form.offer_name} onChange={e => set('offer_name', e.target.value)} placeholder="e.g. 1:1 Coaching" /></div>
        <div><label className="label">Type</label>
          <select className="input-field" value={form.offer_type} onChange={e => set('offer_type', e.target.value)}>
            <option value="">Select...</option>
            {OFFER_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Offer Description</label><textarea className="textarea-field" rows={2} value={form.offer_description} onChange={e => set('offer_description', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">One-time Price</label><input className="input-field" value={form.one_time_price} onChange={e => set('one_time_price', e.target.value)} placeholder="$0" /></div>
        <div><label className="label">Monthly Revenue from This Offer</label><input className="input-field" value={form.monthly_revenue} onChange={e => set('monthly_revenue', e.target.value)} placeholder="$0" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Payment Plan 1</label><input className="input-field" value={form.payment_plan_1} onChange={e => set('payment_plan_1', e.target.value)} placeholder="e.g. 3 x $500" /></div>
        <div><label className="label">Payment Plan 2</label><input className="input-field" value={form.payment_plan_2} onChange={e => set('payment_plan_2', e.target.value)} placeholder="e.g. 6 x $280" /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button onClick={() => onSave(form)} className="btn-brand" style={{ backgroundColor: BRAND }}>Save Offer</button>
      </div>
    </div>
  )
}

function ProductSuiteTier({ tier, userId }) {
  const [offers, setOffers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from('product_suite').select('*').eq('user_id', userId).eq('tier', tier.key).order('created_at')
      .then(({ data }) => setOffers(data || []))
  }, [userId, tier.key])

  const handleSave = async (form) => {
    if (editId) {
      const { data } = await supabase.from('product_suite').update({ ...form }).eq('id', editId).select().single()
      setOffers(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data } = await supabase.from('product_suite').insert({ user_id: userId, tier: tier.key, ...form }).select().single()
      setOffers(prev => [...prev, data])
    }
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('product_suite').delete().eq('id', id)
    setOffers(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <p className="font-bold text-gray-900">{tier.label}</p>
          {offers.length > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{offers.length} offer{offers.length !== 1 ? 's' : ''}</span>}
        </div>
        <span className="text-gray-400">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <p className="text-xs text-gray-400">Update every 30 days</p>

          {offers.map(offer => (
            <div key={offer.id} className="card group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900">{offer.offer_name}</p>
                    {offer.offer_type && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{offer.offer_type}</span>}
                  </div>
                  {offer.offer_description && <p className="text-xs text-gray-500 mt-1">{offer.offer_description}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                    {offer.one_time_price && <span>Price: <strong>{offer.one_time_price}</strong></span>}
                    {offer.monthly_revenue && <span>Monthly Rev: <strong>{offer.monthly_revenue}</strong></span>}
                    {offer.payment_plan_1 && <span>Plan 1: <strong>{offer.payment_plan_1}</strong></span>}
                    {offer.payment_plan_2 && <span>Plan 2: <strong>{offer.payment_plan_2}</strong></span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(offer.id); setShowForm(true) }} className="edit-btn"><EditIcon /></button>
                  <button onClick={() => handleDelete(offer.id)} className="delete-btn"><DeleteIcon /></button>
                </div>
              </div>
            </div>
          ))}

          {showForm ? (
            <OfferForm
              tier={tier}
              initial={editId ? offers.find(x => x.id === editId) : null}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditId(null) }}
            />
          ) : (
            <button onClick={() => { setEditId(null); setShowForm(true) }} className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: BRAND }}>
              + Add Another Offer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Quarterly Revenue Review ── */
const Q_QUESTIONS = [
  'What is the one thing I sell that most people want, and why do they love it?',
  'Where do people get confused or stop buying, and how can I make it easier?',
  'Which job takes the least amount of work but makes the most amount of money?',
  'What went surprisingly well this time, and how can we make it happen on purpose next time?',
  'How much monthly revenue did I have at the start of the quarter, and how much at the end?',
]

function QuarterlyReview({ userId }) {
  const currentQ = getCurrentQuarter()
  const currentYear = new Date().getFullYear().toString()
  const [quarter, setQuarter] = useState(currentQ)
  const [year, setYear] = useState(currentYear)
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [current, setCurrent] = useState(null)
  const [past, setPast] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editPastId, setEditPastId] = useState(null)

  const loadReviews = async () => {
    const { data } = await supabase.from('quarterly_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) {
      const curr = data.find(r => r.quarter === currentQ && r.year === currentYear && r.is_current)
      const pastReviews = data.filter(r => !(r.quarter === currentQ && r.year === currentYear && r.is_current))
      setCurrent(curr || null)
      setPast(pastReviews.slice(0, 8))
      if (curr) setAnswers({ q1: curr.q1||'', q2: curr.q2||'', q3: curr.q3||'', q4: curr.q4||'', q5: curr.q5||'' })
    }
  }

  useEffect(() => { loadReviews() }, [userId])

  const handleSave = async () => {
    if (current) {
      const { data } = await supabase.from('quarterly_reviews').update({ ...answers, quarter, year }).eq('id', current.id).select().single()
      setCurrent(data)
    } else {
      const { data } = await supabase.from('quarterly_reviews').insert({ user_id: userId, quarter, year, ...answers, is_current: true }).select().single()
      setCurrent(data)
    }
    setShowForm(false)
  }

  const handleReset = async () => {
    if (!window.confirm('Reset this quarterly review? The current review will be archived.')) return
    if (current) {
      await supabase.from('quarterly_reviews').update({ is_current: false }).eq('id', current.id)
    }
    setAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' })
    setCurrent(null)
    loadReviews()
  }

  const handleDeletePast = async (id) => {
    await supabase.from('quarterly_reviews').delete().eq('id', id)
    setPast(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
        Quarterly Revenue Review
      </h2>
      <p className="section-subtitle">Resets each quarter — past reviews saved below.</p>

      {current && !showForm ? (
        <div>
          <div className="card mb-4">
            <div className="flex justify-between items-start mb-3">
              <p className="font-bold text-gray-900">{current.quarter} {current.year} Review</p>
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(true); setAnswers({ q1: current.q1||'', q2: current.q2||'', q3: current.q3||'', q4: current.q4||'', q5: current.q5||'' }) }} className="edit-btn"><EditIcon /></button>
                <button onClick={handleReset} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded">↺ Reset</button>
              </div>
            </div>
            {Q_QUESTIONS.map((q, i) => (
              <div key={i} className="mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{q}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{answers[`q${i+1}`] || <span className="text-gray-300 italic">Not answered</span>}</p>
              </div>
            ))}
          </div>
        </div>
      ) : showForm ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quarter</label>
              <select className="input-field" value={quarter} onChange={e => setQuarter(e.target.value)}>
                {['Q1','Q2','Q3','Q4'].map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div><label className="label">Year</label>
              <input className="input-field" value={year} onChange={e => setYear(e.target.value)} />
            </div>
          </div>
          {Q_QUESTIONS.map((q, i) => (
            <div key={i}>
              <label className="label">{i + 1}. {q}</label>
              <textarea className="textarea-field" rows={3} value={answers[`q${i+1}`]} onChange={e => setAnswers(p => ({ ...p, [`q${i+1}`]: e.target.value }))} />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
            <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>Save Review</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn-brand" style={{ backgroundColor: BRAND }}>
          + Start {currentQ} {currentYear} Review
        </button>
      )}

      {/* Past reviews */}
      {past.length > 0 && (
        <div className="mt-6">
          <p className="font-bold text-sm text-gray-700 mb-3">Past Reviews</p>
          <div className="space-y-2">
            {past.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 bg-white">
                  <p className="font-semibold text-sm text-gray-900">{r.quarter} {r.year}</p>
                  <div className="flex gap-2">
                    <button onClick={() => {}} className="text-xs text-gray-400 hover:text-brand px-2 py-1">View</button>
                    <button onClick={() => handleDeletePast(r.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ── */
export default function Cash() {
  const { user } = useAuth()

  return (
    <div className="space-y-0">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
          <h1 className="text-2xl font-black text-gray-900">Cash</h1>
        </div>
        <p className="text-sm text-gray-500">
          Your offers, systems, and conversion processes: how visibility translates into consistent, scalable income.
        </p>
      </div>

      <MRRGoal userId={user.id} />
      <ILN userId={user.id} />

      {/* Product Suite */}
      <div className="card-section">
        <h2 className="section-title flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cdd5ae' }} />
          Product & Service Suite
        </h2>
        <p className="section-subtitle mb-4">Update every 30 days. Click a tier to expand.</p>
        <div className="space-y-2">
          {TIERS.map(tier => (
            <ProductSuiteTier key={tier.key} tier={tier} userId={user.id} />
          ))}
        </div>
      </div>

      <QuarterlyReview userId={user.id} />
    </div>
  )
}
