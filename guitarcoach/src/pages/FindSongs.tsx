import { useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"
import "../style/FindSongs.css"

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
    previewUrl: string | null
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
    const [error, setError] = useState<string | null>(null)
    const [timeRange, setTimeRange] = useState("medium_term")
    const [recommendedSong, setRecommendedSong] = useState<RecommendedSong | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const API_BASE = "http://127.0.0.1:8000"

    useEffect(() => {
        fetchSpotifyData()
    }, [timeRange])

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

            saveSpotifyStats(token)
        } catch (err) {
            setError("Error fetching Spotify data")
            console.error(err)
        }

        setLoading(false)
    }

    async function saveSpotifyStats(token: string) {
        try {
            await fetch(`${API_BASE}/api/spotify/save-stats`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            })
            console.log("Spotify stats saved to database")
        } catch (err) {
            console.error("Failed to save Spotify stats:", err)
        }
    }

    function generateRecommendation() {
        if (topTracks.length === 0) return

        setIsGenerating(true)

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }

        // For now, pick a random track from top tracks
        // Later this will be replaced with ChatGPT recommendations
        const randomTrack = topTracks[Math.floor(Math.random() * topTracks.length)]

        // Try to find the artist in topArtists to get their image
        const artistName = randomTrack.artists?.[0]?.name || ""
        const matchingArtist = topArtists.find(a => a.name === artistName)
        const artistImage = matchingArtist?.images?.[0]?.url ||
                           matchingArtist?.images?.[1]?.url ||
                           randomTrack.album?.images?.[0]?.url || null

        // Placeholder skills and description - will be replaced with ChatGPT
        const skills = ["strumming", "chord transitions", "fingerpicking"]
        const descriptions = [
            "This song matches your taste and will help improve your technique.",
            "Based on your listening history, this track offers a good challenge.",
            "A great song to practice rhythm and timing skills."
        ]

        setTimeout(() => {
            setRecommendedSong({
                name: randomTrack.name,
                artist: randomTrack.artists?.map(a => a.name).join(", ") || "Unknown",
                artistImage: artistImage,
                previewUrl: randomTrack.preview_url || null,
                difficulty: 3,
                skills: skills.slice(0, Math.floor(Math.random() * 2) + 2),
                description: descriptions[Math.floor(Math.random() * descriptions.length)]
            })
            setIsGenerating(false)
        }, 500) // Small delay for UX
    }

    function togglePlayback() {
        if (!recommendedSong?.previewUrl) return

        if (!audioRef.current) {
            audioRef.current = new Audio(recommendedSong.previewUrl)
            audioRef.current.onended = () => setIsPlaying(false)
        }

        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.play()
            setIsPlaying(true)
        }
    }

    // Update audio source when recommendation changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }
        if (recommendedSong?.previewUrl) {
            audioRef.current = new Audio(recommendedSong.previewUrl)
            audioRef.current.onended = () => setIsPlaying(false)
        }
    }, [recommendedSong])

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="container">
                    <div className="logo" onClick={() => { window.location.href = '/dashboard'; }}>
                        GuitarCoach
                    </div>
                    <nav className='navbar'>
                        <ul className='navbar-list'>
                            <li><a href='/dashboard'>Coach</a></li>
                            <li><a href='/find-songs'>Find Songs</a></li>
                            <li><a href='/'>Tasks</a></li>
                            <li>
                                <button onClick={() => { window.location.href = '/profile'; }} className="profile-button">
                                    Profile
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main className="find-songs-main">
                <h1 className="page-title">Find Songs</h1>

                <div className="time-range-selector">
                    <button
                        className={timeRange === "short_term" ? "active" : ""}
                        onClick={() => setTimeRange("short_term")}
                    >
                        Last 4 Weeks
                    </button>
                    <button
                        className={timeRange === "medium_term" ? "active" : ""}
                        onClick={() => setTimeRange("medium_term")}
                    >
                        Last 6 Months
                    </button>
                    <button
                        className={timeRange === "long_term" ? "active" : ""}
                        onClick={() => setTimeRange("long_term")}
                    >
                        All Time
                    </button>
                </div>

                {loading && <p className="loading">Loading your Spotify data...</p>}
                {error && <p className="error">{error}</p>}

                {!loading && !error && (
                    <div className="content-layout">
                        {/* Left Column - Top Tracks */}
                        <section className="tracks-column">
                            <h2>Your Top Tracks</h2>
                            <div className="tracks-list">
                                {topTracks.map((track, index) => (
                                    <div key={track.id || index} className="track-item">
                                        <span className="track-number">{index + 1}</span>
                                        {track.album?.images?.length > 0 && (
                                            <img
                                                src={track.album.images[2]?.url || track.album.images[0]?.url}
                                                alt={track.album?.name || "Album"}
                                                className="track-image"
                                            />
                                        )}
                                        <div className="track-info">
                                            <span className="track-name">{track.name}</span>
                                            <span className="track-artist">
                                                {track.artists?.map(a => a.name).join(", ") || "Unknown"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Middle Column - Recommendations */}
                        <section className="recommendation-column">
                            <button
                                className="generate-btn"
                                onClick={generateRecommendation}
                                disabled={isGenerating || topTracks.length === 0}
                            >
                                {isGenerating ? "Generating..." : "Generate new song"}
                            </button>

                            {recommendedSong ? (
                                <>
                                    <div className="difficulty-buttons">
                                        <button className="difficulty-btn" onClick={generateRecommendation}>difficulty up</button>
                                        <button className="difficulty-btn" onClick={generateRecommendation}>difficulty down</button>
                                    </div>

                                    <div className="recommended-song-container">
                                        <div className="recommended-song">
                                            <div
                                                className={`play-button ${!recommendedSong.previewUrl ? 'disabled' : ''}`}
                                                onClick={togglePlayback}
                                            >
                                                <span className="play-icon">{isPlaying ? "⏸" : "▶"}</span>
                                            </div>
                                            <span className="song-title">{recommendedSong.name}</span>
                                        </div>

                                        <div className="artist-display">
                                            {recommendedSong.artistImage && (
                                                <img
                                                    src={recommendedSong.artistImage}
                                                    alt={recommendedSong.artist}
                                                    className="recommended-artist-image"
                                                />
                                            )}
                                            <div className="artist-text">
                                                <h3><u>Artist:</u></h3>
                                                <p>{recommendedSong.artist}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {!recommendedSong.previewUrl && (
                                        <p className="no-preview">No preview available for this track</p>
                                    )}

                                    <div className="star-rating">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span
                                                key={star}
                                                className={`star ${star <= recommendedSong.difficulty ? 'filled' : ''}`}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>

                                    <div className="info-boxes">
                                        <div className="info-box">
                                            <h3><u>Guitar skills involved:</u></h3>
                                            {recommendedSong.skills.map((skill, idx) => (
                                                <p key={idx}>{skill}</p>
                                            ))}
                                        </div>

                                        <div className="info-box">
                                            <h3><u>Description:</u></h3>
                                            <p>{recommendedSong.description}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-recommendation">
                                    <p>Click "Generate new song" to get a personalized recommendation based on your listening history!</p>
                                </div>
                            )}
                        </section>

                        {/* Right Column - Top Artists */}
                        <section className="artists-column">
                            <h2>Your Top Artists</h2>
                            <div className="artists-list">
                                {topArtists.map((artist, index) => (
                                    <div key={artist.id || index} className="artist-item">
                                        <span className="track-number">{index + 1}</span>
                                        {artist.images?.length > 0 && (
                                            <img
                                                src={artist.images[2]?.url || artist.images[0]?.url}
                                                alt={artist.name}
                                                className="artist-image"
                                            />
                                        )}
                                        <div className="artist-info">
                                            <span className="artist-name">{artist.name}</span>
                                        </div>
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
