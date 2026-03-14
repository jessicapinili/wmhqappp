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

  return (
    <div>
      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4 font-medium">
        ✓ Content System never resets — your framework stays here permanently.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {columns.map((col, idx) => {
          const isMyStory = idx === 3
          const colDef = COLUMN_DEFAULTS[idx]

          if (saved[idx] && !editing[idx]) {
            return (
              <div key={idx} className={`rounded-xl p-4 ${isMyStory ? 'text-white' : 'bg-white border border-gray-100'}`} style={isMyStory ? { backgroundColor: BRAND } : {}}>
                <p className={`font-black text-sm mb-3 ${isMyStory ? 'text-white' : 'text-gray-900'}`}>{col.theme_name || colDef.name}</p>
                <div className="space-y-2">
                  {col.topics.map((t, ti) => (
                    <p key={ti} className={`text-sm leading-relaxed ${isMyStory ? 'text-white/90' : 'text-gray-700'}`}>
                      <span className={`font-bold ${isMyStory ? 'text-white/60' : 'text-gray-400'}`}>{ti + 1}. </span>{t}
                    </p>
                  ))}
                </div>
                <button onClick={() => editColumn(idx)} className={`mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold ${isMyStory ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}>Edit</button>
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
              <button onClick={() => saveColumn(idx)} className="mt-2 btn-brand text-xs py-1.5 px-3 rounded-lg" style={{ backgroundColor: BRAND }}>Save Column</button>
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
  Attract:  { sel: '#B8804A', bg: '#FAF0E6', text: '#7A4E20', border: '#E5C49A' },
  Nurture:  { sel: '#6A9070', bg: '#EEF4EF', text: '#3E6645', border: '#B2CEBC' },
  Position: { sel: '#9A6070', bg: '#F5EEF0', text: '#6A3848', border: '#D8B4C0' },
  Convert:  { sel: '#607A8E', bg: '#EDF1F5', text: '#364E60', border: '#B4C4D2' },
}

// Action generated: distinct soft tones, cohesive with stage palette
const ACTION_COLORS = {
  'DM/Enquiry':       { sel: '#7A6898', bg: '#F0EEF8', text: '#4E3C6E', border: '#C8BEE0' },
  'Link Click':       { sel: '#4E8880', bg: '#ECF4F3', text: '#2E5E58', border: '#A8CCCA' },
  'Sale/Sign Up':     { sel: '#8E6848', bg: '#F5EEE6', text: '#5E3E22', border: '#D4B898' },
  'No Direct Action': { sel: '#7A7470', bg: '#F2F0EE', text: '#524E4A', border: '#CEC8C2' },
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
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border mb-5" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <span className="text-sm font-medium text-gray-700">Current week: {weekStart} – {weekEnd}</span>
        <span className="text-xs text-gray-400">Resets Sunday midnight</span>
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
                className={`tag-btn ${form.funnel_stage === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={form.funnel_stage === s ? { backgroundColor: STAGE_COLORS[s].sel, borderColor: STAGE_COLORS[s].sel } : {}}>{s}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Action Generated</label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map(a => (
              <button key={a} onClick={() => toggleField('led_to_action', a)}
                className={`tag-btn ${form.led_to_action === a ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={form.led_to_action === a ? { backgroundColor: ACTION_COLORS[a].sel, borderColor: ACTION_COLORS[a].sel } : {}}>{a}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {editId && (
            <button onClick={() => { setEditId(null); resetForm() }}
              className="py-2 px-4 rounded-lg border text-sm text-gray-600"
              style={{ borderColor: 'var(--card-border)' }}>Cancel</button>
          )}
          <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>Log post</button>
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
                      <span className="tag-btn text-[10px] py-0.5 px-2" style={{ backgroundColor: STAGE_COLORS[e.funnel_stage]?.bg || '#F5F0ED', color: STAGE_COLORS[e.funnel_stage]?.text || '#6B5A50', borderColor: STAGE_COLORS[e.funnel_stage]?.border || '#D8D0CA' }}>{e.funnel_stage}</span>
                    )}
                    {e.led_to_action && (
                      <span className="tag-btn text-[10px] py-0.5 px-2" style={{ backgroundColor: ACTION_COLORS[e.led_to_action]?.bg || '#F2F0EE', color: ACTION_COLORS[e.led_to_action]?.text || '#524E4A', borderColor: ACTION_COLORS[e.led_to_action]?.border || '#CEC8C2' }}>{e.led_to_action}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-medium shrink-0">{entryDay}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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

/* ══════════════════ VISIBILITY BLOCKS ══════════════════ */
const BLOCKS = [
  { key: 'judged', label: 'Fear of being judged', insight: 'Visibility fear is rarely about content. It is about identity. Head to your Identity pillar and revisit your self-concept work.' },
  { key: 'imposter', label: 'Imposter syndrome', insight: 'Imposter syndrome is your nervous system protecting an old identity. The real you already has the answers.' },
  { key: 'perfectionism', label: 'Perfectionism holding me back', insight: 'Perfectionism is the most socially acceptable form of self-sabotage. Done beats perfect every time.' },
  { key: 'notsure', label: 'Not sure what to say', insight: 'When you\'re not sure what to say, go back to your buyer psychology. Speak to one pain. One desire. That\'s enough.' },
  { key: 'worried', label: 'Worried about what people think', insight: 'People are thinking about themselves far more than they\'re thinking about you. Show up anyway.' },
  { key: 'inconsistent', label: 'Feeling inconsistent / no momentum', insight: 'Momentum isn\'t a feeling — it\'s a decision. One post. Then another. That\'s how it starts.' },
  { key: 'comparison', label: 'Comparison spiral', insight: 'Comparison is your subconscious pointing to an unlived desire. Use it as data, not evidence of inadequacy.' },
  { key: 'tired', label: 'Tired / capacity issue', insight: 'Rest is not optional at the higher levels. Your nervous system needs recovery to hold more.' },
  { key: 'showed', label: 'Nothing, I showed up fully', insight: 'That\'s the energy. Keep going. Consistency compounds.' },
]

function VisibilityBlocks({ userId }) {
  const [selected, setSelected] = useState([])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('visibility_blocks_entries').select('*').eq('user_id', userId).eq('week_key', weekKey).single()
      .then(({ data }) => { if (data) { setSelected(data.selected_blocks || []); setNotes(data.notes || ''); setSaved(true) } })
  }, [userId])

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
    setSaved(false)
  }

  const handleLog = async () => {
    await supabase.from('visibility_blocks_entries').upsert(
      { user_id: userId, week_key: weekKey, selected_blocks: selected, notes },
      { onConflict: 'user_id,week_key' }
    )
    setSaved(true)
  }

  const activeInsights = BLOCKS.filter(b => selected.includes(b.key) && b.insight)

  return (
    <div>
      {WEEKLY_RESET_NOTICE}

      <p className="text-sm font-semibold text-gray-700 mb-3">
        Visibility Blocks Check-in — What's stopping you from showing up fully right now? Select all that apply.
      </p>

      <div className="space-y-2 mb-4">
        {BLOCKS.map(b => (
          <label key={b.key}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${selected.includes(b.key) ? 'border-brand/40 text-white' : 'border-gray-100 bg-white hover:bg-gray-50 text-gray-700'}`}
            style={selected.includes(b.key) ? { backgroundColor: BRAND } : {}}
          >
            <input type="checkbox" checked={selected.includes(b.key)} onChange={() => toggle(b.key)} className="flex-shrink-0" style={{ accentColor: selected.includes(b.key) ? 'white' : BRAND }} />
            <span className="text-sm font-medium">{b.label}</span>
          </label>
        ))}
      </div>

      {activeInsights.length > 0 && (
        <div className="space-y-2 mb-4">
          {activeInsights.map(b => (
            <div key={b.key} className="insight-box">
              <p className="font-semibold text-xs mb-1">WMHQ Insight ✦</p>
              <p>{b.insight}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <label className="label">Add a Note</label>
        <textarea className="textarea-field" rows={3} value={notes} onChange={e => { setNotes(e.target.value); setSaved(false) }} placeholder="What's coming up for you this week around visibility?" />
      </div>

      <button onClick={handleLog} className="btn-brand" style={{ backgroundColor: BRAND }}>
        {saved ? '✓ Saved' : 'Log Entry'}
      </button>
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
const TABS = ['Content System', 'Content Tracker', 'Visibility Blocks', 'Funnel View']

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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="card-section">
        {tab === 'Content System' && <ContentSystem userId={user.id} />}
        {tab === 'Content Tracker' && <ContentTracker userId={user.id} />}
        {tab === 'Visibility Blocks' && <VisibilityBlocks userId={user.id} />}
        {tab === 'Funnel View' && <FunnelView userId={user.id} />}
      </div>
    </div>
  )
}
