import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getMoneyDashboardSettings,
  upsertMoneyDashboardSettings,
} from '../lib/moneyDashboardService'
import MoneyDashboardWeekly from './MoneyDashboardWeekly'
import MoneyDashboardTrends from './MoneyDashboardTrends'
import MoneyDashboardBaseline from './MoneyDashboardBaseline'

const BRAND = '#6B1020'
const CASH_DOT = '#cdd5ae'

// ─── Model picker modal (shown when business_model is not set) ─────────────────

function ModelPickerModal({ onSelect, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(240,237,234,0.97)',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 500, color: '#1A1A1A', marginBottom: '10px' }}>
          Welcome to your Money Dashboard.
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6, marginBottom: '28px' }}>
          Before we start, tell us how your business makes money. This shapes everything you see here.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          {/* Service card */}
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '0.5px solid rgba(0,0,0,0.12)', textAlign: 'left' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Service-based</p>
            <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
              Coaches, consultants, service providers, agencies. You charge for your time or expertise.
            </p>
            <button
              onClick={() => onSelect('service')}
              disabled={loading}
              style={{
                width: '100%', background: BRAND, color: 'white', border: 'none',
                fontSize: '13px', fontWeight: 500, padding: '10px 0', borderRadius: '8px',
                letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Choose service
            </button>
          </div>

          {/* Product card */}
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '0.5px solid rgba(0,0,0,0.12)', textAlign: 'left' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Product-based</p>
            <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
              Physical or digital products, e-commerce, courses, software. You charge per unit sold or download.
            </p>
            <button
              onClick={() => onSelect('product')}
              disabled={loading}
              style={{
                width: '100%', background: '#1A1A1A', color: 'white', border: 'none',
                fontSize: '13px', fontWeight: 500, padding: '10px 0', borderRadius: '8px',
                letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Choose product
            </button>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.35)' }}>You can change this later in settings.</p>
      </div>
    </div>
  )
}

// ─── Change model confirmation modal ─────────────────────────────────────────

function ChangeModelModal({ currentModel, onConfirm, onCancel, loading }) {
  const other = currentModel === 'product' ? 'Service-Based' : 'Product-Based'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: '24px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Change business model?</p>
        <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', lineHeight: 1.6, marginBottom: '20px' }}>
          Switching to <strong>{other}</strong> will change the labels and fields shown going forward. Your existing data is preserved.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '0.5px solid rgba(0,0,0,0.12)', fontSize: '13px', fontWeight: 500, color: 'rgba(0,0,0,0.6)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, color: 'white', background: BRAND, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Switching…' : 'Switch model'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'weekly', label: 'Weekly' },
    { key: 'trends', label: 'Trends' },
    { key: 'baseline', label: 'Baseline' },
  ]
  return (
    <div style={{ display: 'flex', gap: '2px', borderRadius: '12px', padding: '4px', backgroundColor: '#ebe5e0', width: 'fit-content' }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
            ...(active === tab.key
              ? { backgroundColor: '#fff', color: '#1a1a1a', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
              : { backgroundColor: 'transparent', color: '#a09590' }
            ),
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function MoneyDashboard() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('weekly')
  const [showModelModal, setShowModelModal] = useState(false)
  const [switchingModel, setSwitchingModel] = useState(false)
  const [pickingModel, setPickingModel] = useState(false)

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

  // First-click model selection (for users with no settings row)
  const handlePickModel = async (model) => {
    setPickingModel(true)
    try {
      const updated = await upsertMoneyDashboardSettings(user.id, {
        business_model: model,
        preferred_currency: 'AUD',
        explanation_mode: 'simple',
      })
      setSettings(updated)
    } catch (err) {
      alert('Failed to save. Please try again.')
    } finally {
      setPickingModel(false)
    }
  }

  // Model switch (for users who want to change after initial selection)
  // Does NOT erase existing data — just updates the active model in settings.
  const handleSwitchModel = async () => {
    if (!settings) return
    setSwitchingModel(true)
    try {
      const newModel = settings.business_model === 'product' ? 'service' : 'product'
      const updated = await upsertMoneyDashboardSettings(user.id, {
        business_model: newModel,
        preferred_currency: settings.preferred_currency || 'AUD',
        explanation_mode: settings.explanation_mode || 'simple',
      })
      setSettings(updated)
      setShowModelModal(false)
      setActiveTab('weekly')
    } catch (err) {
      alert('Failed to switch model. Please try again.')
    } finally {
      setSwitchingModel(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '32px', height: '32px', border: `4px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  // Show model picker for any user without a business_model (no row, or null model)
  if (!settings || !settings.business_model) {
    return <ModelPickerModal onSelect={handlePickModel} loading={pickingModel} />
  }

  const settingsWithUser = { ...settings, user_id: user.id }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Change model modal */}
        {showModelModal && (
          <ChangeModelModal
            currentModel={settings.business_model}
            onConfirm={handleSwitchModel}
            onCancel={() => setShowModelModal(false)}
            loading={switchingModel}
          />
        )}

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px', color: BRAND }}>
              WMHQ TOOLS
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, backgroundColor: CASH_DOT }} />
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 500, color: '#1A1A1A' }}>Money Dashboard</h1>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.5)' }}>Track the financial health of your business based on how you actually sell.</p>
          </div>

          {/* Change model link */}
          <button
            onClick={() => setShowModelModal(true)}
            style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', flexShrink: 0, fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            Change model
          </button>
        </div>

        {/* ── Tabs ── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Tab content ── */}
        {activeTab === 'weekly' && (
          <MoneyDashboardWeekly
            settings={settingsWithUser}
            onViewTrends={() => setActiveTab('trends')}
            onGoToBaseline={() => setActiveTab('baseline')}
            simpleMode={simpleMode}
            onToggleSimpleMode={toggleSimpleMode}
          />
        )}
        {activeTab === 'trends' && (
          <MoneyDashboardTrends settings={settingsWithUser} />
        )}
        {activeTab === 'baseline' && (
          <MoneyDashboardBaseline settings={settingsWithUser} />
        )}
      </div>

      {/* ── Footer disclaimer ── */}
      <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.35)', lineHeight: 1.6, marginBottom: '8px' }}>
          This work is the sole property of Jessica Pinili. You do not have permission to share, sublicense, distribute, duplicate, sell, license, or create derivative works in any capacity. All intellectual property within this digital product is proprietary and reserved exclusively for Jessica Pinili.
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.35)', lineHeight: 1.6 }}>
          This dashboard provides directional clarity only and does not constitute financial advice. Jessica Pinili is not a financial advisor. Use this tool to identify patterns, pressure points, and more profitable next moves.
        </p>
      </div>
    </div>
  )
}
