import { useState } from "react"
import { supabase } from "../supabaseClient"

// copy style from find songs to ensure consistent styles
import "../style/FindSongs.css"

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
  const [minutesPerDay, setMinutesPerDay] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<PracticePlan | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  function toggleDay(day: string) {
    setExpandedDay((prev) => (prev === day ? null : day))
  }

  async function generatePlan() {
    setLoading(true)
    setError("")
    setResult(null)
    setExpandedDay(null)

    // check if in valid session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError("You must be logged in.")
      setLoading(false)
      return
    }

    // obtain token
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
          minutes_per_day: minutesPerDay,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.detail ?? "Failed to generate practice plan.")
      } else {
        setResult(data)
        if (data.days?.length) setExpandedDay(data.days[0].day)
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error.")
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = songTitle.trim() && artist.trim() && !loading

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

        {/* form */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 25, flexWrap: "wrap" }}>
          <input
            placeholder="Song title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Minutes/Day"
            value={minutesPerDay}
            onChange={(e) => setMinutesPerDay(e.target.value)}
            style={inputStyle}
          />
          <button
            className="generate-btn"
            disabled={!canGenerate}
            onClick={generatePlan}
          >
            {loading ? "Generating..." : "Generate Plan"}
          </button>
          {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
        </div>

        {/* results */}
        {result && (
          <div className="content-layout" style={{ alignItems: "flex-start" }}>

            {/* weekly goal - left side */}
            <section style={{ width: 220, flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: "bold", margin: "0 0 12px" }}>Weekly Goal</h2>
              <div className="info-box" style={{ minWidth: "unset", minHeight: "unset" }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 }}>
                  {result.weekly_goal.description}
                </p>
                <h3 style={{ fontSize: 13, fontWeight: "bold", margin: "0 0 8px" }}>Milestones</h3>
                {result.weekly_goal.milestones.map((m, i) => (
                  <p key={i} style={{ fontSize: 13, margin: "4px 0", color: "#333" }}>✓ {m}</p>
                ))}
              </div>
            </section>

            {/* plan for each day - middle */}
            <section className="recommendation-column" style={{ gap: 8 }}>
              {result.days?.map((day) => (
                <div key={day.day} style={{ width: "100%" }}>
                  {/* day row */}
                  <div
                    className="track-item"
                    onClick={() => toggleDay(day.day)}
                    style={{
                      borderRadius: expandedDay === day.day ? "8px 8px 0 0" : 25,
                      height: "auto",
                      padding: "10px 16px",
                      cursor: "pointer",
                      justifyContent: "space-between",
                      backgroundColor: expandedDay === day.day ? "#B57F50" : "#d9d9d9",
                      color: expandedDay === day.day ? "#fff" : "#000",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{day.day}</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {day.focus} {expandedDay === day.day ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* expand tasks */}
                  {expandedDay === day.day && (
                    <div style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "2px solid #B57F50",
                      borderTop: "none",
                      borderRadius: "0 0 8px 8px",
                      padding: 16,
                      display: "grid",
                      gap: 12,
                    }}>
                      {day.tasks?.map((task, i) => (
                        <div key={i} className="info-box" style={{ minHeight: "unset", minWidth: "unset" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <strong style={{ fontSize: 15 }}>{task.title}</strong>
                            <span style={{ fontSize: 12, color: "#666" }}>⏱ {task.duration_minutes} min</span>
                          </div>
                          <p style={{ fontSize: 12, color: "#777", margin: "0 0 10px", fontStyle: "italic" }}>
                            {task.technique}
                          </p>
                          <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Instructions</h3>
                          <p style={{ fontSize: 13, margin: "0 0 10px", lineHeight: 1.5, color: "#333" }}>
                            {task.instructions}
                          </p>
                          <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Why this helps</h3>
                          <p style={{ fontSize: 13, margin: "0 0 10px", lineHeight: 1.5, color: "#333" }}>
                            {task.why}
                          </p>
                          <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Milestone</h3>
                          <p style={{ fontSize: 13, margin: 0, color: "#2a7a2a", fontWeight: 500 }}>
                            ✓ {task.milestone}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* song information - right Side */}
            <section style={{ width: 220, flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: "bold", margin: "0 0 12px" }}>Song</h2>
              <div className="info-box" style={{ minWidth: "unset", minHeight: "unset", marginTop: 12 }}>
                <p style={{ fontSize: 13, fontWeight: "bold", margin: "0 0 6px" }}></p>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>{result.song_title}</p>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>{result.artist}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#777", textTransform: "capitalize" }}>
                  {result.skill_level} · {minutesPerDay} min/day
                </p>
              </div>
            </section>

          </div>
        )}

        {/* empty state */}
        {!result && !loading && (
          <div className="empty-recommendation" style={{ marginTop: 0 }}>
            <p>Enter a song and artist above to generate your personalized weekly practice plan!</p>
          </div>
        )}
      </main>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 14,
  borderRadius: 25,
  border: "2px solid #000",
  backgroundColor: "#fff",
  outline: "none",
}