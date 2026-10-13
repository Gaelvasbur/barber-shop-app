import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Reusable base style for inputs that corrects the right padding asymmetry
  const inputStyle = {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    boxSizing: 'border-box' // Fixes right padding overflow
  }

  const validatePassword = (pass) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#\$%^&*(),.?":{}|<>]/.test(pass);

    return minLength && hasUpper && hasLower && hasNumber && hasSymbol;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    // Enforce password strength requirements ONLY during registration
    if (isRegistering && !validatePassword(password)) {
      setErrorMessage('Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and symbols.')
      setLoading(false)
      return
    }

    try {
      if (isRegistering) {
        // Determinamos el rol inicial basado en el correo del usuario
        const assignedRole = email.includes('admin') ? 'barber' : 'client'

        // 1. Register the user profile securely in Supabase Auth backend
        // Enviamos full_name y role dentro de la metadata para que el Trigger los reciba en el servidor
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: assignedRole
            }
          }
        })

        if (authError) throw authError

        // 2. ¡EL PROCESO SE SIMPLIFICA! 
        // Ya no necesitamos el .insert() manual desde JavaScript. 
        // El Trigger en la base de datos se activa en este milisegundo de forma interna.
        if (authData?.user) {
          alert('Account successfully created! Please sign in with your credentials.');
          setIsRegistering(false); // Clean routing switch over to regular Login mode
          setFullName('');
          setEmail('');
          setPassword('');
        }
      } else {
        // 3. Authenticate active state validation session
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginError) throw loginError
      }
    } catch (error) {
      console.error('Authentication process failure:', error.message)
      setErrorMessage(error.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box' }}>
      <h2>{isRegistering ? 'Create ChopTime Account' : 'Sign In'}</h2>
      
      {errorMessage && (
        <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '13px', lineHeight: '1.4' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <div style={{ marginBottom: '15px' }}>
            <label>Full Name:</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
          </div>
        )}
        <div style={{ marginBottom: '15px' }}>
          <label>Email Address:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          
          {isRegistering && (
            <small style={{ color: '#666', display: 'block', marginTop: '4px', fontSize: '11px' }}>
              Requirements: Min. 8 characters, case-sensitive (A/a), numbers (0-9), and symbols (!@#\$).
            </small>
          )}
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box' }}>
          {loading ? 'Processing...' : isRegistering ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      <button onClick={() => { setIsRegistering(!isRegistering); setErrorMessage(''); }} style={{ marginTop: '15px', background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', textDecoration: 'underline' }}>
        {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
      </button>
    </div>
  )
}

