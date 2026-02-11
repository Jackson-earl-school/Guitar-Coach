import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from '../supabaseClient'
import '../style/QuestionnairePage.css'

function QuestionnairePage () {
    const navigate = useNavigate()
    const [started, setStarted] = useState(false)

    async function handleComplete() {
        // Mark questionnaire as completed
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
            await supabase
                .from('profiles')
                .update({ has_completed_questionnaire: true })
                .eq('id', userData.user.id)
        }
        navigate('/profile')
    }

    if (!started) {
        return (
            <div className="questionnaire-page">
                <div className="questionnaire-intro"> 
                    <h1>Welcome to Guitar Coach!</h1>
                    <p>To help us personalize your account, please answer the following questions.</p>
                    <button onClick={() => setStarted(true)}>Get Started</button>
                </div>
            </div>
        )
    }

    return (
        <div className="questionnaire-page">
            <div className="questionnaire-content">
                <h2>Question 1</h2>
                <p>Question here</p>
                <button onClick={handleComplete}>Complete</button>
            </div>
        </div>
    )
}

export default QuestionnairePage