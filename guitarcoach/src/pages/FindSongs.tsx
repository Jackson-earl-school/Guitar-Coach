import { useEffect, useState } from "react"
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
        similarTo?: {type: "track" | "artist", name: string, artistName?: string }
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
                    headers: { "Authorization": `Bearer ${token}`}
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
                    <div className="time-range-buttons">
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

                    <button
                        className="history-btn"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        {showHistory ? "Hide history" : "View recommendation history"}
                    </button>
                    {showHistory && (
                        <div className="history-panel">
                            <div className="history-header">
                                <h3>Recommendation History    </h3>
                                <button 
                                    className="clear-history-btn"
                                    onClick={() => {
                                        setPreviousSongs([])
                                        setShowHistory(false)
                                    }}
                                >
                                    Clear all
                                </button>
                            </div>
                            {previousSongs.length === 0 ? (
                                <p className="history-empty">No recommendation yet</p>
                            ) : (
                                <ul className="history-list">
                                    {previousSongs.map((song, index) => (
                                        <li key={index} className="history-item">{song}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
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
                                    <div key={track.id || index} className="track-item-wrapper">
                                        <div 
                                            className="track-item" 
                                            onClick={() => setSelectedItem( 
                                                selectedItem?.type === "track" && selectedItem?.name === track.name 
                                                ? null 
                                                : {type: "track", name: track.name, artist: track.artists?.map(a => a.name).join(", ")}
                                            )}
                                        >
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
                                        {/* Popp for this track */}
                                        {selectedItem?.type === "track" && selectedItem?.name === track.name && (
                                            <div className="similar-popup">
                                                <p>Generate similar song?</p>
                                                <button 
                                                    className="popup-yes-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        generateRecommendation(null, {
                                                            type: "track",
                                                            name: track.name,
                                                            artistName: track.artists?.[0]?.name
                                                        })
                                                    }}>
                                                    Yes
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Middle Column - Recommendations */}
                        <section className="recommendation-column">
                            <button
                                className="generate-btn"
                                onClick={() => generateRecommendation(null)}
                                disabled={isGenerating || topTracks.length === 0}
                            >
                                {isGenerating ? "Generating..." : "Generate random new song"}
                            </button>

                            {recommendedSong ? (
                                <>

                                <div className="player-difficulty-row">
                                    {/* Spotify Embed Player */}
                                    {recommendedSong.spotifyId && (
                                        <iframe
                                            src={`https://open.spotify.com/embed/track/${recommendedSong.spotifyId}?utm_source=generator&theme=1&size=large`}
                                            height="152"
                                            width="100%"
                                            style={{ borderRadius: "12px", minWidth: "400px", border: "none"}}
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                            loading="lazy"
                                        />
                                    )}

                                    <div className="difficulty-section">
                                        <h3 className="difficulty-header"> Adjust Difficulty</h3>
                                        <div className="difficulty-controls">
                                            <button
                                                className="difficulty-arrow-btn"
                                                onClick={() => generateRecommendation("down")}
                                                disabled={isGenerating || (recommendedSong?.difficulty || 0) <= 1}
                                            >
                                                ◀
                                            </button>

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

                                            <button
                                                className="difficulty-arrow-btn"
                                                onClick={() => generateRecommendation("up")}
                                                disabled={isGenerating || (recommendedSong?.difficulty || 0) >= 5}
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    </div>

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
                                    <div key={artist.id || index} className="artist-item-wrapper">
                                        <div 
                                            className="artist-item"
                                            onClick={() => setSelectedItem( 
                                                selectedItem?.type === "artist" && selectedItem?.name === artist.name
                                                    ? null
                                                    : { type: "artist", name: artist.name }
                                            )}
                                        >
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
                                    {/* Popup for the artists */}
                                    {selectedItem?.type === "artist" && selectedItem?.name === artist.name && (
                                        <div className="similar-popup">
                                            <p>Generate similar song by {artist.name}</p>
                                            <button 
                                                className="popup-yes-btn" 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    generateRecommendation(null, {
                                                        type: "artist",
                                                        name: artist.name
                                                    })
                                                }}
                                            >
                                                Yes
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
