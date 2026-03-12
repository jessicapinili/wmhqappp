import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BRAND = '#6B1010'

const FEARS = [
  'Fear you\'ll be abandoned or outgrow people you love',
  'Fear you\'ll be criticised or called out publicly',
  'Fear you\'ll be exposed as "not good enough"',
  'Fear you\'ll fail privately and publicly',
  'Fear you\'ll freeze or shut down when things get big',
  'Fear you\'ll invest and not get the ROI',
  'Fear you\'ll lose everything as soon as you get ahead',
  'Fear you\'ll lose control as the business grows',
  'Fear you\'ll never reach your true potential',
  'Fear you\'re becoming "too much" for people',
  'Fear you\'re not capable of holding the next level',
  'Fear you\'re not meant for the success you want',
  'Fear your ambition makes you unrelatable',
  'Fear your audience won\'t get you or will misunderstand you',
  'Fear your business growth will expose your flaws',
  'Fear your identity will change faster than you can keep up',
  'Fear your success will create more pressure than you can handle',
  'Fear of being fully seen for who you are',
  'Fear of being perceived the wrong way',
  'Fear of disappointing people who expect a lot from you',
  'Fear of receiving more than your system can hold',
  'Fear of slowing down and losing momentum',
  'Fear of visibility aka the attention, the eyes, the opinions',
]

const TRIGGERS = [
  'Launching a new offer',
  'Posting vulnerable content',
  'Someone unfollows/unsubscribes',
  'A client sets a boundary or gives feedback',
  'A quiet week in sales',
  'Being praised or spotlighted',
  'Money going out (investing, bills)',
  'Unexpected opportunities/invitations',
  'Comparing yourself to others',
  'Receiving a large payment',
  'Being asked to raise your prices',
  'Speaking on a stage or podcast',
]

const BODY_RESPONSES = [
  'Tight chest / shallow breathing',
  'Knot in stomach',
  'Racing heart',
  'Brain fog / dissociation',
  'Restlessness / urge to "do more"',
  'Heavy exhaustion',
  'Numbness / shutdown',
  'Tension in jaw or shoulders',
  'Nausea or loss of appetite',
  'Sweaty palms',
  'Headache or pressure in head',
]

const PROTECTIVE_BEHAVIOURS = [
  'Procrastinate or "busy work"',
  'Over-preparing / over-planning',
  'People-pleasing / softening your truth',
  'Lowering prices / discounting',
  'Avoiding posting or selling',
  'Overworking / hustling',
  'Picking fights or creating drama',
  'Escaping into content (scrolling/bingeing)',
  'Withdrawing from relationships',
  'Perfectionism / endless editing',
  'Self-sabotaging success',
  'Seeking external validation',
]

const emptySteps = () => ({
  step1: { primaryFear: '' },
  step2: { branchType: '' },
  step3: { perceivedBenefits: '', hiddenDrawbacks: '', drawbacksOfFear: '', hiddenBenefits: '' },
  step4: { triggers: [], bodyResponses: [], protectiveBehaviours: [], story: '' },
  step5: { oldQ1: '', oldQ2: '', oldQ3: '', inQ1: '', inQ2: '', inQ3: '', newQ1: '', newQ2: '', newQ3: '' },
  step6: { q1: '', q2: '', q3: '', q4: '', q5: '' },
  step7: { charge: 5 },
})

/* ── Toggle select helpers ── */
const ToggleGrid = ({ options, selected, onToggle, max = 3 }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const isSelected = selected.includes(opt)
      return (
        <button
          key={opt}
          onClick={() => {
            if (isSelected) onToggle(selected.filter(x => x !== opt))
            else if (selected.length < max) onToggle([...selected, opt])
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isSelected ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
          style={isSelected ? { backgroundColor: BRAND } : {}}
        >{opt}</button>
      )
    })}
  </div>
)

/* ── 7-Step Wizard ── */
function WizardModal({ initial, onSave, onClose }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState(initial ? { ...emptySteps(), ...initial } : emptySteps())

  const setS = (stepKey, field, val) => setData(prev => ({ ...prev, [stepKey]: { ...prev[stepKey], [field]: val } }))

  const canNext = () => {
    if (step === 1) return !!data.step1.primaryFear
    if (step === 2) return !!data.step2.branchType
    return true
  }

  const handleSaveExit = () => onSave(data, true)
  const handleComplete = () => onSave(data, false)

  const progressPct = ((step - 1) / 6) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subconscious Identity Map</p>
            <div className="flex gap-2">
              <button onClick={handleSaveExit} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">Save & Exit</button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full">
              <div className="h-2 rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: BRAND }} />
            </div>
            <p className="text-xs font-bold text-gray-500">Step {step} of 7</p>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">

          {step === 1 && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">The Undercurrent Theme</h3>
              <p className="text-sm text-gray-500 mb-5">Choose the main fear or limitation that's currently running the show.</p>
              <label className="label">Select Your Primary Fear</label>
              <select
                className="input-field mb-4"
                value={data.step1.primaryFear}
                onChange={e => setS('step1', 'primaryFear', e.target.value)}
              >
                <option value="">Choose a fear...</option>
                {FEARS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {data.step1.primaryFear && (
                <div className="p-4 rounded-xl border-2 text-sm font-medium text-gray-800" style={{ borderColor: BRAND, backgroundColor: '#FFF8F8' }}>
                  Selected: <strong>{data.step1.primaryFear}</strong>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">The First Experience</h3>
              <p className="text-sm text-gray-500 mb-5">Choose what status your first significant memory around this fear holds.</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    key: 'infatuation',
                    title: 'Infatuation',
                    sub: 'Past – Infatuation / Pleasure / Success',
                    desc: ['Pleasure, success, gain, euphoria, "amazing"', 'Pride, self-sacrifice, self-exaggeration', 'Going above and beyond', 'Arrogance or cockiness'],
                    leads: 'Fantasy',
                    color: '#F59E0B',
                    bg: '#FFFBEB',
                  },
                  {
                    key: 'resentment',
                    title: 'Resentment',
                    sub: 'Past – Resentment / Pain / Failure',
                    desc: ['Pain, failure, setback, loss, trauma, tragedy', 'Guilt, "I let them down"', '"I did the wrong thing"', '"I wasn\'t enough"'],
                    leads: 'Fear',
                    color: BRAND,
                    bg: '#FFF8F8',
                  },
                ].map(branch => (
                  <button
                    key={branch.key}
                    onClick={() => setS('step2', 'branchType', branch.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${data.step2.branchType === branch.key ? 'shadow-md' : 'border-gray-100 hover:border-gray-200'}`}
                    style={data.step2.branchType === branch.key ? { borderColor: branch.color, backgroundColor: branch.bg } : {}}
                  >
                    <p className="font-bold text-sm text-gray-900">{branch.title}</p>
                    <p className="text-xs text-gray-500 mb-2">{branch.sub}</p>
                    {branch.desc.map((d, i) => <p key={i} className="text-xs text-gray-600 mb-0.5">• {d}</p>)}
                    <p className="text-xs font-bold mt-2" style={{ color: branch.color }}>This branch leads to → {branch.leads}</p>
                  </button>
                ))}
              </div>
              {data.step2.branchType && (
                <p className="text-sm font-medium mt-4 p-3 bg-gray-50 rounded-lg text-gray-700">
                  You've selected the <strong>{data.step2.branchType}</strong> → <strong>{data.step2.branchType === 'infatuation' ? 'Fantasy' : 'Fear'}</strong> branch.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              {data.step2.branchType === 'infatuation' ? (
                <>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Future Fantasy</h3>
                  <p className="text-sm text-gray-500 mb-4">How did your mind fast-forward this experience into an idealised future?</p>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4 text-sm text-amber-800">
                    <p className="font-bold mb-2">Future – Fantasy / Desire</p>
                    <p>• Pleasure-seeking, naivety, giddiness</p>
                    <p>• "I'll go over and above," "I love you"</p>
                    <p>• Idealised outcomes and expectations</p>
                  </div>
                  <div className="mb-4">
                    <label className="label">Perceived Benefits of the Fantasy</label>
                    <textarea className="textarea-field" rows={3} value={data.step3.perceivedBenefits} onChange={e => setS('step3', 'perceivedBenefits', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Hidden Drawbacks of Staying in the Fantasy</label>
                    <textarea className="textarea-field" rows={3} value={data.step3.hiddenDrawbacks} onChange={e => setS('step3', 'hiddenDrawbacks', e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Future Fear</h3>
                  <p className="text-sm text-gray-500 mb-4">How did your mind project this experience into a feared future?</p>
                  <div className="p-4 rounded-xl mb-4 text-sm border" style={{ backgroundColor: '#FFF8F8', borderColor: BRAND + '40' }}>
                    <p className="font-bold mb-2">Future – Fear / Avoidance / Scepticism</p>
                    <p>• Shyness, defensiveness, over-guarding</p>
                    <p>• Revenge, entitlement themes</p>
                    <p>• Catastrophic thinking and worst-case scenarios</p>
                  </div>
                  <div className="mb-4">
                    <label className="label">Drawbacks of This Fear</label>
                    <textarea className="textarea-field" rows={3} value={data.step3.drawbacksOfFear} onChange={e => setS('step3', 'drawbacksOfFear', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Hidden Benefits of This Fear</label>
                    <textarea className="textarea-field" rows={3} value={data.step3.hiddenBenefits} onChange={e => setS('step3', 'hiddenBenefits', e.target.value)} />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">How This Pattern Shows Up Now</h3>
              <p className="text-sm text-gray-500 mb-5">Map how this fear plays out in your present-day life and business.</p>

              <div className="mb-5">
                <label className="label mb-2">What triggers this pattern? (Select up to 3)</label>
                <ToggleGrid options={TRIGGERS} selected={data.step4.triggers} onToggle={v => setS('step4', 'triggers', v)} />
              </div>

              <div className="mb-5">
                <label className="label mb-2">How does your body respond? (Select up to 3)</label>
                <ToggleGrid options={BODY_RESPONSES} selected={data.step4.bodyResponses} onToggle={v => setS('step4', 'bodyResponses', v)} />
              </div>

              <div className="mb-5">
                <label className="label mb-2">What protective behaviours show up? (Select up to 3)</label>
                <ToggleGrid options={PROTECTIVE_BEHAVIOURS} selected={data.step4.protectiveBehaviours} onToggle={v => setS('step4', 'protectiveBehaviours', v)} />
              </div>

              <div>
                <label className="label">What is the story you tell yourself when this pattern is active?</label>
                <textarea className="textarea-field" rows={3} value={data.step4.story} onChange={e => setS('step4', 'story', e.target.value)} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Identity / Self-Concept</h3>
              <p className="text-sm text-gray-500 mb-5">Map the transition from your old identity through the in-between to your new identity.</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    col: 'old', label: 'Old Identity', bg: '#FAFAF9', border: '#E5E7EB',
                    qs: [
                      ['oldQ1', 'What patterns from your old identity are still showing up?'],
                      ['oldQ2', 'What beliefs did this old identity hold about success, money, or who you get to be?'],
                      ['oldQ3', 'What behaviours do you notice yourself slipping into when things feel stretchy?'],
                    ],
                  },
                  {
                    col: 'in', label: 'In Between', bg: '#FAFAF9', border: '#E5E7EB',
                    qs: [
                      ['inQ1', 'Where are you currently conflicted or split between old patterns and new standards?'],
                      ['inQ2', 'What new beliefs or behaviours are you practising but not fully owning yet?'],
                      ['inQ3', 'What does your body/nervous system do in this in-between phase?'],
                    ],
                  },
                  {
                    col: 'new', label: 'New Identity', bg: '#FAF5FF', border: '#DDD6FE',
                    qs: [
                      ['newQ1', 'Who is the woman you\'re growing into? Describe her without centring anyone else.'],
                      ['newQ2', 'What beliefs does this version of you hold that you are learning to adopt?'],
                      ['newQ3', 'What behaviours would this identity normalise immediately?'],
                    ],
                  },
                ].map(col => (
                  <div key={col.col} className="rounded-xl p-4 space-y-3 border" style={{ backgroundColor: col.bg, borderColor: col.border }}>
                    <p className="font-black text-xs uppercase tracking-wide text-gray-600">{col.label}</p>
                    {col.qs.map(([field, q]) => (
                      <div key={field}>
                        <p className="text-xs text-gray-500 mb-1 leading-relaxed">{q}</p>
                        <textarea className="textarea-field text-xs" rows={3} value={data.step5[field]} onChange={e => setS('step5', field, e.target.value)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Your Capacity to Hold More</h3>
              <p className="text-sm text-gray-500 mb-5">Explore your nervous system's tolerance for change, growth, and expansion.</p>
              <div className="space-y-4">
                {[
                  ['q1', 'What does your body do the moment things start to grow or move fast?'],
                  ['q2', 'When you imagine holding the next level — more money, more visibility, more clients — what feels unsafe or overwhelming about it?'],
                  ['q3', 'When was the last time you hit an upper limit and pulled back? What triggered the contraction?'],
                  ['q4', 'What level of success feels safe right now, and what level feels like "too much"? Why?'],
                  ['q5', 'What would you need (emotionally, structurally, somatically) to feel safe holding more?'],
                ].map(([field, q], i) => (
                  <div key={field}>
                    <label className="label">{i + 1}. {q}</label>
                    <textarea className="textarea-field" rows={3} value={data.step6[field]} onChange={e => setS('step6', field, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Your Subconscious Identity Review</h3>
              <p className="text-sm text-gray-500 mb-5">A complete overview of your mapping session. Set your emotional charge.</p>

              {/* Charge slider */}
              <div className="card mb-5">
                <label className="label">Emotional Charge Level</label>
                <p className="text-sm text-gray-500 mb-3">0 = Neutral · 10 = Extremely Charged</p>
                <input
                  type="range" min={0} max={10} value={data.step7.charge}
                  onChange={e => setS('step7', 'charge', parseInt(e.target.value))}
                  className="w-full mb-2"
                  style={{ accentColor: '#8B5CF6' }}
                />
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>0 — Neutral</span><span>5</span><span>10 — Extremely Charged</span>
                </div>
                <p className="text-3xl font-black text-center" style={{ color: '#8B5CF6' }}>{data.step7.charge}/10</p>

                {data.step7.charge <= 2 ? (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium">
                    ✓ This emotional charge is under 2/10. You can now mark this as neutralised.
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                    ✗ Your emotional charge is over 2/10. You cannot neutralise this pattern yet.
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-3">
                <div className="card">
                  <p className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-2">Primary Fear & Branch</p>
                  <p className="text-sm text-gray-800">{data.step1.primaryFear}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{data.step2.branchType} branch → {data.step2.branchType === 'infatuation' ? 'Fantasy' : 'Fear'}</p>
                </div>

                {(data.step4.triggers.length > 0 || data.step4.protectiveBehaviours.length > 0) && (
                  <div className="card">
                    <p className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-2">Key Triggers & Protective Behaviours</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {data.step4.triggers.map(t => <span key={t} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{t}</span>)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.step4.protectiveBehaviours.map(b => <span key={b} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{b}</span>)}
                    </div>
                  </div>
                )}

                {data.step4.story && (
                  <div className="card">
                    <p className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-1">Story You Tell Yourself</p>
                    <p className="text-sm text-gray-700 italic">"{data.step4.story}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="py-2.5 px-5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              ← Back
            </button>
          )}
          <div className="flex-1" />
          {step < 7 ? (
            <button
              onClick={() => canNext() && setStep(s => s + 1)}
              disabled={!canNext()}
              className="py-2.5 px-6 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: BRAND }}
            >
              Next →
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleComplete()}
                disabled={data.step7.charge <= 2}
                className={`py-2.5 px-5 rounded-xl text-sm font-bold text-white transition-colors ${data.step7.charge <= 2 ? '' : 'opacity-40 cursor-not-allowed'}`}
                style={data.step7.charge <= 2 ? { backgroundColor: '#10B981' } : { backgroundColor: '#10B981', opacity: 0.4, cursor: 'not-allowed' }}
                title={data.step7.charge > 2 ? 'Charge must be 2 or below to neutralise' : ''}
              >
                Mark as Neutralised
              </button>
              <button
                onClick={handleSaveExit}
                className="py-2.5 px-5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >
                Save & Return
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Pattern Card ── */
function PatternCard({ pattern, onMarkNeutralised, onMarkActive, onEdit, onDelete }) {
  const d = pattern.data || {}
  const isNeutralised = pattern.status === 'neutralised'

  return (
    <div className={`card border-l-4 ${isNeutralised ? 'border-l-emerald-400' : 'border-l-red-400'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isNeutralised ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {isNeutralised ? '✓ Neutralised' : 'Active'}
            </span>
            {pattern.charge !== undefined && (
              <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-semibold">
                Charge: {pattern.charge}/10
              </span>
            )}
          </div>
          <p className="font-semibold text-sm text-gray-900 mt-1">{d.step1?.primaryFear}</p>
          {d.step2?.branchType && (
            <p className="text-xs text-gray-500 capitalize mt-0.5">{d.step2.branchType} branch</p>
          )}
          {d.step4?.triggers?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {d.step4.triggers.slice(0, 3).map(t => (
                <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="edit-btn">✏️</button>
          <button onClick={onDelete} className="delete-btn">🗑️</button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50">
        {isNeutralised ? (
          <button onClick={onMarkActive} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
            Mark as Active
          </button>
        ) : (
          <button
            onClick={onMarkNeutralised}
            disabled={pattern.charge > 2}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${pattern.charge <= 2 ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            title={pattern.charge > 2 ? 'Charge must be 2 or below to neutralise' : ''}
          >
            {pattern.charge <= 2 ? 'Mark as Neutralised' : `Mark as Neutralised (charge too high: ${pattern.charge}/10)`}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function Identity() {
  const { user } = useAuth()
  const [patterns, setPatterns] = useState([])
  const [showWizard, setShowWizard] = useState(false)
  const [editPattern, setEditPattern] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadPatterns = async () => {
    const { data } = await supabase.from('identity_patterns').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    setPatterns(data || [])
    setLoading(false)
  }

  useEffect(() => { loadPatterns() }, [user])

  const handleSavePattern = async (data, exitOnly) => {
    const charge = data.step7?.charge ?? 5
    const status = !exitOnly && charge <= 2 ? 'neutralised' : 'active'

    if (editPattern) {
      const { data: updated } = await supabase.from('identity_patterns')
        .update({ status, charge, data })
        .eq('id', editPattern.id).select().single()
      setPatterns(prev => prev.map(x => x.id === editPattern.id ? updated : x))
    } else {
      const { data: created } = await supabase.from('identity_patterns')
        .insert({ user_id: user.id, status, charge, data })
        .select().single()
      setPatterns(prev => [created, ...prev])
    }
    setShowWizard(false); setEditPattern(null)
  }

  const handleMarkNeutralised = async (id) => {
    const { data } = await supabase.from('identity_patterns').update({ status: 'neutralised' }).eq('id', id).select().single()
    setPatterns(prev => prev.map(x => x.id === id ? data : x))
  }

  const handleMarkActive = async (id) => {
    const { data } = await supabase.from('identity_patterns').update({ status: 'active' }).eq('id', id).select().single()
    setPatterns(prev => prev.map(x => x.id === id ? data : x))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pattern?')) return
    await supabase.from('identity_patterns').delete().eq('id', id)
    setPatterns(prev => prev.filter(x => x.id !== id))
  }

  const neutralised = patterns.filter(p => p.status === 'neutralised')
  const active = patterns.filter(p => p.status === 'active')

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full bg-violet-500" />
          <h1 className="text-2xl font-black text-gray-900">Identity</h1>
        </div>
        <p className="text-sm text-gray-500">
          The inner work: the mindset, regulation, and capacity that allow you to sustainably hold and expand your success.
        </p>
      </div>

      {/* Start new session */}
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-600 mb-1 font-semibold">Subconscious Identity Map</p>
        <p className="text-xs text-gray-400 mb-4">Uncover the fears, patterns, and identity blocks running beneath the surface of your business.</p>
        <button
          onClick={() => { setEditPattern(null); setShowWizard(true) }}
          className="btn-brand"
          style={{ backgroundColor: BRAND }}
        >
          + Start a new subconscious identity map
        </button>
      </div>

      {!loading && patterns.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Neutralised Patterns */}
          <div>
            <h2 className="font-bold text-sm text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Neutralised Patterns ({neutralised.length})
            </h2>
            {neutralised.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No neutralised patterns yet.</p>
            ) : (
              <div className="space-y-3">
                {neutralised.map(p => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    onMarkActive={() => handleMarkActive(p.id)}
                    onEdit={() => { setEditPattern(p); setShowWizard(true) }}
                    onDelete={() => handleDelete(p.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Active Patterns */}
          <div>
            <h2 className="font-bold text-sm text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Active Patterns ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No active patterns.</p>
            ) : (
              <div className="space-y-3">
                {active.map(p => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    onMarkNeutralised={() => handleMarkNeutralised(p.id)}
                    onEdit={() => { setEditPattern(p); setShowWizard(true) }}
                    onDelete={() => handleDelete(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showWizard && (
        <WizardModal
          initial={editPattern ? editPattern.data : null}
          onSave={handleSavePattern}
          onClose={() => { setShowWizard(false); setEditPattern(null) }}
        />
      )}
    </div>
  )
}
