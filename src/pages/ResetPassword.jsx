import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // 'checking' | 'valid' | 'invalid'
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Confirm the recovery link is valid: it puts the app into PASSWORD_RECOVERY
  // and creates a temporary session.
  useEffect(() => {
    let resolved = false
    const markValid = () => { resolved = true; setStatus('valid') }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) markValid()
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) markValid()
    })

    const timer = setTimeout(() => {
      if (!resolved) setStatus('invalid')
    }, 3000)

    return () => {
      sub?.subscription?.unsubscribe?.()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError(updateError.message || 'Could not update your password. Please try again.')
        return
      }
      await supabase.auth.signOut()
      navigate('/login', { replace: true, state: { message: 'Password updated, please sign in.' } })
    } catch (err) {
      setError(err.message || 'Could not update your password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-lg"
            style={{ backgroundColor: '#3d0c0c' }}
          >
            <span className="text-white font-black text-sm tracking-tighter">WMHQ</span>
          </div>
          <h1 className="font-black text-xl text-gray-900 tracking-wide uppercase">
            Woman Mastery HQ
          </h1>
          <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase text-xs">
            Personal Portal
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          {status === 'checking' && (
            <>
              <h2 className="section-title mb-1">Checking your link</h2>
              <p className="text-sm text-gray-500">One moment while we confirm your reset link...</p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <h2 className="section-title mb-1">This link is no longer valid</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your reset link is missing or has expired. Request a new one and try again.
              </p>
              <Link
                to="/forgot-password"
                className="block w-full btn-brand py-2 rounded-lg text-center text-white font-semibold text-sm"
                style={{ backgroundColor: '#3d0c0c' }}
              >
                Request a new link
              </Link>
            </>
          )}

          {status === 'valid' && (
            <>
              <h2 className="section-title mb-1">Set a new password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose a new password for your portal.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full btn-brand py-2 rounded-lg mt-2 disabled:opacity-60"
                  style={{ backgroundColor: '#3d0c0c' }}
                >
                  {saving ? 'Saving...' : 'Save new password'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © JESSICA PINILI · WOMAN MASTERY HQ · All rights reserved
        </p>
      </div>
    </div>
  )
}
