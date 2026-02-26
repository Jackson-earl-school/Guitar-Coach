import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"
import "../style/LoginPage.css"

const API_BASE = "http://127.0.0.1:8000"

export default function ProfilePage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [username, setUsername] = useState("")
    const [spotifyConnected, setSpotifyConnected] = useState(false)

    useEffect(() => {
        // checking if spotify is connected
        if (searchParams.get("spotify_connected")){
            setSpotifyConnected(true)
        }

        if (searchParams.get("spotify_error")){
            console.error("Spotify error:", searchParams.get("spotify_error"))
        }

        ;(async () => {
            const { data: sessionData } = await supabase.auth.getSession()
            if (!sessionData.session) {
                navigate("/login")
                return
            }

            const { data: userData } = await supabase.auth.getUser()
            const user = userData.user
            if (!user) {
                navigate("/login")
                return
            }

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("username, spotify_access_token")
                .eq("id", user.id)
                .single()

            if (error) {
                console.error("Profile fetch error:", error)
                return
            }
            if (!profile) {
                console.warn("No profile row found.")
                return
            }

            setUsername(profile.username ?? "")
            if (!searchParams.get("spotify_connected")){
                setSpotifyConnected(!!profile.spotify_access_token)
            }
        })()
    }, [navigate, searchParams])

    async function connectSpotify() {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
            window.location.href = `${API_BASE}/api/spotify/login?token=${token}`
        }
    }

    async function logout() {
        await supabase.auth.signOut()
        navigate("/login")
    }

    return (
        <div>
            <h1>Profile</h1>
            <p><b>Username:</b> {username}</p>
            <button onClick={logout}>Log out</button>

            <button onClick={() => window.location.href = '/dashboard'}>Back to Dashboard</button>

            {spotifyConnected ? (
                <>
                    <p>Spotify Connected</p>
                </>
            ) : (
                <button onClick={connectSpotify}>Connect Spotify</button>
            )}
        </div>
    )
}
