import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../style/LoginPage.css'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsSubmitting(true)

        if (isSignUp) {
            const cleanUsername = username.trim()
            if (!cleanUsername) {
                setError("Username is required.")
                return
            }

            const { data, error } = await supabase.auth.signUp({
               email, 
               password, 
               options: {
                data: { 
                  username: cleanUsername 
                }
              }
            })

            if (error) {
                setError(error.message)
                return
            }

            if (!data.session) {
                setError("Account created. Please check your email to confirm, then log in.")
                setIsSubmitting(false)
                return
            }

            navigate("/profile")
            return
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) {
            setError(loginError.message)
            setIsSubmitting(false)
            return
        }

        // Changed to check if a user has completed the quesitonniare yet

        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_questionnaire')
          .eq('id', loginData.user?.id)
          .single()
        
        if (profile?.has_completed_questionnaire){
          navigate("/profile")
        } else {
          navigate("/questionnaire")
        }

    }

    return (
        <div className="login-page">
            <header>
                <Link to="/" className='logo' style={{ textDecoration: 'none', color: 'inherit' }}>
                    GuitarCoach
                </Link>
            </header>

            <div className='account-container'>
                <div className='create-account-login-title'>
                    <h1 className="create-account-login-title">
                        {isSignUp ? 'Create Account' : 'Log In'}
                    </h1>
                </div>

                <div className='form-container'>
                    <form onSubmit={handleSubmit} className='create-account'>
                        {isSignUp && ( // prompt for username only on sign up
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={6} // create minimum length for username
                            />
                        )}

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
                            minLength={6} // create minimum length for password
                        />
                        {error && <p className="error">{error}</p>}
                        <button type="submit" className='submit-auth' disabled={isSubmitting}>
                            {isSubmitting ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Log In')}
                        </button>
                    </form>
                </div>

                <button type="button" className="toggle-auth" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
  
        /*
        <div className="login-page">
            <div className='container'>
                <div className='logo'>
                GuitarCoach
                </div>
            </div>

            <h1>{isSignUp ? 'Create Account' : 'Log In'}</h1>
            <form onSubmit={handleSubmit} className='create-account'>
                {isSignUp && ( // prompt for username only on sign up
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={6} // create minimum length for username
                    />
                )}
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
                    minLength={6} // create minimum length for password
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
        */
    )
}

export default LoginPage
