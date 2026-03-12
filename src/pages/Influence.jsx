import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BRAND = '#6B1010'

/* ─── Generic single-item save/display card ─── */
function SingleCard({ value, onEdit, onDelete, renderContent }) {
  return (
    <div className="card group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">{renderContent(value)}</div>
        <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="edit-btn" title="Edit">✏️</button>
          <button onClick={onDelete} className="delete-btn" title="Delete">🗑️</button>
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
        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
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

  useEffect(() => {
    supabase.from('product_one_liners').select('*').eq('user_id', userId)
      .order('created_at').then(({ data }) => setItems(data || []))
  }, [userId])

  const handleSave = async () => {
    if (!offerName.trim() || !offerLine.trim()) return alert('Fill in both fields.')
    if (editId) {
      const { data } = await supabase.from('product_one_liners').update({ offer_name: offerName, offer_one_liner: offerLine }).eq('id', editId).select().single()
      setItems(prev => prev.map(x => x.id === editId ? data : x))
      setEditId(null)
    } else {
      const { data } = await supabase.from('product_one_liners').insert({ user_id: userId, offer_name: offerName, offer_one_liner: offerLine }).select().single()
      setItems(prev => [...prev, data])
    }
    setOfferName(''); setOfferLine('')
  }

  const handleDelete = async (id) => {
    await supabase.from('product_one_liners').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const handleEdit = (item) => {
    setEditId(item.id); setOfferName(item.offer_name); setOfferLine(item.offer_one_liner)
  }

  return (
    <div className="card-section">
      <h2 className="section-title flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
        Product / Service One-Liners
      </h2>
      <p className="section-subtitle">Add a one-liner for each of your core offers.</p>

      {/* Saved items */}
      {items.length > 0 && (
        <div className="space-y-3 mb-4">
          {items.map(item => (
            <div key={item.id} className="card group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900">{item.offer_name}</p>
                  <p className="text-gray-700 text-sm mt-1 italic">"{item.offer_one_liner}"</p>
                </div>
                <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(item)} className="edit-btn">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="delete-btn">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
        <p className="text-xs font-semibold text-gray-600">{editId ? 'Editing offer' : 'Add new offer'}</p>
        <input className="input-field" value={offerName} onChange={e => setOfferName(e.target.value)} placeholder="Offer Name (e.g. 1:1 Coaching)" />
        <textarea className="textarea-field" rows={2} value={offerLine} onChange={e => setOfferLine(e.target.value)} placeholder="Offer one-liner" />
        <div className="flex gap-2">
          {editId && <button onClick={() => { setEditId(null); setOfferName(''); setOfferLine('') }} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600">Cancel</button>}
          <button onClick={handleSave} className="btn-brand" style={{ backgroundColor: BRAND }}>
            {editId ? 'Update Offer' : 'Save Offer'}
          </button>
        </div>
      </div>
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
        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
        Your Ideal Buyer Avatar
      </h2>
      <p className="section-subtitle">Define the exact person your business is built for.</p>

      {saved && !editing ? (
        <SingleCard
          value={saved}
          onEdit={() => { setForm({ name: saved.name||'', age_range: saved.age_range||'', description: saved.description||'' }); setEditing(true) }}
          onDelete={handleDelete}
          renderContent={v => (
            <div className="space-y-1">
              {v.name && <p className="font-bold text-gray-900">{v.name}</p>}
              {v.age_range && <p className="text-xs text-gray-500">Age: {v.age_range}</p>}
              {v.description && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{v.description}</p>}
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
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600">Cancel</button>}
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
        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
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
            {editing && <button onClick={() => setEditing(false)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-600">Cancel</button>}
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
    <div className="space-y-0">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full bg-blue-500" />
          <h1 className="text-2xl font-black text-gray-900">Influence</h1>
        </div>
        <p className="text-sm text-gray-500">
          Defining your brand voice, ethos, and positioning: who you are, what you stand for, and the transformation you help create.
        </p>
      </div>

      <CoreOneLiner userId={user.id} />
      <ProductOneLiners userId={user.id} />
      <BuyerAvatar userId={user.id} />
      <BuyerPsychology userId={user.id} />
    </div>
  )
}
