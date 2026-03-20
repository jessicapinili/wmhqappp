import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getMoneyDashboardSettings,
  upsertMoneyDashboardSettings,
  resetDashboardForModelChange,
} from '../lib/moneyDashboardService'
import MoneyDashboardSetup from './MoneyDashboardSetup'
import MoneyDashboardWeekly from './MoneyDashboardWeekly'
import MoneyDashboardTrends from './MoneyDashboardTrends'

const BRAND = '#6B1010'
const CASH_DOT = '#cdd5ae'

// ─── Change model confirmation modal ─────────────────────────────────────────

function ChangeModelModal({ currentModel, onConfirm, onCancel }) {
  const other = currentModel === 'product' ? 'Service-Based' : 'Product-Based'
  return (
    <div className="modal-overlay">
      <div className="modal-box p-6 max-w-md">
        <h2 className="text-xl font-black text-gray-900 mb-2">Change business model?</h2>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Switching to <strong>{other}</strong> will reset your Money Dashboard history because your metrics, inputs, and formulas will change. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: '#DC2626' }}
          >
            Continue and Reset
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-0.5 rounded-xl p-1" style={{ backgroundColor: '#ebe5e0', width: 'fit-content' }}>
      {['weekly', 'trends'].map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className="px-5 py-2 rounded-lg text-sm font-bold transition-all capitalize"
          style={
            active === tab
              ? { backgroundColor: '#fff', color: '#1a1a1a', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
              : { color: '#a09590' }
          }
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MoneyDashboard() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('weekly')
  const [showModelModal, setShowModelModal] = useState(false)
  const [changingModel, setChangingModel] = useState(false)
  const [simpleMode, setSimpleMode] = useState(() => {
    try { return localStorage.getItem('wmhq_explain_simple') === 'true' } catch { return false }
  })

  const toggleSimpleMode = () => {
    setSimpleMode(prev => {
      const next = !prev
      try { localStorage.setItem('wmhq_explain_simple', String(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    if (!user) return
    getMoneyDashboardSettings(user.id).then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [user])

  const handleSetupComplete = (newSettings) => {
    setSettings(newSettings)
  }

  const handleModelChange = async () => {
    if (!settings) return
    setChangingModel(true)
    try {
      const oldModel = settings.business_model
      const newModel = oldModel === 'product' ? 'service' : 'product'
      await resetDashboardForModelChange(user.id, oldModel)
      const updated = await upsertMoneyDashboardSettings(user.id, {
        business_model: newModel,
        preferred_currency: settings.preferred_currency || 'AUD',
        explanation_mode: settings.explanation_mode || 'simple',
      })
      setSettings(updated)
      setShowModelModal(false)
      setActiveTab('weekly')
    } catch (err) {
      alert('Failed to change model. Please try again.')
    } finally {
      setChangingModel(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${BRAND} transparent transparent transparent` }} />
      </div>
    )
  }

  if (!settings || !settings.business_model) {
    return (
      <MoneyDashboardSetup
        userId={user.id}
        onComplete={handleSetupComplete}
      />
    )
  }

  return (
    <div className="space-y-5">
      {showModelModal && (
        <ChangeModelModal
          currentModel={settings.business_model}
          onConfirm={handleModelChange}
          onCancel={() => setShowModelModal(false)}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: BRAND }}>
            WMHQ TOOLS
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: CASH_DOT }} />
            <h1 className="text-2xl font-black text-gray-900">Money Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500">Track the financial health of your business based on how you actually sell.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1 flex-shrink-0" style={{ backgroundColor: '#ebe5e0' }}>
          {['product', 'service'].map(m => (
            <button
              key={m}
              onClick={() => settings.business_model !== m && setShowModelModal(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={
                settings.business_model === m
                  ? { backgroundColor: '#fff', color: '#1a1a1a', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                  : { color: '#a09590' }
              }
            >
              {m === 'product' ? 'Product' : 'Service'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Tab content ── */}
      {activeTab === 'weekly' && (
        <MoneyDashboardWeekly
          settings={{ ...settings, user_id: user.id }}
          onViewTrends={() => setActiveTab('trends')}
          simpleMode={simpleMode}
          onToggleSimpleMode={toggleSimpleMode}
        />
      )}
      {activeTab === 'trends' && (
        <MoneyDashboardTrends
          settings={{ ...settings, user_id: user.id }}
        />
      )}

      {/* ── Disclaimer (page-specific override) ── */}
      <p className="footer-copyright">
        This work is the sole property of Jessica Pinili. You do not have permission to share, sublicense, distribute, duplicate, sell, license, or create derivative works in any capacity. All intellectual property within this digital product is proprietary and reserved exclusively for Jessica Pinili.
        <br /><br />
        This dashboard provides directional clarity only and does not constitute financial advice. Jessica Pinili is not a financial advisor. Use this tool to identify patterns, pressure points, and more profitable next moves.
      </p>
    </div>
  )
}
