import React, { useState } from 'react'

/* The optional creative direction a member brainstorms against a revenue event.
   Shared so the revenue planner and the launch wizard ask exactly the same things,
   and so answers carry across untouched when an event becomes a campaign. */

export const CREATIVE_INTRO =
  'All optional. Use this space to shape how the campaign will look, feel and connect with ' +
  'your buyer. Anything added here will carry across if the revenue event becomes a launch campaign.'

export const CREATIVE_FIELDS = [
  {
    key: 'concept',
    label: 'Campaign concept',
    hint: 'The overarching creative idea that connects the campaign. Think beyond the discount or offer itself.',
    examples: [
      ['Product', '“The Winter Skin Rescue” featuring products that support dry, sensitive winter skin.'],
      ['Service', '“Your Brand’s Next Chapter” for a photographer offering refreshed brand shoots.'],
      ['Info-based', '“Stop Starting Over” for a membership helping women build consistent habits.'],
    ],
  },
  {
    key: 'buyer_moment',
    label: 'Buyer moment',
    hint: 'What is happening in your buyer’s life, business or mind that makes this campaign relevant now?',
    examples: [
      ['Product', 'Winter has arrived and her usual moisturiser is no longer helping with dryness and tightness.'],
      ['Service', 'She is entering a new quarter but her current branding no longer reflects the level of her business.'],
      ['Info-based', 'She keeps setting goals but loses momentum after the first few weeks.'],
    ],
  },
  {
    key: 'core_message',
    label: 'Core message',
    hint: 'The one idea you want your buyer to understand, feel or act on after seeing the campaign.',
    examples: [
      ['Product', 'Your sensitive skin can feel deeply nourished without adding another complicated routine.'],
      ['Service', 'Your brand visuals should reflect the business you have grown into.'],
      ['Info-based', 'You do not need more motivation. You need a repeatable system that helps you continue.'],
    ],
  },
  {
    key: 'hooks',
    label: 'Creative hooks',
    hint: 'Potential headlines, opening lines, campaign angles or phrases that will capture attention.',
    examples: [
      ['Product', '“Your winter skin is asking for something different.”'],
      ['Service', '“Your business has evolved. Have your brand photos?”'],
      ['Info-based', '“You are not inconsistent. Your current system was never built for your real life.”'],
    ],
  },
  {
    key: 'offer',
    label: 'Offer or incentive',
    hint: 'The commercial reason to act now. This could be a bundle, bonus, limited edition, event, gift or time-sensitive benefit.',
    examples: [
      ['Product', 'Purchase the Winter Skin Duo and receive a complimentary travel-sized balm.'],
      ['Service', 'Book a brand shoot this month and receive a pre-shoot content-planning session.'],
      ['Info-based', 'Join the program during launch week and receive a private implementation workshop.'],
    ],
  },
  {
    key: 'visual_direction',
    label: 'Visual direction',
    hint: 'Describe the desired colours, imagery, styling, mood, locations, props or references.',
    examples: [
      ['Product', 'Warm bathroom lighting, rich cream textures, soft towels and close-up skin shots.'],
      ['Service', 'Editorial office imagery, confident movement, deep neutrals and polished behind-the-scenes footage.'],
      ['Info-based', 'Notebook pages, progress trackers, candid working moments and energetic pops of colour.'],
    ],
  },
  {
    key: 'activation_ideas',
    label: 'Activation ideas',
    hint: 'Ways to bring the concept to life through content, collaborations, events, community participation or customer experiences.',
    examples: [
      ['Product', 'A seven-day skin diary, customer texture reactions and a collaboration with a local facialist.'],
      ['Service', 'A live profile review, client before-and-afters and a local founder headshot morning.'],
      ['Info-based', 'A five-day challenge, member progress stories and a live “build your plan with me” workshop.'],
    ],
  },
  {
    key: 'low_budget',
    label: 'Low-budget version',
    hint: 'The simplest way to execute the campaign using the audience, skills, assets and resources you already have.',
    examples: [
      ['Product', 'Film founder-led demonstrations at home, reuse customer reviews and create one simple bundle landing page.'],
      ['Service', 'Use past client results, record screen-share audits and host an Instagram Live instead of an in-person event.'],
      ['Info-based', 'Deliver a live workshop on Zoom, repurpose existing lessons and use organic content to drive registrations.'],
    ],
  },
]

export const INSPIRATION_HINT =
  'Save any references, examples, screenshots, campaign ideas, creators, brands or unfinished thoughts you may want to revisit.'

export const BLANK_CREATIVE = {
  ...Object.fromEntries(CREATIVE_FIELDS.map(f => [f.key, ''])),
  inspiration: [],
}

/* Inspiration used to be a single block of text. Anything stored that way is kept
   and shown as a note rather than dropped. */
function toEntries(stored) {
  if (Array.isArray(stored)) return stored
  if (typeof stored === 'string' && stored.trim()) return [{ kind: 'note', note: stored.trim() }]
  return []
}

export function creativeToForm(stored) {
  return { ...BLANK_CREATIVE, ...(stored || {}), inspiration: toEntries(stored?.inspiration) }
}

/* Form shape back into what gets stored. Empty answers are dropped, and a section
   left entirely blank is stored as nothing at all rather than a row of empties. */
export function cleanCreative(form) {
  const out = {}
  CREATIVE_FIELDS.forEach(f => {
    const v = (form?.[f.key] || '').trim()
    if (v) out[f.key] = v
  })
  const entries = toEntries(form?.inspiration)
    .map(e => ({ kind: e.kind === 'link' ? 'link' : 'note', url: (e.url || '').trim(), note: (e.note || '').trim() }))
    .filter(e => e.url || e.note)
  if (entries.length) out.inspiration = entries
  return Object.keys(out).length ? out : null
}

export function countCreative(value) {
  const written = CREATIVE_FIELDS.filter(f => (value?.[f.key] || '').trim()).length
  return written + toEntries(value?.inspiration).length
}

/* The examples, tucked behind a question mark so the form stays calm until asked. */
function HelpToggle({ open, onToggle }) {
  return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={open ? 'Hide examples' : 'See examples'}
        style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${open ? '#3d0c0c' : '#c4b5af'}`,
          backgroundColor: open ? '#3d0c0c' : 'transparent',
          color: open ? '#f5ece0' : '#8a7a72',
          fontSize: 10, fontWeight: 700, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ?
      </button>
  )
}

function Examples({ field }) {
  return (
    <div className="mt-2 rounded px-3 py-2.5 space-y-1" style={{ backgroundColor: '#fff8f8', border: '0.5px solid #e8e0d8' }}>
      {field.examples.map(([kind, text]) => (
        <p key={kind} className="text-xs leading-relaxed" style={{ color: '#5a4a44' }}>
          <span className="font-bold" style={{ color: '#3d0c0c' }}>{kind}:</span> {text}
        </p>
      ))}
    </div>
  )
}

/* Links and notes, added one at a time. */
function InspirationEditor({ entries, onChange }) {
  const list = toEntries(entries)
  const update = (i, patch) => onChange(list.map((e, idx) => idx === i ? { ...e, ...patch } : e))
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i))

  return (
    <div>
      {list.length > 0 && (
        <div className="space-y-2 mb-2">
          {list.map((e, i) => (
            <div key={i} className="rounded px-3 py-2.5" style={{ backgroundColor: '#ffffff', border: '0.5px solid #e8e0d8' }}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="label" style={{ margin: 0 }}>{e.kind === 'link' ? 'Link' : 'Note'}</p>
                <button type="button" onClick={() => remove(i)} className="delete-btn" title="Remove">×</button>
              </div>
              {e.kind === 'link' && (
                <input
                  className="input-field mb-2"
                  value={e.url || ''}
                  placeholder="https://..."
                  onChange={ev => update(i, { url: ev.target.value })}
                />
              )}
              <textarea
                className="textarea-field"
                rows={2}
                value={e.note || ''}
                placeholder={e.kind === 'link' ? 'What caught your eye about this? (optional)' : 'Your note'}
                onChange={ev => update(i, { note: ev.target.value })}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange([...list, { kind: 'link', url: '', note: '' }])} className="btn-brand-outline">
          + Add link
        </button>
        <button type="button" onClick={() => onChange([...list, { kind: 'note', note: '' }])} className="btn-brand-outline">
          + Add note
        </button>
      </div>
    </div>
  )
}

/* The prompts. Every one optional. */
export function CreativeDirectionFields({ value, onChange, idPrefix = 'cd' }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const [openHelp, setOpenHelp] = useState(null)
  return (
    <div className="space-y-4">
      {CREATIVE_FIELDS.map(f => (
        <div key={f.key}>
          <div className="flex items-center gap-1.5">
            <label className="label" htmlFor={`${idPrefix}-${f.key}`} style={{ margin: 0, color: '#3d0c0c' }}>
              {f.label}
            </label>
            <HelpToggle open={openHelp === f.key} onToggle={() => setOpenHelp(k => k === f.key ? null : f.key)} />
          </div>
          <p className="text-xs mt-1 mb-1.5 leading-relaxed" style={{ color: '#6b5a52' }}>{f.hint}</p>
          {openHelp === f.key && <div className="mb-2"><Examples field={f} /></div>}
          <textarea
            id={`${idPrefix}-${f.key}`}
            className="textarea-field"
            rows={2}
            value={value?.[f.key] || ''}
            onChange={e => set(f.key, e.target.value)}
          />
        </div>
      ))}

      <div>
        <p className="label" style={{ margin: 0, color: '#3d0c0c' }}>Inspiration</p>
        <p className="text-xs mt-1 mb-2 leading-relaxed" style={{ color: '#6b5a52' }}>{INSPIRATION_HINT}</p>
        <InspirationEditor entries={value?.inspiration} onChange={v => set('inspiration', v)} />
      </div>
    </div>
  )
}

/* Saved view: what was written, locked in until Edit is pressed. */
export function CreativeDirectionRead({ value }) {
  const entries = toEntries(value?.inspiration)
  const written = CREATIVE_FIELDS.filter(f => (value?.[f.key] || '').trim())

  if (!written.length && !entries.length) {
    return <p className="text-sm" style={{ color: '#b8a898' }}>Nothing added yet.</p>
  }

  return (
    <div className="space-y-3">
      {written.map(f => (
        <div key={f.key}>
          <p className="label" style={{ marginBottom: 2, color: '#3d0c0c' }}>{f.label}</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: '#1a0606' }}>{value[f.key]}</p>
        </div>
      ))}
      {entries.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: 4, color: '#3d0c0c' }}>Inspiration</p>
          <div className="space-y-1.5">
            {entries.map((e, i) => (
              <div key={i}>
                {e.url && (
                  <a href={e.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold break-all" style={{ color: '#3d0c0c', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    {e.url}
                  </a>
                )}
                {e.note && <p className="text-sm whitespace-pre-wrap" style={{ color: '#1a0606' }}>{e.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
