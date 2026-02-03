import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function ProfilePage() {
    const navigate = useNavigate()
    const [username, setUsername] = useState("")

    useEffect(() => {
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
                .select("username")
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
        })()
    }, [navigate])

    async function logout() {
        await supabase.auth.signOut()
        navigate("/login")
    }

    return (
        <div>
        <h1>Profile</h1>
        <p><b>Username:</b> {username}</p>
        <button onClick={logout}>Log out</button>
        </div>
    )
}
