import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EditIcon, DeleteIcon } from '../lib/icons'

const BRAND = '#6B1010'

/* ─── Generic single-item save/display card ─── */
function SingleCard({ value, onEdit, onDelete, renderContent }) {
  return (
    <div className="card group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">{renderContent(value)}</div>
        <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>Save One-Liner</button>
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
      const { data } = await supabase.from('product_one_liners')
        .update({ offer_name: offerName, offer_one_liner: offerLine })
        .eq('id', editId).select().single()
      setItems(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data } = await supabase.from('product_one_liners')
        .insert({ user_id: userId, offer_name: offerName, offer_one_liner: offerLine })
        .select().single()
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
          <button onClick={() => setShowForm(true)} className="btn-brand" style={{ backgroundColor: BRAND }}>
            Add Offer
          </button>
        )}
      </div>
      <p className="section-subtitle">Add a one-liner for each of your core offers.</p>

      {items.length === 0 && !showingForm ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl" style={{ borderColor: '#e8ddd8', backgroundColor: '#fdf9f7' }}>
          <p className="text-sm text-gray-400 mb-4">No offers added yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-brand" style={{ backgroundColor: BRAND }}>
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
                    <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>
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
      const { data } = await supabase.from('objection_bank')
        .update({ objection: objection.trim(), reframe: reframe.trim() })
        .eq('id', editId).select().single()
      setItems(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data } = await supabase.from('objection_bank')
        .insert({ user_id: userId, objection: objection.trim(), reframe: reframe.trim() })
        .select().single()
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
          <button onClick={() => setShowForm(true)} className="btn-brand" style={{ backgroundColor: BRAND }}>
            Add Objection
          </button>
        )}
      </div>
      <p className="section-subtitle">The top objections your ideal buyer has before buying — and your reframe for each.</p>

      {items.length === 0 && !showingForm ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl" style={{ borderColor: '#e8ddd8', backgroundColor: '#fdf9f7' }}>
          <p className="text-sm text-gray-400 mb-4">No objections added yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-brand" style={{ backgroundColor: BRAND }}>
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.objection}</p>
                      <p className="text-sm text-gray-500 mt-1 italic">{item.reframe}</p>
                    </div>
                    <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>
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
          renderContent={v => (
            <div className="space-y-3">
              {(v.name || v.age_range) && (
                <div className={`grid gap-3 ${v.name && v.age_range ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                  {v.name && (
                    <div className="rounded-lg p-3 border" style={{ background: '#fff', borderColor: '#ede6e1' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#b0a49e' }}>Name</p>
                      <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                    </div>
                  )}
                  {v.age_range && (
                    <div className="rounded-lg p-3 border" style={{ background: '#fff', borderColor: '#ede6e1' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#b0a49e' }}>Age Range</p>
                      <p className="text-sm font-semibold text-gray-900">{v.age_range}</p>
                    </div>
                  )}
                </div>
              )}
              {v.description && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{v.description}</p>
              )}
            </div>
          )}
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
            <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>Save Avatar</button>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-600 mb-2">Buyer Pains</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.pains}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-2">Buyer Desires</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.desires}</p>
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
            <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>Save / Update</button>
          </div>
        </div>
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
          <h1 className="text-2xl font-black text-gray-900">Influence</h1>
        </div>
        <p className="text-sm text-gray-500">
          Defining your brand voice, ethos, and positioning: who you are, what you stand for, and the transformation you help create.
        </p>
      </div>

      <CoreOneLiner userId={user.id} />
      <ProductOneLiners userId={user.id} />
      <ObjectionBank userId={user.id} />
      <BuyerAvatar userId={user.id} />
      <BuyerPsychology userId={user.id} />
    </div>
  )
}
