import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#3d0c0c'

/* ─── Copy button (matches the Quick Links copy pattern) ─── */
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const doCopy = () => {
    try { navigator.clipboard?.writeText(text || '') } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button onClick={doCopy} className="edit-btn" title="Copy">
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

/* ─── Generic single-item save/display card ─── */
function SingleCard({ value, onEdit, onDelete, renderContent, copyText }) {
  return (
    <div className="card group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">{renderContent(value)}</div>
        <div className="flex gap-1 ml-3 transition-opacity">
          {copyText != null && <CopyButton text={copyText} />}
          <button onClick={onEdit} className="edit-btn" title="Edit"><EditIcon /></button>
          <button onClick={onDelete} className="delete-btn" title="Delete"><DeleteIcon /></button>
        </div>
      </div>
    </div>
  )
}

/* ─── Core One-Liner ─── */
function CoreOneLiner({ userId }) {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('core_one_liner').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) setSaved(data.content); setLoading(false) })
  }, [userId])

  const handleSave = async () => {
    if (!value.trim()) return
    const { error } = await supabase.from('core_one_liner')
      .upsert({ user_id: userId, content: value.trim() }, { onConflict: 'user_id' })
    if (!error) { setSaved(value.trim()); setValue(''); setEditing(false) }
  }

  const handleDelete = async () => {
    await supabase.from('core_one_liner').delete().eq('user_id', userId)
    setSaved(null); setValue('')
  }

  if (loading) return null

  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
        Your Core One-Liner
      </h2>
      <p className="section-subtitle">One sentence that captures who you help, how you help them, and the transformation you create.</p>

      {saved && !editing ? (
        <SingleCard
          value={saved}
          copyText={saved}
          onEdit={() => { setValue(saved); setEditing(true) }}
          onDelete={handleDelete}
          renderContent={v => <p className="text-gray-800 font-medium leading-relaxed">"{v}"</p>}
        />
      ) : (
        <div className="space-y-3">
          <textarea
            className="textarea-field"
            rows={3}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. I help ambitious women coaches build consistent $10K+ months through identity-led marketing."
          />
          <div className="flex gap-2">
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
            <button onClick={handleSave} className="btn-brand">Save One-Liner</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Product One-Liners ─── */
function ProductOneLiners({ userId }) {
  const [items, setItems] = useState([])
  const [offerName, setOfferName] = useState('')
  const [offerLine, setOfferLine] = useState('')
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('product_one_liners').select('*').eq('user_id', userId)
      .order('created_at').then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [userId])

  const handleSave = async () => {
    if (!offerName.trim() || !offerLine.trim()) return
    if (editId) {
      const { data, error } = await supabase.from('product_one_liners')
        .update({ offer_name: offerName, offer_one_liner: offerLine })
        .eq('id', editId).select().single()
      if (error || !data) { console.error('Failed to update one-liner:', error); return }
      setItems(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('product_one_liners')
        .insert({ user_id: userId, offer_name: offerName, offer_one_liner: offerLine })
        .select().single()
      if (error || !data) { console.error('Failed to save one-liner:', error); return }
      setItems(prev => [...prev, data])
    }
    setOfferName(''); setOfferLine(''); setShowForm(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('product_one_liners').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const handleEdit = (item) => {
    setEditId(item.id); setOfferName(item.offer_name); setOfferLine(item.offer_one_liner)
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditId(null); setOfferName(''); setOfferLine(''); setShowForm(false)
  }

  if (loading) return null

  const showingForm = showForm || editId !== null

  return (
    <div className="card-section">
      <div className="flex items-start justify-between mb-1">
        <h2 className="section-title flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
          Product / Service One-Liners
        </h2>
        {items.length > 0 && !showingForm && (
          <button onClick={() => setShowForm(true)} className="btn-brand">
            Add Offer
          </button>
        )}
      </div>
      <p className="section-subtitle">Add a one-liner for each of your core offers.</p>

      {items.length === 0 && !showingForm ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl" style={{ borderColor: '#e8ddd8', backgroundColor: '#fdf9f7' }}>
          <p className="text-sm text-gray-400 mb-4">No offers added yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-brand">
            Add your first offer
          </button>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="card group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{item.offer_name}</p>
                      <p className="text-gray-600 text-sm mt-1 italic">"{item.offer_one_liner}"</p>
                    </div>
                    <div className="flex gap-1 ml-3 transition-opacity">
                      <CopyButton text={item.offer_one_liner} />
                      <button onClick={() => handleEdit(item)} className="edit-btn"><EditIcon /></button>
                      <button onClick={() => handleDelete(item.id)} className="delete-btn"><DeleteIcon /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showingForm && (
            <div className="form-card space-y-3">
              <p className="text-xs font-semibold text-gray-500">{editId ? 'Edit offer' : 'New offer'}</p>
              <input
                className="input-field"
                value={offerName}
                onChange={e => setOfferName(e.target.value)}
                placeholder="Offer name (e.g. 1:1 Coaching)"
              />
              <textarea
                className="textarea-field"
                rows={2}
                value={offerLine}
                onChange={e => setOfferLine(e.target.value)}
                placeholder="One-liner for this offer"
              />
              <div className="flex gap-2">
                <button onClick={handleCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="btn-brand">
                  {editId ? 'Update Offer' : 'Save Offer'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Objection Bank ─── */
function ObjectionBank({ userId }) {
  const [items, setItems] = useState([])
  const [objection, setObjection] = useState('')
  const [reframe, setReframe] = useState('')
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('objection_bank').select('*').eq('user_id', userId)
      .order('created_at').then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [userId])

  const handleSave = async () => {
    if (!objection.trim() || !reframe.trim()) return
    if (editId) {
      const { data, error } = await supabase.from('objection_bank')
        .update({ objection: objection.trim(), reframe: reframe.trim() })
        .eq('id', editId).select().single()
      if (error || !data) { console.error('Failed to update objection:', error); return }
      setItems(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('objection_bank')
        .insert({ user_id: userId, objection: objection.trim(), reframe: reframe.trim() })
        .select().single()
      if (error || !data) { console.error('Failed to save objection:', error); return }
      setItems(prev => [...prev, data])
    }
    setObjection(''); setReframe(''); setShowForm(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('objection_bank').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const handleEdit = (item) => {
    setEditId(item.id); setObjection(item.objection); setReframe(item.reframe)
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditId(null); setObjection(''); setReframe(''); setShowForm(false)
  }

  if (loading) return null

  const showingForm = showForm || editId !== null

  return (
    <div className="card-section">
      <div className="flex items-start justify-between mb-1">
        <h2 className="section-title flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
          Objection Bank
        </h2>
        {items.length > 0 && !showingForm && (
          <button onClick={() => setShowForm(true)} className="btn-brand">
            Add Objection
          </button>
        )}
      </div>
      <p className="section-subtitle">The top objections your ideal buyer has before buying — and your reframe for each.</p>

      {items.length === 0 && !showingForm ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl" style={{ borderColor: '#e8ddd8', backgroundColor: '#fdf9f7' }}>
          <p className="text-sm text-gray-400 mb-4">No objections added yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-brand">
            Add your first objection
          </button>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="card group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <p className="label" style={{ marginBottom: 4 }}>Objection</p>
                        <p className="text-sm font-semibold text-gray-900">{item.objection}</p>
                      </div>
                      <div>
                        <p className="label" style={{ marginBottom: 4 }}>Reframe</p>
                        <p className="text-sm text-gray-600">{item.reframe}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-3 transition-opacity">
                      <CopyButton text={item.reframe} />
                      <button onClick={() => handleEdit(item)} className="edit-btn"><EditIcon /></button>
                      <button onClick={() => handleDelete(item.id)} className="delete-btn"><DeleteIcon /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showingForm && (
            <div className="form-card space-y-3">
              <p className="text-xs font-semibold text-gray-500">{editId ? 'Edit objection' : 'New objection'}</p>
              <div>
                <label className="label">Objection</label>
                <input
                  className="input-field"
                  value={objection}
                  onChange={e => setObjection(e.target.value)}
                  placeholder="e.g. I can't afford it right now."
                />
              </div>
              <div>
                <label className="label">Reframe / Response</label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  value={reframe}
                  onChange={e => setReframe(e.target.value)}
                  placeholder="e.g. The cost of staying where you are is higher than the investment."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="btn-brand">
                  {editId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Ideal Buyer Avatar ─── */
function BuyerAvatar({ userId }) {
  const [form, setForm] = useState({ name: '', age_range: '', description: '' })
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('buyer_avatar').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) setSaved(data); setLoading(false) })
  }, [userId])

  const handleSave = async () => {
    const { error, data } = await supabase.from('buyer_avatar')
      .upsert({ user_id: userId, ...form }, { onConflict: 'user_id' })
      .select().single()
    if (!error) { setSaved(data); setEditing(false) }
  }

  const handleDelete = async () => {
    await supabase.from('buyer_avatar').delete().eq('user_id', userId)
    setSaved(null); setForm({ name: '', age_range: '', description: '' })
  }

  if (loading) return null

  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
        Your Ideal Buyer Avatar
      </h2>
      <p className="section-subtitle">Define the exact person your business is built for.</p>

      {saved && !editing ? (
        <SingleCard
          value={saved}
          onEdit={() => { setForm({ name: saved.name||'', age_range: saved.age_range||'', description: saved.description||'' }); setEditing(true) }}
          onDelete={handleDelete}
          renderContent={v => {
            const title = v.name && v.age_range ? `${v.name} · ${v.age_range}` : (v.name || v.age_range || '')
            return (
              <div className="space-y-1.5">
                {title && <p className="text-sm font-semibold text-gray-900">{title}</p>}
                {v.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{v.description}</p>
                )}
              </div>
            )
          }}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name (optional)</label>
              <input className="input-field" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Sarah" />
            </div>
            <div>
              <label className="label">Age Range</label>
              <input className="input-field" value={form.age_range} onChange={e => setForm(p => ({...p, age_range: e.target.value}))} placeholder="e.g. 28–40" />
            </div>
          </div>
          <div>
            <label className="label">Short Description — Demographics, Gender, etc.</label>
            <textarea className="textarea-field" rows={4} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Female, 30-45, service-based business owner, 1-3 years in business, $3K–$8K months, wants to scale to consistent $15K+..." />
          </div>
          <div className="flex gap-2">
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
            <button onClick={handleSave} className="btn-brand">Save Avatar</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Buyer Psychology Map ─── */
function BuyerPsychology({ userId }) {
  const [form, setForm] = useState({ pains: '', desires: '' })
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('buyer_psychology').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) setSaved(data); setLoading(false) })
  }, [userId])

  const handleSave = async () => {
    const { data, error } = await supabase.from('buyer_psychology')
      .upsert({ user_id: userId, ...form }, { onConflict: 'user_id' })
      .select().single()
    if (!error) { setSaved(data); setEditing(false) }
  }

  const handleDelete = async () => {
    await supabase.from('buyer_psychology').delete().eq('user_id', userId)
    setSaved(null); setForm({ pains: '', desires: '' })
  }

  if (loading) return null

  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
        Buyer Psychology Map
      </h2>
      <p className="section-subtitle">Map what your buyer feels, fears, and desires.</p>

      {saved && !editing ? (
        <SingleCard
          value={saved}
          onEdit={() => { setForm({ pains: saved.pains||'', desires: saved.desires||'' }); setEditing(true) }}
          onDelete={handleDelete}
          renderContent={v => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="label" style={{ marginBottom: 0 }}>Buyer pains</p>
                  {v.pains && <CopyButton text={v.pains} />}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{v.pains}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="label" style={{ marginBottom: 0 }}>Buyer desires</p>
                  {v.desires && <CopyButton text={v.desires} />}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{v.desires}</p>
              </div>
            </div>
          )}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Buyer Pains</label>
              <textarea className="textarea-field" rows={5} value={form.pains} onChange={e => setForm(p => ({...p, pains: e.target.value}))} placeholder="What keeps them up at night? What are they frustrated by? What have they already tried that didn't work?" />
            </div>
            <div>
              <label className="label">Buyer Desires</label>
              <textarea className="textarea-field" rows={5} value={form.desires} onChange={e => setForm(p => ({...p, desires: e.target.value}))} placeholder="What do they dream of? What outcome do they desperately want? How do they want to feel?" />
            </div>
          </div>
          <div className="flex gap-2">
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
            <button onClick={handleSave} className="btn-brand">Save / Update</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Brand Worldview ─── */
const WORLDVIEW_PROMPTS = [
  { key: 'believe',           label: 'We/I believe…',                  placeholder: 'e.g. Every woman deserves a business that funds the life she actually wants.' },
  { key: 'not_believe',       label: 'We/I do not believe…',           placeholder: 'e.g. That working harder is the only way to grow.' },
  { key: 'industry_wrong',    label: 'The industry gets this wrong…',  placeholder: 'e.g. It sells more content instead of clearer strategy.' },
  { key: 'customers_deserve', label: 'Our customers deserve…',         placeholder: 'e.g. Honest guidance and a path that fits their season of life.' },
  { key: 'old_way',           label: 'The old way is…',                placeholder: 'e.g. Push harder, post more, and hope it works.' },
  { key: 'new_way',           label: 'The new way is…',                placeholder: 'e.g. Build a simple system that holds steady when life shifts.' },
  { key: 'future',            label: 'The future we want to create is…', placeholder: 'e.g. A world where more women lead profitable, spacious businesses.' },
]
const BLANK_WORLDVIEW = { believe: '', not_believe: '', industry_wrong: '', customers_deserve: '', old_way: '', new_way: '', future: '' }

function BrandWorldview({ userId }) {
  const [form, setForm] = useState(BLANK_WORLDVIEW)
  const [saved, setSaved] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('brand_worldview').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) setSaved(data); setLoading(false) })
  }, [userId])

  const fillFrom = (d) => {
    const next = { ...BLANK_WORLDVIEW }
    WORLDVIEW_PROMPTS.forEach(p => { next[p.key] = d?.[p.key] || '' })
    return next
  }

  const handleSave = async () => {
    const payload = { user_id: userId }
    WORLDVIEW_PROMPTS.forEach(p => { payload[p.key] = form[p.key].trim() })
    const { data, error } = await supabase.from('brand_worldview')
      .upsert(payload, { onConflict: 'user_id' }).select().single()
    if (!error) { setSaved(data); setEditing(false) }
  }

  const handleDelete = async () => {
    await supabase.from('brand_worldview').delete().eq('user_id', userId)
    setSaved(null); setForm(BLANK_WORLDVIEW)
  }

  if (loading) return null

  const hasAny = saved && WORLDVIEW_PROMPTS.some(p => (saved[p.key] || '').trim())

  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
        Brand Worldview
      </h2>
      <p className="section-subtitle">The set of beliefs your brand repeatedly stands for.</p>

      {saved && !editing ? (
        <SingleCard
          value={saved}
          onEdit={() => { setForm(fillFrom(saved)); setEditing(true) }}
          onDelete={handleDelete}
          renderContent={v => (
            hasAny ? (
              <div className="space-y-3">
                {WORLDVIEW_PROMPTS.filter(p => (v[p.key] || '').trim()).map(p => (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="label" style={{ marginBottom: 0 }}>{p.label}</p>
                      <CopyButton text={v[p.key]} />
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{v[p.key]}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nothing added yet. Tap edit to begin.</p>
            )
          )}
        />
      ) : (
        <div className="space-y-3">
          {WORLDVIEW_PROMPTS.map(p => (
            <div key={p.key}>
              <label className="label">{p.label}</label>
              <textarea
                className="textarea-field"
                rows={2}
                value={form[p.key]}
                onChange={e => setForm(prev => ({ ...prev, [p.key]: e.target.value }))}
                placeholder={p.placeholder}
              />
            </div>
          ))}
          <div className="flex gap-2">
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
            <button onClick={handleSave} className="btn-brand">Save Worldview</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Buying Triggers ─── */
const TRIGGER_EXAMPLES = [
  'A failed launch',
  'A life transition',
  'A revenue plateau',
  'A deadline',
  'A new role',
  'A painful recent experience',
  'A seasonal event',
  'A competitor moving ahead',
  'A loss of time or money',
]

function HelpPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <span ref={ref} className="relative inline-block align-middle">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center justify-center font-semibold"
        style={{ width: 18, height: 18, borderRadius: 9999, border: '1px solid #e8e0d8', color: '#b8a898', fontSize: 11, lineHeight: 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}
        title="Examples of buying triggers"
        aria-label="Examples of buying triggers"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-20 mt-1" style={{ left: 0, backgroundColor: '#fff', border: '0.5px solid #e8e0d8', borderRadius: 6, padding: '12px 14px', width: 230 }}>
          <p className="text-xs font-semibold text-gray-700 mb-2">Examples of buying triggers</p>
          <ul className="space-y-1">
            {TRIGGER_EXAMPLES.map(x => (
              <li key={x} className="text-xs text-gray-500 flex items-start gap-1.5">
                <span style={{ color: '#c6def2' }}>•</span>{x}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}

function BuyingTriggers({ userId }) {
  const [items, setItems] = useState([])
  const [trigger, setTrigger] = useState('')
  const [looks, setLooks] = useState('')
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('buying_triggers').select('*').eq('user_id', userId)
      .order('created_at').then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [userId])

  const handleSave = async () => {
    if (!trigger.trim()) return
    if (editId) {
      const { data, error } = await supabase.from('buying_triggers')
        .update({ trigger: trigger.trim(), what_this_looks_like: looks.trim() })
        .eq('id', editId).select().single()
      if (error || !data) { console.error('Failed to update trigger:', error); return }
      setItems(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('buying_triggers')
        .insert({ user_id: userId, trigger: trigger.trim(), what_this_looks_like: looks.trim() })
        .select().single()
      if (error || !data) { console.error('Failed to save trigger:', error); return }
      setItems(prev => [...prev, data])
    }
    setTrigger(''); setLooks(''); setShowForm(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('buying_triggers').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const handleEdit = (item) => {
    setEditId(item.id); setTrigger(item.trigger); setLooks(item.what_this_looks_like || '')
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditId(null); setTrigger(''); setLooks(''); setShowForm(false)
  }

  if (loading) return null

  const showingForm = showForm || editId !== null

  return (
    <div className="card-section">
      <div className="flex items-start justify-between mb-1">
        <h2 className="section-title flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#c6def2' }} />
          Buying Triggers
          <HelpPopover />
        </h2>
        {items.length > 0 && !showingForm && (
          <button onClick={() => setShowForm(true)} className="btn-brand">
            Add Trigger
          </button>
        )}
      </div>
      <p className="section-subtitle">The moments or events that make your ideal buyer more likely to act now.</p>

      {items.length === 0 && !showingForm ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl" style={{ borderColor: '#e8ddd8', backgroundColor: '#fdf9f7' }}>
          <p className="text-sm text-gray-400 mb-4">No buying triggers added yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-brand">
            Add your first trigger
          </button>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="card group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <p className="label" style={{ marginBottom: 4 }}>Trigger</p>
                        <p className="text-sm font-semibold text-gray-900">{item.trigger}</p>
                      </div>
                      {item.what_this_looks_like && (
                        <div>
                          <p className="label" style={{ marginBottom: 4 }}>What this looks like</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.what_this_looks_like}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-3 transition-opacity">
                      {item.what_this_looks_like && <CopyButton text={item.what_this_looks_like} />}
                      <button onClick={() => handleEdit(item)} className="edit-btn"><EditIcon /></button>
                      <button onClick={() => handleDelete(item.id)} className="delete-btn"><DeleteIcon /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showingForm && (
            <div className="form-card space-y-3">
              <p className="text-xs font-semibold text-gray-500">{editId ? 'Edit trigger' : 'New trigger'}</p>
              <div>
                <label className="label">Trigger</label>
                <input
                  className="input-field"
                  value={trigger}
                  onChange={e => setTrigger(e.target.value)}
                  placeholder="e.g. Their latest launch did not meet its sales goal."
                />
              </div>
              <div>
                <label className="label">What this looks like</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={looks}
                  onChange={e => setLooks(e.target.value)}
                  placeholder="e.g. They have tried posting more, changing their offer and lowering the price, but revenue is still inconsistent. They are now actively looking for a clearer sales system."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCancel} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="btn-brand">
                  {editId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Page ─── */
export default function Influence() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#c6def2' }} />
          <h1 className="page-title">Influence</h1>
        </div>
        <p className="text-sm text-gray-500">
          Defining your brand voice, ethos, and positioning: who you are, what you stand for, and the transformation you help create.
        </p>
      </div>

      <CoreOneLiner userId={user.id} />
      <ProductOneLiners userId={user.id} />
      <BrandWorldview userId={user.id} />
      <ObjectionBank userId={user.id} />
      <BuyingTriggers userId={user.id} />
      <BuyerAvatar userId={user.id} />
      <BuyerPsychology userId={user.id} />
    </div>
  )
}
