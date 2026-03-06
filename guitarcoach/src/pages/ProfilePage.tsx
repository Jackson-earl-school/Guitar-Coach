import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

import "bootstrap/dist/css/bootstrap.css"
import "../style/Profilepage.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"

const API_BASE = "http://127.0.0.1:8000"

export default function ProfilePage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [spotifyConnected, setSpotifyConnected] = useState(false)

    useEffect(() => {
        if (searchParams.get("spotify_connected")) setSpotifyConnected(true)
        if (searchParams.get("spotify_error")) {
            console.error("Spotify error:", searchParams.get("spotify_error"))
        }

        ;(async () => {
            const { data: sessionData } = await supabase.auth.getSession()
            if (!sessionData.session) {
                navigate("/login");
                return
            }

            const { data: userData } = await supabase.auth.getUser()
            const user = userData.user
            if (!user) {
                navigate("/login");
                return
            }

            setEmail(user.email ?? "")

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("username, spotify_access_token")
                .eq("id", user.id)
                .single()

            if (error) {
                console.error("Profile fetch error:", error);
                return
            }

            if (!profile) {
                console.warn("No profile row found.");
                return
            }

            setUsername(profile.username ?? "")

            if (!searchParams.get("spotify_connected")){
                setSpotifyConnected(!!profile.spotify_access_token)
            }
        })()
    }, [navigate, searchParams])

    async function connectSpotify() {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) window.location.href = `${API_BASE}/api/spotify/login?token=${token}`
    }

    async function logout() {
        await supabase.auth.signOut()
        navigate("/login")
    }

    return (
        <div className="profile-page">
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
                <div className="container-fluid">
                    <a className="navbar-brand" href="/dashboard">GuitarCoach</a>
                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#profileNavbar"
                        aria-controls="profileNavbar"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="profileNavbar">
                        <ul className="navbar-nav justify-content-end w-100">
                            <li className="nav-item"><a className="nav-link" href="/practice-plans">Coach</a></li>
                            <li className="nav-item"><a className="nav-link" href="/find-songs">Find Songs</a></li>
                            <li className="nav-item"><a className="nav-link" href="/schedule">Tasks</a></li>
                            <li className="nav-item"><a className="nav-link active" href="/profile">Profile</a></li>
                        </ul>
                    </div>
                </div>
            </nav>

            <section className="profile-hero">
                <div className="profile-avatar">
                </div>
                <h1 className="profile-hero-name">{username || "Your Profile"}</h1>
                <p className="profile-hero-email">{email}</p>
            </section>

            <main className="profile-main">

                <section className="profile-card">
                    <h2 className="profile-card-title">Account Info</h2>

                    <div className="profile-field">
                        <span className="profile-field-label">Email</span>
                        <span className="profile-field-value">{email}</span>
                    </div>

                    <div className="profile-field">
                        <span className="profile-field-label">Username</span>
                        <div className="profile-edit-row">
                            <span className="profile-field-value">{username}</span>
                        </div>
                    </div>
                </section>

                <section className="profile-card">
                    <h2 className="profile-card-title">Connected Accounts</h2>

                    <div className="profile-field">
                        <div className="profile-spotify-row">
                            <div className="profile-spotify-info">
                                <span className="profile-spotify-icon">🎵</span>
                                <div>
                                    <strong>Spotify</strong>
                                    <p className="profile-spotify-status">
                                        {spotifyConnected ? "Connected" : "Not connected"}
                                    </p>
                                </div>
                            </div>
                            {spotifyConnected ? (
                                <span className="profile-connected-badge">✓ Connected</span>
                            ) : (
                                <button className="profile-btn-spotify" onClick={connectSpotify}>
                                    Connect
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="profile-card profile-card-danger">
                    <h2 className="profile-card-title">Account</h2>
                    <p className="profile-danger-text">Sign out of your GuitarCoach account on this device.</p>
                    <button className="profile-btn-logout" onClick={logout}>Log Out</button>
                </section>

            </main>

            <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top profile-footer">
                <span className="mb-3 mb-md-0 text-body-secondary">© 2026 GuitarCoach, Inc</span>
            </footer>
        </div>
    )
}
