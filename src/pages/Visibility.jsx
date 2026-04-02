import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWeekKey } from '../lib/utils'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#6B1010'

const weekKey = getWeekKey()
const now = new Date()
const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'dd MMM')
const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'dd MMM yyyy')

const WEEKLY_RESET_NOTICE = (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800 font-medium">
    ⚠️ This section resets every Sunday at midnight. Current week: {weekStart} – {weekEnd}
  </div>
)

/* ══════════════════ CONTENT SYSTEM ══════════════════ */
const COLUMN_DEFAULTS = [
  { name: 'Theme 1', bg: 'white' },
  { name: 'Theme 2', bg: 'white' },
  { name: 'Theme 3', bg: 'white' },
  { name: 'My Story', bg: BRAND },
]

function ContentSystem({ userId }) {
  const [columns, setColumns] = useState([
    { theme_name: '', topics: ['', '', '', ''] },
    { theme_name: '', topics: ['', '', '', ''] },
    { theme_name: '', topics: ['', '', '', ''] },
    { theme_name: '', topics: ['', '', '', ''] },
  ])
  const [saved, setSaved] = useState([false, false, false, false])
  const [editing, setEditing] = useState([false, false, false, false])

  useEffect(() => {
    supabase.from('content_system').select('*').eq('user_id', userId).order('column_index')
      .then(({ data }) => {
        if (data?.length) {
          const newCols = [...columns]
          const newSaved = [...saved]
          data.forEach(row => {
            if (row.column_index >= 0 && row.column_index < 4) {
              newCols[row.column_index] = { theme_name: row.theme_name || '', topics: row.topics || ['', '', '', ''] }
              newSaved[row.column_index] = true
            }
          })
          setColumns(newCols)
          setSaved(newSaved)
        }
      })
  }, [userId])

  const updateCol = (idx, field, val) => {
    setColumns(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
  }
  const updateTopic = (colIdx, topicIdx, val) => {
    setColumns(prev => {
      const n = [...prev]; const topics = [...n[colIdx].topics]; topics[topicIdx] = val; n[colIdx] = { ...n[colIdx], topics }; return n
    })
  }

  const saveColumn = async (idx) => {
    const col = columns[idx]
    await supabase.from('content_system').upsert(
      { user_id: userId, column_index: idx, theme_name: col.theme_name, topics: col.topics },
      { onConflict: 'user_id,column_index' }
    )
    setSaved(prev => { const n = [...prev]; n[idx] = true; return n })
    setEditing(prev => { const n = [...prev]; n[idx] = false; return n })
  }

  const editColumn = (idx) => {
    setEditing(prev => { const n = [...prev]; n[idx] = true; return n })
    setSaved(prev => { const n = [...prev]; n[idx] = false; return n })
  }

  const resetAll = async () => {
    if (!window.confirm('Clear all columns? This cannot be undone.')) return
    await supabase.from('content_system').delete().eq('user_id', userId)
    setColumns([
      { theme_name: '', topics: ['', '', '', ''] },
      { theme_name: '', topics: ['', '', '', ''] },
      { theme_name: '', topics: ['', '', '', ''] },
      { theme_name: '', topics: ['', '', '', ''] },
    ])
    setSaved([false, false, false, false])
    setEditing([false, false, false, false])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-medium flex-1">
          ✓ Content System never resets — your framework stays here permanently.
        </p>
        <button
          onClick={resetAll}
          title="Clear all columns"
          className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
      <div className="rounded-lg px-3 py-2.5 mb-4 text-sm font-medium" style={{ backgroundColor: '#FFF8F8', border: '1px solid rgba(107,16,16,0.18)', color: '#6B1010' }}>
        ✦ Watch: CEO Visibility Training → Creating Content Pillars
      </div>
      <div className="grid grid-cols-4 gap-3">
        {columns.map((col, idx) => {
          const isMyStory = idx === 3
          const colDef = COLUMN_DEFAULTS[idx]

          if (saved[idx] && !editing[idx]) {
            return (
              <div key={idx} className={`rounded-xl p-4 ${isMyStory ? 'text-white' : 'border'}`} style={isMyStory ? { backgroundColor: BRAND } : { backgroundColor: '#FFF8F8', borderColor: 'rgba(107,16,16,0.15)' }}>
                <p className={`font-black text-sm mb-3 ${isMyStory ? 'text-white' : 'text-gray-900'}`}>{col.theme_name || colDef.name}</p>
                <div className="space-y-2">
                  {col.topics.map((t, ti) => (
                    <p key={ti} className={`text-sm leading-relaxed ${isMyStory ? 'text-white/90' : 'text-gray-700'}`}>
                      <span className="font-bold" style={isMyStory ? { color: 'rgba(255,255,255,0.6)' } : { color: '#9a4a52' }}>{ti + 1}. </span>{t}
                    </p>
                  ))}
                </div>
                <button onClick={() => editColumn(idx)} className={`mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${isMyStory ? 'bg-white/20 text-white hover:bg-white/30' : ''}`} style={isMyStory ? {} : { backgroundColor: 'rgba(107,16,16,0.07)', color: '#7a2535' }}>Edit</button>
              </div>
            )
          }

          return (
            <div key={idx} className={`rounded-xl p-4 border ${isMyStory ? 'border-brand/30' : 'border-gray-100 bg-gray-50'}`} style={isMyStory ? { backgroundColor: '#FFF8F8' } : {}}>
              <div className="mb-3">
                <label className="label">{isMyStory ? 'My Story Column' : `Column ${idx + 1} Name`}</label>
                <input className="input-field text-sm" value={col.theme_name} onChange={e => updateCol(idx, 'theme_name', e.target.value)} placeholder={colDef.name} />
              </div>
              {[0, 1, 2, 3].map(ti => (
                <div key={ti} className="mb-2">
                  <label className="label text-[10px]">Topic {ti + 1}</label>
                  <input className="input-field text-xs" value={col.topics[ti]} onChange={e => updateTopic(idx, ti, e.target.value)} placeholder={`Content topic ${ti + 1}`} />
                </div>
              ))}
              <button onClick={() => saveColumn(idx)} className="mt-2 btn-brand text-xs py-1.5 px-3 rounded-lg">Save Column</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════ CONTENT TRACKER ══════════════════ */
const PLATFORMS = ['Instagram', 'TikTok/YouTube', 'Email']
const FUNNEL_STAGES = ['Attract', 'Nurture', 'Position', 'Convert']
const ACTIONS = ['DM/Enquiry', 'Link Click', 'Sale/Sign Up', 'No Direct Action']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayDayName = format(now, 'EEE')

// Funnel stage: soft editorial palette — each has a selected-pill colour and a tag treatment
const STAGE_COLORS = {
  Attract:  { sel: '#EDD5BA', bg: '#FAF0E6', text: '#7A4E20', border: '#E5C49A' },
  Nurture:  { sel: '#BEDEC6', bg: '#EEF4EF', text: '#3E6645', border: '#B2CEBC' },
  Position: { sel: '#DDBECE', bg: '#F5EEF0', text: '#6A3848', border: '#D8B4C0' },
  Convert:  { sel: '#BCD0E0', bg: '#EDF1F5', text: '#364E60', border: '#B4C4D2' },
}

// Action generated: distinct soft tones, cohesive with stage palette
const ACTION_COLORS = {
  'DM/Enquiry':       { sel: '#CEC4E4', bg: '#F0EEF8', text: '#4E3C6E', border: '#C8BEE0' },
  'Link Click':       { sel: '#BEDADA', bg: '#ECF4F3', text: '#2E5E58', border: '#A8CCCA' },
  'Sale/Sign Up':     { sel: '#DCC0A4', bg: '#F5EEE6', text: '#5E3E22', border: '#D4B898' },
  'No Direct Action': { sel: '#D2CCCA', bg: '#F2F0EE', text: '#524E4A', border: '#CEC8C2' },
}

function ContentTracker({ userId }) {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ platform: '', funnel_stage: '', content_about: '', led_to_action: '', reflection: '' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(todayDayName)

  useEffect(() => {
    supabase.from('content_tracker_entries').select('*').eq('user_id', userId).eq('week_key', weekKey)
      .order('created_at', { ascending: false }).then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [userId])

  const daysWithEntries = new Set(entries.map(e => format(new Date(e.created_at), 'EEE')))

  const stats = {
    total: entries.length,
    led: entries.filter(e => e.led_to_action && e.led_to_action !== 'No Direct Action').length,
  }

  const toggleField = (field, val) => setForm(p => ({ ...p, [field]: p[field] === val ? '' : val }))
  const resetForm = () => setForm({ platform: '', funnel_stage: '', content_about: '', led_to_action: '', reflection: '' })

  const handleSave = async () => {
    if (!form.platform || !form.funnel_stage) return alert('Select a platform and funnel stage.')
    if (editId) {
      const { data } = await supabase.from('content_tracker_entries').update({ ...form }).eq('id', editId).select().single()
      setEntries(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data } = await supabase.from('content_tracker_entries').insert({ user_id: userId, week_key: weekKey, ...form }).select().single()
      setEntries(prev => [data, ...prev])
    }
    resetForm()
  }

  const handleDelete = async (id) => {
    await supabase.from('content_tracker_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div>
      {/* Week status bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800 font-medium">
        ⚠️ Resets every Sunday at midnight. Current week: {weekStart} – {weekEnd}
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 mb-5">
        {DAYS.map(day => {
          const hasEntry = daysWithEntries.has(day)
          const isSelected = selectedDay === day
          return (
            <button key={day} onClick={() => setSelectedDay(day)}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors flex flex-col items-center gap-1"
              style={isSelected
                ? { backgroundColor: BRAND, borderColor: BRAND, color: 'white' }
                : { backgroundColor: 'white', borderColor: 'var(--card-border)', color: '#6B7280' }}>
              {day}
              <span className="w-1.5 h-1.5 rounded-full" style={{
                backgroundColor: hasEntry ? (isSelected ? 'rgba(255,255,255,0.6)' : BRAND) : 'transparent'
              }} />
            </button>
          )
        })}
      </div>

      {/* Log form */}
      <div className="card-section mb-5">
        <p className="font-bold text-sm text-gray-900 mb-4">{editId ? 'Edit entry' : 'Log a post'}</p>

        <div className="mb-3">
          <label className="label">Platform</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => toggleField('platform', p)}
                className={`tag-btn ${form.platform === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={form.platform === p ? { backgroundColor: BRAND } : {}}>{p}</button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="label">Funnel Stage</label>
          <div className="flex flex-wrap gap-2">
            {FUNNEL_STAGES.map(s => (
              <button key={s} onClick={() => toggleField('funnel_stage', s)}
                className={`tag-btn ${form.funnel_stage === s ? '' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={form.funnel_stage === s ? { backgroundColor: STAGE_COLORS[s].sel, borderColor: STAGE_COLORS[s].border, color: STAGE_COLORS[s].text } : {}}>{s}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Action Generated</label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map(a => (
              <button key={a} onClick={() => toggleField('led_to_action', a)}
                className={`tag-btn ${form.led_to_action === a ? '' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={form.led_to_action === a ? { backgroundColor: ACTION_COLORS[a].sel, borderColor: ACTION_COLORS[a].border, color: ACTION_COLORS[a].text } : {}}>{a}</button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {editId && (
            <button onClick={() => { setEditId(null); resetForm() }}
              className="py-2 px-4 rounded-lg border text-sm text-gray-600"
              style={{ borderColor: 'var(--card-border)' }}>Cancel</button>
          )}
          <button onClick={handleSave} className="btn-brand">Log post</button>
        </div>
      </div>

      {/* This week */}
      {entries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            This week · {stats.total} post{stats.total !== 1 ? 's' : ''}{stats.led > 0 ? ` · ${stats.led} led to action` : ''}
          </p>
          <div className="space-y-2">
            {entries.map(e => {
              const entryDay = format(new Date(e.created_at), 'EEE')
              return (
                <div key={e.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                    {e.platform && (
                      <span className="tag-btn text-white border-transparent text-[10px] py-0.5 px-2" style={{ backgroundColor: BRAND }}>{e.platform}</span>
                    )}
                    {e.funnel_stage && (
                      <span className="tag-btn text-[10px] py-0.5 px-2" style={{ backgroundColor: STAGE_COLORS[e.funnel_stage]?.bg || '#F5F0ED', color: '#1a1a1a', borderColor: STAGE_COLORS[e.funnel_stage]?.border || '#D8D0CA' }}>{e.funnel_stage}</span>
                    )}
                    {e.led_to_action && (
                      <span className="tag-btn text-[10px] py-0.5 px-2" style={{ backgroundColor: ACTION_COLORS[e.led_to_action]?.bg || '#F2F0EE', color: '#1a1a1a', borderColor: ACTION_COLORS[e.led_to_action]?.border || '#CEC8C2' }}>{e.led_to_action}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-medium shrink-0">{entryDay}</span>
                  <div className="flex gap-1 transition-opacity shrink-0">
                    <button onClick={() => { setEditId(e.id); setForm({ platform: e.platform||'', funnel_stage: e.funnel_stage||'', content_about: e.content_about||'', led_to_action: e.led_to_action||'', reflection: e.reflection||'' }) }} className="edit-btn"><EditIcon /></button>
                    <button onClick={() => handleDelete(e.id)} className="delete-btn"><DeleteIcon /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {entries.length === 0 && !loading && (
        <p className="text-sm text-gray-400 italic mt-2">No posts logged this week yet.</p>
      )}
    </div>
  )
}

/* ══════════════════ FUNNEL VIEW ══════════════════ */
const FUNNEL_CARDS = [
  { stage: 'Attract',  color: '#A86442', dot: '#A86442', bg: '#FAF1EB' },
  { stage: 'Nurture',  color: '#8A7A38', dot: '#8A7A38', bg: '#F7F3E6' },
  { stage: 'Position', color: '#6B2B3A', dot: '#6B2B3A', bg: '#F5ECEE' },
  { stage: 'Convert',  color: '#2A1519', dot: '#2A1519', bg: '#F2ECEC' },
]

const REVENUE_LEVELS = [
  { label: 'Under $3K/month', data: { Attract: 40, Nurture: 30, Position: 20, Convert: 10 } },
  { label: '$3K to $10K/month', data: { Attract: 30, Nurture: 30, Position: 20, Convert: 20 } },
  { label: '$10K+ per month', data: { Attract: 20, Nurture: 25, Position: 25, Convert: 30 } },
]

function FunnelView({ userId }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    supabase.from('content_tracker_entries').select('funnel_stage').eq('user_id', userId).eq('week_key', weekKey)
      .then(({ data }) => setEntries(data || []))
  }, [userId])

  const total = entries.length
  const counts = FUNNEL_STAGES.reduce((acc, s) => ({ ...acc, [s]: entries.filter(e => e.funnel_stage === s).length }), {})
  const pcts = FUNNEL_STAGES.reduce((acc, s) => ({ ...acc, [s]: total > 0 ? Math.round((counts[s] / total) * 100) : 0 }), {})

  const getInsight = () => {
    if (total === 0) return 'Start logging your content to get a pattern insight.'
    const top = Object.entries(pcts).sort((a, b) => b[1] - a[1])[0]
    const low = Object.entries(pcts).sort((a, b) => a[1] - b[1])[0]
    if (top[0] === 'Attract' && pcts.Convert < 15) return `Your content this week: Attract ${pcts.Attract}%, Convert ${pcts.Convert}%. Most people over-attract and under-convert. Consider adding more conversion content this week.`
    if (top[0] === 'Convert') return `You're heavy on Convert content (${pcts.Convert}%). Balance with more Attract content to keep feeding the top of your funnel.`
    return `This week your strongest funnel stage is ${top[0]} at ${top[1]}%. Your lowest is ${low[0]} at ${low[1]}%. Aim for intentional distribution.`
  }

  return (
    <div>
      {WEEKLY_RESET_NOTICE}

      <div className="grid grid-cols-4 gap-3 mb-5">
        {FUNNEL_CARDS.map(f => (
          <div key={f.stage} className="rounded-xl p-4 text-center border" style={{ backgroundColor: f.bg, borderColor: f.color + '40' }}>
            <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: f.dot }} />
            <p className="font-bold text-xs text-gray-900">{f.stage}</p>
            <p className="text-2xl font-black mt-1" style={{ color: f.color }}>{pcts[f.stage]}%</p>
            <p className="text-xs text-gray-500">{counts[f.stage]} post{counts[f.stage] !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      <div className="insight-box mb-6">
        <p className="font-bold text-xs mb-1">Pattern Insight ✦</p>
        <p>{getInsight()}</p>
      </div>

      {/* Revenue level reference */}
      <div>
        <p className="section-title text-sm mb-3">Content % by Revenue Level <span className="text-xs font-normal text-gray-400">(static reference — does not reset)</span></p>
        <div className="space-y-4">
          {REVENUE_LEVELS.map(level => (
            <div key={level.label} className="card">
              <p className="font-bold text-xs text-gray-700 mb-3">{level.label}</p>
              {Object.entries(level.data).map(([stage, pct]) => {
                const fc = FUNNEL_CARDS.find(f => f.stage === stage)
                return (
                  <div key={stage} className="flex items-center gap-3 mb-2">
                    <p className="w-20 text-xs text-gray-600">{stage}</p>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: fc?.dot || BRAND }} />
                    </div>
                    <p className="text-xs font-bold text-gray-700 w-8 text-right">{pct}%</p>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════ PAGE ══════════════════ */
const TABS = ['Content System', 'Content Tracker', 'Funnel View']

export default function Visibility() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Content System')

  return (
    <div className="space-y-0">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fcc799' }} />
          <h1 className="text-2xl font-black text-gray-900">Visibility</h1>
        </div>
        <p className="text-sm text-gray-500">
          How you show up: your content strategy, storytelling, and social presence that attracts and nurtures your audience.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: '#fff8f8' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors"
            style={tab === t
              ? { backgroundColor: '#6b1010', color: 'white' }
              : { backgroundColor: '#fff8f8', color: '#5a3a3c' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="card-section" style={{ marginTop: '16px' }}>
        {tab === 'Content System' && <ContentSystem userId={user.id} />}
        {tab === 'Content Tracker' && <ContentTracker userId={user.id} />}
        {tab === 'Funnel View' && <FunnelView userId={user.id} />}
      </div>
    </div>
  )
}
