import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

import "bootstrap/dist/css/bootstrap.css"
import "../style/FindSongs.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"


interface SpotifyTrack {
    id: string
    name: string
    artists: { name: string }[]
    album: {
        name: string
        images: { url: string }[]
    }
    preview_url?: string | null
}

interface RecommendedSong {
    name: string
    artist: string
    artistImage: string | null
    spotifyId: string | null
    difficulty: number
    skills: string[]
    description: string
}

interface SpotifyArtist {
    id: string
    name: string
    images: { url: string }[]
    genres: string[]
}

export default function FindSongs() {
    const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([])
    const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([])
    const [loading, setLoading] = useState(true)
    const [showHistory, setShowHistory] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [timeRange, setTimeRange] = useState("medium_term")
    const [recommendedSong, setRecommendedSong] = useState<RecommendedSong | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    const [previousSongs, setPreviousSongs] = useState<string[]>(() => {
        const saved = localStorage.getItem("previousSongs")
        return saved ? JSON.parse(saved) : []
    })

    const [selectedItem, setSelectedItem] = useState<{
        type: "track" | "artist"
        name: string
        artist?: string     // only for tracks
    } | null>(null)



    const API_BASE = "http://127.0.0.1:8000"

    useEffect(() => {
        fetchSpotifyData()
    }, [timeRange])

    useEffect(() => {
        localStorage.setItem("previousSongs", JSON.stringify(previousSongs))
    }, [previousSongs])

    async function fetchSpotifyData() {
        setLoading(true)
        setError(null)

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
            setError("Session error - please log in again")
            setLoading(false)
            return
        }

        const token = sessionData.session?.access_token

        if (!token) {
            setError("Not authenticated - please log in")
            setLoading(false)
            return
        }

        try {
            const [tracksRes, artistsRes] = await Promise.all([
                fetch(`${API_BASE}/api/spotify/top-tracks?limit=10&time_range=${timeRange}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/api/spotify/top-artists?limit=10&time_range=${timeRange}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ])

            if (!tracksRes.ok || !artistsRes.ok) {
                setError("Failed to fetch Spotify data. Make sure Spotify is connected.")
                setLoading(false)
                return
            }

            const tracksData = await tracksRes.json()
            const artistsData = await artistsRes.json()

            setTopTracks(tracksData.items || [])
            setTopArtists(artistsData.items || [])

            saveSpotifyStats(token, timeRange)
        } catch (err) {
            setError("Error fetching Spotify data")
            console.error(err)
        }

        setLoading(false)
    }

    async function saveSpotifyStats(token: string, timeRange: string) {
        try {
            await fetch(`${API_BASE}/api/spotify/save-stats?time_range=${timeRange}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            })
            console.log("Spotify stats saved to database")
        } catch (err) {
            console.error("Failed to save Spotify stats:", err)
        }
    }

    async function generateRecommendation(
        adjust_difficulty: "up" | "down" | null = null,
        similarTo?: { type: "track" | "artist", name: string, artistName?: string }
    ) {
        if (topTracks.length == 0) return

        setSelectedItem(null)
        setIsGenerating(true)

        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
            setError("Not authenticated")
            setIsGenerating(false)
            return
        }

        try {
            // call openapi endpoint
            const endpoint = similarTo
                ? `${API_BASE}/api/recommendation/generate-similar`
                : `${API_BASE}/api/recommendation/generate-song`

            const body = similarTo
                ? {
                    type: similarTo.type,
                    name: similarTo.name,
                    artist_name: similarTo.artistName || null,
                    current_difficulty: recommendedSong?.difficulty || (Math.floor(Math.random() * 5) + 1),
                    previous_songs: previousSongs
                }
                : {
                    top_tracks: topTracks,
                    top_artists: topArtists,
                    current_difficulty: recommendedSong?.difficulty || (Math.floor(Math.random() * 5) + 1),
                    adjust_difficulty: adjust_difficulty,
                    previous_songs: previousSongs
                }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            })
            const recommendation = await response.json()

            // store song so it doesn't get repeated
            setPreviousSongs(prev => [...prev, `${recommendation.name} by ${recommendation.artist}`])

            // search spotify for preview
            const spotifyRes = await fetch(
                `${API_BASE}/api/recommendation/search-spotify?song_name=${encodeURIComponent(recommendation.name)}&artist_name=${encodeURIComponent(recommendation.artist)}`,
                {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                }
            )
            const spotifyData = await spotifyRes.json()
            console.log("spotifyData:", spotifyData)

            setRecommendedSong({
                name: recommendation.name,
                artist: recommendation.artist,
                artistImage: spotifyData.album_image,
                spotifyId: spotifyData.spotify_id,
                difficulty: recommendation.difficulty,
                skills: recommendation.skills,
                description: recommendation.description
            })
        } catch (error) {
            console.error("Recommendation error:", error)
            setError("Failed to generate recommendation")

        }
        setIsGenerating(false)
    }

    return (
        <div className="find-songs-page">
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

            <section className="find-songs-hero">
                <div className="find-songs-hero-content">
                    <p className="find-songs-eyebrow">Discover</p>
                    <h1 className="find-songs-title">Find Songs</h1>
                    <p className="find-songs-sub">Personalized recommendations based on your Spotify listening history.</p>
                </div>
            </section>

            <main className="find-songs-main">
                <div className="fs-controls-row">
                    <div className="fs-time-btns">
                        {[
                            { value: "short_term", label: "Last 4 Weeks" },
                            { value: "medium_term", label: "Last 6 Months" },
                            { value: "long_term", label: "All Time" },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                className={`fs-time-btn ${timeRange === opt.value ? "active" : ""}`}
                                onClick={() => setTimeRange(opt.value)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="fs-history-wrapper">
                        <button className="fs-history-btn" onClick={() => setShowHistory(!showHistory)}>
                            {showHistory ? "Hide history" : "View recommendation history"}
                        </button>
                        {showHistory && (
                            <div className="fs-history-panel">
                                <div className="fs-history-header">
                                    <h3>Recommendation History</h3>
                                    <button className="fs-clear-btn" onClick={() => { setPreviousSongs([]); setShowHistory(false) }}>
                                        Clear all
                                    </button>
                                </div>
                                {previousSongs.length === 0 ? (
                                    <p className="fs-history-empty">No recommendations yet</p>
                                ) : (
                                    <ul className="fs-history-list">
                                        {previousSongs.map((song, i) => (
                                            <li key={i} className="fs-history-item">{song}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {loading && <p className="fs-loading">Loading your Spotify data...</p>}
                {error && <p className="fs-error">{error}</p>}

                {!loading && !error && (
                    <div className="fs-content-layout">

                        {/* Left — Top Tracks */}
                        <section className="fs-column fs-tracks-column">
                            <h2 className="fs-column-title">Your Top Tracks</h2>
                            <div className="fs-list">
                                {topTracks.map((track, index) => (
                                    <div key={track.id || index} className="fs-item-wrapper">
                                        <div
                                            className={`fs-item ${selectedItem?.type === "track" && selectedItem?.name === track.name ? "fs-item-selected" : ""}`}
                                            onClick={() => setSelectedItem(
                                                selectedItem?.type === "track" && selectedItem?.name === track.name
                                                    ? null
                                                    : { type: "track", name: track.name, artist: track.artists?.map(a => a.name).join(", ") }
                                            )}
                                        >
                                            <span className="fs-item-number">{index + 1}</span>
                                            {track.album?.images?.length > 0 && (
                                                <img
                                                    src={track.album.images[2]?.url || track.album.images[0]?.url}
                                                    alt={track.album?.name || "Album"}
                                                    className="fs-item-img"
                                                />
                                            )}
                                            <div className="fs-item-info">
                                                <span className="fs-item-name">{track.name}</span>
                                                <span className="fs-item-sub">{track.artists?.map(a => a.name).join(", ") || "Unknown"}</span>
                                            </div>
                                        </div>
                                        {selectedItem?.type === "track" && selectedItem?.name === track.name && (
                                            <div className="fs-popup">
                                                <p>Generate a similar song?</p>
                                                <button className="fs-popup-btn" onClick={(e) => {
                                                    e.stopPropagation()
                                                    generateRecommendation(null, { type: "track", name: track.name, artistName: track.artists?.[0]?.name })
                                                }}>
                                                    Yes, generate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Middle — Recommendation */}
                        <section className="fs-recommendation-column">
                            <button
                                className="fs-generate-btn"
                                onClick={() => generateRecommendation(null)}
                                disabled={isGenerating || topTracks.length === 0}
                            >
                                {isGenerating ? "Generating…" : "Generate random new song"}
                            </button>

                            {recommendedSong ? (
                                <>
                                    <div className="fs-player-row">
                                        {recommendedSong.spotifyId && (
                                            <iframe
                                                src={`https://open.spotify.com/embed/track/${recommendedSong.spotifyId}?utm_source=generator&theme=1`}
                                                height="152"
                                                width="100%"
                                                style={{ borderRadius: "12px", border: "none", minWidth: "280px" }}
                                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="fs-difficulty">
                                            <h3 className="fs-difficulty-label">Adjust Difficulty</h3>
                                            <div className="fs-difficulty-controls">
                                                <button
                                                    className="fs-arrow-btn"
                                                    onClick={() => generateRecommendation("down")}
                                                    disabled={isGenerating || (recommendedSong?.difficulty || 0) <= 1}
                                                >◀</button>
                                                <div className="fs-stars">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <span key={star} className={`fs-star ${star <= recommendedSong.difficulty ? "filled" : ""}`}>★</span>
                                                    ))}
                                                </div>
                                                <button
                                                    className="fs-arrow-btn"
                                                    onClick={() => generateRecommendation("up")}
                                                    disabled={isGenerating || (recommendedSong?.difficulty || 0) >= 5}
                                                >▶</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="fs-info-boxes">
                                        <div className="fs-info-box">
                                            <h3 className="fs-info-box-title">Guitar Skills Involved</h3>
                                            {recommendedSong.skills.map((skill, idx) => (
                                                <p key={idx} className="fs-info-box-item">• {skill}</p>
                                            ))}
                                        </div>
                                        <div className="fs-info-box">
                                            <h3 className="fs-info-box-title">Description</h3>
                                            <p className="fs-info-box-body">{recommendedSong.description}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="fs-empty">
                                    <div className="fs-empty-icon">🎸</div>
                                    <p>Click <strong>"Generate random new song"</strong> for a recommendation based on your listening history.</p>
                                    <p>Or click any track or artist to get a more targeted suggestion.</p>
                                </div>
                            )}
                        </section>

                        {/* Right — Top Artists */}
                        <section className="fs-column fs-artists-column">
                            <h2 className="fs-column-title">Your Top Artists</h2>
                            <div className="fs-list">
                                {topArtists.map((artist, index) => (
                                    <div key={artist.id || index} className="fs-item-wrapper">
                                        <div
                                            className={`fs-item ${selectedItem?.type === "artist" && selectedItem?.name === artist.name ? "fs-item-selected" : ""}`}
                                            onClick={() => setSelectedItem(
                                                selectedItem?.type === "artist" && selectedItem?.name === artist.name
                                                    ? null
                                                    : { type: "artist", name: artist.name }
                                            )}
                                        >
                                            <span className="fs-item-number">{index + 1}</span>
                                            {artist.images?.length > 0 && (
                                                <img
                                                    src={artist.images[2]?.url || artist.images[0]?.url}
                                                    alt={artist.name}
                                                    className="fs-item-img fs-item-img-round"
                                                />
                                            )}
                                            <div className="fs-item-info">
                                                <span className="fs-item-name">{artist.name}</span>
                                            </div>
                                        </div>
                                        {selectedItem?.type === "artist" && selectedItem?.name === artist.name && (
                                            <div className="fs-popup">
                                                <p>Generate a song by {artist.name}?</p>
                                                <button className="fs-popup-btn" onClick={(e) => {
                                                    e.stopPropagation()
                                                    generateRecommendation(null, { type: "artist", name: artist.name })
                                                }}>
                                                    Yes, generate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                    </div>
                )}
            </main>
        </div>
    )
}
