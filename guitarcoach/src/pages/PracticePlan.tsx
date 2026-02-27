import { useState } from "react"
import { supabase } from "../supabaseClient"

type Resource = { title?: string; url: string; why?: string }
type PracticePlan = {
  focus_summary?: string
  plan?: any[]
  resources?: Resource[]
  next_steps?: string[]
}

export default function PracticePlanPage() {
  const [songTitle, setSongTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [goals, setGoals] = useState("")
  const [struggles, setStruggles] = useState("")
  const [minutesPerDay, setMinutesPerDay] = useState(15)
  const [daysPerWeek, setDaysPerWeek] = useState(5)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<PracticePlan | null>(null)

  async function generatePlan() {
    setLoading(true)
    setError("")
    setResult(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError("You must be logged in.")
      setLoading(false)
      return
    }

    const token = sessionData.session.access_token

    const body = {
      song_title: songTitle.trim(),
      artist: artist.trim() || null,
      minutes_per_day: minutesPerDay,
      days_per_week: daysPerWeek,
      goals: goals.split(",").map(s => s.trim()).filter(Boolean),
      struggles: struggles.split(",").map(s => s.trim()).filter(Boolean),
      // skill_level optional for now
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/practice-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      // check if json
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

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Generate Practice Plan</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          placeholder="Song Title (required)"
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
        />
        <input
          placeholder="Artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <input
          placeholder="Goals"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
        <input
          placeholder="Struggles"
          value={struggles}
          onChange={(e) => setStruggles(e.target.value)}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label>
            Minutes/day{" "}
            <input
              type="number"
              value={minutesPerDay}
              onChange={(e) => setMinutesPerDay(Number(e.target.value))}
              style={{ width: 50 }}
            />
          </label>

          <label>
            Days/week{" "}
            <input
              type="number"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              style={{ width: 50 }}
            />
          </label>
        </div>

        <button disabled={loading || !songTitle.trim()} onClick={generatePlan}>
          {loading ? "Generating..." : "Generate"}
        </button>

        {error && <p>{error}</p>}
      </div>

      {result && (
        <div>
          {result.focus_summary && (
            <>
              <h2>Focus</h2>
              <p>{result.focus_summary}</p>
            </>
          )}

          {Array.isArray(result.resources) && result.resources.length > 0 && (
            <>
              <h2>YouTube Resources</h2>
              <ul>
                {result.resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.title || r.url}
                    </a>
                    {r.why ? ` — ${r.why}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2>Raw Plan (for now)</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}