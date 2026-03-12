import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWeekKey, getWeekBounds } from '../lib/utils'
import html2canvas from 'html2canvas'

const BRAND = '#6B1010'
const PILLAR_COLORS = {
  Influence: '#3B82F6',
  Visibility: '#F59E0B',
  Cash: '#10B981',
  Identity: '#8B5CF6',
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
function PillarRatingBox({ pillar, value, onChange }) {
  const [showPad, setShowPad] = useState(false)
  const color = PILLAR_COLORS[pillar]
  return (
    <div className="relative">
      <button
        onClick={() => setShowPad(!showPad)}
        className="w-full rounded-xl p-4 text-left border-2 transition-all"
        style={value ? { borderColor: color, backgroundColor: color + '15' } : { borderColor: '#E5E7EB', backgroundColor: 'white' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <p className="text-xs font-black uppercase tracking-wide text-gray-700">{pillar}</p>
        </div>
        <p className="text-3xl font-black" style={{ color: value ? color : '#D1D5DB' }}>
          {value !== null ? `${value}/10` : '—'}
        </p>
      </button>
      {showPad && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10 w-full">
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
const ReviewDownloadCard = React.forwardRef(({ review, weekKey, monday, sunday, year }, ref) => {
  const nsLabel = NS_OPTIONS.find(x => x.key === review.nervous_system)?.label || ''
  return (
    <div ref={ref} className="bg-white p-8" style={{ width: '800px', fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b-4 pb-4 mb-6" style={{ borderColor: BRAND }}>
        <p className="font-black text-2xl" style={{ color: BRAND }}>WOMAN MASTERY HQ</p>
        <p className="text-gray-500 text-sm tracking-widest uppercase">Weekly Review</p>
        <p className="text-gray-700 text-sm mt-1">Week of {monday} – {sunday}, {year}</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {PILLARS.map(p => (
          <div key={p} className="rounded-xl p-3 text-center" style={{ backgroundColor: PILLAR_COLORS[p] + '15', border: `2px solid ${PILLAR_COLORS[p]}40` }}>
            <p className="text-xs font-bold uppercase text-gray-600">{p}</p>
            <p className="text-2xl font-black" style={{ color: PILLAR_COLORS[p] }}>{review.pillar_ratings?.[p] ?? '—'}{review.pillar_ratings?.[p] ? '/10' : ''}</p>
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
        <div key={label} className="mb-4">
          <p className="font-black text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
          <p className="text-sm text-gray-800">{val}</p>
        </div>
      ))}

      <p className="text-[10px] text-gray-400 mt-8 border-t border-gray-100 pt-4">
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
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [doneSaved, setDoneSaved] = useState(false)
  const downloadRef = useRef(null)
  const [showDownload, setShowDownload] = useState(false)

  useEffect(() => {
    supabase.from('weekly_reviews').select('*').eq('user_id', user.id).eq('week_key', weekKey).single()
      .then(({ data }) => {
        if (data && !data.is_completed) {
          setReview(data.data || emptyReview())
          setDbId(data.id)
          setStarted(true)
        }
      })
  }, [user])

  const setField = (k, v) => setReview(prev => ({ ...prev, [k]: v }))
  const setPillar = (pillar, val) => setReview(prev => ({ ...prev, pillar_ratings: { ...prev.pillar_ratings, [pillar]: val } }))

  const save = async (data) => {
    if (dbId) {
      await supabase.from('weekly_reviews').update({ data }).eq('id', dbId)
    } else {
      const { data: created } = await supabase.from('weekly_reviews').insert({ user_id: user.id, week_key: weekKey, data, is_completed: false }).select().single()
      setDbId(created.id)
    }
  }

  // Autosave on change
  useEffect(() => {
    if (!started) return
    const t = setTimeout(() => save(review), 800)
    return () => clearTimeout(t)
  }, [review, started])

  const handleStart = () => setStarted(true)

  const handleDone = async () => {
    await supabase.from('weekly_reviews').update({ is_completed: true }).eq('id', dbId)
    setDoneSaved(true)
  }

  const handleConfirmDone = async () => {
    await handleDone()
    setStarted(false)
    setReview(emptyReview())
    setDbId(null)
    setShowDoneModal(false)
  }

  const handleDownload = async () => {
    setShowDownload(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      const canvas = await html2canvas(downloadRef.current, { scale: 2, backgroundColor: '#ffffff' })
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
        <h1 className="font-black text-2xl text-gray-900 mb-1">WMHQ Weekly Review</h1>
        <p className="text-gray-500 mb-6">
          Week of {monday} to {sunday}, {year}
        </p>
        <p className="text-xs text-gray-400 mb-6">Your review autosaves as you type. A new review opens each Monday.</p>
        <button onClick={handleStart} className="btn-brand px-8 py-3 text-base rounded-xl" style={{ backgroundColor: BRAND }}>
          Start Weekly Review
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-gray-900">Weekly Review</h1>
          <p className="text-sm text-gray-500">Week of {monday} – {sunday}, {year}</p>
          <p className="text-xs text-gray-400 mt-0.5">Autosaving as you type...</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="py-2 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            ↓ Download
          </button>
          <button onClick={() => setShowDoneModal(true)} className={`py-2 px-4 rounded-xl text-sm font-bold transition-colors ${doneSaved ? 'bg-emerald-500 text-white' : 'text-white'}`} style={!doneSaved ? { backgroundColor: BRAND } : {}}>
            {doneSaved ? '✓ Review Done' : 'Mark as Done'}
          </button>
        </div>
      </div>

      {/* Pillar ratings */}
      <div className="card-section">
        <h2 className="section-title">Pillar Ratings</h2>
        <p className="text-xs text-gray-400 mb-4">Click a pillar to rate this week.</p>
        <div className="grid grid-cols-4 gap-3">
          {PILLARS.map(p => (
            <PillarRatingBox key={p} pillar={p} value={review.pillar_ratings?.[p]} onChange={v => setPillar(p, v)} />
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
              placeholder={`Type here...`}
            />
          </div>
        ))}

        <div>
          <label className="label">Strongest Phase This Week</label>
          <div className="flex flex-wrap gap-2">
            {PILLARS.map(p => (
              <button key={p} onClick={() => setField('strongest_phase', review.strongest_phase === p ? '' : p)}
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
              <button key={p} onClick={() => setField('most_challenging_phase', review.most_challenging_phase === p ? '' : p)}
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
              onClick={() => setField('nervous_system', review.nervous_system === opt.key ? '' : opt.key)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${review.nervous_system === opt.key ? 'border-brand shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              style={review.nervous_system === opt.key ? { borderColor: BRAND, backgroundColor: '#FFF8F8' } : {}}
            >
              <div className="text-2xl mb-1">{opt.emoji}</div>
              <p className="text-xs font-semibold text-gray-700">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Done Modal */}
      {showDoneModal && (
        <div className="modal-overlay" onClick={() => setShowDoneModal(false)}>
          <div className="modal-box p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Mark this week as done?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will clear your review. Make sure you have downloaded it first.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDoneModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={handleConfirmDone} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>Yes, I'm done</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden download template */}
      <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
        {showDownload && (
          <ReviewDownloadCard
            ref={downloadRef}
            review={review}
            weekKey={weekKey}
            monday={monday}
            sunday={sunday}
            year={year}
          />
        )}
      </div>
    </div>
  )
}
