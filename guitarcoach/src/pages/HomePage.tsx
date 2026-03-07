import "bootstrap/dist/css/bootstrap.css"
import '../style/HomePage.css'
import "bootstrap/dist/js/bootstrap.bundle.min.js"

import features1 from '../images/features1.jpg'
import features2 from '../images/features2.jpg'
import features3 from '../images/features3.jpg'

function HomePage() {
    return (
        <div className="home-page">
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
                <div className="container-fluid">
                    <a className="navbar-brand" href="/">GuitarCoach</a>
                    <button className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav justify-content-end w-100">
                            <li className="nav-item">
                                <a className="nav-link active" aria-current="page" href="/">Home</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/login">Find Songs</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/login">Tasks</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/login"><span className="fas fa-user"></span>Sign Up / Login</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <main className="home-main">
                <section className="guitarcoach-intro">
                    <div className="intro-content">
                        <h1 className="intro-title">Welcome to GuitarCoach</h1>
                        <p className="intro-description">
                            Link your Spotify account to receive song recommendations based on your listening history paired with personalized coaching.
                        </p>
                        <button onClick={() => { window.location.href = '/login'; }} className='get-started'> Get Started </button>
                    </div>
                </section>

                <section className="guitarcoach-features">
                    <h2 className="features-title"> Features </h2>

                    <div className="features-list">
                        <div className='feature-item'>
                            <div className='feature-item-photo'>
                                <img src={features1} alt='Feature Item 1' />
                            </div>

                            <div className='feature-item-title'>
                                Coaching with AI
                            </div>

                            <div className='feature-item-body'>
                                Utilizing OpenAI's GPT-4-o model, our application provides personalized feedback and coaching to help you improve your guitar skills based on your practice sessions and goals.
                            </div>
                        </div>

                        <div className='feature-item'>
                            <div className='feature-item-photo'>
                                <img src={features2} alt='Feature Item 2' />
                            </div>

                            <div className='feature-item-title'>
                                Song Recommendations
                            </div>

                            <div className='feature-item-body'>
                                Finding it a hard time to choose a song? Link your Spotify account to receive song recommendations paired with a description of the skills and techniques you can practice by learning that song.
                            </div>
                        </div>

                        <div className='feature-item'>
                            <div className='feature-item-photo'>
                                <img src={features3} alt='Feature Item 3' />
                            </div>

                            <div className='feature-item-title'>
                                Tasks
                            </div>

                            <div className='feature-item-body'>
                                Once you've selected a song, our application generates a personalized practice plan with specific tasks and exercises tailored to your skill level and the musical elements of the chosen track.
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top home-footer">
                <span className="mb-3 mb-md-0 text-body-secondary"> © 2026 GuitarCoach, Inc </span>
            </footer>
        </div>
    )
}

export default HomePage