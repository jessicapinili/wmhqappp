import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function Login() {
  const { login } = useAuth()
  const location = useLocation()
  const successMessage = location.state?.message
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
    <AuthLayout>
      <h2 className="section-title mb-1">Welcome back WMHQ Member 👸🏽</h2>
      <p className="text-sm text-gray-500 mb-6">
        Sign in to access your WMHQ Personal Portal
      </p>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm mb-4">
          {successMessage}
        </div>
      )}

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
          className="w-full btn-brand justify-center mt-2 disabled:opacity-60"
          style={{ padding: '9px 16px' }}
        >
          {loading ? 'Signing in' : 'Sign In'}
        </button>

        <div className="text-center">
          <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600">
            Forgot password?
          </Link>
        </div>
      </form>

      <p className="text-xs text-gray-400 text-center mt-6">
        Access is by invitation only. Contact your administrator if you need access.
      </p>
      <p className="text-xs font-bold text-center mt-2" style={{ color: '#3d0c0c' }}>
        New members will be granted access within one to two business days.
      </p>

      <a
        href="https://womanmasteryhq.com/joinmembership/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-dashed mt-4"
      >
        Not a member? Join here →
      </a>
    </AuthLayout>
  )
}
