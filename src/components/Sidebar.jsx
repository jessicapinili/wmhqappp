import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const BRAND_RED = '#6B1010'

const NavItem = ({ to, icon, label, dot, dotColor, children, external }) => {
  const location = useLocation()
  const isActive = to && location.pathname === to

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors mx-2 group"
      >
        {icon && <span className="text-base">{icon}</span>}
        {dot && (
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        )}
        <span className="flex-1">{label}</span>
        <span className="text-white/40 text-xs">↗</span>
      </a>
    )
  }

  if (children) return <>{children}</>

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-2 ${
          isActive
            ? 'bg-white/20 text-white'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`
      }
    >
      {icon && <span className="text-base">{icon}</span>}
      {dot && (
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      )}
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
      style={{ backgroundColor: BRAND_RED }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <p className="text-white font-black text-sm tracking-widest uppercase leading-tight">
          WOMAN MASTERY HQ
        </p>
        <p className="text-white/60 text-xs tracking-[0.2em] uppercase mt-0.5">
          PERSONAL PORTAL
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5">
        <NavItem to="/dashboard" icon="⊞" label="Dashboard" />

        {/* Pillars section */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase">
            PILLARS
          </p>
        </div>

        <NavItem to="/influence" dot dotColor="#3B82F6" label="Influence" />
        <NavItem to="/visibility" dot dotColor="#F59E0B" label="Visibility" />

        {/* Cash with submenu */}
        <div className="mx-2">
          <button
            onClick={() => { setCashOpen(!cashOpen); navigate('/cash') }}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              cashActive ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-emerald-400" />
            <span className="flex-1 text-left">Cash</span>
            <span className="text-white/50 text-xs">{cashOpen ? '▾' : '▸'}</span>
          </button>
          {cashOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5">
              <NavLink
                to="/cash/revenue-events"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <span className="text-white/40">└</span>
                Revenue Events
              </NavLink>
            </div>
          )}
        </div>

        <NavItem to="/identity" dot dotColor="#8B5CF6" label="Identity" />

        <div className="mx-2 my-1 border-t border-white/10" />

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
      <div className="border-t border-white/10 p-4 space-y-3">
        {/* Member info */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white/30 text-white font-bold text-sm"
            style={{ backgroundColor: '#4A0B0B' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs uppercase truncate leading-tight">
              {displayName}
            </p>
            <p className="text-white/50 text-[10px] truncate mt-0.5">
              {displayTitle}
            </p>
          </div>
        </div>

        {/* Profile + Logout */}
        <div className="flex gap-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex-1 text-center text-xs py-1.5 rounded-lg font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
