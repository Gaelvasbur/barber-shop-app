import { useState, FormEvent } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  // Primitives state management with explicit string and boolean typing
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [isRegistering, setIsRegistering] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Reusable base style object typed for inline CSS rendering
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    boxSizing: 'border-box' // Fixes right padding overflow bounds
  }

  // Strong password complexity validation layer powered by Regular Expressions
  const validatePassword = (pass: string): boolean => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#\$%^&*(),.?":{}|<>]/.test(pass);

    return minLength && hasUpper && hasLower && hasNumber && hasSymbol;
  }

  // Handle identity ingestion and authentication lifecycle events
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    // Enforce strict password validation rules only during account registration
    if (isRegistering && !validatePassword(password)) {
      setErrorMessage('Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and symbols.')
      setLoading(false)
      return
    }

    try {
      if (isRegistering) {
        // Derive initial role assignment based on specific email domains
        const assignedRole = email.includes('admin') ? 'barber' : 'client'

        // 1. Dispatch profile registration securely toward the Supabase Auth system
        // Custom metadata values are passed directly so the backend SQL Trigger can map them
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

        // 2. Client synchronization confirmation block
        // The server-side Trigger takes full ownership of public.profiles ingestion instantly
        if (authData?.user) {
          alert('Account successfully created! Please sign in with your credentials.');
          setIsRegistering(false); // Clean visual state routing switch back to default Login mode
          setFullName('');
          setEmail('');
          setPassword('');
        }
      } else {
        // 3. Authenticate active credentials state and initialize token exchange session
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginError) throw loginError
      }
    } catch (error) {
      // Type assertion guard protects network payload error messaging extractions
      if (error instanceof Error) {
        console.error('Authentication process failure:', error.message)
        setErrorMessage(error.message)
      } else {
        console.error('An unexpected authentication anomaly occurred.')
        setErrorMessage('An unexpected error occurred.')
      }
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
