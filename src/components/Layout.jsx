import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const COPYRIGHT = "This work is the sole property of Jessica Pinili. You do not have permission to share, sublicense, distribute, duplicate, sell, licence, or create derivative works in any capacity. All rights on intellectual property of this digital product are proprietary and reserved for exclusive use by Jessica Pinili alone."

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar — fixed width */}
      <div className="w-64 flex-shrink-0 h-full" style={{ backgroundColor: '#6B1010' }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <Outlet />
          </div>
          {/* Footer copyright */}
          <footer className="max-w-5xl mx-auto px-6">
            <p className="footer-copyright">{COPYRIGHT}</p>
          </footer>
        </main>
      </div>
    </div>
  )
}
