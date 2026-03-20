import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Deeper rich burgundy — editorial, feminine
const SIDEBAR_BG = '#2E0A0E'
const AVATAR_BG = '#1A0508'

// Phase colours (new)
const PHASE_COLORS = {
  influence: '#c6def2',
  visibility: '#fcc799',
  cash: '#cdd5ae',
  identity: '#e7cee3',
}

function NavItem({ to, icon, label, dot, dotColor, external }) {
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mx-2 group"
        style={{ color: 'rgba(255,255,255,0.55)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
      >
        {icon && <span className="text-sm opacity-70">{icon}</span>}
        {dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
        <span className="flex-1 font-medium">{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>↗</span>
      </a>
    )
  }

  return (
    <NavLink
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mx-2"
      style={({ isActive }) => ({
        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
        backgroundColor: isActive ? 'rgba(255, 240, 236, 0.13)' : 'transparent',
        borderLeft: isActive ? '2px solid rgba(255,220,210,0.4)' : '2px solid transparent',
      })}
    >
      {icon && <span className="text-sm">{icon}</span>}
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
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="font-black text-xs tracking-[0.18em] uppercase leading-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
          WOMAN MASTERY HQ
        </p>
        <p className="text-[10px] tracking-[0.22em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          PERSONAL PORTAL
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5">
        <NavItem to="/dashboard" icon="⊞" label="Dashboard" />

        {/* Phases section */}
        <div className="px-5 pt-5 pb-1.5">
          <p className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>
            PHASES
          </p>
        </div>

        <NavItem to="/influence" dot dotColor={PHASE_COLORS.influence} label="Influence" />
        <NavItem to="/visibility" dot dotColor={PHASE_COLORS.visibility} label="Visibility" />

        {/* Cash with submenu */}
        <div className="mx-2">
          <button
            onClick={() => { setCashOpen(!cashOpen); navigate('/cash') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              color: cashActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
              backgroundColor: cashActive ? 'rgba(255,240,236,0.13)' : 'transparent',
              borderLeft: cashActive ? '2px solid rgba(255,220,210,0.4)' : '2px solid transparent',
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PHASE_COLORS.cash }} />
            <span className="flex-1 text-left">Cash</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{cashOpen ? '▾' : '▸'}</span>
          </button>
          {cashOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5">
              <NavLink
                to="/cash/money-dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={({ isActive }) => ({
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  backgroundColor: isActive ? 'rgba(255,240,236,0.1)' : 'transparent',
                })}
              >
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>└</span>
                Money Dashboard
              </NavLink>
              <NavLink
                to="/cash/revenue-events"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={({ isActive }) => ({
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  backgroundColor: isActive ? 'rgba(255,240,236,0.1)' : 'transparent',
                })}
              >
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>└</span>
                Revenue Events
              </NavLink>
              <NavLink
                to="/cash/launches"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={({ isActive }) => ({
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  backgroundColor: isActive ? 'rgba(255,240,236,0.1)' : 'transparent',
                })}
              >
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>└</span>
                Launches
              </NavLink>
              <NavLink
                to="/cash/offer-suite"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={({ isActive }) => ({
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  backgroundColor: isActive ? 'rgba(255,240,236,0.1)' : 'transparent',
                })}
              >
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>└</span>
                Offer Suite
              </NavLink>
            </div>
          )}
        </div>

        <NavItem to="/identity" dot dotColor={PHASE_COLORS.identity} label="Identity" />

        <div className="mx-2 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

        <NavItem to="/weekly-review" icon="📋" label="Weekly Review" />

        <NavItem
          to="https://wmhq-tools-dashboard.base44.app/"
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
      <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              backgroundColor: AVATAR_BG,
              border: '1.5px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs uppercase truncate leading-tight" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {displayName}
            </p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {displayTitle}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <NavLink
            to="/profile"
            className="flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition-colors"
            style={({ isActive }) => ({
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
              backgroundColor: isActive ? 'rgba(255,240,236,0.13)' : 'transparent',
            })}
          >
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
