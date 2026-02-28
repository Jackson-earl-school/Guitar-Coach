import '../style/HomePage.css'
import home from '../images/home.jpg'
import features1 from '../images/features1.jpg'
import features2 from '../images/features2.jpg'
import features3 from '../images/features3.jpg'
import { Link } from 'react-router-dom'

function HomePage() {
    return (
        <>
            <header className='homepage-header'>
                <div className='container'>
                    <div className='logo'>
                        <Link to="/" className='logo'>
                            GuitarCoach
                        </Link>
                    </div>

                    <nav className='navbar'>
                    <ul className='navbar-list'>
                        <li> <a href='/login'> Coach </a> </li>
                        <li> <a href='/login'> Find Songs </a> </li>
                        <li> <a href='/login'> Tasks </a> </li>
                        <li> <button onClick={() => { window.location.href = '/login'; }} className='login'> Login / Create Account </button> </li>
                    </ul>
                    </nav>
                </div>
            </header>

            <main>
                <div className='main-home'>
                    <div className='main-home-title'>
                        GuitarCoach
                    </div>

                    <div className='main-home-body'>
                        Link your Spotify account to receive song recommendations based on
                        your listening history. Receive feedback and set goals to improve your guitar skills!
                    </div>

                    <div className='main-home-button'>
                        <button onClick={() => { window.location.href = '/login'; }} className='get-started'> Get Started </button>
                    </div>
                </div>

                <div className='guitar-image'>
                    <img className='home' src={home} alt='Guitar Image'/>
                </div>

                <div className='features-section'>
                    <div className='features'>
                        Features
                    </div>

                    <div className='features-list'>
                        <div className='feature-item'>
                            <div className='feature-item-photo'>
                                <img src={features1} alt='Feature Item 1'/>
                            </div>

                            <div className='feature-item-title'>
                                Coaching with AI
                            </div>

                            <div className='feature-item-body'>
                                I love AI
                            </div>
                        </div>

                        <div className='feature-item'>
                            <div className='feature-item-photo'>
                            <img src={features2} alt='Feature Item 2'/>
                            </div>

                            <div className='feature-item-title'>
                            Song Recommendations
                            </div> 

                            <div className='feature-item-body'>
                            The quick brown fox jumped over the lazy river. Hello hi hey lebron james is the best hahahaha testing this if this wraps in the div
                            </div>
                        </div>

                        <div className='feature-item'>
                            <div className='feature-item-photo'>
                                <img src={features3} alt='Feature Item 3'/>
                            </div>

                            <div className='feature-item-title'>
                                Tasks
                            </div>

                            <div className='feature-item-body'>
                                The quick brown fox jumped over the lazy river. Hello hi hey
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="home-footer">
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
        </>
    )
}

export default HomePage