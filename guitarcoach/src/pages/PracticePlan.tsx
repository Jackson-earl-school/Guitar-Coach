import { useState, useEffect } from "react"
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

type SavedPlan = {
  id: string
  song_title: string
  artist: string
  plan: PracticePlan
  created_at: string
}

const API = "http://127.0.0.1:8000"

export default function PracticePlanPage() {
  const [songTitle, setSongTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<PracticePlan | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate")
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
  const [savedPlansLoading, setSavedPlansLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSavedPlans()
  }, [])

  function toggleTask(key: string) {
    setExpandedTask((prev) => (prev === key ? null : key))
  }

  async function getToken(): Promise<string | null> {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) return null
    return data.session.access_token
  }

  async function generatePlan() {
    setLoading(true)
    setError("")
    setResult(null)
    setExpandedTask(null)

    const token = await getToken()
    if (!token) {
      setError("You must be logged in.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API}/api/practice-plan`, {
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
        localStorage.setItem("activePracticePlan", JSON.stringify(data))
        // Note: Generated plans don't have an ID until saved
        localStorage.removeItem("activePracticePlanId")
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error.")
    } finally {
      setLoading(false)
    }
  }

  async function savePlan() {
    if (!result) return
    setSaving(true)

    const token = await getToken()
    if (!token) return

    try {
      const res = await fetch(`${API}/api/practice-plan/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: result }),
      })

      if (res.ok) {
        // Fetch saved plans and find the newly saved one
        const savedRes = await fetch(`${API}/api/practice-plan/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const savedData = await savedRes.json()
        setSavedPlans(savedData)

        const matchingPlan = savedData.find(
          (p: SavedPlan) => p.song_title === result.song_title && p.artist === result.artist
        )
        if (matchingPlan) {
          localStorage.setItem("activePracticePlanId", matchingPlan.id)
        }
      } else {
        const data = await res.json()
        console.error("Save failed:", data)
      }
    } catch (e) {
      console.error("Failed to save plan:", e)
    } finally {
      setSaving(false)
    }
  }

  async function fetchSavedPlans() {
    setSavedPlansLoading(true)
    const token = await getToken()
    if (!token) {
      setSavedPlansLoading(false)
      return
    }

    try {
      const res = await fetch(`${API}/api/practice-plan/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setSavedPlans(data)
    } catch (e) {
      console.error("Failed to fetch saved plans:", e)
    } finally {
      setSavedPlansLoading(false)
    }
  }

  async function deletePlan(planId: string) {
    const token = await getToken()
    if (!token) return

    try {
      await fetch(`${API}/api/practice-plan/saved/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId))
    } catch (e) {
      console.error("Failed to delete plan:", e)
    }
  }

  function loadPlan(saved: SavedPlan) {
    setResult(saved.plan)
    setExpandedTask(null)
    setActiveTab("generate")
    localStorage.setItem("activePracticePlan", JSON.stringify(saved.plan))
    localStorage.setItem("activePracticePlanId", saved.id)
  }

  const canGenerate = !!songTitle.trim() && !!artist.trim() && !loading
  const alreadySaved = result
    ? savedPlans.some((p) => p.song_title === result.song_title && p.artist === result.artist)
    : false

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

        {/* tabs */}
        <div className="time-range-selector" style={{ marginBottom: 25 }}>
          <button
            className={activeTab === "generate" ? "active" : ""}
            onClick={() => setActiveTab("generate")}
          >
            Generate
          </button>
          <button
            className={activeTab === "saved" ? "active" : ""}
            onClick={() => setActiveTab("saved")}
          >
            Saved Plans {savedPlans.length > 0 && `(${savedPlans.length})`}
          </button>
        </div>

        {/* generate tab */}
        {activeTab === "generate" && (
          <>
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
                <div className="pp-main-layout">

                  {/* calendar — main focus */}
                  <div className="pp-calendar">
                    {result.days?.map((day, dayIndex) => (
                      <div key={day.day} className="pp-day-column">
                        <div className="pp-day-header">
                          <span className="pp-day-name">{day.day}</span>
                          <span className="pp-day-focus">{day.focus}</span>
                        </div>
                        <div className="pp-task-list">
                          {day.tasks?.map((task, taskIndex) => {
                            const key = `${dayIndex}-${taskIndex}`
                            const isOpen = expandedTask === key
                            return (
                              <div key={taskIndex} className={`pp-task-card ${isOpen ? "pp-task-card--expanded" : ""}`}>
                                <div
                                  className={`pp-task-title-row ${isOpen ? "pp-task-title-row--open" : ""}`}
                                  onClick={(e) => { e.stopPropagation(); toggleTask(key) }}
                                >
                                  <span className="pp-task-name">{task.title}</span>
                                  <span className="pp-task-meta">
                                    {task.duration_minutes}m {isOpen ? "▲" : "▼"}
                                  </span>
                                </div>
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

                  {/* sidebar — song info, weekly goal, save button */}
                  <div className="pp-sidebar">
                    <div className="pp-sidebar-box">
                      <p className="pp-song-title">Song</p>
                      <p className="pp-song-detail"><span className="pp-song-detail-label">Song:</span> {result.song_title}</p>
                      <p className="pp-song-detail"><span className="pp-song-detail-label">Artist:</span> {result.artist}</p>
                      <p className="pp-sidebar-skill">
                        <span className="pp-skill-label">Song Difficulty:</span> {result.skill_level}
                      </p>

                      <button
                        className="pp-save-btn"
                        onClick={(e) => { e.stopPropagation(); savePlan() }}
                        disabled={saving || alreadySaved}
                      >
                        {saving ? "Saving..." : alreadySaved ? "✓ Saved" : "Save Plan"}
                      </button>

                      <div className="pp-sidebar-divider" />

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
          </>
        )}

        {/* saved plans tab */}
        {activeTab === "saved" && (
          <div>
            {savedPlansLoading && <p className="loading">Loading saved plans...</p>}
            {!savedPlansLoading && savedPlans.length === 0 && (
              <div className="empty-recommendation">
                <p>No saved plans yet. Generate a plan and save it!</p>
              </div>
            )}
            {!savedPlansLoading && savedPlans.length > 0 && (
              <div className="pp-saved-list">
                {savedPlans.map((saved) => (
                  <div key={saved.id} className="track-item pp-saved-item">
                    <div className="pp-saved-info">
                      <span className="track-name">{saved.song_title}</span>
                      <span className="track-artist">{saved.artist}</span>
                    </div>
                    <div className="pp-saved-actions">
                      <button className="pp-load-btn" onClick={() => loadPlan(saved)}>
                        Load
                      </button>
                      <button className="pp-delete-btn" onClick={() => deletePlan(saved.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
