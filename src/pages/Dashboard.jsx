import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getMonthKey, getDateKey, todayFormatted } from '../lib/utils'
import { getTodaysInsight } from '../lib/insights'

const BRAND = '#6B1010'

/* ─── Season ─── */
const SEASONS = {
  bloom: {
    label: 'BLOOM SEASON',
    sub: 'Testing / Exploring',
    color: '#F9A8D4',
    bg: '#FDF2F8',
    border: '#F9A8D4',
    text: 'Bloom is where you test, explore and plant seeds. MODE: TESTING AND EXPLORING',
  },
  integration: {
    label: 'INTEGRATION SEASON',
    sub: 'Stabilising / Systemising',
    color: '#93C5FD',
    bg: '#EFF6FF',
    border: '#93C5FD',
    text: 'Integration is where you stabilise and systemise. MODE: STABILISING AND SYSTEMISING',
  },
  sprint: {
    label: 'SPRINT SEASON',
    sub: 'Full Lock-In / Executing',
    color: '#6EE7B7',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    text: 'Sprint is where you lock in fully, knowing your base is strong enough to hold it. MODE: FULL LOCK-IN AND EXECUTION',
  },
}

/* ─── Checklist data ─── */
const CHECKLIST = {
  Influence: {
    CONNECT: [
      'Share a personal rule you follow when creating results or products',
      'Show how you organise your day as a leader',
    ],
    'CREATE DEMAND': [
      'Share one internal shift that improves product or service results',
      'Break down what a high standard looks like in your niche',
    ],
    ACTIVATE: [
      'Explain how your offer solves a very specific bottleneck',
      'Share a moment when a customer realised they needed this',
    ],
  },
  Visibility: {
    CONNECT: [
      'Show a behind-the-scenes of your content creation process',
      'Post a story showing your filming setup',
    ],
    'CREATE DEMAND': [
      'Share the content strategy that changed everything for you',
      'Explain the psychology behind shareable content',
    ],
    ACTIVATE: [
      'Share the journey from follower to buyer',
      'Post a clear call-to-action for your next offering or consultation',
    ],
  },
  Cash: {
    CONNECT: [
      'Post about a rejection that led to something better',
      'Share your money story and how it shaped your business',
    ],
    'CREATE DEMAND': [
      'Share a case study highlighting specific ROI you\'ve delivered',
      'Break down the hidden costs of DIY approaches',
    ],
    ACTIVATE: [
      'Explain exactly what they get when they join',
      'Break down the payment options available',
    ],
  },
}

const COLS = ['CONNECT', 'CREATE DEMAND', 'ACTIVATE']
const COL_SUBTITLES = {
  CONNECT: 'Attracting new eyes',
  'CREATE DEMAND': 'Shift their perspective',
  ACTIVATE: 'Selling to them',
}

/* ─── Modals ─── */
function BusinessFocusModal({ onSave, onClose, initial }) {
  const [type, setType] = useState(initial?.focus_type || 'offer')
  const [data, setData] = useState(initial?.data || {})

  const setField = (k, v) => setData(prev => ({ ...prev, [k]: v }))

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const years = [2024,2025,2026,2027,2028]
  const quarters = ['Q1','Q2','Q3','Q4']

  const handleSave = () => {
    if (!data.month || !data.year) return alert('Please select a month and year.')
    onSave({ focus_type: type, data })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900">Add Business Focus</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 mb-5">
          {['offer','visibility','revenue'].map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setData({}) }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${type===t ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={type===t ? {backgroundColor:BRAND} : {}}
            >{t === 'offer' ? 'Offer Focus' : t === 'visibility' ? 'Visibility Focus' : 'Revenue Focus'}</button>
          ))}
        </div>

        {/* Date selectors */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <label className="label">Month</label>
            <select className="input-field" value={data.month||''} onChange={e=>setField('month',e.target.value)}>
              <option value="">--</option>
              {months.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input-field" value={data.year||''} onChange={e=>setField('year',e.target.value)}>
              <option value="">--</option>
              {years.map(y=><option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quarter</label>
            <select className="input-field" value={data.quarter||''} onChange={e=>setField('quarter',e.target.value)}>
              <option value="">--</option>
              {quarters.map(q=><option key={q}>{q}</option>)}
            </select>
          </div>
        </div>

        {type === 'offer' && (
          <div className="space-y-3">
            <div><label className="label">Offer in Focus</label>
              <input className="input-field" value={data.offer||''} onChange={e=>setField('offer',e.target.value)} placeholder="e.g. 1:1 Coaching" /></div>
            <div><label className="label">Revenue Goal for Month</label>
              <input className="input-field" value={data.revenueGoal||''} onChange={e=>setField('revenueGoal',e.target.value)} placeholder="$0" /></div>
            <div><label className="label">Traffic Needed</label>
              <input className="input-field" value={data.trafficNeeded||''} onChange={e=>setField('trafficNeeded',e.target.value)} placeholder="e.g. 500 website visits" /></div>
          </div>
        )}

        {type === 'visibility' && (
          <div className="space-y-3">
            <div><label className="label">Visibility Focus</label>
              <select className="input-field" value={data.visibilityFocus||''} onChange={e=>setField('visibilityFocus',e.target.value)}>
                <option value="">Select...</option>
                {['TikTok Followers','Instagram Followers','Email List','Podcast Downloads','YouTube Subscribers','Website Traffic'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className="label">Current Number</label>
              <input className="input-field" type="number" value={data.currentNumber||''} onChange={e=>setField('currentNumber',e.target.value)} /></div>
            <div><label className="label">Target Number for Month</label>
              <input className="input-field" type="number" value={data.targetNumber||''} onChange={e=>setField('targetNumber',e.target.value)} /></div>
          </div>
        )}

        {type === 'revenue' && (
          <div className="space-y-3">
            <div><label className="label">Revenue Focus Type</label>
              <select className="input-field" value={data.revenueFocusType||''} onChange={e=>setField('revenueFocusType',e.target.value)}>
                <option value="">Select...</option>
                {['New Clients','Renewals','Upsells','Launch','Recurring Revenue','Passive Income'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className="label">Current Revenue</label>
              <input className="input-field" value={data.currentRevenue||''} onChange={e=>setField('currentRevenue',e.target.value)} placeholder="$0" /></div>
            <div><label className="label">Target Revenue</label>
              <input className="input-field" value={data.targetRevenue||''} onChange={e=>setField('targetRevenue',e.target.value)} placeholder="$0" /></div>
            <div><label className="label">Primary Lever This Month</label>
              <select className="input-field" value={data.primaryLever||''} onChange={e=>setField('primaryLever',e.target.value)}>
                <option value="">Select...</option>
                {['New Offer Launch','Increasing Prices','Adding Volume','Reducing Churn','Referrals','Ads/Paid Traffic'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="flex-1 btn-brand py-2 rounded-lg" style={{backgroundColor:BRAND}}>Save Focus</button>
        </div>
      </div>
    </div>
  )
}

function LifeFocusModal({ onSave, onClose, initial }) {
  const AREAS = ['Relationships','Hobbies','Travel','Finances','Health']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const years = [2024,2025,2026,2027,2028]
  const quarters = ['Q1','Q2','Q3','Q4']

  const [month, setMonth] = useState(initial?.month||'')
  const [year, setYear] = useState(initial?.year||'')
  const [quarter, setQuarter] = useState(initial?.quarter||'')
  const [areas, setAreas] = useState(initial?.areas||[])
  const [notes, setNotes] = useState(initial?.notes||'')

  const toggleArea = (a) => setAreas(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev,a])

  const handleSave = () => {
    if (!month || !year) return alert('Please select a month and year.')
    onSave({ month, year, quarter, areas, notes })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900">Add Life Focus</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div><label className="label">Month</label>
            <select className="input-field" value={month} onChange={e=>setMonth(e.target.value)}>
              <option value="">--</option>
              {months.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="label">Year</label>
            <select className="input-field" value={year} onChange={e=>setYear(e.target.value)}>
              <option value="">--</option>
              {years.map(y=><option key={y}>{y}</option>)}
            </select>
          </div>
          <div><label className="label">Quarter</label>
            <select className="input-field" value={quarter} onChange={e=>setQuarter(e.target.value)}>
              <option value="">--</option>
              {quarters.map(q=><option key={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Area of Focus</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {AREAS.map(a=>(
              <button
                key={a}
                onClick={()=>toggleArea(a)}
                className={`tag-btn ${areas.includes(a) ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-gray-50'}`}
                style={areas.includes(a)?{backgroundColor:BRAND,borderColor:BRAND}:{}}
              >{a}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="label">What does success look like this month?</label>
          <textarea className="textarea-field" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="flex-1 btn-brand py-2 rounded-lg" style={{backgroundColor:BRAND}}>Save Focus</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Focus Card ─── */
function FocusCard({ item, onEdit, onDelete, type }) {
  const d = item.data || item
  const isLife = type === 'life'

  return (
    <div className="card relative group">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {!isLife && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white mb-2 capitalize" style={{backgroundColor:BRAND}}>
              {item.focus_type === 'offer' ? 'Offer Focus' : item.focus_type === 'visibility' ? 'Visibility Focus' : 'Revenue Focus'}
            </span>
          )}
          {isLife && d.areas?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {d.areas.map(a=>(
                <span key={a} className="px-2 py-0.5 rounded text-xs font-semibold bg-violet-100 text-violet-700">{a}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mb-1">
            {d.month} {d.year}{d.quarter ? ` · ${d.quarter}` : ''}
          </p>
          {!isLife && d.offer && <p className="text-sm font-semibold">{d.offer}</p>}
          {!isLife && d.visibilityFocus && <p className="text-sm font-semibold">{d.visibilityFocus}</p>}
          {!isLife && d.revenueFocusType && <p className="text-sm font-semibold">{d.revenueFocusType}</p>}
          {!isLife && d.revenueGoal && <p className="text-xs text-gray-600 mt-1">Goal: {d.revenueGoal}</p>}
          {!isLife && d.targetNumber && <p className="text-xs text-gray-600 mt-1">Target: {d.targetNumber}</p>}
          {!isLife && d.targetRevenue && <p className="text-xs text-gray-600 mt-1">Target: {d.targetRevenue}</p>}
          {isLife && d.notes && <p className="text-sm text-gray-700 mt-1">{d.notes}</p>}
        </div>
        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="edit-btn">✏️</button>
          <button onClick={onDelete} className="delete-btn">🗑️</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const { user, firstName } = useAuth()
  const { insight, number } = getTodaysInsight()
  const today = todayFormatted()
  const monthKey = getMonthKey()
  const dateKey = getDateKey()

  // Season
  const [season, setSeason] = useState(null)
  const [seasonLoaded, setSeasonLoaded] = useState(false)

  // Business & Life Focus
  const [businessFocuses, setBusinessFocuses] = useState([])
  const [lifeFocuses, setLifeFocuses] = useState([])
  const [showBizModal, setShowBizModal] = useState(false)
  const [showLifeModal, setShowLifeModal] = useState(false)
  const [editBiz, setEditBiz] = useState(null)
  const [editLife, setEditLife] = useState(null)

  // Checklist
  const [checklistTab, setChecklistTab] = useState('Influence')
  const [checked, setChecked] = useState({})
  const [checklistComplete, setChecklistComplete] = useState(false)

  /* ── Load season ── */
  useEffect(() => {
    supabase.from('season_selection')
      .select('*').eq('user_id', user.id).eq('month_year', monthKey).single()
      .then(({ data }) => {
        if (data) setSeason(data.season)
        setSeasonLoaded(true)
      })
  }, [user, monthKey])

  const saveSeason = async (s) => {
    setSeason(s)
    await supabase.from('season_selection').upsert(
      { user_id: user.id, month_year: monthKey, season: s },
      { onConflict: 'user_id,month_year' }
    )
  }

  /* ── Load business focuses ── */
  useEffect(() => {
    supabase.from('business_focus').select('*').eq('user_id', user.id)
      .order('created_at').then(({ data }) => setBusinessFocuses(data || []))
  }, [user])

  const saveBizFocus = async (item) => {
    if (businessFocuses.length >= 3 && !editBiz) return alert('Max 3 business focuses.')
    if (editBiz) {
      const { data } = await supabase.from('business_focus').update(item).eq('id', editBiz.id).select().single()
      setBusinessFocuses(prev => prev.map(x => x.id === editBiz.id ? data : x))
    } else {
      const { data } = await supabase.from('business_focus').insert({ ...item, user_id: user.id }).select().single()
      setBusinessFocuses(prev => [...prev, data])
    }
    setShowBizModal(false); setEditBiz(null)
  }

  const deleteBizFocus = async (id) => {
    await supabase.from('business_focus').delete().eq('id', id)
    setBusinessFocuses(prev => prev.filter(x => x.id !== id))
  }

  /* ── Load life focuses ── */
  useEffect(() => {
    supabase.from('life_focus').select('*').eq('user_id', user.id)
      .order('created_at').then(({ data }) => setLifeFocuses(data || []))
  }, [user])

  const saveLifeFocus = async (item) => {
    if (lifeFocuses.length >= 3 && !editLife) return alert('Max 3 life focuses.')
    if (editLife) {
      const { data } = await supabase.from('life_focus').update(item).eq('id', editLife.id).select().single()
      setLifeFocuses(prev => prev.map(x => x.id === editLife.id ? data : x))
    } else {
      const { data } = await supabase.from('life_focus').insert({ ...item, user_id: user.id }).select().single()
      setLifeFocuses(prev => [...prev, data])
    }
    setShowLifeModal(false); setEditLife(null)
  }

  const deleteLifeFocus = async (id) => {
    await supabase.from('life_focus').delete().eq('id', id)
    setLifeFocuses(prev => prev.filter(x => x.id !== id))
  }

  /* ── Load checklist ── */
  useEffect(() => {
    supabase.from('daily_checklist').select('*').eq('user_id', user.id).eq('date_key', dateKey).single()
      .then(({ data }) => {
        if (data) { setChecked(data.checked_items || {}); setChecklistComplete(data.is_complete || false) }
      })
  }, [user, dateKey])

  const toggleCheck = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    setChecklistComplete(false)
  }

  const saveChecklist = async (items, complete) => {
    await supabase.from('daily_checklist').upsert(
      { user_id: user.id, date_key: dateKey, checked_items: items, is_complete: complete },
      { onConflict: 'user_id,date_key' }
    )
  }

  const completeChecklist = () => {
    setChecklistComplete(true)
    saveChecklist(checked, true)
  }

  const resetChecklist = () => {
    setChecked({})
    setChecklistComplete(false)
    saveChecklist({}, false)
  }

  const tabColors = { Influence: '#3B82F6', Visibility: '#F59E0B', Cash: '#10B981' }

  return (
    <div className="space-y-6">
      {/* Header image */}
      <div>
        <img
          src="https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2162592122/settings_images/1622d17-4367-a434-f718-0be170584c6a_WMHQ_Community_Covers.png"
          alt="WMHQ"
          className="w-full rounded-2xl object-cover"
          style={{ maxHeight: '220px' }}
          onError={e => { e.target.style.display='none' }}
        />
      </div>

      {/* Welcome + Date + Login button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome back, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        <a
          href="https://www.jessicapinili.com/login"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand flex-shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          Login to WMHQ ↗
        </a>
      </div>

      {/* Insight of the Day */}
      <div className="card-section" style={{ borderLeft: `4px solid ${BRAND}` }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND }}>
          JP × WMHQ — Insight of the Day #{number}
        </p>
        <p className="text-gray-800 font-medium text-base leading-relaxed italic">
          "{insight}"
        </p>
      </div>

      {/* Your Season This Month */}
      <div className="card-section">
        <h2 className="section-title">Your Season This Month</h2>
        <p className="section-subtitle">Select your season — locks for the calendar month.</p>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(SEASONS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => saveSeason(key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${season === key ? 'shadow-md' : 'border-gray-100 hover:border-gray-200'}`}
              style={season === key ? { borderColor: s.color, backgroundColor: s.bg } : {}}
            >
              <div className="w-4 h-4 rounded-full mb-2" style={{ backgroundColor: s.color }} />
              <p className="font-bold text-xs text-gray-900 leading-tight">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
            </button>
          ))}
        </div>
        {season && (
          <div className="mt-3 p-3 rounded-lg text-sm" style={{ backgroundColor: SEASONS[season].bg, color: '#374151', borderLeft: `3px solid ${SEASONS[season].color}` }}>
            {SEASONS[season].text}
          </div>
        )}
      </div>

      {/* Business Focus */}
      <div className="card-section">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="section-title">Business Focus</h2>
            <p className="section-subtitle">Up to 3 at a time · persists until deleted</p>
          </div>
          {businessFocuses.length < 3 && (
            <button className="btn-brand text-sm" style={{backgroundColor:BRAND}} onClick={()=>{setEditBiz(null);setShowBizModal(true)}}>+ Add</button>
          )}
        </div>
        {businessFocuses.length === 0 && (
          <p className="text-sm text-gray-400 italic">No business focuses added yet.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {businessFocuses.map(item => (
            <FocusCard
              key={item.id}
              item={item}
              type="business"
              onEdit={()=>{setEditBiz(item);setShowBizModal(true)}}
              onDelete={()=>deleteBizFocus(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Life Focus */}
      <div className="card-section">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="section-title">Life Focus</h2>
            <p className="section-subtitle">Up to 3 at a time · persists until deleted</p>
          </div>
          {lifeFocuses.length < 3 && (
            <button className="btn-brand text-sm" style={{backgroundColor:BRAND}} onClick={()=>{setEditLife(null);setShowLifeModal(true)}}>+ Add</button>
          )}
        </div>
        {lifeFocuses.length === 0 && (
          <p className="text-sm text-gray-400 italic">No life focuses added yet.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lifeFocuses.map(item => (
            <FocusCard
              key={item.id}
              item={{ ...item, data: item }}
              type="life"
              onEdit={()=>{setEditLife(item);setShowLifeModal(true)}}
              onDelete={()=>deleteLifeFocus(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Daily Marketing Checklist */}
      <div className="card-section">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="section-title">Daily Marketing Checklist</h2>
            <p className="section-subtitle">Resets daily</p>
          </div>
          <div className="flex gap-2">
            {checklistComplete ? (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg">✓ Done today</span>
            ) : (
              <button onClick={completeChecklist} className="btn-brand text-xs" style={{backgroundColor:BRAND}}>Complete Today</button>
            )}
            <button onClick={resetChecklist} title="Reset" className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm">↺</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {Object.keys(CHECKLIST).map(tab => (
            <button
              key={tab}
              onClick={() => setChecklistTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${checklistTab===tab ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              style={checklistTab===tab ? {backgroundColor: tabColors[tab]} : {}}
            >{tab}</button>
          ))}
        </div>

        {/* Columns */}
        <div className="grid grid-cols-3 gap-4">
          {COLS.map(col => (
            <div key={col}>
              <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-0.5">{col}</p>
              <p className="text-xs text-gray-400 mb-3">{COL_SUBTITLES[col]}</p>
              <div className="space-y-2">
                {CHECKLIST[checklistTab][col].map((item, i) => {
                  const key = `${checklistTab}-${col}-${i}`
                  return (
                    <label key={key} className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${checked[key] ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={!!checked[key]}
                        onChange={() => toggleCheck(key)}
                        className="mt-0.5 flex-shrink-0 accent-brand"
                        style={{ accentColor: BRAND }}
                      />
                      <span className={`text-xs leading-relaxed ${checked[key] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showBizModal && (
        <BusinessFocusModal
          initial={editBiz}
          onSave={saveBizFocus}
          onClose={()=>{setShowBizModal(false);setEditBiz(null)}}
        />
      )}
      {showLifeModal && (
        <LifeFocusModal
          initial={editLife}
          onSave={saveLifeFocus}
          onClose={()=>{setShowLifeModal(false);setEditLife(null)}}
        />
      )}
    </div>
  )
}
