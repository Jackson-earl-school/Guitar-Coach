import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import "../style/SchedulePage.css"
import { Link } from 'react-router-dom'

const API_BASE = "http://127.0.0.1:8000"

type Task = {
    title: string
    duration_minutes: number
    instructions: string
    technique?: string
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


function SchedulePage() {
    const [plan, setPlan] = useState<PracticePlan | null>(null)
    const [planId, setPlanId] = useState<string | null>(null)
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())

    useEffect(() => {
        const stored = localStorage.getItem("activePracticePlan")
        const storedPlanId = localStorage.getItem("activePracticePlanId")
        if (!stored) return
        try {
            setPlan(JSON.parse(stored))
            if (storedPlanId) {
                setPlanId(storedPlanId)
                fetchCompletions(storedPlanId)
            }
        } catch (e) {
            console.error("Failed to parse active plan:", e)
        }
    }, [])

    async function fetchCompletions(planId: string) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        try {
            const res = await fetch(`${API_BASE}/api/practice-plan/completions/${planId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const completions = await res.json()
            const keys = completions.map((c: any) => `${c.day_name}-${c.task_index}`)
            setCompletedTasks(new Set(keys))
        } catch (e) {
            console.error("Failed to fetch completions:", e)
        }
    }

    async function toggleTaskCompletion(dayName: string, taskIndex: number, task: Task) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token || !planId) return

        const key = `${dayName}-${taskIndex}`
        const isCompleted = completedTasks.has(key)

        try {
            if (isCompleted) {
                await fetch(
                    `${API_BASE}/api/practice-plan/complete-task?plan_id=${planId}&day_name=${dayName}&task_index=${taskIndex}`,
                    {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` }
                    }
                )
                setCompletedTasks(prev => {
                    const next = new Set(prev)
                    next.delete(key)
                    return next
                })
            } else {
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
                    {(plan ? plan.days.map(d => d.day) : []).map((dayName) => {
                        const tasks = getTasksForDay(dayName)
                        return (
                            <div key={dayName} className="day-column">
                                <div className="day-title">{dayName}</div>
                                <ul className="tasks-list">
                                    {tasks.length === 0 ? (
                                        <li className="task-item task-item--empty">—</li>
                                    ) : (
                                        tasks.map((task, i) => {
                                        const key = `${dayName}-${i}`
                                        const isCompleted = completedTasks.has(key)
                                        return (
                                            <li key={i} className={`task-item ${isCompleted ? "task-item--completed" : ""}`}>
                                                <label className="task-item-label">
                                                    <input
                                                        type="checkbox"
                                                        className="schedule-checkbox"
                                                        checked={isCompleted}
                                                        onChange={() => toggleTaskCompletion(dayName, i, task)}
                                                    />
                                                    <span className={`task-item-name ${isCompleted ? "task-name--completed" : ""}`}>
                                                        {task.title} — {task.duration_minutes} min
                                                    </span>
                                                </label>
                                                <ul className={`task-instructions-list ${isCompleted ? "task-instructions--completed" : ""}`}>
                                                    <li>{task.instructions}</li>
                                                </ul>
                                            </li>
                                        )
                                    })
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