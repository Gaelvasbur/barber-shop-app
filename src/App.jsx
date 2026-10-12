import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import ClientView from './components/ClientView'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Strict role query with orphan session detection
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      // If the browser session exists but the profile is missing in PostgreSQL
      if (error) {
        console.warn('Profile not found. Clearing corrupted session...')
        await supabase.auth.signOut() // Force sign out to clean up the browser state
        setSession(null)
        setUserRole(null)
        setLoading(false)
        return
      }
      
      if (data) {
        setUserRole(data.role)
        setLoading(false) // Release the loading screen
      }
    } catch (error) {
      console.error('Critical error fetching user role:', error.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Verify initial session upon page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Listen to real-time authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        if (event === 'SIGNED_IN') {
          setLoading(true)
          fetchUserRole(session.user.id)
        }
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}><h3>Verifying credentials...</h3></div>
  }

  if (!session) {
    return <Login />
  }

  return userRole === 'barber' ? <AdminDashboard /> : <ClientView session={session} />
}

export default App
