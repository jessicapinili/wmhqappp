import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        // Fixed rather than taken from the current domain: a www or preview address is
        // not on the Supabase allowlist and would silently fall back to the site root.
        redirectTo: 'https://womanmasteryhqportal.com/reset-password',
      })
    } catch (err) {
      // Never reveal whether an account exists for this email.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <AuthLayout>
      <h2 className="section-title mb-1">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email and we will send you a reset link.
      </p>

      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm mb-4">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-brand justify-center mt-2 disabled:opacity-60"
            style={{ padding: '9px 16px' }}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      <div className="text-center mt-6">
        <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
