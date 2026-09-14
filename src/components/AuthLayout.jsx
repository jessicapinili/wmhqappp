import React from 'react'

/* Shared frame for the signed-out pages: login, forgot password and reset password.
   Logo above, a shadowed card in the middle, the merlot footer at the foot of the page,
   so the three can never drift apart. */

/* ── Minimal social marks ── */
const Ico = ({ children, fill }) => (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const InstagramIcon = () => (
  <Ico>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
  </Ico>
)
const YouTubeIcon = () => (
  <Ico>
    <rect x="2" y="5" width="20" height="14" rx="4.5" />
    <path d="M10.2 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
  </Ico>
)
const TikTokIcon = () => (
  <Ico fill>
    <path d="M16.2 2.5h-3v13.1a2.6 2.6 0 1 1-2.2-2.57V9.9a5.7 5.7 0 1 0 5.2 5.68V9.3a7.2 7.2 0 0 0 4.1 1.3V7.5a4.3 4.3 0 0 1-4.1-4.3z" />
  </Ico>
)
const SubstackIcon = () => (
  <Ico fill>
    <path d="M3 3h18v2.9H3zM3 8.1h18V11H3zM3 13.3v7.9l9-4.6 9 4.6v-7.9z" />
  </Ico>
)

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/jesspinili',  Icon: InstagramIcon },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@jesspinili',    Icon: TikTokIcon },
  { label: 'YouTube',   href: 'https://www.youtube.com/@jesspinili',   Icon: YouTubeIcon },
  { label: 'Jess Pinili Writes on Substack',
    href: 'https://substack.com/@jessicapinili', Icon: SubstackIcon },
]

function AuthFooter() {
  return (
    <footer style={{ backgroundColor: '#3d0c0c' }} className="px-6 py-6">
      <div className="max-w-sm mx-auto text-center">
        <div className="flex items-center justify-center gap-5 mb-4">
          {SOCIALS.map(({ label, href, Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              aria-label={label} title={label}
              className="social-link" style={{ color: 'rgba(245,236,224,0.65)' }}>
              <Icon />
            </a>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <a href="https://www.jessicapinili.com/jpinili-terms-conditions"
            target="_blank" rel="noopener noreferrer"
            className="text-xs" style={{ color: 'rgba(245,236,224,0.75)' }}>
            Terms and Conditions
          </a>
          <span className="text-xs" style={{ color: 'rgba(245,236,224,0.3)' }}>·</span>
          <a href="https://www.jessicapinili.com/jpinili-privacy-statement"
            target="_blank" rel="noopener noreferrer"
            className="text-xs" style={{ color: 'rgba(245,236,224,0.75)' }}>
            Privacy Statement
          </a>
        </div>
        <p className="text-xs" style={{ color: 'rgba(245,236,224,0.45)' }}>
          © {new Date().getFullYear()} Jessica Marie Group Pty Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo / branding */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-lg"
              style={{ backgroundColor: '#3d0c0c' }}
            >
              <span className="text-white font-black text-sm tracking-tighter">WMHQ</span>
            </div>
            <h1 className="font-black text-xl text-gray-900 tracking-wide uppercase">
              Woman Mastery HQ
            </h1>
            <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase text-xs">
              Personal Portal
            </p>
          </div>

          {/* Card */}
          <div className="card" style={{
            padding: '32px',
            boxShadow: '0 6px 24px rgba(61, 12, 12, 0.07), 0 2px 6px rgba(61, 12, 12, 0.04)',
          }}>
            {children}
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  )
}
