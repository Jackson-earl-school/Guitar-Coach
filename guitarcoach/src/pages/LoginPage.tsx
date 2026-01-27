import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../style/LoginPage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="login-page">
      <h1>{isSignUp ? 'Sign Up' : 'Log In'}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">{isSignUp ? 'Sign Up' : 'Log In'}</button>
      </form>
      <button
        className="toggle-auth"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
      </button>
    </div>
  )
}

export default LoginPage
