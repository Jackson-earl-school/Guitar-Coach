import "../style/Dashboard.css"
import guitar1 from "../images/guitar1.jpg"
import home1 from "../images/home.jpg"
import features2 from "../images/features2.jpg"
import features3 from "../images/features3.jpg"
import { Link } from "react-router-dom"

function Dashboard() {
    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="container">
                    <div className="logo" onClick={() => { window.location.href = '/dashboard'; }}>
                        GuitarCoach
                    </div>
                    <nav className='navbar'>
                        <ul className='navbar-list'>
                            <li><a href='/'>Coach</a></li>
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

            <main className="dashboard-main">
                <h1 className="dashboard-title">Dashboard</h1>

                <div className="dashboard-content">
                    <div className="dashboard-grid">
                        <div className="dashboard-card" onClick={() => window.location.href = '/find-songs'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${features2})` }}></div>
                            <h2>Find new songs to learn</h2>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/schedule'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${home1})` }}></div>
                            <h2>See my Schedule</h2>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/practice-plans'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${guitar1})` }}></div>
                            <h2>Generate New Practice Plans</h2>
                        </div>

                        <div className="dashboard-card" onClick={() => window.location.href = '/progress'}>
                            <div className="card-bg" style={{ backgroundImage: `url(${features3})` }}></div>
                            <h2>Overall Progress</h2>
                        </div>
                    </div>

                    <div className="tasks-panel">
                        <h2 className="tasks-title">Today's Tasks</h2>
                        <a>Fill out a practice plan to create new tasks</a>
                    </div>
                </div>
            </main>

            <footer className="dashboard-footer">
                <div className="footer-container">
                    <div className="footer-section">
                        <div>
                            <Link to="/" className='logo'>
                                GuitarCoach
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Dashboard