import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EditIcon } from '../lib/icons'

const BRAND = '#3d0c0c'
const NAME_MAX = 40
const MAX_PINNED = 3
const SIDES = [
  { key: 'business', label: 'Business' },
  { key: 'personal', label: 'Personal' },
]

/* ── Inline icons (scoped) ── */
function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
function LinkGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function PinIcon({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5.76a2 2 0 0 0 .59 1.42L18 14H6l2.41-1.82A2 2 0 0 0 9 10.76z" />
    </svg>
  )
}

/* ── Favicon (fetched at render, neutral fallback on failure) ── */
function Favicon({ url, size = 16 }) {
  const [err, setErr] = useState(false)
  let domain = ''
  try { domain = new URL(url).hostname } catch { /* ignore */ }
  if (err || !domain) {
    return (
      <span className="flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size, color: '#b8a898' }}>
        <LinkGlyph />
      </span>
    )
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="flex-shrink-0"
      style={{ borderRadius: 3 }}
      onError={() => setErr(true)}
    />
  )
}

/* ── Normalise + validate a URL ── */
function normaliseUrl(raw) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes('.')) return null
    return withScheme
  } catch {
    return null
  }
}

/* ── Add / edit form ── */
function LinkForm({ initial, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(initial?.name || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [side, setSide] = useState(initial?.side || 'business')

  const save = () => {
    if (!name.trim()) return
    const clean = normaliseUrl(url)
    if (!clean) { alert('Please enter a valid link, for example https://example.com'); return }
    onSave({ name: name.trim().slice(0, NAME_MAX), url: clean, side })
  }

  return (
    <div className="form-card space-y-4">
      <div>
        <label className="label">Name</label>
        <input className="input-field" value={name} maxLength={NAME_MAX}
          onChange={e => setName(e.target.value)} placeholder="e.g. Stripe dashboard" autoFocus />
      </div>
      <div>
        <label className="label">Link</label>
        <input className="input-field" value={url}
          onChange={e => setUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <label className="label">Business or personal</label>
        <div className="flex gap-2">
          {SIDES.map(s => {
            const on = side === s.key
            return (
              <button key={s.key} onClick={() => setSide(s.key)} className="tag-btn"
                style={on
                  ? { backgroundColor: BRAND, color: '#f5ece0', borderColor: BRAND }
                  : { backgroundColor: '#faf7f3', color: '#b8a898', borderColor: '#e8e0d8' }}>
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button onClick={onDelete} className="text-xs font-semibold px-3 py-2 rounded" style={{ color: '#9c3034' }}>Delete</button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-brand-outline">Cancel</button>
          <button onClick={save} className="btn-brand" disabled={!name.trim()}>Save link</button>
        </div>
      </div>
    </div>
  )
}

/* ── Link row ── */
function LinkRow({ link, dragging, onOpen, onTogglePin, onEdit, onGrip }) {
  const [copied, setCopied] = useState(false)
  const doCopy = () => {
    try { navigator.clipboard?.writeText(link.url) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className="rounded-xl px-3 py-3 flex items-center gap-2.5"
      style={{ backgroundColor: dragging ? '#f3ece6' : '#faf7f5', border: '0.5px solid #e8e0d8' }}>
      <button onPointerDown={onGrip} className="flex-shrink-0 cursor-grab" style={{ color: '#c4b5af', touchAction: 'none' }} title="Drag to reorder">
        <GripIcon />
      </button>
      <Favicon url={link.url} />
      <p className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: '#1a0606' }}>{link.name}</p>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: BRAND, color: '#f5ece0' }}
        title="Open in a new tab"
      >
        Open <ExternalIcon />
      </button>
      <button onClick={onTogglePin} className="edit-btn flex-shrink-0" title={link.pinned ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
        style={link.pinned ? { color: BRAND } : undefined}>
        <PinIcon filled={!!link.pinned} />
      </button>
      <button onClick={doCopy} className="edit-btn flex-shrink-0" title="Copy link">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <button onClick={onEdit} className="edit-btn flex-shrink-0" title="Edit"><EditIcon /></button>
    </div>
  )
}

/* ── Page ── */
export default function QuickLinks() {
  const { user } = useAuth()
  const [links, setLinks] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [pinMsg, setPinMsg] = useState('')

  const [dragId, setDragId] = useState(null)
  const dragIdRef = useRef(null)
  const dragSideRef = useRef(null)
  const rowRefs = useRef({})
  const listsRef = useRef({ business: [], personal: [] })

  useEffect(() => {
    if (!user?.id) return
    let active = true
    supabase.from('quick_links').select('*').eq('user_id', user.id)
      .order('sort_order').order('created_at')
      .then(({ data }) => { if (active) { setLinks(data || []); setLoaded(true) } })
    return () => { active = false }
  }, [user?.id])

  const openLink = (url) => { window.open(url, '_blank', 'noopener,noreferrer') }

  const saveAdd = async (vals) => {
    const sort_order = links.filter(l => l.side === vals.side).length
    const { data: row } = await supabase.from('quick_links')
      .insert({ user_id: user.id, ...vals, sort_order, pinned: false }).select().single()
    if (row) setLinks(prev => [...prev, row])
    setAdding(false)
  }

  const saveEdit = async (id, vals) => {
    const { data: row } = await supabase.from('quick_links')
      .update({ name: vals.name, url: vals.url, side: vals.side }).eq('id', id).select().single()
    if (row) setLinks(prev => prev.map(l => l.id === id ? row : l))
    setEditingId(null)
  }

  const deleteLink = async (id) => {
    if (!window.confirm('Delete this link? This cannot be undone.')) return
    await supabase.from('quick_links').delete().eq('id', id)
    setLinks(prev => prev.filter(l => l.id !== id))
    setEditingId(null)
  }

  const pinnedCount = links.filter(l => l.pinned).length
  const togglePin = async (link) => {
    if (!link.pinned && pinnedCount >= MAX_PINNED) {
      setPinMsg(`You can pin up to ${MAX_PINNED} links at one time`)
      setTimeout(() => setPinMsg(''), 2500)
      return
    }
    const next = !link.pinned
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, pinned: next } : l))
    await supabase.from('quick_links').update({ pinned: next }).eq('id', link.id)
  }

  /* ── Drag (pointer based, within a column only) ── */
  const onGripMove = useCallback((e) => {
    if (dragIdRef.current == null) return
    e.preventDefault()
    const order = listsRef.current[dragSideRef.current] || []
    const y = e.clientY
    let target = order.length - 1
    for (let i = 0; i < order.length; i++) {
      const node = rowRefs.current[order[i].id]
      if (!node) continue
      const r = node.getBoundingClientRect()
      if (y < r.top + r.height / 2) { target = i; break }
    }
    const from = order.findIndex(o => o.id === dragIdRef.current)
    if (from === -1 || from === target) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(target, 0, moved)
    const sortById = {}
    next.forEach((l, i) => { sortById[l.id] = i })
    setLinks(prev => prev.map(l => sortById[l.id] != null ? { ...l, sort_order: sortById[l.id] } : l))
  }, [])

  const onGripUp = useCallback(() => {
    if (dragIdRef.current == null) return
    window.removeEventListener('pointermove', onGripMove)
    window.removeEventListener('pointerup', onGripUp)
    const ordered = listsRef.current[dragSideRef.current] || []
    dragIdRef.current = null
    dragSideRef.current = null
    setDragId(null)
    Promise.all(ordered.map((l, i) =>
      supabase.from('quick_links').update({ sort_order: i }).eq('id', l.id)
    )).catch(err => console.error('Failed to persist order:', err))
  }, [onGripMove])

  const onGrip = useCallback((e, link) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    dragIdRef.current = link.id
    dragSideRef.current = link.side
    setDragId(link.id)
    window.addEventListener('pointermove', onGripMove, { passive: false })
    window.addEventListener('pointerup', onGripUp)
  }, [onGripMove, onGripUp])

  useEffect(() => () => {
    window.removeEventListener('pointermove', onGripMove)
    window.removeEventListener('pointerup', onGripUp)
  }, [onGripMove, onGripUp])

  if (!loaded) return null

  const bySide = (side) => links
    .filter(l => l.side === side)
    .sort((a, b) => (a.sort_order - b.sort_order) || (new Date(a.created_at) - new Date(b.created_at)))

  const renderColumn = (side, label) => {
    const list = bySide(side)
    listsRef.current[side] = list
    return (
      <div>
        <p className="label" style={{ marginBottom: 12 }}>{label}</p>
        <div className="space-y-2.5">
          {list.map(link => {
            const setRef = (el) => { if (el) rowRefs.current[link.id] = el; else delete rowRefs.current[link.id] }
            return (
              <div key={link.id} ref={setRef}>
                {editingId === link.id ? (
                  <LinkForm
                    initial={link}
                    onSave={(vals) => saveEdit(link.id, vals)}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => deleteLink(link.id)}
                  />
                ) : (
                  <LinkRow
                    link={link}
                    dragging={dragId === link.id}
                    onOpen={() => openLink(link.url)}
                    onTogglePin={() => togglePin(link)}
                    onEdit={() => { setEditingId(link.id); setAdding(false) }}
                    onGrip={(e) => onGrip(e, link)}
                  />
                )}
              </div>
            )
          })}
          {list.length === 0 && (
            <p className="text-sm italic" style={{ color: '#b8a898' }}>No links yet.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Quick Links</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your most-used links, one tap away. Add, rename, or remove them anytime.</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold flex-shrink-0 mt-1" style={{ color: '#b8a898' }}>
          <LockIcon />
          Only you can see these
        </span>
      </div>

      {/* Pin announcement */}
      <div style={{ backgroundColor: '#fdf8f5', border: '0.5px solid rgba(240,208,208,0.5)', borderLeft: '2px solid rgba(240,208,208,0.7)', borderRadius: '4px', padding: '13px 16px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '11px', fontWeight: 300, color: '#3d0c0c' }}>
        ✦ You can pin up to {MAX_PINNED} links to your Dashboard for one-tap access. Tap the pin on any link.
      </div>

      {/* Add link */}
      <div>
        {adding ? (
          <LinkForm onSave={saveAdd} onCancel={() => setAdding(false)} />
        ) : (
          <button onClick={() => { setAdding(true); setEditingId(null) }} className="btn-brand">
            + Add link
          </button>
        )}
        {pinMsg && (
          <p className="text-xs mt-2" style={{ color: BRAND }}>{pinMsg}</p>
        )}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {renderColumn('business', 'Business')}
        {renderColumn('personal', 'Personal')}
      </div>
    </div>
  )
}
