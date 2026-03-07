import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"

import "bootstrap/dist/css/bootstrap.css"
import "../style/LoginPage.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"

function LoginPage() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
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

            navigate("/dashboard")
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
            .from("profiles")
            .select("has_completed_questionnaire")
            .eq("id", loginData.user?.id)
            .single()

        if (profile?.has_completed_questionnaire) {
            navigate("/dashboard")
        } else {
            navigate("/questionnaire")
        }

    }

    return (
        <div className="login-page">
            <nav className="navbar navbar-expand-lg">
                <div className="container-fluid">
                    <a className="navbar-brand" href="/">GuitarCoach</a>
                </div>
            </nav>

            <main className="login-main">
                <section className="login-section">
                    <div className="login-card">
                        <div className="login-card-image">
                            <span className="login-card-image-label"></span>
                        </div>

                        <div className="login-card-form">
                            <div>
                                <h1 className="login-card-title">
                                    {isSignUp ? "Create Account" : "Welcome Back"}
                                </h1>
                                <p className="login-card-subtitle">
                                    {isSignUp ? "Join GuitarCoach and start your journey." : "Log in to continue your practice."}
                                </p>
                            </div>

                            <div className="nav nav-pills nav-justified" id="pills-tab" role="tablist">
                                <button
                                    className={`nav-link ${!isSignUp ? "active" : ""}`}
                                    type="button"
                                    role="tab"
                                    onClick={() => { setIsSignUp(false); setError("") }}
                                >
                                    Log In
                                </button>
                                <button
                                    className={`nav-link ${isSignUp ? "active" : ""}`}
                                    type="button"
                                    role="tab"
                                    onClick={() => { setIsSignUp(true); setError("") }}
                                >
                                    Sign Up
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="create-account">
                                {isSignUp && (
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        minLength={6}
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
                                    minLength={6}
                                />
                                {error && <p className="error">{error}</p>}
                                <button type="submit" className="submit-auth" disabled={isSubmitting}>
                                    {isSubmitting ? "Please wait..." : (isSignUp ? "Sign Up" : "Log In")}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top login-footer">
                <span className="mb-3 mb-md-0">© 2026 GuitarCoach, Inc</span>
            </footer>
        </div>
    )
}

export default LoginPage
