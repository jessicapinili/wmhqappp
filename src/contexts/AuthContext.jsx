import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

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
