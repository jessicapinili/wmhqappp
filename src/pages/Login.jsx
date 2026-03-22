import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-lg"
            style={{ backgroundColor: '#6B1010' }}
          >
            <span className="text-white font-black text-lg tracking-tight">WM</span>
          </div>
          <h1 className="font-black text-xl text-gray-900 tracking-wide uppercase">
            Woman Mastery HQ
          </h1>
          <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase text-xs">
            Personal Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#f7f7f7] rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sign in to access your portal.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

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
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-brand py-2 rounded-lg mt-2 disabled:opacity-60"
              style={{ backgroundColor: '#6B1010' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Access is by invitation only. Contact your administrator if you need access.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © JESSICA PINILI · WOMAN MASTERY HQ · All rights reserved
        </p>
      </div>
    </div>
  )
}
