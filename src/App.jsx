import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import ClientView from './components/ClientView'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Consulta del rol optimizada con reintentos para producción
  const fetchUserRole = async (userId, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        // Si el perfil no se encuentra en el primer milisegundo (desfase de red), 
        // le damos hasta 3 reintentos antes de dar la sesión por corrupta.
        if (retryCount < 3) {
          console.log(`Profile syncing... Retry attempt #${retryCount + 1}`)
          setTimeout(() => fetchUserRole(userId, retryCount + 1), 1000)
          return
        }

        console.warn('Profile genuinely missing. Clearing session...')
        await supabase.auth.signOut()
        setSession(null)
        setUserRole(null)
        setLoading(false)
        return
      }
      
      if (data) {
        setUserRole(data.role)
        setLoading(false) // Liberamos la pantalla de carga de forma segura
      }
    } catch (error) {
      console.error('Critical error fetching user role:', error.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Verificar sesión inicial al cargar la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Escuchar cambios de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        // Forzamos la verificación solo en eventos de entrada o cambios reales
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
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
