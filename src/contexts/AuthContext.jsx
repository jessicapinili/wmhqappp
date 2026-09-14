import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// A password recovery link signs the member in with a normal, saved session, and
// Supabase announces PASSWORD_RECOVERY only once. After a reload that announcement
// is gone, so the recovery state is remembered here until a new password is set.
const RECOVERY_KEY = 'wmhq-password-recovery'
const readRecovery = () => {
  try { return localStorage.getItem(RECOVERY_KEY) === '1' } catch { return false }
}
const writeRecovery = (on) => {
  try {
    if (on) localStorage.setItem(RECOVERY_KEY, '1')
    else localStorage.removeItem(RECOVERY_KEY)
  } catch { /* storage unavailable: the in-memory flag still guards this visit */ }
}

// Read straight from the link before supabase-js consumes and clears the URL, so the
// portal is locked from the very first render rather than after the event arrives.
const arrivedViaRecoveryLink = typeof window !== 'undefined' &&
  /(?:^|[#&?])type=recovery(?:&|$)/.test(`${window.location.hash}&${window.location.search}`)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(() => {
    if (arrivedViaRecoveryLink) { writeRecovery(true); return true }
    return readRecovery()
  })

  const setRecovery = (on) => {
    writeRecovery(on)
    setRecovering(on)
  }

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
    else setProfile(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // No session means no recovery session either, e.g. an expired link.
      if (!session) setRecovery(false)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      else if (!session) setRecovery(false)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setRecovery(false)   // she knows her password, so this is a normal login
    return data
  }

  const logout = async () => {
    setRecovery(false)
    await supabase.auth.signOut()
  }

  // Called only once supabase.auth.updateUser has actually saved the new password.
  const completeRecovery = () => setRecovery(false)

  const refreshProfile = () => {
    if (user) fetchProfile(user.id)
  }

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'WMHQ Member'
    : 'WMHQ Member'

  const firstName = profile?.first_name || 'Member'

  const displayTitle = profile?.brand_title || 'WMHQ MEMBER'

  const initials = profile
    ? `${(profile.first_name || 'W')[0]}${(profile.last_name || 'M')[0]}`.toUpperCase()
    : 'WM'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      recovering,
      completeRecovery,
      login,
      logout,
      refreshProfile,
      displayName,
      firstName,
      displayTitle,
      initials,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
