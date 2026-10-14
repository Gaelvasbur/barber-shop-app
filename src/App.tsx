import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import ClientView from './components/ClientView'
import AdminDashboard from './components/AdminDashboard'
import { Session } from '@supabase/supabase-js'

// Define the structural shape of a profile row from the PostgreSQL table
interface Profile {
  role: string
}

function App() {
  // Strict state management typed for Supabase payloads and primitives
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch the role metadata linked to the authenticated user ID
  const fetchUserRole = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single<Profile>()

      if (error) {
        console.warn('Profile sync pending or missing in database.')
        // Fallback default client assignment prevents application locks
        setUserRole('client')
        setLoading(false)
        return
      }
      
      if (data) {
        setUserRole(data.role)
        setLoading(false)
      }
    } catch (error) {
      // Advanced error containment: safely extract messaging from unknown types
      if (error instanceof Error) {
        console.error('Network trace error fetching role:', error.message)
      } else {
        console.error('An unexpected authentication error occurred.')
      }
      setUserRole('client')
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Validate active cookie/token browser session on initial load
    const initializeAuth = async (): Promise<void> => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        if (initialSession) {
          await fetchUserRole(initialSession.user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error('Auth initialization failed:', err.message)
        }
        setLoading(false)
      }
    }

    initializeAuth()

    // 2. Subscribe to real-time authentication lifecycle events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession)
      if (currentSession) {
        await fetchUserRole(currentSession.user.id)
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    // Clean up subscription listener on unmount to prevent client-side memory leaks
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}><h3>Verifying credentials...</h3></div>
  }

  if (!session) {
    return <Login />
  }

  // Conditional UI routing layout built upon verified PostgreSQL user roles
  return userRole === 'barber' ? <AdminDashboard /> : <ClientView session={session} />
}

export default App
