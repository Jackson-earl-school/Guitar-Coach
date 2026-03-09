import { useEffect, useState } from "react"
import "../style/Dashboard.css"
import guitar1 from "../images/guitar1.jpg"
import home1 from "../images/home.jpg"
import features2 from "../images/features2.jpg"
import features3 from "../images/features3.jpg"
import { Link } from "react-router-dom"

type Task = {
  title: string
  duration_minutes: number
  instructions: string
}

type PracticePlan = {
  song_title: string
  artist: string
  days: { day: string; tasks: Task[] }[]
}

function getTodayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" })
}

function Dashboard() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [planInfo, setPlanInfo] = useState<{ song: string; artist: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("activePracticePlan")
    if (!stored) return

    try {
      const plan: PracticePlan = JSON.parse(stored)
      const today = getTodayName()
      const todayDay = plan.days?.find((d) => d.day === today)
      if (todayDay) {
        setTodayTasks(todayDay.tasks || [])
        setPlanInfo({ song: plan.song_title, artist: plan.artist })
      }
    } catch (e) {
      console.error("Failed to parse active plan:", e)
    }
  }, [])

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="container">
          <div className="logo" onClick={() => { window.location.href = '/dashboard' }}>
            GuitarCoach
          </div>
          <nav className='navbar'>
            <ul className='navbar-list'>
              <li><a href='/practice-plans'>Coach</a></li>
              <li><a href='/find-songs'>Find Songs</a></li>
              <li><a href='/schedule'>Tasks</a></li>
              <li>
                <button onClick={() => { window.location.href = '/profile' }} className="profile-button">
                  Profile
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="dashboard-main">
        <h1 className="dashboard-title">Dashboard</h1>

        <div className="dashboard-content">
          <div className="dashboard-grid">
            <div className="dashboard-card" onClick={() => window.location.href = '/find-songs'}>
              <div className="card-bg" style={{ backgroundImage: `url(${features2})` }}></div>
              <h2>Find new songs to learn</h2>
            </div>
            <div className="dashboard-card" onClick={() => window.location.href = '/schedule'}>
              <div className="card-bg" style={{ backgroundImage: `url(${home1})` }}></div>
              <h2>See my Schedule</h2>
            </div>
            <div className="dashboard-card" onClick={() => window.location.href = '/practice-plans'}>
              <div className="card-bg" style={{ backgroundImage: `url(${guitar1})` }}></div>
              <h2>Generate New Practice Plans</h2>
            </div>
            <div className="dashboard-card" onClick={() => window.location.href = '/progress'}>
              <div className="card-bg" style={{ backgroundImage: `url(${features3})` }}></div>
              <h2>Overall Progress</h2>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {todayTasks.map((task, i) => (
                    <div key={i} style={{ borderBottom: "1px solid #eee", paddingBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{task.title}</span>
                        <span style={{ fontSize: 12, color: "#999", whiteSpace: "nowrap" }}>{task.duration_minutes} min</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.5 }}>{task.instructions}</p>
                    </div>
                  ))}
                </div>
                <a href="/practice-plans" style={{ display: "block", marginTop: 14, fontSize: 13, color: "#B57F50", fontWeight: 600 }}>
                  View full plan →
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <div className="footer-container">
          <div className="footer-section">
            <Link to="/dashboard" className='logo'>GuitarCoach</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Dashboard