import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from '../supabaseClient'
import '../style/QuestionnairePage.css'

const questions = [
    {
    id: 'time_frame',
    question: 'How long have you been playing guitar?',
    options: ['3+ years', '1-3 years', '6 months - 1 year', 'Less than 6 months', 'Never played before'],
    type: 'single'
    },
    {
    id: 'play_style',
    question: 'What type(s) of guitar do you play?',
    options: ['Acoustic', 'Electric', 'Classical', 'Bass'],
    type: 'multi'
    },
    {
    id: 'technical skills',
    question: 'Which of these can you comfortably play? (Select all that apply)',
    options: ['Open chords (C, G, D, A, E, Am, etc.)', 'Barre chords (F, Bm, etc.)', 'Power chords', 'Basic strumming patterns', 'Fingerpicking patterns'],
    type: 'multi'
    },
    {
    id: 'switching_chords',
    question: 'How would you rate your ability to switch chords smoothly?',
    options: ['Very Comfortable at fast tempos', 'Comfortable at moderate tempos', 'Okay at slow tempos', 'Still learning'],
    type: 'single'
    },
    {
    id: 'song_playing',
    question: 'Can you play a song from start to finish?',
    options: ['Yes, confidently', 'Yes, at slower tempos', 'With pauses or mistakes', 'Not yet'],
    type: 'single'
    },
    {
    id: 'techniques',
    question: 'Rate the following techniques from 1-5 (1 = not familiar, 5 = very comfortable)',
    options: ['Palm muting', 'Hammer-ons', 'Pull-offs', 'Slides', 'Bends', 'Vibrato', 'Tapping'],
    type: 'input'
    },
    {
    id: 'preference',
    question: 'What styles are you most interested in?',
    options: ['Rock', 'Pop', 'Blues', 'Jazz', 'Metal', 'Acoustic / Folk', 'R&B / Neo-soul'],
    type: 'multi'
    },
    {
    id: 'practicing',
    question: 'How much time can you practice per day?',
    options: ['15 minutes', '30 minutes', '1 hour', 'More than 1 hour'],
    type: 'single'
    },
    {
    id: 'goal',
    question: 'What best describes your current goal?',
    options: ['Becoming an advanced player', 'Performing or recording', 'Playing confidently with others', 'Playing songs for fun', 'Just staring out'],
    type: 'single'
    }
    // },
    // {
    // id: 'favorite_artist',
    // question: 'Who is your current favorite artist or band?',
    // options: ['Bad Bunny']
    // }
]

function QuestionnairePage () {
    const navigate = useNavigate()
    const [started, setStarted] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [completed, setCompleted] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string | string[] | Record<string, number>>>({})

    // one answer
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    
    // multi answer
    const [selectedOptions, setSelectedOptions] = useState<string[]>([])

    // inputted answer
    const [inputs, setInputs] = useState<Record<string, number>>({})

    const currentQuestion = questions[currentIndex]
    const isLastQuestion = (currentIndex === questions.length - 1)
    const progress = ((currentIndex + 1) / questions.length) * 100


    //check for valid answer
    function hasValidAnswer(): boolean {
        switch (currentQuestion.type) {
            case 'single':
                return selectedOption !== null
            case 'multi':
                return selectedOptions.length > 0
            case 'input':
                return Object.keys(inputs).length === currentQuestion.options.length
            default:
                return false
        }
    }

    
    
    function handleSingleSelect(option: string){
        setSelectedOption(option)
    }

    function handleMultiSelect(option: string){
        setSelectedOptions(prev => {
            if (prev.includes(option)){
                return prev.filter(o => o !== option)
            } else {
                return [...prev, option]
            }
        })
    }

    function handleInput(option: string, value: number){
        setInputs(prev => ({...prev, [option]: value}))
    }

    function handelNext(){
        if (!hasValidAnswer()) return

        //save the answer

        let answer: string | string[] | Record<string, number>
        switch (currentQuestion.type) {
            case 'single':
                answer = selectedOption!
                break
            case 'multi':
                answer = selectedOptions
                break
            case 'input':
                answer = inputs
                break
        }

        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: answer
        }))
        if (isLastQuestion) {
            handleComplete()
        } else {
            setCurrentIndex(prev => prev + 1)
            setSelectedOption(null)
            setSelectedOptions([])
            setInputs({})
        }
    }

    function handleBack(){
        if (currentIndex > 0){
            const prevQuestion = questions[currentIndex - 1]
            const prevAnswer = answers[prevQuestion.id]

            setCurrentIndex(prev => prev - 1)
            
            // Bring back the previous answers
            if (prevQuestion.type === 'single'){
                setSelectedOption(prevAnswer as string || null)
                setSelectedOptions([])
                setInputs({})
            } else if (prevQuestion.type === 'multi'){
                setSelectedOption(null)
                setSelectedOptions(prevAnswer as string[] || [])
                setInputs({})
            } else if (prevQuestion.type === 'input'){
                setSelectedOption(null)
                setSelectedOptions([])
                setInputs(prevAnswer as Record<string, number> || {})
            }
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

        //show completed screen
        setCompleted(true)

        setTimeout(() => {
            navigate('/profile')
        }, 3000)
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

    if (completed) {
        return (
            <div className="questionnaire-page">
                <div className="questionnaire-box">
                    <h1>Thank you!</h1>
                    <p>Thanks for filling out the quesitonniare</p>
                    <p>Taking you to your profile page now...</p>
                </div>
            </div>
        )
    }

    // Questions screen based on specific question type
    function renderOptions() {
        switch (currentQuestion.type) {
            case 'single':
                return (
                    <div className="options-container">
                        {currentQuestion.options.map(option => (
                            <button
                            key={option}
                            className={`options-btn ${selectedOption === option ? 'selected' : ''}`}
                            onClick={() => handleSingleSelect(option)}>
                                {option}
                            </button>
                        ))}
                    </div>
                )
            
            case 'multi':
                return (
                    <div className="options-container">
                        {currentQuestion.options.map(option => (
                            <button
                            key={option}
                            className={`options-btn ${selectedOptions.includes(option) ? 'selected' : ''}`}
                            onClick={() => handleMultiSelect(option)}>
                                {option}
                            </button>
                        ))}
                    </div>
                )

            case 'input':
                return (
                    <div className="input-container">
                        {currentQuestion.options.map(option => (
                            <div className="input-row" key={option}>
                                <span className="input-label">{option}</span>
                                <div className="input-buttons">
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <button
                                        key={num}
                                        className={`input-btn ${inputs[option] === num ? 'selected' : ''}`}
                                        onClick={() => handleInput(option, num)}>
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
        }
    }
    return (
        <div className="questionnaire-page">
            <div className="questionnaire-box">
                {/*Progress bar */}
                <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${progress}%` }}></div>
                </div>

                <p className="question-count">Question {currentIndex + 1}</p>

                <h2>{currentQuestion.question}</h2>
                
                {renderOptions()}

                <div className="navigation-btn">
                    {currentIndex > 0 && (
                        <button className="back-btn" onClick={handleBack}>
                            Back
                        </button>
                    )}
                    <button className="next-btn" onClick={handelNext} disabled={!hasValidAnswer()}>
                        {isLastQuestion ? 'Complete' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default QuestionnairePage