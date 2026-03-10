import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

import "bootstrap/dist/css/bootstrap.css"
import "../style/Dashboard.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"



const API_BASE = "http://127.0.0.1:8000"

const CACHE_KEY_USERNAME = "gc_username"
const CACHE_KEY_SPOTIFY  = "gc_spotify_connected"

type Task = {
  title: string
  duration_minutes: number
  instructions: string
  technique?: string
}

type PracticePlan = {
  song_title: string
  artist: string
  days: { day: string; tasks: Task[] }[]
}

type CompletionKey = string

function getTodayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" })
}

function Dashboard() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
    const [planId, setPlanId] = useState<string | null>(null)

    // Read cache instantly so the UI renders correctly on the first frame
    const [username, setUsername] = useState<string>(
        () => localStorage.getItem(CACHE_KEY_USERNAME) ?? ""
    )
    const [spotifyConnected, setSpotifyConnected] = useState<boolean>(
        () => localStorage.getItem(CACHE_KEY_SPOTIFY) === "true"
    )

    const [todayTasks, setTodayTasks] = useState<Task[]>([])
    const [planInfo, setPlanInfo] = useState<{ song: string; artist: string } | null>(null)

    useEffect(() => {
        if (searchParams.get("spotify_connected")) {
            setSpotifyConnected(true)
            localStorage.setItem(CACHE_KEY_SPOTIFY, "true")
        }
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

            // Update username and cache it
            const name = profile.username ?? ""
            setUsername(name)
            localStorage.setItem(CACHE_KEY_USERNAME, name)

            // Only update Spotify status from DB if the URL param didn't already set it
            if (!searchParams.get("spotify_connected")) {
                const connected = !!profile.spotify_access_token
                setSpotifyConnected(connected)
                localStorage.setItem(CACHE_KEY_SPOTIFY, String(connected))
            }
        })()
    }, [navigate, searchParams])

    useEffect(() => {
        const stored = localStorage.getItem("activePracticePlan")
        const storedPlanId = localStorage.getItem("activePracticePlanId")
        if (!stored) return

        try {
            const plan: PracticePlan = JSON.parse(stored)
            const today = getTodayName()
            const todayDay = plan.days?.find((d) => d.day === today)
            if (todayDay) {
                setTodayTasks(todayDay.tasks || [])
                setPlanInfo({ song: plan.song_title, artist: plan.artist })
            }

            if (storedPlanId) {
                setPlanId(storedPlanId)
                fetchCompletions(storedPlanId)
            }
        } catch (e) {
            console.error("Failed to parse active plan:", e)
        }
    }, [])

    // fetching the completions for the display
    async function fetchCompletions(planId: string) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        try {
            const res = await fetch(`${API_BASE}/api/practice-plan/completions/${planId}`, {
                headers: {Authorization: `Bearer ${token}`}
            })
            const completions = await res.json()
            const keys = completions.map((c: any) => `${c.day_name}-${c.task_index}`)
            setCompletedTasks(new Set(keys))
        } catch (e) {
            console.error("Failed to fetch completions:", e)
        }
    }

    // task completion function
    async function toggleTaskCompletion(taskIndex: number, task: Task){
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token || !planId) return

        const dayName = getTodayName()
        const key = `${dayName}-${taskIndex}`
        const isCompleted = completedTasks.has(key)

        try {
            if (isCompleted){
                // uncomplete
                await fetch(`${API_BASE}/api/practice-plan/complete-task?plan_id=${planId}&day_name=${dayName}&task_index=${taskIndex}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}`}
                })

                setCompletedTasks(prev => {
                    const next = new Set(prev)
                    next.delete(key)
                    return next
                })
            } else {
                // Complete
                await fetch(`${API_BASE}/api/practice-plan/complete-task`, {
                    method: "POST",
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        plan_id: planId,
                        day_name: dayName,
                        task_index: taskIndex,
                        task_title: task.title,
                        technique: task.technique || null,
                        duration_minutes: task.duration_minutes
                    })
                })
                setCompletedTasks(prev => new Set(prev).add(key))
            }
        } catch (e) {
            console.error("Failed to toggle task:", e)
        }
    }

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
                    <a className="navbar-brand" href="/dashboard">GuitarCoach</a>
                    <button className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav justify-content-end w-100">
                            <li className="nav-item">
                                <a className="nav-link active" aria-current="page" href="/dashboard">Dashboard</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/profile">Profile</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <section className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <p className="dashboard-eyebrow">Welcome back</p>
                    <h1 className="dashboard-your-dashboard">
                        {`${username}'s Dashboard`}
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

            <main className="dashboard-main">
                <section className="dashboard-content">
                    <div className="dashboard-grid">
                        <div className="dashboard-card" onClick={() => window.location.href = '/find-songs'}>
                            <div className="card-bg card-bg--1"></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Discover</span>
                                <h2>Find New Songs</h2>
                            </div>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/schedule'}>
                            <div className="card-bg card-bg--2"></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Plan</span>
                                <h2>My Schedule</h2>
                            </div>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/practice-plans'}>
                            <div className="card-bg card-bg--3"></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Practice</span>
                                <h2>Generate Practice Plans</h2>
                            </div>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/progress'}>
                            <div className="card-bg card-bg--4"></div>
                            <div className="card-overlay"></div>
                            <div className="card-text">
                                <span className="card-label">Track</span>
                                <h2>Overall Progress</h2>
                            </div>
                        </div>
                    </div>

                    {/* today's tasks panel */}
                    <div className="tasks-panel">
                        <h2 className="tasks-title">Today's Tasks</h2>

                        {todayTasks.length === 0 ? (
                            <div>
                                <p style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>
                                    No tasks for today.
                                </p>
                                <a href="/practice-plans" style={{ fontSize: 13, color: "#B57F50", fontWeight: 600 }}>
                                    Generate a practice plan →
                                </a>
                            </div>
                        ) : (
                            <div>
                                {planInfo && (
                                    <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 14px", paddingBottom: 10, borderBottom: "1px solid #eee", color: "#333" }}>
                                        {planInfo.song} — <span style={{ fontWeight: 400, color: "#666" }}>{planInfo.artist}</span>
                                    </p>
                                )}
                                <div className="task-list">
                                    {todayTasks.map((task, i) => {
                                        const key = `${getTodayName()}-${i}`
                                        const isCompleted = completedTasks.has(key)
                                        return (
                                            <div key={i} className={`task-row ${isCompleted ? "task-row--completed" : ""}`}>
                                                <input
                                                    type="checkbox"
                                                    className="task-checkbox"
                                                    checked={isCompleted}
                                                    onChange={() => toggleTaskCompletion(i, task)}
                                                />
                                                <div className="task-content">
                                                    <div className="task-header">
                                                        <span className={`task-title ${isCompleted ? "task-title--completed" : ""}`}>
                                                            {task.title}
                                                        </span>
                                                        <span className="task-duration">{task.duration_minutes} min</span>
                                                    </div>
                                                    <p className={`task-instructions ${isCompleted ? "task-instructions--completed" : ""}`}>
                                                        {task.instructions}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <a href="/practice-plans" style={{ display: "block", marginTop: 14, fontSize: 13, color: "#B57F50", fontWeight: 600 }}>
                                    View full plan →
                                </a>
                            </div>
                        )}
                    </div>

                </section>
            </main>

            <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top dashboard-footer">
                <span className="mb-3 mb-md-0 text-body-secondary"> © 2026 GuitarCoach, Inc </span>
            </footer>
        </div>
    )
}

export default Dashboard