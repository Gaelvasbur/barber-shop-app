import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import ClientView from './components/ClientView'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Consulta directa y secuencial del rol en PostgreSQL
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Profile sync pending or missing in database.')
        // Si el perfil no existe, el rol por defecto en el cliente será client
        setUserRole('client')
        setLoading(false)
        return
      }
      
      if (data) {
        setUserRole(data.role)
        setLoading(false)
      }
    } catch (error) {
      console.error('Network trace error fetching role:', error.message)
      setUserRole('client')
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Validar el estado de la sesión activa en el navegador
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        if (initialSession) {
          await fetchUserRole(initialSession.user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth initialization failed:', err)
        setLoading(false)
      }
    }

    initializeAuth()

    // 2. Suscribirse a los cambios de estado en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession)
      if (currentSession) {
        await fetchUserRole(currentSession.user.id)
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
