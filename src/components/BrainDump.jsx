import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { EditIcon } from '../lib/icons'

const BRAND = '#3d0c0c'
const BODY_MAX = 120

const PLACEHOLDERS = [
  "What's circling up there?",
  'Say it, drop it, move on',
  'What woke you up at 3am?',
  'Park a thought here',
  "What's louder than it should be?",
  'Unfinished sentence? Drop it',
  'What are you carrying for no reason?',
]

// Soft tints cycle through the app's existing phase colors.
const TINTS = [
  { bg: '#c6def2', text: '#1e4d78' }, // influence
  { bg: '#fcc799', text: '#7a3c0a' }, // visibility
  { bg: '#cdd5ae', text: '#3d4a1c' }, // cash
  { bg: '#e7cee3', text: '#5a2d58' }, // identity
]

// Deterministic slight rotation per slip position (roughly -2 to +2 degrees).
const ROTS = [-2, 1.5, -1, 2, -1.5, 1, -0.5, 0.5]

const localDateStr = () => format(new Date(), 'yyyy-MM-dd')

function msToMidnight() {
  const now = new Date()
  const mid = new Date(now)
  mid.setHours(24, 0, 0, 0)
  return mid - now
}

function MoonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function BrainDump({ userId }) {
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadDate, setLoadDate] = useState(localDateStr())
  const [input, setInput] = useState('')
  const [phIdx, setPhIdx] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [hoverId, setHoverId] = useState(null)
  const [, setTick] = useState(0)
  const freshIds = useRef(new Set())

  /* Load today's entries only */
  useEffect(() => {
    if (!userId) return
    let active = true
    const load = async () => {
      const today = localDateStr()
      const { data } = await supabase
        .from('brain_dump_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('local_date', today)
        .order('created_at')
      if (!active) return
      setEntries(data || [])
      setLoadDate(today)
      setLoaded(true)
    }
    load()
    return () => { active = false }
  }, [userId])

  /* Live countdown + midnight rollover while the app stays open */
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      const today = localDateStr()
      if (today !== loadDate) {
        setEntries([])
        setLoadDate(today)
        freshIds.current.clear()
      }
    }, 60000)
    return () => clearInterval(id)
  }, [loadDate])

  const ms = msToMidnight()
  const hrs = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)

  const add = async () => {
    const body = input.trim().slice(0, BODY_MAX)
    if (!body) return
    const payload = {
      user_id: userId,
      body,
      local_date: localDateStr(),
      tz_offset_minutes: new Date().getTimezoneOffset(),
      done: false,
    }
    const { data, error } = await supabase.from('brain_dump_entries').insert(payload).select().single()
    if (error || !data) { console.error('Failed to add brain dump:', error); return }
    freshIds.current.add(data.id)
    setEntries(prev => [...prev, data])
    setInput('')
    setPhIdx(i => (i + 1) % PLACEHOLDERS.length)
  }

  const toggleDone = async (id) => {
    const e = entries.find(x => x.id === id)
    if (!e) return
    const next = !e.done
    setEntries(prev => prev.map(x => x.id === id ? { ...x, done: next } : x))
    await supabase.from('brain_dump_entries').update({ done: next }).eq('id', id)
  }

  const toggleEditMode = () => {
    setEditMode(m => {
      const next = !m
      if (!next) { setEditingId(null); setEditDraft('') }
      return next
    })
  }

  const openEditor = (e) => { setEditingId(e.id); setEditDraft(e.body) }

  const saveEdit = async (id) => {
    const body = editDraft.trim().slice(0, BODY_MAX)
    if (!body) return
    setEntries(prev => prev.map(x => x.id === id ? { ...x, body } : x))
    setEditingId(null); setEditDraft(''); setEditMode(false)
    await supabase.from('brain_dump_entries').update({ body }).eq('id', id)
  }

  const deleteEntry = async (id) => {
    setEntries(prev => prev.filter(x => x.id !== id))
    setEditingId(null); setEditDraft(''); setEditMode(false)
    await supabase.from('brain_dump_entries').delete().eq('id', id)
  }

  if (!loaded) return null

  const total = entries.length
  const doneCount = entries.filter(e => e.done).length

  return (
    <div className="card-section">
      <style>{`
        @keyframes bdDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="section-title">Brain dump</h2>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold flex-shrink-0 mt-1" style={{ color: '#b8a898' }}>
          <MoonIcon />
          Clears at midnight · {hrs}h {mins}m
        </span>
      </div>
      <p className="section-subtitle">Get it out of your head so it stops taking up space. Gone by morning.</p>

      {/* Input row */}
      <div className="flex gap-2 items-center">
        <input
          className="input-field"
          value={input}
          maxLength={BODY_MAX}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={PLACEHOLDERS[phIdx]}
        />
        <button onClick={add} className="btn-brand flex-shrink-0" disabled={!input.trim()}>Dump it</button>
        <button
          onClick={toggleEditMode}
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 36, height: 36, borderRadius: 4,
            color: editMode ? '#f5ece0' : '#b8a898',
            backgroundColor: editMode ? BRAND : 'transparent',
            border: editMode ? 'none' : '0.5px solid #e8e0d8',
          }}
          title={editMode ? 'Exit edit mode' : 'Edit entries'}
        >
          <EditIcon />
        </button>
      </div>

      {/* Tally */}
      <p className="text-[11px] mt-2" style={{ color: '#b8a898' }}>
        {total} {total === 1 ? 'thought' : 'thoughts'} out of your head · {doneCount} dealt with
      </p>

      {/* Edit mode hint */}
      {editMode && (
        <p className="text-[11px] mt-2" style={{ color: BRAND }}>
          Edit mode: tap the slip you want to change. Tap the pencil again to exit.
        </p>
      )}

      {/* Pile */}
      <div className="mt-4">
        {total === 0 ? (
          <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#b8a898' }}>
            Clear head. Nothing in the pile.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {entries.map((e, i) => {
              const tint = TINTS[i % TINTS.length]
              const rot = ROTS[i % ROTS.length]
              const isFresh = freshIds.current.has(e.id)

              if (editMode && editingId === e.id) {
                return (
                  <div key={e.id} className="form-card w-full space-y-3" style={{ padding: '14px 16px' }}>
                    <input
                      className="input-field"
                      value={editDraft}
                      maxLength={BODY_MAX}
                      autoFocus
                      onChange={ev => setEditDraft(ev.target.value)}
                      onKeyDown={ev => { if (ev.key === 'Enter') saveEdit(e.id) }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => deleteEntry(e.id)} className="text-xs font-semibold px-3 py-2 rounded" style={{ color: '#9c3034' }}>Delete</button>
                      <button onClick={() => saveEdit(e.id)} className="btn-brand" disabled={!editDraft.trim()}>Save</button>
                    </div>
                  </div>
                )
              }

              const raised = editMode && hoverId === e.id
              const opacity = editMode ? (raised ? 1 : 0.45) : (e.done ? 0.45 : 1)
              return (
                <span
                  key={e.id}
                  style={{ display: 'inline-block', animation: isFresh ? 'bdDropIn 0.3s ease' : 'none' }}
                >
                  <button
                    onClick={() => (editMode ? openEditor(e) : toggleDone(e.id))}
                    onMouseEnter={() => setHoverId(e.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(e.id)}
                    onBlur={() => setHoverId(null)}
                    className="text-xs"
                    style={{
                      transform: `rotate(${rot}deg)`,
                      backgroundColor: tint.bg,
                      color: tint.text,
                      opacity,
                      padding: '7px 13px',
                      borderRadius: 999,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      maxWidth: 320,
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      outline: raised ? `1.5px solid ${BRAND}` : 'none',
                      textDecoration: (!editMode && e.done) ? 'line-through' : 'none',
                      transition: 'opacity 0.15s ease',
                    }}
                    title={editMode ? 'Tap to edit' : (e.done ? 'Tap to undo' : 'Tap when dealt with')}
                  >
                    {e.body}
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
