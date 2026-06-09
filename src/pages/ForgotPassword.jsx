import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    } catch (err) {
      // Never reveal whether an account exists for this email.
    } finally {
      setLoading(false)
      setSent(true)
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
                className="w-full btn-brand py-2 rounded-lg mt-2 disabled:opacity-60"
                style={{ backgroundColor: '#3d0c0c' }}
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
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © JESSICA PINILI · WOMAN MASTERY HQ · All rights reserved
        </p>
      </div>
    </div>
  )
}
