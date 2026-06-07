import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EditIcon } from '../lib/icons'

const BRAND = '#3d0c0c'
const NAME_MAX = 40
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
function LinkRow({ link, onOpen, onEdit }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8' }}>
      <p className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: '#1a0606' }}>{link.name}</p>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: BRAND, color: '#f5ece0' }}
        title="Open in a new tab"
      >
        Open <ExternalIcon />
      </button>
      <button onClick={onEdit} className="edit-btn flex-shrink-0"><EditIcon /></button>
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
    const sameSide = links.filter(l => l.side === vals.side)
    const sort_order = sameSide.length
    const { data: row } = await supabase.from('quick_links')
      .insert({ user_id: user.id, ...vals, sort_order }).select().single()
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

  if (!loaded) return null

  const bySide = (side) => links
    .filter(l => l.side === side)
    .sort((a, b) => (a.sort_order - b.sort_order) || (new Date(a.created_at) - new Date(b.created_at)))

  const renderColumn = (side, label) => {
    const list = bySide(side)
    return (
      <div>
        <p className="label" style={{ marginBottom: 12 }}>{label}</p>
        <div className="space-y-2.5">
          {list.map(link => (
            editingId === link.id ? (
              <LinkForm
                key={link.id}
                initial={link}
                onSave={(vals) => saveEdit(link.id, vals)}
                onCancel={() => setEditingId(null)}
                onDelete={() => deleteLink(link.id)}
              />
            ) : (
              <LinkRow
                key={link.id}
                link={link}
                onOpen={() => openLink(link.url)}
                onEdit={() => { setEditingId(link.id); setAdding(false) }}
              />
            )
          ))}
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

      {/* Add link */}
      <div>
        {adding ? (
          <LinkForm onSave={saveAdd} onCancel={() => setAdding(false)} />
        ) : (
          <button onClick={() => { setAdding(true); setEditingId(null) }} className="btn-brand">
            + Add link
          </button>
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
