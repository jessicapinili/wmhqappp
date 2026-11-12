import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { EditIcon, DeleteIcon } from '../lib/icons'

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
  const [copied, setCopied] = useState(false)
  const copyAll = async () => {
    const text = entries.map(e => `• ${e.body}`).join('\n')
    if (!text) return
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
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
        <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-1">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: '#b8a898' }}>
            <MoonIcon />
            Clears at midnight · {hrs}h {mins}m
          </span>
          {entries.length > 0 && (
            <button type="button" onClick={copyAll} className="text-[10px] font-semibold hover:underline" style={{ color: copied ? '#6b8f5a' : '#9c7070', textUnderlineOffset: '2px' }}
              title="Copy everything as dot points">
              {copied ? '✓ Copied as dot points' : '⧉ Copy all'}
            </button>
          )}
        </div>
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
      </div>

      {/* Tally */}
      <p className="text-[11px] mt-2" style={{ color: '#b8a898' }}>
        {total} {total === 1 ? 'thought' : 'thoughts'} out of your head · {doneCount} dealt with
      </p>

      {/* Pile */}
      <div className="mt-4">
        {total === 0 ? (
          <p className="text-sm italic" style={{ fontFamily: "'Manrope', system-ui, sans-serif", color: '#b8a898' }}>
            Clear head. Nothing in the pile.
          </p>
        ) : (
          <ul style={{ borderTop: '1px solid #f3ece8' }}>
            {entries.map(e => {
              const isFresh = freshIds.current.has(e.id)
              if (editingId === e.id) {
                return (
                  <li key={e.id} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid #f3ece8' }}>
                    <input
                      className="input-field flex-1"
                      value={editDraft}
                      maxLength={BODY_MAX}
                      autoFocus
                      onChange={ev => setEditDraft(ev.target.value)}
                      onKeyDown={ev => { if (ev.key === 'Enter') saveEdit(e.id); if (ev.key === 'Escape') { setEditingId(null); setEditDraft('') } }}
                    />
                    <button onClick={() => { setEditingId(null); setEditDraft('') }} className="btn-cancel flex-shrink-0">Cancel</button>
                    <button onClick={() => saveEdit(e.id)} className="btn-brand flex-shrink-0" disabled={!editDraft.trim()}>Save</button>
                  </li>
                )
              }
              return (
                <li key={e.id} className="group flex items-center gap-3 py-2.5"
                  style={{ borderBottom: '1px solid #f3ece8', animation: isFresh ? 'bdDropIn 0.3s ease' : 'none' }}>
                  <button type="button" onClick={() => toggleDone(e.id)}
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ width: 18, height: 18, border: `1.5px solid ${e.done ? BRAND : '#d8cfc6'}`, backgroundColor: e.done ? BRAND : 'transparent', color: '#f5ece0', fontSize: '10px' }}
                    title={e.done ? 'Mark not dealt with' : 'Mark dealt with'}>
                    {e.done ? '✓' : ''}
                  </button>
                  <span className="flex-1 min-w-0" style={{ fontSize: '13.5px', color: BRAND, lineHeight: 1.45, textDecoration: e.done ? 'line-through' : 'none', opacity: e.done ? 0.5 : 1 }}>
                    {e.body}
                  </span>
                  <div className="flex gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => openEditor(e)} className="edit-btn" title="Edit"><EditIcon /></button>
                    <button type="button" onClick={() => deleteEntry(e.id)} className="delete-btn" title="Delete"><DeleteIcon /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
