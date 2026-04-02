import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const COPYRIGHT = "This work is the sole property of Jessica Pinili. You do not have permission to share, sublicense, distribute, duplicate, sell, licence, or create derivative works in any capacity. All rights on intellectual property of this digital product are proprietary and reserved for exclusive use by Jessica Pinili alone."

export default function Layout() {
  const location = useLocation()
  const isMoneyDashboard = location.pathname === '/cash/money-dashboard'

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f2f2f2' }}>
      {/* Sidebar — fixed width */}
      <div className="w-64 flex-shrink-0 h-full" style={{ backgroundColor: '#6B1010' }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f2f2f2' }}>
          {/* Flex column so footer is always pushed to the bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }} className="max-w-5xl w-full mx-auto px-6 py-8">
              <Outlet />
            </div>
            {/* Footer — pinned to bottom of scrollable area; suppressed on Money Dashboard which has its own */}
            {!isMoneyDashboard && (
              <footer className="max-w-5xl w-full mx-auto px-6">
                <p className="footer-copyright">{COPYRIGHT}</p>
              </footer>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
