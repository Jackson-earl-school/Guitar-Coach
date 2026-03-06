import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

import "bootstrap/dist/css/bootstrap.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
import "../style/Dashboard.css"

import module1 from "../images/generate-practice-plans.jpg"
import module2 from "../images/my-schedule.jpg"
import module3 from "../images/find-songs.jpg"
import module4 from "../images/tasks.webp"

const API_BASE = "http://127.0.0.1:8000"

function Dashboard() {
    const [username, setUsername] = useState("")
    const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null)

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from("profiles")
                .select("spotify_access_token")
                .eq("id", user.id)
                .single()

            setSpotifyConnected(!!profile?.spotify_access_token)
        }
        fetchUser()
    }, [])

    async function connectSpotify() {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
            window.location.href = `${API_BASE}/api/spotify/login?token=${token}`
        }
    }

    return (
        <div className="dashboard-page">
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
                <div className="container-fluid">
                    <a className="navbar-brand" href="/dashboard"> GuitarCoach </a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav justify-content-end w-100">
                            <li className="nav-item">
                                <a className="nav-link active" aria-current="page" href="/dashboard"> Dashboard </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/find-songs"> Find Songs </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/schedule"> Tasks </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/profile"> Profile </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <section className="dashboard-welcome">
                <div className="dashboard-welcome-content">
                    <p className="dashboard-eyebrow">Welcome back</p>
                    <h1 className="dashboard-your-dashboard">
                        Your Dashboard
                    </h1>
                    <p className="dashboard-sub">Pick up where you left off.</p>
                </div>
            </section>

            {spotifyConnected === false && (
                <div className="spotify-banner">
                    <div className="spotify-banner-content">
                        <div className="spotify-banner-text">
                            <span className="spotify-banner-icon">🎵</span>
                            <div>
                                <strong>Connect your Spotify account</strong>
                                <p>Link Spotify to get personalized song recommendations based on your listening history.</p>
                            </div>
                        </div>
                        <button className="spotify-banner-btn" onClick={connectSpotify}>
                            Connect Spotify
                        </button>
                    </div>
                </div>
            )}

            <section className="dashboard-main">
                <div className="dashboard-content">

                    <div className="dashboard-grid">
                        <div className="dashboard-card" onClick={() => window.location.href = '/find-songs'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${module3})` }}></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Discover</span>
                                <h2>Find New Songs</h2>
                            </div>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/schedule'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${module2})` }}></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Plan</span>
                                <h2>My Schedule</h2>
                            </div>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/practice-plans'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${module1})` }}></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Practice</span>
                                <h2>Generate Practice Plans</h2>
                            </div>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/progress'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${module4})` }}></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Track</span>
                                <h2>Overall Progress</h2>
                            </div>
                        </div>
                    </div>

                    {/* Tasks panel */}
                    <div className="tasks-panel">
                        <h2 className="tasks-title">Today's Tasks</h2>
                        <p className="tasks-empty">Fill out a practice plan to create new tasks.</p>
                    </div>

                </div>
            </section>

            <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top dashboard-footer">
                <span className="mb-3 mb-md-0 text-body-secondary"> © 2026 GuitarCoach, Inc </span>
            </footer>
        </div>
    )
}

export default Dashboard