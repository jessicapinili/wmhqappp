import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentQuarter } from '../lib/utils'
import { EditIcon, DeleteIcon } from '../lib/icons'

/*
  Your Focus. Saves to focus_items / focus_settings (migration 021).
  The first time a member opens it, her existing business_focus / life_focus rows
  are copied in once (the old tables are left untouched).
*/

const BRAND = '#3d0c0c'
const MUTED = '#b8a898'
const LIFE_AREAS = ['Health', 'Relationships', 'Family', 'Finances', 'Home', 'Rest', 'Hobbies', 'Travel', 'Personal growth']
const TRACK = [
  { key: 'check', label: 'Tick off when done' },
  { key: 'percent', label: '% progress' },
  { key: 'number', label: 'Number target' },
]
const uid = () => Math.random().toString(36).slice(2, 10)
const num = v => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0 }
const monthLabel = () => `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} · ${getCurrentQuarter()}`

function pct(f) {
  if (f.track === 'check') return f.done ? 100 : 0
  if (f.track === 'percent') return Math.max(0, Math.min(100, num(f.percent)))
  return num(f.target) > 0 ? Math.max(0, Math.min(100, Math.round((num(f.current) / num(f.target)) * 100))) : 0
}
const isFinished = f => f.status === 'completed' || f.status === 'not_completed'
const STATUS_STYLE = {
  active: { label: 'In progress', bg: '#fdf3d1', edge: '#e8cf7f' },
  completed: { label: 'Completed', bg: '#e2ecdc', edge: '#a9c39a' },
  not_completed: { label: 'Not completed', bg: '#f8dcd8', edge: '#dfa59d' },
}

async function importOldFocuses(userId) {
  const [bizRes, lifeRes] = await Promise.all([
    supabase.from('business_focus').select('*').eq('user_id', userId),
    supabase.from('life_focus').select('*').eq('user_id', userId).order('created_at'),
  ])
  if (bizRes.error || lifeRes.error) throw new Error('Could not read existing focuses')
  const biz = (bizRes.data || []).map(row => {
    const d = row.data || {}
    const target = num(d.target ?? d.revenueGoal ?? d.targetNumber ?? d.targetRevenue)
    const status = d.manual_status || (d.status === 'Completed' ? 'completed' : 'active')
    return {
      user_id: userId, kind: 'business',
      title: String(d.title ?? d.offer ?? d.visibilityFocus ?? d.revenueFocusType ?? 'Untitled focus').slice(0, 500) || 'Untitled focus',
      goals: String(d.lever ?? d.primaryLever ?? '').slice(0, 5000), area: '',
      track: target > 0 ? 'number' : 'check', current: num(d.current ?? d.currentNumber ?? d.currentRevenue), target,
      unit: '', percent: 0, status: ['active', 'completed', 'not_completed'].includes(status) ? status : 'active',
      created_at: row.created_at,
    }
  })
  const life = (lifeRes.data || []).map(row => ({
    user_id: userId, kind: 'life',
    title: String(row.notes || (row.areas || []).join(', ') || 'Life focus').slice(0, 500),
    goals: '', area: String((row.areas || [])[0] || '').slice(0, 60), track: 'check', current: 0, target: 0,
    unit: '', percent: 0, status: row.done ? 'completed' : 'active', created_at: row.created_at,
  }))
  return [...biz, ...life]
}
const fromRow = r => ({ ...r, current: num(r.current), target: num(r.target), percent: num(r.percent), done: r.status === 'completed' })
const toRow = f => ({
  kind: f.kind, title: f.title, goals: f.goals || '', area: f.area || '', track: f.track,
  current: num(f.current), target: num(f.target), unit: f.unit || '', percent: Math.max(0, Math.min(100, num(f.percent))),
  status: f.status, updated_at: new Date().toISOString(),
})

/* ── Add / edit form ── */
function FocusForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { kind: '', title: '', goals: '', area: '', track: 'check', current: 0, target: '', unit: '', percent: 0, done: false, status: 'active' })
  const up = p => setF(x => ({ ...x, ...p }))
  const box = { backgroundColor: '#faf7f3', border: '0.5px solid #e8e0d8', borderRadius: '6px', padding: '9px 12px', fontSize: '13px', color: BRAND }
  const pill = on => ({ fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '999px', border: `1px solid ${on ? BRAND : 'rgba(61,12,12,0.15)'}`, backgroundColor: on ? BRAND : '#fff', color: on ? '#f5ece0' : BRAND })
  const ok = f.kind && f.title.trim() && (f.kind !== 'life' || f.area)
  return (
    <div className="space-y-4 p-4" style={{ border: '1px solid #ede6e1', borderRadius: '10px', backgroundColor: '#fff' }}>
      {!initial && (
        <div>
          <label className="label mb-2 block">What kind of focus?</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => up({ kind: 'business' })} style={pill(f.kind === 'business')}>Business</button>
            <button type="button" onClick={() => up({ kind: 'life' })} style={pill(f.kind === 'life')}>Life</button>
          </div>
        </div>
      )}

      {f.kind === 'life' && (
        <div>
          <label className="label mb-2 block">Which area of life?</label>
          <select value={f.area} onChange={e => up({ area: e.target.value })} style={{ ...box, width: '100%', maxWidth: '280px' }}>
            <option value="" disabled>Choose an area…</option>
            {LIFE_AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      )}

      {f.kind && (
        <>
          <div>
            <label className="label mb-2 block">{f.kind === 'business' ? 'What’s the focus?' : 'What’s your focus here?'}</label>
            <input value={f.title} onChange={e => up({ title: e.target.value })} className="textarea-field"
              placeholder={f.kind === 'business' ? 'e.g. Launch my new group program' : 'e.g. Move my body 4 times a week'} />
          </div>
          <div>
            <label className="label mb-2 block">Goals <span style={{ color: MUTED, fontWeight: 400 }}>(optional)</span></label>
            <textarea value={f.goals} onChange={e => up({ goals: e.target.value })} rows={3} className="textarea-field"
              placeholder="What does success look like? Write out the goals, steps or details." />
          </div>
          <div>
            <label className="label mb-2 block">How do you want to track it?</label>
            <select value={f.track} onChange={e => up({ track: e.target.value })} style={{ ...box, width: '100%', maxWidth: '280px' }}>
              {TRACK.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {f.track === 'number' && (
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs" style={{ color: BRAND }}>
                <span>Target</span>
                <input type="number" min="0" value={f.target} onChange={e => up({ target: e.target.value })} className="textarea-field" style={{ width: '100px' }} placeholder="10" />
                <input value={f.unit} onChange={e => up({ unit: e.target.value })} className="textarea-field" style={{ width: '160px' }} placeholder="e.g. sales calls" />
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
        <button type="button" disabled={!ok} onClick={() => onSave({ ...f, title: f.title.trim(), goals: f.goals.trim() })} className="btn-brand" style={{ opacity: ok ? 1 : 0.5 }}>
          {initial ? 'Save focus' : 'Add focus'}
        </button>
      </div>
    </div>
  )
}

/* ── One focus ── */
function Tracker({ f, onChange }) {
  if (f.track === 'check') {
    return (
      <button type="button" onClick={() => onChange({ done: !f.done, status: !f.done ? 'completed' : 'active' })}
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 20, height: 20, border: `1.5px solid ${f.done ? BRAND : '#d8cfc6'}`, backgroundColor: f.done ? BRAND : 'transparent', color: '#f5ece0', fontSize: '11px' }}
        title={f.done ? 'Mark not done' : 'Mark done'}>{f.done ? '✓' : ''}</button>
    )
  }
  if (f.track === 'percent') {
    return (
      <div className="flex items-center gap-2 w-full">
        <input type="range" min="0" max="100" step="5" value={pct(f)} onChange={e => onChange({ percent: Number(e.target.value) })}
          className="flex-1 capacity-slider" style={{ background: `linear-gradient(to right, ${BRAND} ${pct(f)}%, #f0e0e0 ${pct(f)}%)` }} />
        <span className="text-xs" style={{ fontWeight: 600, color: BRAND, minWidth: '34px', textAlign: 'right' }}>{pct(f)}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1" style={{ height: '4px', borderRadius: '999px', backgroundColor: '#f0e8e4' }}>
        <div style={{ height: '100%', width: `${pct(f)}%`, borderRadius: '999px', backgroundColor: BRAND }} />
      </div>
      <span className="inline-flex items-center gap-1 text-xs" style={{ color: BRAND }}>
        <button type="button" className="focus-step" onClick={() => onChange({ current: Math.max(0, num(f.current) - 1) })}>−</button>
        <span style={{ fontWeight: 600, minWidth: '48px', textAlign: 'center' }}>{num(f.current)}/{num(f.target)}{f.unit ? ` ${f.unit}` : ''}</span>
        <button type="button" className="focus-step" onClick={() => onChange({ current: num(f.current) + 1 })}>+</button>
      </span>
    </div>
  )
}

function FocusCard({ f, view, onChange, onEdit, onDelete }) {
  const finished = isFinished(f)
  const st = STATUS_STYLE[f.status] || STATUS_STYLE.active
  return (
    <div style={{ backgroundColor: '#fff', border: '1.5px solid #e2d6cf', borderRadius: view === 'cards' ? '12px' : '10px', padding: view === 'cards' ? '14px 16px' : '12px 14px', marginBottom: view === 'cards' ? 0 : '8px' }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <select value={f.status} onChange={e => onChange({ status: e.target.value, done: e.target.value === 'completed' })} title="Status"
            style={{ fontSize: '11px', fontWeight: 600, color: BRAND, backgroundColor: st.bg, border: `1px solid ${st.edge}`, borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}>
            {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {f.area && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold truncate" style={{ backgroundColor: '#f3ece8', color: BRAND }}>{f.area}</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={onEdit} className="edit-btn" title="Edit"><EditIcon /></button>
          <button type="button" onClick={onDelete} className="delete-btn" title="Delete"><DeleteIcon /></button>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        {f.track === 'check' && <div className="pt-0.5"><Tracker f={f} onChange={onChange} /></div>}
        <p className="flex-1 min-w-0" style={{ fontSize: '14.5px', fontWeight: 600, color: BRAND, lineHeight: 1.4, textDecoration: f.status === 'completed' ? 'line-through' : 'none', opacity: finished ? 0.6 : 1 }}>{f.title}</p>
      </div>
      {f.goals && <p className="text-xs mt-1.5 whitespace-pre-line" style={{ color: '#6b5a5a', lineHeight: 1.55 }}>{f.goals}</p>}
      {f.track !== 'check' && <div className="mt-3"><Tracker f={f} onChange={onChange} /></div>}
    </div>
  )
}

/* ── main ── */
export default function YourFocusNew({ userId, seasonSlot }) {
  const [state, setState] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    let active = true
    const load = async () => {
      try {
        let { data: settings } = await supabase.from('focus_settings').select('*').eq('user_id', userId).maybeSingle()
        if (!settings) {
          // Claim the one-time copy first, so it can never run twice (two tabs, double effects).
          const { data: claimed, error: claimErr } = await supabase.from('focus_settings')
            .insert({ user_id: userId, imported: true, view: 'cards' }).select().single()
          if (!claimErr && claimed) {
            settings = claimed
            try {
              const rows = await importOldFocuses(userId)
              if (rows.length) {
                const { error: insErr } = await supabase.from('focus_items').insert(rows)
                if (insErr) throw insErr
              }
            } catch (impErr) {
              await supabase.from('focus_settings').delete().eq('user_id', userId) // let it retry next time
              throw impErr
            }
          } else {
            // Another load already claimed it; wait briefly for its copy to land.
            await new Promise(r => setTimeout(r, 800))
            settings = { view: 'cards' }
          }
        }
        const { data: items, error: e2 } = await supabase.from('focus_items').select('*').eq('user_id', userId).order('created_at')
        if (e2) throw e2
        if (active) setState({ items: (items || []).map(fromRow), view: settings?.view || 'cards', showFinished: false })
      } catch (e) {
        console.error('Your Focus load failed', e)
        if (active) { setError('Couldn’t load your focuses. Please refresh.'); setState({ items: [], view: 'cards', showFinished: false }) }
      }
    }
    load()
    return () => { active = false }
  }, [userId])

  if (!state) return <div className="card-section text-sm" style={{ color: MUTED }}>Loading your focus…</div>

  const fail = e => { console.error('Your Focus save failed', e); setError('That change didn’t save. Please try again.') }
  const setView = async view => {
    setState(s0 => ({ ...s0, view }))
    const { error: e } = await supabase.from('focus_settings').upsert({ user_id: userId, view, imported: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (e) fail(e)
  }
  const addFocus = async v => {
    setError('')
    const { data, error: e } = await supabase.from('focus_items').insert({ user_id: userId, ...toRow(v) }).select().single()
    if (e) return fail(e)
    setState(s0 => ({ ...s0, items: [...s0.items, fromRow(data)] }))
  }
  const upd = async (id, p) => {
    setError('')
    const before = state.items.find(i => i.id === id)
    const next = { ...before, ...p }
    if (p.status) next.done = p.status === 'completed'
    if ('done' in p && !p.status) next.status = p.done ? 'completed' : 'active'
    setState(s0 => ({ ...s0, items: s0.items.map(i => (i.id === id ? next : i)) }))
    const { error: e } = await supabase.from('focus_items').update(toRow(next)).eq('id', id)
    if (e) { setState(s0 => ({ ...s0, items: s0.items.map(i => (i.id === id ? before : i)) })); fail(e) }
  }
  const del = async id => {
    if (!window.confirm('Delete this focus?')) return
    const before = state.items
    setState(s0 => ({ ...s0, items: s0.items.filter(i => i.id !== id) }))
    const { error: e } = await supabase.from('focus_items').delete().eq('id', id)
    if (e) { setState(s0 => ({ ...s0, items: before })); fail(e) }
  }
  const finishedN = state.items.filter(isFinished).length

  const group = (kind, title) => {
    const list = state.items.filter(i => i.kind === kind && (state.showFinished || !isFinished(i)))
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{title}</p>
        {list.length === 0 ? (
          <p className="text-xs italic py-2" style={{ color: MUTED }}>No {kind} focuses yet.</p>
        ) : (
          <div className={state.view === 'cards' ? 'grid gap-3 md:grid-cols-2' : ''}>
            {list.map(f => editingId === f.id ? (
              <div key={f.id} className={state.view === 'cards' ? 'md:col-span-2' : 'py-2'}>
                <FocusForm initial={f} onCancel={() => setEditingId(null)} onSave={v => { upd(f.id, v); setEditingId(null) }} />
              </div>
            ) : (
              <FocusCard key={f.id} f={f} view={state.view} onChange={p => upd(f.id, p)} onEdit={() => setEditingId(f.id)} onDelete={() => del(f.id)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card-section" style={{ backgroundColor: '#fbf4f1', border: '1.5px solid #ecd9d1' }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="section-title">Your Focus</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="section-subtitle" style={{ margin: 0 }}>{monthLabel()}</p>
            {seasonSlot}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full p-0.5" style={{ backgroundColor: '#f5efec' }}>
            {[['list', 'List'], ['cards', 'Cards']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setView(k)}
                style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', backgroundColor: state.view === k ? '#fff' : 'transparent', color: BRAND, boxShadow: state.view === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
            ))}
          </div>
          {finishedN > 0 && (
            <button type="button" onClick={() => setState(s0 => ({ ...s0, showFinished: !s0.showFinished }))}
              style={{ fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '999px', border: '1px solid rgba(61,12,12,0.12)', color: BRAND, backgroundColor: state.showFinished ? '#faf1f1' : '#fff' }}>
              {state.showFinished ? 'Hide finished' : `Show finished (${finishedN})`}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs mb-3" style={{ color: '#b54a3c' }}>{error}</p>}

      <div className="mb-5">
        {adding ? (
          <FocusForm onCancel={() => setAdding(false)} onSave={v => { addFocus(v); setAdding(false) }} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn-brand btn-add">Add focus</button>
        )}
      </div>

      <div className="space-y-6">
        {group('business', 'Business')}
        {group('life', 'Life')}
      </div>
    </div>
  )
}
