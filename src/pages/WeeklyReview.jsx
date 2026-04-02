import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWeekKey, getWeekBounds } from '../lib/utils'
import html2canvas from 'html2canvas'

const BRAND = '#3d0c0c'
const PILLAR_COLORS = {
  Influence: '#c6def2',
  Visibility: '#fcc799',
  Cash: '#cdd5ae',
  Identity: '#e7cee3',
}
const PILLARS = Object.keys(PILLAR_COLORS)
const NS_OPTIONS = [
  { key: 'overwhelmed', label: 'Overwhelmed', emoji: '😵' },
  { key: 'neutral', label: 'Neutral', emoji: '😐' },
  { key: 'good', label: 'Good', emoji: '😊' },
  { key: 'energised', label: 'Energised', emoji: '⚡' },
]

const weekKey = getWeekKey()
const { monday, sunday, year } = getWeekBounds()

const emptyReview = () => ({
  pillar_ratings: { Influence: null, Visibility: null, Cash: null, Identity: null },
  wins: '', strongest_phase: '', challenges: '', most_challenging_phase: '',
  intentions: '', what_avoided: '', nervous_system: '',
})

/* ── Pillar Rating Box ── */
function PillarRatingBox({ pillar, value, onChange, disabled }) {
  const [showPad, setShowPad] = useState(false)
  const color = PILLAR_COLORS[pillar]
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setShowPad(!showPad)}
        disabled={disabled}
        className="w-full rounded-xl p-4 text-left border-2 transition-all"
        style={value ? { borderColor: color, backgroundColor: color + '15' } : { borderColor: '#E5E7EB', backgroundColor: '#f7f7f7' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <p className="text-xs font-black uppercase tracking-wide text-gray-700">{pillar}</p>
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '32px', fontWeight: 300, fontStyle: 'italic', color: value ? color : '#D1D5DB' }}>
          {value !== null ? `${value}/10` : '—'}
        </p>
      </button>
      {showPad && !disabled && (
        <div className="absolute top-full left-0 mt-2 bg-[#f7f7f7] border border-gray-200 rounded-xl shadow-lg p-3 z-10 w-full">
          <div className="grid grid-cols-5 gap-1.5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => { onChange(n); setShowPad(false) }}
                className="py-2 rounded-lg text-sm font-bold transition-colors hover:text-white"
                style={value === n ? { backgroundColor: color, color: 'white' } : { backgroundColor: '#F3F4F6', color: '#374151' }}
              >{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Download card ── */
const ReviewDownloadCard = React.forwardRef(({ review, monday, sunday, year }, ref) => {
  const nsLabel = NS_OPTIONS.find(x => x.key === review.nervous_system)?.label || ''
  return (
    <div ref={ref} style={{ width: '800px', fontFamily: 'Inter, sans-serif', backgroundColor: '#f7f7f7', padding: '32px' }}>
      <div style={{ borderBottom: `4px solid ${BRAND}`, paddingBottom: '16px', marginBottom: '24px' }}>
        <p style={{ fontWeight: 900, fontSize: '24px', color: BRAND, margin: 0 }}>WOMAN MASTERY HQ</p>
        <p style={{ color: '#6B7280', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 0' }}>Weekly Review</p>
        <p style={{ color: '#374151', fontSize: '14px', margin: '4px 0 0' }}>Week of {monday} – {sunday}, {year}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {PILLARS.map(p => (
          <div key={p} style={{ borderRadius: '12px', padding: '12px', textAlign: 'center', backgroundColor: PILLAR_COLORS[p] + '15', border: `2px solid ${PILLAR_COLORS[p]}40` }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', margin: '0 0 4px' }}>{p}</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: PILLAR_COLORS[p], margin: 0 }}>
              {review.pillar_ratings?.[p] ?? '—'}{review.pillar_ratings?.[p] ? '/10' : ''}
            </p>
          </div>
        ))}
      </div>

      {[
        ['Wins This Week', review.wins],
        ['Strongest Phase', review.strongest_phase],
        ['Challenges', review.challenges],
        ['Most Challenging Phase', review.most_challenging_phase],
        ['Intentions for Next Week', review.intentions],
        ['What I Avoided', review.what_avoided],
        ['Nervous System', nsLabel],
      ].filter(([, v]) => v).map(([label, val]) => (
        <div key={label} style={{ marginBottom: '16px' }}>
          <p style={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', margin: '0 0 4px' }}>{label}</p>
          <p style={{ fontSize: '14px', color: '#1F2937', margin: 0 }}>{val}</p>
        </div>
      ))}

      <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '32px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
        This work is the sole property of Jessica Pinili. All rights reserved.
      </p>
    </div>
  )
})

/* ── Main Page ── */
export default function WeeklyReview() {
  const { user } = useAuth()
  const [review, setReview] = useState(emptyReview())
  const [dbId, setDbId] = useState(null)
  const [started, setStarted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const downloadRef = useRef(null)
  const [showDownload, setShowDownload] = useState(false)

  useEffect(() => {
    supabase.from('weekly_reviews').select('*').eq('user_id', user.id).eq('week_key', weekKey).single()
      .then(({ data }) => {
        if (data) {
          setReview(data.data || emptyReview())
          setDbId(data.id)
          setStarted(true)
          if (data.is_completed) {
            setIsCompleted(true)
          }
        }
      })
  }, [user])

  const setField = (k, v) => {
    if (isCompleted) return
    setReview(prev => ({ ...prev, [k]: v }))
  }
  const setPillar = (pillar, val) => {
    if (isCompleted) return
    setReview(prev => ({ ...prev, pillar_ratings: { ...prev.pillar_ratings, [pillar]: val } }))
  }

  const save = async (data) => {
    if (dbId) {
      await supabase.from('weekly_reviews').update({ data }).eq('id', dbId)
    } else {
      const { data: created, error } = await supabase.from('weekly_reviews').insert({ user_id: user.id, week_key: weekKey, data, is_completed: false }).select().single()
      if (error || !created) { console.error('Failed to create weekly review:', error); return }
      setDbId(created.id)
    }
  }

  // Autosave on change (only while not completed)
  useEffect(() => {
    if (!started || isCompleted) return
    const t = setTimeout(() => save(review), 800)
    return () => clearTimeout(t)
  }, [review, started, isCompleted])

  const handleStart = () => setStarted(true)

  const handleConfirmDone = async () => {
    await supabase.from('weekly_reviews').update({ is_completed: true }).eq('id', dbId)
    setIsCompleted(true)
    setShowDoneModal(false)
  }

  const handleDownload = async () => {
    setShowDownload(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      const el = downloadRef.current
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      })
      const link = document.createElement('a')
      link.download = `WMHQ-Weekly-Review-${weekKey}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('Download failed. Please try again.')
    }
    setShowDownload(false)
  }

  if (!started) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="page-title mb-1">WMHQ Weekly Review</h1>
        <p className="text-gray-500 mb-6">
          Week of {monday} to {sunday}, {year}
        </p>
        <p className="text-xs text-gray-400 mb-6">Your review autosaves as you type. A new review opens each Monday.</p>
        <button onClick={handleStart} className="btn-brand px-5 rounded-lg">
          Start Weekly Review
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header — Download only */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Weekly Review</h1>
          <p className="text-sm text-gray-500">Week of {monday} – {sunday}, {year}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isCompleted ? '✓ Review completed and locked' : 'Autosaving as you type...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <button
              onClick={async () => {
                if (!window.confirm('Unlock this review to edit it again?')) return
                await supabase.from('weekly_reviews').update({ is_completed: false }).eq('id', dbId)
                setIsCompleted(false)
              }}
              title="Unlock review"
              className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
          <button onClick={handleDownload} className="py-1.5 px-3.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">
            ↓ Download
          </button>
        </div>
      </div>

      {/* Pillar ratings */}
      <div className="card-section">
        <h2 className="section-title">Pillar Ratings</h2>
        <p className="text-xs text-gray-400 mb-4">
          {isCompleted ? 'Completed.' : 'Click a pillar to rate this week.'}
        </p>
        <div className="grid grid-cols-4 gap-3">
          {PILLARS.map(p => (
            <PillarRatingBox key={p} pillar={p} value={review.pillar_ratings?.[p]} onChange={v => setPillar(p, v)} disabled={isCompleted} />
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="card-section space-y-5">
        {[
          ['wins', 'Wins This Week'],
          ['challenges', 'Challenges'],
          ['intentions', 'Intentions for Next Week'],
          ['what_avoided', 'What You Avoided'],
        ].map(([field, label]) => (
          <div key={field}>
            <label className="label">{label}</label>
            <textarea
              className="textarea-field"
              rows={3}
              value={review[field]}
              onChange={e => setField(field, e.target.value)}
              placeholder="Type here..."
              disabled={isCompleted}
              readOnly={isCompleted}
            />
          </div>
        ))}

        <div>
          <label className="label">Strongest Phase This Week</label>
          <div className="flex flex-wrap gap-2">
            {PILLARS.map(p => (
              <button key={p}
                onClick={() => !isCompleted && setField('strongest_phase', review.strongest_phase === p ? '' : p)}
                disabled={isCompleted}
                className={`tag-btn ${review.strongest_phase === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={review.strongest_phase === p ? { backgroundColor: PILLAR_COLORS[p] } : {}}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Most Challenging Phase</label>
          <div className="flex flex-wrap gap-2">
            {PILLARS.map(p => (
              <button key={p}
                onClick={() => !isCompleted && setField('most_challenging_phase', review.most_challenging_phase === p ? '' : p)}
                disabled={isCompleted}
                className={`tag-btn ${review.most_challenging_phase === p ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`}
                style={review.most_challenging_phase === p ? { backgroundColor: PILLAR_COLORS[p] } : {}}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nervous System Check-In */}
      <div className="card-section">
        <h2 className="section-title">Nervous System Check-In</h2>
        <div className="grid grid-cols-4 gap-3">
          {NS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => !isCompleted && setField('nervous_system', review.nervous_system === opt.key ? '' : opt.key)}
              disabled={isCompleted}
              className={`p-4 rounded-xl border-2 text-center transition-all ${review.nervous_system === opt.key ? 'border-brand shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              style={review.nervous_system === opt.key ? { borderColor: BRAND, backgroundColor: '#FFF8F8' } : {}}
            >
              <div className="text-2xl mb-1">{opt.emoji}</div>
              <p className="text-xs font-semibold text-gray-700">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom action row */}
      <div className="flex justify-end pb-8">
        {isCompleted ? (
          <div className="insight-box" style={{ padding: '6px 16px' }}>
            ✓ Review Completed
          </div>
        ) : (
          <button
            onClick={() => setShowDoneModal(true)}
            className="py-1.5 px-4 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#3d0c0c' }}
          >
            Review Done
          </button>
        )}
      </div>

      {/* Done Modal */}
      {showDoneModal && (
        <div className="modal-overlay" onClick={() => setShowDoneModal(false)}>
          <div className="modal-box p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Mark this week as done?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Your review will be locked and saved. You can still view and download it anytime this week.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDoneModal(false)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={handleConfirmDone} className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#3d0c0c' }}>Yes, I'm done</button>
            </div>
          </div>
        </div>
      )}

      {/* Download template — rendered via portal directly into body to avoid any parent clipping */}
      {showDownload && ReactDOM.createPortal(
        <div style={{ position: 'absolute', top: 0, left: '-9999px', overflow: 'visible' }} aria-hidden="true">
          <ReviewDownloadCard
            ref={downloadRef}
            review={review}
            monday={monday}
            sunday={sunday}
            year={year}
          />
        </div>,
        document.body
      )}
    </div>
  )
}
