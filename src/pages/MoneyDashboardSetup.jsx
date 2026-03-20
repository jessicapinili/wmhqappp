import { useState } from 'react'
import { upsertMoneyDashboardSettings } from '../lib/moneyDashboardService'

const BRAND = '#6B1010'
const CASH_DOT = '#cdd5ae'

export default function MoneyDashboardSetup({ userId, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const settings = await upsertMoneyDashboardSettings(userId, {
        business_model: selected,
        preferred_currency: 'AUD',
        explanation_mode: 'simple',
      })
      onComplete(settings)
    } catch (err) {
      const detail = err?.message || err?.code || String(err)
      console.error('Money Dashboard setup save failed:', detail, err)
      alert(
        import.meta.env.DEV
          ? `Setup failed: ${detail}`
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: CASH_DOT }} />
          <h1 className="text-2xl font-black text-gray-900">Money Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500">Track the financial health of your business based on how you actually sell.</p>
      </div>

      {/* Setup card */}
      <div className="card-section max-w-xl">
        <p className="text-xs font-bold tracking-[0.16em] uppercase mb-1" style={{ color: BRAND }}>FIRST VISIT SETUP</p>
        <h2 className="text-xl font-black text-gray-900 mb-1">How do you primarily sell?</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your business model shapes how your numbers are tracked. You can change this later, but doing so will reset your saved Money Dashboard history.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Product */}
          <button
            onClick={() => setSelected('product')}
            className="rounded-2xl p-5 text-left transition-all border-2"
            style={{
              borderColor: selected === 'product' ? BRAND : 'rgba(0,0,0,0.08)',
              backgroundColor: selected === 'product' ? '#fdf5f5' : '#fff',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3"
              style={{ backgroundColor: selected === 'product' ? '#f4d4d4' : '#f5f5f5' }}
            >
              📦
            </div>
            <p className="font-black text-gray-900 mb-1">Product-Based</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              You sell physical or digital products. Think: stock, COGS, inventory, orders, and fulfilment.
            </p>
          </button>

          {/* Service */}
          <button
            onClick={() => setSelected('service')}
            className="rounded-2xl p-5 text-left transition-all border-2"
            style={{
              borderColor: selected === 'service' ? BRAND : 'rgba(0,0,0,0.08)',
              backgroundColor: selected === 'service' ? '#fdf5f5' : '#fff',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3"
              style={{ backgroundColor: selected === 'service' ? '#f4d4d4' : '#f5f5f5' }}
            >
              🎯
            </div>
            <p className="font-black text-gray-900 mb-1">Service-Based</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              You sell coaching, consulting, programs, or services. Think: clients, hours, capacity, and delivery costs.
            </p>
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="btn-brand w-full py-3 text-base font-bold"
          style={{ opacity: !selected || saving ? 0.5 : 1 }}
        >
          {saving ? 'Setting up your dashboard…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
