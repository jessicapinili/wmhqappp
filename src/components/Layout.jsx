import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const COPYRIGHT = "This work is the sole property of Jessica Pinili. You do not have permission to share, sublicense, distribute, duplicate, sell, licence, or create derivative works in any capacity. All rights on intellectual property of this digital product are proprietary and reserved for exclusive use by Jessica Pinili alone."

export default function Layout() {
  const location = useLocation()
  const isMoneyDashboard = location.pathname === '/cash/money-dashboard'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f2f2f2' }}>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex-shrink-0 h-full
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: '#3d0c0c' }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-4 md:hidden flex-shrink-0"
          style={{
            height: '52px',
            backgroundColor: '#3d0c0c',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col justify-center items-center gap-1 p-1"
            style={{ color: 'rgba(245,236,224,0.75)' }}
            aria-label="Open menu"
          >
            <span style={{ display: 'block', width: '18px', height: '1.5px', backgroundColor: 'currentColor' }} />
            <span style={{ display: 'block', width: '18px', height: '1.5px', backgroundColor: 'currentColor' }} />
            <span style={{ display: 'block', width: '18px', height: '1.5px', backgroundColor: 'currentColor' }} />
          </button>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '13px',
            fontWeight: 400,
            color: '#f5ece0',
            letterSpacing: '0.02em',
          }}>
            WOMAN MASTERY HQ
          </p>
        </div>

        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f2f2f2' }}>
          {/* Flex column so footer is always pushed to the bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ flex: 1 }} className="max-w-7xl w-full mx-auto px-4 py-5 md:px-8 md:py-8">
              <Outlet />
            </div>
            {/* Footer — pinned to bottom of scrollable area; suppressed on Money Dashboard which has its own */}
            {!isMoneyDashboard && (
              <footer className="max-w-7xl w-full mx-auto px-4 md:px-8">
                <p className="footer-copyright">{COPYRIGHT}</p>
              </footer>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
