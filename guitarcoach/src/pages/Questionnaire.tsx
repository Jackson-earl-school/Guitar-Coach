import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from '../supabaseClient'
import '../style/QuestionnairePage.css'

const questions = [
    {
    id: 'time_frame',
    question: 'How long have you been playing guitar?',
    options: ['3+ years', '1-3 years', '6 months - 1 year', 'Less than 6 months', 'Never played before']
    },
    {
    id: 'play_style',
    question: 'What type(s) of guitar do you play?',
    options: ['Acoustic', 'Electric', 'Classical', 'Bass']
    },
    {
    id: 'technical skills',
    question: 'Which of these can you comfortably play? (Select all that apply)',
    options: ['Open chords (C, G, D, A, E, Am, etc.)', 'Barre chords (F, Bm, etc.)', 'Power chords', 'Basic strumming patterns', 'Fingerpicking patterns']
    },
    {
    id: 'switching_chords',
    question: 'How would you rate your ability to switch chords smoothly?',
    options: ['Very Comfortable at fast tempos', 'Comfortable at moderate tempos', 'Okay at slow tempos', 'Still learning']
    },
    {
    id: 'song_playing',
    question: 'Can you play a song from start to finish?',
    options: ['Yes, confidently', 'Yes, at slower tempos', 'With pauses or mistakes', 'Not yet']
    },
    {
    id: 'techniques',
    question: 'Rate the following techniques from 1-5 (1 = not familiar, 5 = very comfortable)',
    options: ['Palm muting', 'Hammer-ons', 'Pull-offs', 'Slides', 'Bends', 'Vibrato', 'Tapping']
    },
    {
    id: 'preference',
    question: 'What styles are you most interested in?',
    options: ['Rock', 'Pop', 'Blues', 'Jazz', 'Metal', 'Acoustic / Folk', 'R&B / Neo-soul']
    },
    {
    id: 'practicing',
    question: 'How much time can you practice per day?',
    options: ['15 minutes', '30 minutes', '1 hour', 'More than 1 hour']
    },
    {
    id: 'goal',
    question: 'What best describes your current goal?',
    options: ['Becoming an advanced player', 'Performing or recording', 'Playing confidently with others', 'Playing songs for fun', 'Just staring out']
    },
    {
    id: 'favorite_artist',
    question: 'Who is your current favorite artist or band?',
    options: ['Bad Bunny']
    }
]

function QuestionnairePage () {
    const navigate = useNavigate()
    const [started, setStarted] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [selectedOption, setSelectedOption] = useState<string | null>(null)

    const currentQuestion = questions[currentIndex]
    const isLastQuestion = (currentIndex === questions.length - 1)
    const progress = ((currentIndex + 1) / questions.length) * 100

    function handelOptionSelect(option: string){
        setSelectedOption(option)
    }

    function handelNext(){
        if (!selectedOption) return

        //save the answer
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: selectedOption
        }))
        if (isLastQuestion) {
            handleComplete()
        } else {
            setCurrentIndex(prev => prev + 1)
            setSelectedOption(null)
        }
    }

    function handleBack(){
        if (currentIndex > 0){
            setCurrentIndex(prev => prev - 1)
            setSelectedOption(answers[questions[currentIndex - 1].id] || null)
        }
    }
    
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

    // Intro Screen

    if (!started) {
        return (
            <div className="questionnaire-page">
                <div className="questionnaire-box"> 
                    <h1>Welcome to Guitar Coach!</h1>
                    <p>To help us personalize your account, please answer the following questions.</p>
                    <button onClick={() => setStarted(true)} className="primary-btn">
                        Get Started
                    </button>
                </div>
            </div>
        )
    }

    // Questions screen
    return (
        <div className="questionnaire-page">
            <div className="questionnaire-box">
                {/*Progress bar */}
                <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${progress}` }}></div>
                </div>

                <p className="question-count">Question {currentIndex + 1}</p>

                <h2>{currentQuestion.question}</h2>
                
                <div className="options-container">
                    {currentQuestion.options.map(option => (
                        <button
                        key={option}
                        className={`options-btn ${selectedOption === option ? 'selected' : ''}`}
                        onClick={() => handelOptionSelect(option)}>
                            {option}
                        </button>
                    ))}
                </div>

                <div className="navigation-btn">
                    {currentIndex > 0 && (
                        <button className="back-btn" onClick={handleBack}>
                            Back
                        </button>
                    )}
                    <button className="next-btn" onClick={handelNext} disabled={!selectedOption}>
                        {isLastQuestion ? 'Complete' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default QuestionnairePage