import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { supabase } from "../supabaseClient"
import { getSkillScores, getPlayerType } from "./utils/getSkillsScore"
import { useEffect, useState } from "react"

import type { SkillScore, QuestionnaireAnswers } from "./utils/getSkillsScore"

import "bootstrap/dist/css/bootstrap.css"
import "../style/ProgressPage.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"

// Skill descriptions and what factors impact each score
const skillInfo: Record<string, { description: string; factors: string[] }> = {
    "Technical Skill": {
        description: "Measures your overall technical proficiency on guitar, including chord knowledge and specific techniques like bends, hammer-ons, and slides.",
        factors: ["technical_skills", "techniques"]
    },
    "Chord Fluency": {
        description: "How smoothly you can switch between chords and play songs without pausing. This reflects your muscle memory and chord transitions.",
        factors: ["switching_chords", "song_playing"]
    },
    "Experience": {
        description: "Your overall time spent playing guitar and dedication to practice. More experience typically leads to better intuition and comfort.",
        factors: ["time_frame", "practicing"]
    },
    "Rhythm & Feel": {
        description: "Your sense of timing, groove, and rhythmic techniques. This includes strumming patterns, fingerpicking, and rhythm-related techniques.",
        factors: ["techniques", "technical_skills"]
    },
    "Theory": {
        description: "Your understanding of music theory, including reading notation, understanding scales, keys, and chord progressions.",
        factors: ["learning_style"]
    },
    "Goal Orientation": {
        description: "How ambitious your guitar goals are and how much time you dedicate to achieving them. Higher goals with consistent practice score higher.",
        factors: ["goal", "practicing"]
    },
    "Lead & Soloing": {
        description: "Your ability to play lead guitar, including solos, improvisation, and melodic playing over chord progressions.",
        factors: ["soloing"]
    }
}

// Helper to get readable factor names
const factorLabels: Record<string, string> = {
    technical_skills: "Chord Types Known",
    techniques: "Technique Ratings",
    switching_chords: "Chord Switching Speed",
    song_playing: "Song Playing Ability",
    time_frame: "Years Playing",
    practicing: "Daily Practice Time",
    learning_style: "Music Reading Ability",
    goal: "Guitar Goals",
    soloing: "Soloing Experience"
}

// Custom label component for radar chart axes
interface CustomTickProps {
    x: number | string
    y: number | string
    cx?: number
    cy?: number
    payload: { value: string }
    chartData: { skill: string; value: number }[]
}

function CustomTick({ x, y, cx = 0, cy = 0, payload, chartData }: CustomTickProps) {
    const dataPoint = chartData.find(d => d.skill === payload.value)
    const percentage = dataPoint?.value ?? 0

    // Split skill name into lines for better display
    const lines = payload.value.split(' ')

    // Calculate offset to push labels away from center
    const numX = Number(x)
    const numY = Number(y)
    const offsetDistance = 35 // pixels to push outward

    // Direction from center to label
    const dx = numX - cx
    const dy = numY - cy
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Normalized direction * offset
    const offsetX = distance > 0 ? (dx / distance) * offsetDistance : 0
    const offsetY = distance > 0 ? (dy / distance) * offsetDistance : 0

    return (
        <g transform={`translate(${numX + offsetX},${numY + offsetY})`}>
            {lines.map((line, i) => (
                <text
                    key={i}
                    x={0}
                    y={i * 14}
                    textAnchor="middle"
                    fill="#000"
                    fontSize={13}
                    fontWeight="bold"
                >
                    {line}
                </text>
            ))}
            <text
                x={0}
                y={lines.length * 14 + 4}
                textAnchor="middle"
                fill="#000"
                fontSize={12}
            >
                {percentage}%
            </text>
        </g>
    )
}

export default function ProgressPage() {
    const [skillScores, setSkillScores] = useState<SkillScore[]>([])
    const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null)
    const [playerType, setPlayerType] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

    // Get the value for a questionnaire answer to display in popup
    function getAnswerDisplay(factor: string): string {
        if (!answers) return "Not set"

        switch (factor) {
            case "technical_skills":
                return answers.technical_skills?.join(", ") || "None selected"
            case "techniques":
                if (!answers.techniques) return "Not rated"
                return Object.entries(answers.techniques)
                    .map(([tech, rating]) => `${tech}: ${rating}/5`)
                    .join(", ")
            case "switching_chords":
                return answers.switching_chords || "Not set"
            case "song_playing":
                return answers.song_playing || "Not set"
            case "time_frame":
                return answers.time_frame || "Not set"
            case "practicing":
                return answers.practicing || "Not set"
            case "learning_style":
                return answers.learning_style?.join(", ") || "None selected"
            case "goal":
                return answers.goal || "Not set"
            case "soloing":
                return answers.soloing || "Not set"
            default:
                return "Unknown"
        }
    }

    // Custom clickable dot component for radar nodes
    function ClickableDot(props: { cx?: number; cy?: number; payload?: { skill: string } }) {
        const { cx, cy, payload } = props
        if (!cx || !cy || !payload) return null

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            setSelectedSkill(payload.skill)
        }

        return (
            <g style={{ cursor: 'pointer' }}>
                {/* Visible dot - no pointer events */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="#B57F50"
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                />
                {/* Invisible clickable area on top */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={14}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={handleClick}
                />
            </g>
        )
    }

    useEffect(() => {
        fetchQuestionnaireData()
    }, [])

    async function fetchQuestionnaireData() {
        try {
            const { data: sessionData } = await supabase.auth.getSession()
            const userId = sessionData.session?.user?.id

            if (!userId) {
                setError("Please log in to view your progress")
                setLoading(false)
                return
            }

            const { data, error: fetchError } = await supabase
                .from("profiles")
                .select("questionnaire_answers")
                .eq("id", userId)
                .single()

            if (fetchError) {
                console.error("Error fetching questionnaire:", fetchError)
                setError("Failed to load your data")
                setLoading(false)
                return
            }

            if (!data?.questionnaire_answers) {
                setError("Complete the questionnaire first to see your skill radar")
                setLoading(false)
                return
            }

            const questionnaireAnswers: QuestionnaireAnswers = data.questionnaire_answers
            setAnswers(questionnaireAnswers)
            const scores = getSkillScores(questionnaireAnswers)
            setSkillScores(scores)
            setPlayerType(getPlayerType(questionnaireAnswers))
            setLoading(false)
        } catch (err) {
            console.error("Failed to fetch questionnaire data:", err)
            setError("Something went wrong")
            setLoading(false)
        }
    }

    // Convert 0-1 values to percentages for display
    const chartData = skillScores.map(score => ({
        skill: score.axis,
        value: Math.round(score.value * 100),
        fullMark: 100
    }))

    // Custom tick formatter for radius axis
    const formatTick = (value: number) => `${value}%`

    return (
        <div className="progress-page">
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
                            <li className="nav-item"><a className="nav-link" href="/dashboard">Dashboard</a></li>
                            <li className="nav-item"><a className="nav-link" href="/profile"> Profile </a></li>
                        </ul>
                    </div>
                </div>
            </nav>

            <section className="progress-hero">
                <div className="progress-hero-content">
                    <p className="progress-eyebrow">Track</p>
                    <h1 className="progress-title">Overall Progress</h1>
                    <p className="progress-sub">Your skill breakdown based on questionnaire answers.</p>
                </div>
            </section>

            <main className="progress-main">
                {loading ? (
                    <p className="progress-loading">Loading your skills...</p>
                ) : error ? (
                    <div className="progress-error">
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="progress-content">

                        {/* Left — Radar + bars */}
                        <div className="radar-section">
                            <div className="progress-card">
                                <h2 className="progress-card-title">Skill Radar</h2>
                                <p className="progress-card-subtitle">Click any node to learn more about that skill</p>

                                <div className="radar-chart-wrapper">
                                    <ResponsiveContainer width="100%" height={500}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
                                            <PolarGrid stroke="#e8d8c4" />
                                            <PolarAngleAxis
                                                dataKey="skill"
                                                tick={(props) => <CustomTick {...props} chartData={chartData} />}
                                                tickLine={false}
                                            />
                                            <PolarRadiusAxis
                                                angle={90}
                                                domain={[0, 100]}
                                                tickCount={4}
                                                tickFormatter={formatTick}
                                                tick={{ fill: '#bbb', fontSize: 10 }}
                                                axisLine={false}
                                            />
                                            <Radar
                                                name="Skills"
                                                dataKey="value"
                                                stroke="#B57F50"
                                                fill="#B57F50"
                                                fillOpacity={0.25}
                                                dot={<ClickableDot />}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="skill-bars">
                                    {chartData.map((item) => (
                                        <div key={item.skill} className="skill-bar-item">
                                            <span className="skill-bar-label">{item.skill}</span>
                                            <div className="skill-bar-track">
                                                <div className="skill-bar-fill" style={{ width: `${item.value}%` }} />
                                            </div>
                                            <span className="skill-bar-value">{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right — Player profile + answers */}
                        <div className="profile-section">

                            {/* Player type emblem */}
                            <div className="progress-card player-emblem-card">
                                <div className="emblem-icon">🎸</div>
                                <h3 className="emblem-title">{playerType}</h3>
                                <p className="emblem-subtitle">Current Level</p>
                            </div>

                            {/* Questionnaire answers */}
                            <div className="progress-card">
                                <h2 className="progress-card-title">Questionnaire Answers</h2>
                                <p className="progress-card-subtitle">Updates as you complete practice plan tasks</p>

                                {answers && (
                                    <div className="answers-list">
                                        {answers.techniques && Object.keys(answers.techniques).length > 0 && (
                                            <div className="answer-group">
                                                <span className="answer-group-label">Technique Ratings (1–5)</span>
                                                <div className="technique-sliders">
                                                    {Object.entries(answers.techniques).map(([tech, rating]) => (
                                                        <div key={tech} className="technique-item">
                                                            <span className="technique-name">{tech}</span>
                                                            <div className="technique-slider">
                                                                <div className="slider-track">
                                                                    <div className="slider-fill" style={{ width: `${(rating / 5) * 100}%` }} />
                                                                    <div className="slider-thumb" style={{ left: `${(rating / 5) * 100}%` }} />
                                                                </div>
                                                            </div>
                                                            <span className="technique-value">{rating}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {answers.technical_skills && answers.technical_skills.length > 0 && (
                                            <div className="answer-group">
                                                <span className="answer-group-label">Technical Skills</span>
                                                <div className="skills-tags">
                                                    {answers.technical_skills.map(skill => (
                                                        <span key={skill} className="skill-tag">✓ {skill}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {[
                                            { label: "Chord Switching", value: answers.switching_chords },
                                            { label: "Song Playing", value: answers.song_playing },
                                            { label: "Soloing", value: answers.soloing },
                                            { label: "Goal", value: answers.goal },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="answer-group">
                                                <span className="answer-group-label">{label}</span>
                                                <span className="answer-value">{value || "Not set"}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Skill detail popup ── */}
            {selectedSkill && skillInfo[selectedSkill] && (
                <div className="skill-popup-overlay" onClick={() => setSelectedSkill(null)}>
                    <div className="skill-popup" onClick={(e) => e.stopPropagation()}>
                        <button className="popup-close" onClick={() => setSelectedSkill(null)}>×</button>
                        <h3 className="popup-title">{selectedSkill}</h3>
                        <p className="popup-score">
                            Score: <strong>{chartData.find(d => d.skill === selectedSkill)?.value ?? 0}%</strong>
                        </p>
                        <p className="popup-description">{skillInfo[selectedSkill].description}</p>
                        <div className="popup-factors">
                            <h4>What impacts this score</h4>
                            {skillInfo[selectedSkill].factors.map(factor => (
                                <div key={factor} className="factor-item">
                                    <span className="factor-label">{factorLabels[factor]}</span>
                                    <span className="factor-value">{getAnswerDisplay(factor)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top progress-footer">
                <span className="mb-3 mb-md-0 text-body-secondary">© 2026 GuitarCoach, Inc</span>
            </footer>
        </div>
    )
}