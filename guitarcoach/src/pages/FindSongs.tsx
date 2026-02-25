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
}

interface SpotifyArtist {
    id: string
    name: string
    images: { url: string }[]
}

export default function FindSongs() {
    const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([])
    const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const API_BASE = "http://127.0.0.1:8000"

    useEffect(() => {
        fetchSpotifyData()
    }, [])

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
                fetch(`${API_BASE}/api/spotify/top-tracks?limit=5`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/api/spotify/top-artists?limit=5`, {
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
        } catch (err) {
            setError("Error fetching Spotify data")
            console.error(err)
        }

        setLoading(false)
    }

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="container">
                    <div className="logo">GuitarCoach</div>
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

                {loading && <p className="loading">Loading your Spotify data...</p>}
                {error && <p className="error">{error}</p>}

                {!loading && !error && (
                    <div className="spotify-sections">
                        <section className="spotify-section">
                            <h2>Your Top 5 Tracks</h2>
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

                        <section className="spotify-section">
                            <h2>Your Top 5 Artists</h2>
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