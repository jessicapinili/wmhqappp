import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getDateKey, getDayOfYear } from '../lib/utils'
import { ResetIcon } from '../lib/icons'

const BRAND = '#3d0c0c'

const CHECKLIST_DATA = {
  'New Followers': {
    CONNECT: [
      'Share a belief you refuse to compromise on in business',
      'Share something people misunderstand about your industry',
      'Explain one mistake beginners always make',
      'Share a lesson you learned the hard way',
      'Share a rule you follow when creating results',
      'Share something unpopular you believe about your niche',
      'Explain why most people struggle in your industry',
      'Share a personal leadership habit',
      'Share something you stopped doing that improved results',
      'Talk about a challenge that made you better',
      'Share what discipline looks like in your field',
      'Explain what separates professionals from amateurs',
      'Share a mindset shift that improved your results',
      'Talk about something you believed early in your career that changed',
      'Share a moment that changed how you think about business',
      'Explain why consistency matters in your field',
      'Share how you stay focused during busy seasons',
      'Share what long-term thinking looks like in your industry',
      'Explain what people underestimate about your field',
      'Share something people should take more seriously',
      'Share something you learned from experience',
      'Explain why shortcuts fail in your industry',
      'Share a leadership decision you had to make',
      'Talk about the discipline required behind your work',
      'Share something that shaped your standards',
    ],
    'CREATE DEMAND': [
      'Explain a mindset shift that improves results',
      'Break down what high standards look like in your niche',
      'Show what quality work actually requires',
      'Explain why shortcuts fail in your industry',
      'Break down a step most people skip',
      'Show what professionals do differently',
      'Share a framework that improves results',
      'Explain why most people struggle to get outcomes',
      'Break down a myth in your industry',
      'Show how experts think about this problem',
      'Explain the real work behind great results',
      'Show how small improvements compound',
      'Explain what beginners usually get wrong',
      'Break down the structure behind success in your field',
      'Explain why patience matters for results',
      'Share the difference between activity and progress',
      'Break down how professionals approach improvement',
      'Show what real discipline looks like in your field',
      'Explain why people stay stuck in this area',
      'Break down how results actually happen',
      'Share a method that improves outcomes',
      'Explain the biggest misconception in your niche',
      'Show what real improvement actually looks like',
      'Break down how people sabotage progress',
      'Explain the standard required for real results',
    ],
    ACTIVATE: [
      'Explain how your offer solves a specific bottleneck',
      'Share a moment a client realised they needed your help',
      'Break down the transformation your clients experience',
      'Show the before and after of your process',
      'Explain why this problem keeps people stuck',
      'Share the biggest benefit clients gain from solving this',
      'Break down what life looks like after fixing this problem',
      'Explain the cost of not solving this issue',
      'Share a result one of your clients experienced',
      'Explain who this offer is best suited for',
      'Break down the first improvement clients notice',
      'Show how your method works step by step',
      'Share a moment when a client saw real progress',
      'Explain why solving this creates momentum',
      'Break down the biggest bottleneck your offer removes',
      'Show how solving this improves other areas of life or business',
      'Explain why most people delay solving this problem',
      'Share a scenario where this solution made a difference',
      'Break down the result people are really buying',
      'Explain how your method is different from others',
      'Show the long-term benefit of solving this problem',
      'Share something clients often say after working with you',
      'Break down how small changes lead to big results',
      'Explain why solving this now matters',
      'Share what clients gain beyond the obvious result',
    ],
  },
  'Build Trust': {
    CONNECT: [
      'Share how you organise your day as a leader',
      'Show what preparation looks like before important work',
      'Share how you maintain high standards',
      'Explain how you approach problem solving',
      'Share something you consistently prioritise',
      'Explain how you stay disciplined during busy seasons',
      'Show how you approach long-term growth',
      'Share a principle that guides your work',
      'Explain how you make decisions in business',
      'Share how you maintain consistency',
      'Show what leadership looks like behind the scenes',
      'Explain how you approach challenges',
      'Share how you stay accountable to your standards',
      'Show how you handle setbacks',
      'Share a rule that guides your work',
      'Explain how you improve your craft',
      'Share how you maintain focus in your work',
      'Show how you plan important work',
      'Share how you approach personal growth',
      'Explain how you build discipline',
      'Share something that strengthened your leadership',
      'Explain how you improve over time',
      'Share how you handle pressure',
      'Show how you evaluate your own performance',
      'Share how you build resilience',
    ],
    'CREATE DEMAND': [
      'Break down your process for getting results',
      'Show the steps behind your method',
      'Explain how you approach solving this problem',
      'Break down the framework you use with clients',
      'Show the thinking behind your process',
      'Explain how you diagnose this problem',
      'Share how you structure your work',
      'Break down the stages of your method',
      'Show how you approach this challenge',
      'Explain the strategy behind your results',
      'Share how you guide clients through this process',
      'Break down how professionals approach this issue',
      'Show how you improve outcomes',
      'Explain the structure behind your results',
      'Share how you refine your method over time',
      'Break down the key stages of improvement',
      'Show how your system works step by step',
      'Explain the biggest mistake people make here',
      'Share the key principle behind your work',
      'Break down the strategy that produces results',
      'Explain the logic behind your approach',
      'Show how you simplify complex problems',
      'Share how you help clients move forward',
      'Explain the thinking behind your framework',
      'Break down how progress happens',
    ],
    ACTIVATE: [
      'Explain how someone knows they need your offer',
      'Share a scenario where your solution helped someone',
      'Break down the transformation your offer provides',
      'Explain what clients gain from working with you',
      'Share a breakthrough a client experienced',
      'Break down what happens inside your program',
      'Explain the outcome your clients are working toward',
      'Share a client success story',
      'Explain why solving this problem matters now',
      'Break down the first change clients notice',
      'Share what clients often say after solving this problem',
      'Explain the long-term benefit of fixing this issue',
      'Share a moment when a client saw the bigger picture',
      'Break down what clients gain beyond the obvious result',
      'Explain the biggest obstacle your offer removes',
      'Share the most common challenge your clients face',
      'Break down the result people truly want',
      'Explain why this solution works',
      'Share what makes your approach effective',
      'Break down the improvement clients experience',
      'Explain the difference between struggling and solving this',
      'Share what life looks like after solving this problem',
      'Explain why people delay fixing this issue',
      'Break down the real cost of staying stuck',
      'Share why solving this now matters',
    ],
  },
  'Sell/Launch': {
    CONNECT: [
      'Share a belief you have about money in business',
      'Explain why most businesses struggle with revenue',
      'Share a lesson you learned about selling',
      'Explain why pricing matters in business',
      'Share something people misunderstand about sales',
      'Explain why confidence affects revenue',
      'Share a money mindset shift you had',
      'Explain why businesses need strong offers',
      'Share what selling taught you about people',
      'Explain why value determines pricing',
      'Share something you learned about demand',
      'Explain why sales require leadership',
      'Share a turning point in your revenue journey',
      'Explain why consistency matters in selling',
      'Share something people avoid about sales',
      'Explain why clarity increases conversions',
      'Share a pricing mistake you made early on',
      'Explain why revenue requires strategy',
      'Share what changed your approach to selling',
      'Explain why undercharging hurts businesses',
      'Share a sales insight you learned from experience',
      'Explain why businesses need predictable revenue',
      'Share a lesson you learned from losing a sale',
      'Explain why positioning affects pricing',
      'Share something founders must learn about money',
    ],
    'CREATE DEMAND': [
      'Break down how you structure your offers',
      'Explain how you price your services',
      'Share how you prepare for sales conversations',
      'Break down how you identify client problems',
      'Explain how you improve conversion rates',
      'Show how you structure a sales call',
      'Break down how you present your offer clearly',
      'Explain how you evaluate demand',
      'Share how you refine your offers',
      'Break down how you create value for clients',
      'Explain how you analyse sales performance',
      'Share how you qualify potential clients',
      'Break down how you design better offers',
      'Explain how you handle objections',
      'Share how you improve client experience',
      'Break down the structure of your pricing',
      'Explain how you increase perceived value',
      'Share how you improve sales messaging',
      'Break down how you build long-term clients',
      'Explain how you improve your offer over time',
      'Share how you identify buying signals',
      'Break down how you position your offer',
      'Explain how you test pricing strategies',
      'Share how you strengthen your sales process',
      'Break down how strong offers are built',
    ],
    ACTIVATE: [
      'Explain who your offer is designed for',
      'Share the transformation your offer provides',
      'Break down the problem your offer solves',
      'Show what clients gain from working with you',
      'Explain the biggest bottleneck your offer removes',
      'Share a recent client result',
      'Break down what happens inside your program',
      'Explain why solving this problem matters now',
      'Share a story of someone who benefited from your work',
      'Break down the first change clients experience',
      'Explain why this solution works',
      'Share a common challenge your clients face',
      'Break down the outcome people want',
      'Explain the long-term benefits of solving this problem',
      'Share a client breakthrough moment',
      'Explain what makes your approach effective',
      'Break down the results clients achieve',
      'Share what clients often say after working with you',
      'Explain why this investment matters',
      'Break down the opportunity cost of not solving this',
      'Explain the result clients are really buying',
      'Share what life looks like after solving this problem',
      'Break down why this offer exists',
      'Explain what makes this solution different',
      'Share the long-term impact of solving this problem',
    ],
  },
}

const TABS = ['New Followers', 'Build Trust', 'Sell/Launch']
const COLS = ['CONNECT', 'CREATE DEMAND', 'ACTIVATE']
const COL_SUBTITLES = {
  CONNECT: 'Attracting new eyes',
  'CREATE DEMAND': 'Shift their perspective',
  ACTIVATE: 'Selling to them',
}

const CHECKLIST_TAB_COLORS = {
  'New Followers': { bg: '#c6def2', text: '#1e4d78' },
  'Build Trust': { bg: '#fcc799', text: '#7a3c0a' },
  'Sell/Launch': { bg: '#cdd5ae', text: '#3d4a1c' },
}

function seededShuffle(arr, seed) {
  const a = [...arr]
  let s = (seed ^ 0xdeadbeef) >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getDailyPrompts(tab, col, dayOfYear, year) {
  const tabIdx = TABS.indexOf(tab)
  const colIdx = COLS.indexOf(col)
  const seed = (year * 366 + dayOfYear) * 100 + tabIdx * 10 + colIdx
  return seededShuffle(CHECKLIST_DATA[tab][col], seed).slice(0, 2)
}

/* ─── Daily Marketing Checklist ─── */
export default function DailyMarketingChecklist() {
  const { user } = useAuth()
  const dateKey = getDateKey()

  const [checklistTab, setChecklistTab] = useState('New Followers')
  const [checked, setChecked] = useState({})
  const [checklistComplete, setChecklistComplete] = useState(false)

  const todayDate = new Date()
  const dayOfYear = getDayOfYear(todayDate)
  const currentYear = todayDate.getFullYear()

  useEffect(() => {
    supabase.from('daily_checklist').select('*').eq('user_id', user.id).eq('date_key', dateKey).single()
      .then(({ data }) => {
        if (data) { setChecked(data.checked_items || {}); setChecklistComplete(data.is_complete || false) }
      })
  }, [user, dateKey])

  const toggleCheck = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    setChecklistComplete(false)
  }

  const saveChecklist = async (items, complete) => {
    await supabase.from('daily_checklist').upsert(
      { user_id: user.id, date_key: dateKey, checked_items: items, is_complete: complete },
      { onConflict: 'user_id,date_key' }
    )
  }

  const completeChecklist = () => { setChecklistComplete(true); saveChecklist(checked, true) }
  const resetChecklist = () => { setChecked({}); setChecklistComplete(false); saveChecklist({}, false) }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#c6def2' }} />
          <h1 className="page-title">Daily Marketing Checklist</h1>
        </div>
        <p className="text-sm text-gray-500">
          Your daily content prompts across every stage of the buyer journey. Resets daily.
        </p>
      </div>

      {/* Daily Marketing Checklist */}
      <div className="card-section">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="section-title">Daily Marketing Checklist</h2>
            <p className="section-subtitle">Resets daily</p>
          </div>
          <div className="flex gap-2 items-center">
            {checklistComplete ? (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100">✓ Done today</span>
            ) : (
              <button onClick={completeChecklist} className="btn-brand text-xs">Complete Today</button>
            )}
            <button onClick={resetChecklist} title="Reset" className="edit-btn"><ResetIcon /></button>
          </div>
        </div>

        <div className="flex gap-1 mb-5">
          {TABS.map(tab => {
            const pc = CHECKLIST_TAB_COLORS[tab]
            return (
              <button
                key={tab}
                onClick={() => setChecklistTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={checklistTab === tab
                  ? { backgroundColor: pc.bg, color: pc.text }
                  : { color: '#9ca3af', backgroundColor: 'transparent' }}
              >{tab}</button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COLS.map(col => {
            const prompts = getDailyPrompts(checklistTab, col, dayOfYear, currentYear)
            return (
              <div key={col}>
                <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-0.5">{col}</p>
                <p className="text-xs text-gray-400 mb-3">{COL_SUBTITLES[col]}</p>
                <div className="space-y-2">
                  {prompts.map((item, i) => {
                    const key = `${checklistTab}-${col}-${i}`
                    return (
                      <label key={key}
                        className="flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={!!checked[key]}
                          onChange={() => toggleCheck(key)}
                          className="mt-0.5 flex-shrink-0"
                          style={{ accentColor: BRAND }}
                        />
                        <span className={`text-xs leading-relaxed ${checked[key] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
