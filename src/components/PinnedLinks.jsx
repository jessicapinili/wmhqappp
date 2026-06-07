import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function LinkGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function Favicon({ url, size = 16 }) {
  const [err, setErr] = useState(false)
  let domain = ''
  try { domain = new URL(url).hostname } catch { /* ignore */ }
  if (err || !domain) {
    return (
      <span className="flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, color: '#b8a898' }}>
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

export default function PinnedLinks({ userId }) {
  const [links, setLinks] = useState([])

  useEffect(() => {
    if (!userId) return
    let active = true
    supabase.from('quick_links').select('*').eq('user_id', userId).eq('pinned', true)
      .order('sort_order').order('created_at')
      .then(({ data }) => { if (active) setLinks(data || []) })
    return () => { active = false }
  }, [userId])

  if (links.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {links.map(l => (
        <button
          key={l.id}
          onClick={() => window.open(l.url, '_blank', 'noopener,noreferrer')}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: '#faf7f5', border: '0.5px solid #e8e0d8', color: '#1a0606' }}
          title="Open in a new tab"
        >
          <Favicon url={l.url} />
          {l.name}
        </button>
      ))}
    </div>
  )
}
