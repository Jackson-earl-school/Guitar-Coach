import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

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

            console.log("Profile row:", profile)

            setUsername(profile.username ?? "")
            setSpotifyConnected(!!profile.spotify_access_token)
        })()
    }, [navigate])

    async function connectSpotify() {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
            // redirect to backend
            window.location.href = `http://localhost:8000/api/spotify/login?token=${token}`
        }
    }

    // async function disconnectSpotify() {
    //     const { data: sessionData } = await supabase.auth.getSession()
    //     const token = sessionData.session?.access_token

    //     await fetch("http://localhost:8000/api/spotify/disconnect", {
    //         method: "Post",
    //         headers: {
    //             "Authorization": `Bearer ${token}`
    //         }
    //     })
    //     setSpotifyConnected(false)
    // }


    async function logout() {
        await supabase.auth.signOut()
        navigate("/login")
    }

    return (
        <div>
        <h1>Profile</h1>
        <p><b>Username:</b> {username}</p>
        <button onClick={logout}>Log out</button>

        {spotifyConnected ? (
            <p> Spotify Connected </p>
        ) : (
            <button onClick={connectSpotify}>Connect Spotify</button>
        )}

        </div>
    )
}
