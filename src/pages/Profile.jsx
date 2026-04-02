import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BRAND = '#3d0c0c'

export default function Profile() {
  const { user, refreshProfile } = useAuth()
  const [form, setForm] = useState({ first_name: '', last_name: '', brand_title: '' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({ first_name: data.first_name || '', last_name: data.last_name || '', brand_title: data.brand_title || '' })
        setLoading(false)
      })
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) return alert('First and last name are required.')
    await supabase.from('profiles').upsert({
      id: user.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      brand_title: form.brand_title.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    setSaved(true)
    refreshProfile()
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return null

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="page-title">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your profile details appear in the sidebar.</p>
      </div>

      <div className="card-section">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input
                className="input-field"
                value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                placeholder="Jessica"
                required
              />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input
                className="input-field"
                value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Brand / Business Title</label>
            <input
              className="input-field"
              value={form.brand_title}
              onChange={e => setForm(p => ({ ...p, brand_title: e.target.value }))}
              placeholder="e.g. Business Coach, CEO at XYZ"
            />
            <p className="text-xs text-gray-400 mt-1">Displayed below your name in the sidebar.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-brand">
              Save Profile
            </button>
            {saved && (
              <span className="text-emerald-600 font-semibold text-sm flex items-center gap-1">
                ✓ Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="card-section mt-5">
        <p className="font-bold text-sm text-gray-700 mb-3">Account Details</p>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
            <p className="text-sm text-gray-800">{user?.email}</p>
          </div>
          <div className="flex justify-between py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Member Since</p>
            <p className="text-sm text-gray-800">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
