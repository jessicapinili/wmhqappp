import React, { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading, recovering, completeRecovery, logout } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [graceOver, setGraceOver] = useState(false)

  // Supabase announces the recovery a moment after the page loads, so allow a short
  // grace period before deciding the link is invalid.
  useEffect(() => {
    const timer = setTimeout(() => setGraceOver(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Only a genuine recovery session gets the form. Any session is no longer enough.
  const status =
    !loading && user && recovering ? 'valid'
    : loading || !graceOver ? 'checking'
    : user ? 'signed-in'
    : 'invalid'

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
      // Only now is the portal unlocked.
      completeRecovery()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not update your password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const cancel = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // A normally signed in member who wanders here has nothing to reset.
  if (status === 'signed-in') return <Navigate to="/dashboard" replace />

  return (
    <AuthLayout>
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
            className="w-full btn-brand justify-center"
            style={{ padding: '9px 16px' }}
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
              className="w-full btn-brand justify-center mt-2 disabled:opacity-60"
              style={{ padding: '9px 16px' }}
            >
              {saving ? 'Saving...' : 'Save new password'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button type="button" onClick={cancel} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel and return to sign in
            </button>
          </div>
        </>
      )}
    </AuthLayout>
  )
}
