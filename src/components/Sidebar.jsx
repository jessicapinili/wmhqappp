import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const SIDEBAR_BG = '#3d0c0c'
const AVATAR_BG = '#2a0808'

const PHASE_COLORS = {
  influence: '#c6def2',
  visibility: '#fcc799',
  cash: '#cdd5ae',
  identity: '#e7cee3',
}

const NAV_FONT = "'DM Sans', system-ui, sans-serif"
const DISPLAY_FONT = "'Cormorant Garamond', Georgia, serif"

function NavItem({ to, icon, label, dot, dotColor, external }) {
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2 transition-colors mx-2"
        style={{
          color: 'rgba(245,236,224,0.38)',
          fontFamily: NAV_FONT,
          fontSize: '11.5px',
          fontWeight: 300,
          borderRadius: '2px',
          borderLeft: '1.5px solid transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {icon && <span style={{ fontSize: '13px', opacity: 0.6 }}>{icon}</span>}
        {dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
        <span className="flex-1">{label}</span>
        <span style={{ color: 'rgba(245,236,224,0.20)', fontSize: '10px' }}>↗</span>
      </a>
    )
  }

  return (
    <NavLink
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 transition-all mx-2"
      style={({ isActive }) => ({
        color: isActive ? '#ffffff' : 'rgba(245,236,224,0.38)',
        backgroundColor: isActive ? 'rgba(0,0,0,0.20)' : 'transparent',
        borderLeft: isActive ? '1.5px solid #f0d0d0' : '1.5px solid transparent',
        fontFamily: NAV_FONT,
        fontSize: '11.5px',
        fontWeight: isActive ? 400 : 300,
        borderRadius: '2px',
      })}
    >
      {icon && <span style={{ fontSize: '13px' }}>{icon}</span>}
      {dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { displayName, displayTitle, initials, logout } = useAuth()
  const [cashOpen, setCashOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const cashActive = location.pathname.startsWith('/cash')

  return (
    <div
      className="flex flex-col h-full sidebar-scroll overflow-y-auto"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <p style={{
          fontFamily: DISPLAY_FONT,
          fontSize: '14px',
          fontWeight: 400,
          color: '#f5ece0',
          lineHeight: 1.2,
          letterSpacing: '0.02em',
        }}>
          WOMAN MASTERY HQ
        </p>
        <p style={{
          fontFamily: NAV_FONT,
          fontSize: '7px',
          fontWeight: 400,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(245,236,224,0.30)',
          marginTop: '4px',
        }}>
          PERSONAL PORTAL
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5">
        <NavItem to="/dashboard" icon="⊞" label="Dashboard" />

        {/* Phases section label */}
        <div className="px-5 pt-5 pb-1.5">
          <p style={{
            fontFamily: NAV_FONT,
            fontSize: '7px',
            fontWeight: 400,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(245,236,224,0.18)',
          }}>
            PHASES
          </p>
        </div>

        <NavItem to="/influence" dot dotColor={PHASE_COLORS.influence} label="Influence" />
        <NavItem to="/visibility" dot dotColor={PHASE_COLORS.visibility} label="Visibility" />

        {/* Cash with submenu */}
        <div className="mx-2">
          <button
            onClick={() => { setCashOpen(!cashOpen); navigate('/cash') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 transition-all"
            style={{
              color: cashActive ? '#ffffff' : 'rgba(245,236,224,0.38)',
              backgroundColor: cashActive ? 'rgba(0,0,0,0.20)' : 'transparent',
              borderLeft: cashActive ? '1.5px solid #f0d0d0' : '1.5px solid transparent',
              fontFamily: NAV_FONT,
              fontSize: '11.5px',
              fontWeight: cashActive ? 400 : 300,
              borderRadius: '2px',
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PHASE_COLORS.cash }} />
            <span className="flex-1 text-left">Cash</span>
            <span style={{ color: 'rgba(245,236,224,0.25)', fontSize: '9px' }}>{cashOpen ? '▾' : '▸'}</span>
          </button>
          {cashOpen && (
            <div className="mt-0.5 space-y-0.5" style={{ marginLeft: '42px' }}>
              {[
                { to: '/cash/money-dashboard', label: 'Money Dashboard' },
                { to: '/cash/revenue-events',  label: 'Revenue Events' },
                { to: '/cash/launches',         label: 'Launches' },
                { to: '/cash/offer-suite',      label: 'Offer Suite' },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className="flex items-center px-3 py-1.5 transition-all"
                  style={({ isActive }) => ({
                    fontFamily: NAV_FONT,
                    fontSize: '10px',
                    fontWeight: 300,
                    color: isActive ? '#ffffff' : 'rgba(245,236,224,0.40)',
                    backgroundColor: isActive ? 'rgba(0,0,0,0.15)' : 'transparent',
                    borderRadius: '2px',
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavItem to="/identity" dot dotColor={PHASE_COLORS.identity} label="Identity" />

        <div className="mx-2 my-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }} />

        <NavItem to="/weekly-review" icon="📋" label="Weekly Review" />

        <NavItem
          to="https://tools.womanmasteryhqportal.com"
          icon="🔧"
          label="WMHQ Tools"
          external
        />
        <NavItem
          to="https://wmhq-wheretostart.base44.app/"
          icon="🧭"
          label="Where Do I Start?"
          external
        />
      </nav>

      {/* Bottom profile section */}
      <div className="p-4 space-y-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: AVATAR_BG,
              border: '0.5px solid rgba(245,236,224,0.15)',
              color: 'rgba(245,236,224,0.85)',
              fontFamily: NAV_FONT,
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p style={{
              fontFamily: DISPLAY_FONT,
              fontSize: '13px',
              fontStyle: 'italic',
              fontWeight: 300,
              color: 'rgba(245,236,224,0.6)',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </p>
            <p style={{
              fontFamily: NAV_FONT,
              fontSize: '7px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'rgba(245,236,224,0.22)',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayTitle}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <NavLink
            to="/profile"
            className="flex-1 text-center py-1.5 transition-colors"
            style={({ isActive }) => ({
              fontFamily: NAV_FONT,
              fontSize: '8px',
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isActive ? '#ffffff' : 'rgba(245,236,224,0.38)',
              backgroundColor: isActive ? 'rgba(0,0,0,0.20)' : 'transparent',
              borderRadius: '2px',
            })}
          >
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex-1 text-center py-1.5 transition-colors"
            style={{
              fontFamily: NAV_FONT,
              fontSize: '8px',
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(245,236,224,0.38)',
              borderRadius: '2px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(245,236,224,0.75)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,236,224,0.38)' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
