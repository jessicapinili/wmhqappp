import React, { useState } from 'react'

/* Where a revenue event will be promoted or delivered. Grouped so the list stays
   scannable, with room for channels we have not thought of. */

export const MARKETING_GROUPS = [
  { group: 'Owned channels', items: [
    'Website or landing page', 'Blog or SEO', 'Email marketing', 'SMS marketing',
    'Substack or newsletter', 'WhatsApp', 'Private community', 'Customer or client database',
  ] },
  { group: 'Social platforms', items: [
    'Instagram', 'TikTok', 'Facebook', 'Facebook Group', 'Threads',
    'LinkedIn', 'YouTube', 'Pinterest', 'Snapchat', 'Reddit',
  ] },
  { group: 'Audio and media', items: [
    'Podcast', 'Guest podcast', 'Live stream', 'Webinar or masterclass', 'PR or media coverage',
  ] },
  { group: 'Paid promotion', items: [
    'Meta ads', 'Google ads', 'YouTube ads', 'TikTok ads', 'Pinterest ads',
    'Paid sponsorship', 'Paid creator or influencer campaign',
  ] },
  { group: 'Partnerships and people', items: [
    'Brand collaboration', 'Creator or influencer collaboration', 'Affiliate marketing',
    'Referral partners', 'UGC creators', 'Ambassadors', 'Community partnerships', 'Cross-promotion',
  ] },
  { group: 'Direct and offline', items: [
    'Direct messages', 'Direct outreach', 'Sales calls', 'Networking', 'In-person event',
    'Pop-up or market', 'Retail or stockists', 'Wholesale', 'Flyers or printed materials',
    'Direct mail', 'Existing customer follow-up',
  ] },
  { group: 'Sales platforms', items: [
    'Online store', 'Amazon', 'Etsy', 'Other marketplace', 'Booking platform',
    'Course or membership platform',
  ] },
]

const KNOWN = MARKETING_GROUPS.flatMap(g => g.items)

export const BLANK_MARKETING = { channels: [], primary: '' }

export function marketingToForm(stored) {
  return {
    channels: Array.isArray(stored?.channels) ? stored.channels : [],
    primary: stored?.primary || '',
  }
}

/* Nothing chosen is stored as nothing at all. A primary channel is only kept while
   it is still one of the selected channels. */
export function cleanMarketing(form) {
  const channels = (form?.channels || []).map(c => c.trim()).filter(Boolean)
  if (!channels.length) return null
  const primary = channels.includes(form?.primary) ? form.primary : ''
  return primary ? { channels, primary } : { channels }
}

export function countMarketing(value) {
  return (value?.channels || []).length
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="tag-btn"
      style={selected
        ? { backgroundColor: '#3d0c0c', color: '#f5ece0', borderColor: '#3d0c0c' }
        : { backgroundColor: '#ffffff', color: '#6b5a52', borderColor: '#e8e0d8' }}
    >
      {label}
    </button>
  )
}

export function MarketingChannelFields({ value, onChange }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const selected = value?.channels || []
  const custom = selected.filter(c => !KNOWN.includes(c))

  const toggle = (name) => {
    const next = selected.includes(name) ? selected.filter(c => c !== name) : [...selected, name]
    // Dropping a channel that was leading the campaign clears the lead as well.
    const primary = next.includes(value?.primary) ? value.primary : ''
    onChange({ channels: next, primary })
  }

  const addCustom = () => {
    const name = draft.trim()
    if (name && !selected.includes(name)) onChange({ ...value, channels: [...selected, name] })
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      {MARKETING_GROUPS.map(g => (
        <div key={g.group}>
          <p className="label" style={{ marginBottom: 6, color: '#3d0c0c' }}>{g.group}</p>
          <div className="flex flex-wrap gap-2">
            {g.items.map(item => (
              <Chip key={item} label={item} selected={selected.includes(item)} onClick={() => toggle(item)} />
            ))}
          </div>
        </div>
      ))}

      {custom.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: 6, color: '#3d0c0c' }}>Your own</p>
          <div className="flex flex-wrap gap-2">
            {custom.map(item => (
              <Chip key={item} label={item} selected onClick={() => toggle(item)} />
            ))}
          </div>
        </div>
      )}

      {adding ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input-field"
            style={{ width: 'auto', minWidth: 220 }}
            value={draft}
            autoFocus
            placeholder="Name the channel"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          />
          <button type="button" onClick={addCustom} className="btn-brand" disabled={!draft.trim()}>Add</button>
          <button type="button" onClick={() => { setAdding(false); setDraft('') }} className="btn-brand-outline">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-brand-outline">
          Add another channel +
        </button>
      )}

      <div className="pt-1">
        <label className="label" htmlFor="re-primary-channel" style={{ color: '#3d0c0c' }}>Primary Marketing Channel</label>
        <p className="text-xs mt-1 mb-1.5" style={{ color: '#6b5a52' }}>Which channel will lead this campaign?</p>
        <select
          id="re-primary-channel"
          className="input-field"
          value={value?.primary || ''}
          disabled={!selected.length}
          onChange={e => onChange({ ...value, primary: e.target.value })}
        >
          <option value="">{selected.length ? 'Select...' : 'Choose your channels first'}</option>
          {selected.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
    </div>
  )
}

/* Saved view: what was chosen, locked in until Edit is pressed. */
export function MarketingChannelsRead({ value }) {
  const selected = value?.channels || []
  if (!selected.length) return <p className="text-sm" style={{ color: '#b8a898' }}>No channels chosen yet.</p>
  return (
    <div>
      {value?.primary && (
        <div className="mb-3">
          <p className="label" style={{ marginBottom: 2, color: '#3d0c0c' }}>Primary Marketing Channel</p>
          <p className="text-sm font-semibold" style={{ color: '#1a0606' }}>{value.primary}</p>
        </div>
      )}
      <p className="label" style={{ marginBottom: 6, color: '#3d0c0c' }}>
        {selected.length} {selected.length === 1 ? 'channel' : 'channels'}
      </p>
      <div className="flex flex-wrap gap-2">
        {selected.map(c => (
          <span key={c} className="tag-btn"
            style={{ backgroundColor: c === value?.primary ? '#3d0c0c' : '#faf7f3',
                     color: c === value?.primary ? '#f5ece0' : '#6b5a52',
                     borderColor: c === value?.primary ? '#3d0c0c' : '#e8e0d8' }}>
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}
