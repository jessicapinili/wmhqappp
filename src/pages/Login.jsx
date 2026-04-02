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
          <h2 className="section-title mb-1">Welcome back</h2>
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
              style={{ backgroundColor: '#3d0c0c' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Access is by invitation only. Contact your administrator if you need access.
          </p>

          <a
            href="https://womanmasteryhq.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full btn-brand py-2 rounded-lg mt-4 text-center text-white font-semibold text-sm"
            style={{ backgroundColor: '#3d0c0c' }}
          >
            Not a member? Join here →
          </a>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © JESSICA PINILI · WOMAN MASTERY HQ · All rights reserved
        </p>
      </div>
    </div>
  )
}
