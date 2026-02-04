import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../style/LoginPage.css'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (isSignUp) {
            const cleanUsername = username.trim()
            if (!cleanUsername) {
                setError("Username is required.")
                return
            }

            const { data, error } = await supabase.auth.signUp({ email, password })
            if (error) {
                setError(error.message)
                return
            }

            const user = data.user
            if (!user) {
                setError("Account created. Please check your email to confirm, then log in.")
                return
            }

            const { error: profileError } = await supabase.from("profiles").update({username: cleanUsername}).eq('id', user.id)

            if (profileError) {
                console.error("Profile upsert failed:", profileError)
                setError(profileError.message)
                return
            }

            navigate("/profile")
            return
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) {
            setError(loginError.message)
            return
        }

        navigate("/profile")
    }

    return (
        <div className="login-page">
            <h1>{isSignUp ? 'Sign Up' : 'Log In'}</h1>
            <form onSubmit={handleSubmit}>
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
    )
}

export default LoginPage
