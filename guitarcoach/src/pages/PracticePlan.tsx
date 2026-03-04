import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../style/FindSongs.css"
import "../style/PracticePlan.css"

type Task = {
  title: string
  duration_minutes: number
  technique: string
  instructions: string
  why: string
  milestone: string
}

type Day = {
  day: string
  focus: string
  tasks: Task[]
}

type WeeklyGoal = {
  description: string
  milestones: string[]
}

type PracticePlan = {
  song_title: string
  artist: string
  skill_level: string
  weekly_goal: WeeklyGoal
  days: Day[]
}

export default function PracticePlanPage() {
  const [songTitle, setSongTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<PracticePlan | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // key is "dayIndex-taskIndex"
  function toggleTask(key: string) {
    setExpandedTask((prev) => (prev === key ? null : key))
  }

  async function generatePlan() {
    setLoading(true)
    setError("")
    setResult(null)
    setExpandedTask(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError("You must be logged in.")
      setLoading(false)
      return
    }

    const token = sessionData.session.access_token

    try {
      const res = await fetch("http://127.0.0.1:8000/api/practice-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          song_title: songTitle.trim(),
          artist: artist.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.detail ?? "Failed to generate practice plan.")
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error.")
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = !!songTitle.trim() && !!artist.trim() && !loading

  return (
    <div className="dashboard-page">
      {/* header */}
      <header className="dashboard-header">
        <div className="container">
          <div className="logo" onClick={() => { window.location.href = "/dashboard" }}>
            GuitarCoach
          </div>
          <nav className="navbar">
            <ul className="navbar-list">
              <li><a href="/dashboard">Coach</a></li>
              <li><a href="/find-songs">Find Songs</a></li>
              <li><a href="/">Tasks</a></li>
              <li>
                <button onClick={() => { window.location.href = "/profile" }} className="profile-button">
                  Profile
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="find-songs-main">
        <h1 className="page-title">Practice Plan</h1>

        {/* user input form */}
        <div className="pp-form">
          <input
            className="pp-input"
            placeholder="Song title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
          />
          <input
            className="pp-input"
            placeholder="Artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
          <button
            className="generate-btn"
            disabled={!canGenerate}
            onClick={generatePlan}
          >
            {loading ? "Generating..." : "Generate Plan"}
          </button>
          {error && <p className="error pp-error">{error}</p>}
        </div>

        {/* loading spinner */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Generating your practice plan...</p>
          </div>
        )}

        {/* empty state */}
        {!result && !loading && (
          <div className="empty-recommendation">
            <p>Enter a song and artist above to generate your personalized weekly practice plan!</p>
          </div>
        )}

        {/* results */}
        {result && (
          <div className="pp-results" onClick={() => setExpandedTask(null)}>
            {/* Main layout: calendar on left, summary on right */}
            <div className="pp-main-layout">
              {/* Calendar - main focus */}
              <div className="pp-calendar">
              {result.days?.map((day, dayIndex) => (
                <div key={day.day} className="pp-day-column">

                  {/* day header */}
                  <div className="pp-day-header">
                    <span className="pp-day-name">{day.day}</span>
                    <span className="pp-day-focus">{day.focus}</span>
                  </div>

                  {/* task list */}
                  <div className="pp-task-list">
                    {day.tasks?.map((task, taskIndex) => {
                      const key = `${dayIndex}-${taskIndex}`
                      const isOpen = expandedTask === key
                      return (
                        <div key={taskIndex} className={`pp-task-card ${isOpen ? "pp-task-card--expanded" : ""}`}>
                          {/* clickable and expandable title row */}
                          <div
                            className={`pp-task-title-row ${isOpen ? "pp-task-title-row--open" : ""}`}
                            onClick={(e) => { e.stopPropagation(); toggleTask(key) }}
                          >
                            <span className="pp-task-name">{task.title}</span>
                            <span className="pp-task-meta">
                              {task.duration_minutes}m {isOpen ? "▲" : "▼"}
                            </span>
                          </div>

                          {/* expanded details */}
                          {isOpen && (
                            <div className="pp-task-detail" onClick={(e) => e.stopPropagation()}>
                              <p className="pp-task-technique">{task.technique}</p>

                              <p className="pp-detail-label">Instructions</p>
                              <p className="pp-detail-body">{task.instructions}</p>

                              <p className="pp-detail-label">Why this helps</p>
                              <p className="pp-detail-body">{task.why}</p>

                              <p className="pp-detail-label">Milestone</p>
                              <p className="pp-detail-milestone">✓ {task.milestone}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                </div>
              ))}
              </div>

              {/* Sidebar - weekly goal and milestones */}
              <div className="pp-sidebar">
                <div className="pp-sidebar-box">
                  <p className="pp-sidebar-skill">
                    <span className="pp-skill-label">Skill Level:</span> {result.skill_level}
                  </p>

                  <p className="pp-section-label">Weekly Goal</p>
                  <p className="pp-goal-description">{result.weekly_goal.description}</p>

                  <p className="pp-section-label">Milestones</p>
                  {result.weekly_goal.milestones.map((m, i) => (
                    <p key={i} className="pp-milestone">✓ {m}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
