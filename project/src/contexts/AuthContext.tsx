import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getUserProfile, UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      return
    }

    try {
      const userProfile = await getUserProfile()
      setProfile(userProfile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
      // If profile fetch fails, sign out the user and clear any invalid tokens
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error('Error during sign out:', signOutError)
        // Force clear the session even if signOut fails
        setUser(null)
        setProfile(null)
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during sign out:', error)
      // Force clear the session even if signOut fails
      setUser(null)
      setProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        // Clear any invalid session state
        setUser(null)
        setProfile(null)
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed, clear the session
          console.warn('Token refresh failed, clearing session')
          setUser(null)
          setProfile(null)
        }
        
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Fetch profile when user changes
  useEffect(() => {
    if (user && !profile) {
      refreshProfile()
    }
  }, [user, profile])

  const value = {
    user,
    profile,
    loading,
    signOut: handleSignOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}