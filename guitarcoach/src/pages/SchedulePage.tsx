import "../style/SchedulePage.css"

function SchedulePage() {
    return (
        <div className="schedule-page">
            <header className="schedule-header">
                <div className="container">
                    <div className="logo">
                        GuitarCoach
                    </div>
                    <nav className='navbar'>
                        <ul className='navbar-list'>
                            <li><a href='/'>Coach</a></li>
                            <li><a href='/'>Find Songs</a></li>
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

            <div className="schedule-container">
                <h1 className="schedule-title"> Weekly Schedule </h1>
                <div className="schedule-grid">
                    <div className="day-column">
                        <div className="day-title"> Sunday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>

                    <div className="day-column">
                        <div className="day-title"> Monday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>

                    <div className="day-column">
                        <div className="day-title"> Tuesday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>

                    <div className="day-column">
                        <div className="day-title"> Wednesday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>

                    <div className="day-column">
                        <div className="day-title"> Thursday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>

                    <div className="day-column">
                        <div className="day-title"> Friday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>

                    <div className="day-column">
                        <div className="day-title"> Saturday </div>
                        <ul className="tasks-list">
                            <li className="task-item"> Bar Chords </li>
                            <li className="task-item"> Strumming Patterns </li>
                        </ul>
                    </div>
                </div>
            </div>

            <footer className="schedule-footer">
                <div className="footer-container">
                    <div className="footer-section">
                        <h3>Contact Us</h3>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default SchedulePage