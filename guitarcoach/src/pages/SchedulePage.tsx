import { useEffect, useState } from "react"
import "../style/SchedulePage.css"
import { Link } from 'react-router-dom'

type Task = {
    title: string
    duration_minutes: number
    instructions: string
}

type Day = {
    day: string
    tasks: Task[]
}

type PracticePlan = {
    song_title: string
    artist: string
    days: Day[]
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function SchedulePage() {
    const [plan, setPlan] = useState<PracticePlan | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem("activePracticePlan")
        if (!stored) return
        try {
            setPlan(JSON.parse(stored))
        } catch (e) {
            console.error("Failed to parse active plan:", e)
        }
    }, [])

    function getTasksForDay(dayName: string): Task[] {
        if (!plan) return []
        const day = plan.days?.find((d) => d.day === dayName)
        return day?.tasks || []
    }

    return (
        <div className="schedule-page">
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

            <div className="schedule-container">
                <h1 className="schedule-title">Weekly Schedule</h1>

                {plan && (
                    <p className="schedule-plan-info">
                        {plan.song_title} — {plan.artist}
                    </p>
                )}

                {!plan && (
                    <p className="schedule-empty">
                        No practice plan loaded.{" "}
                        <a href="/practice-plans">Generate one →</a>
                    </p>
                )}

                <div className="schedule-grid">
                    {DAYS.map((dayName) => {
                        const tasks = getTasksForDay(dayName)
                        return (
                            <div key={dayName} className="day-column">
                                <div className="day-title">{dayName}</div>
                                <ul className="tasks-list">
                                    {tasks.length === 0 ? (
                                        <li className="task-item task-item--empty">—</li>
                                    ) : (
                                        tasks.map((task, i) => (
                                            <li key={i} className="task-item">
                                                <span className="task-item-name">{task.title} — {task.duration_minutes} min</span>
                                                <ul className="task-instructions-list">
                                                    <li>{task.instructions}</li>
                                                </ul>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </div>

            <footer className="schedule-footer">
                <div className="footer-container">
                    <div className="footer-section">
                        <Link to="/" className='logo'>GuitarCoach</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default SchedulePage