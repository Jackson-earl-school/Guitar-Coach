import '../style/HomePage.css'
import guitar1 from '../images/guitar1.jpg'
import test from '../images/test.jpg'

function HomePage() {
  return (
    <>

    <html lang='en'>
      <head>
        <meta charSet='UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title> GuitarCoach - Home </title>
      </head>
      <body>
        <header>
          <div className='container'>
            <div className='logo'>
              GuitarCoach
            </div>

            <nav className='navbar'>
              <ul className='navbar-list'>
                <li> <a href='#'> Coach </a> </li>
                <li> <a href='#'> Find Songs </a> </li>
                <li> <a href='#'> Tasks </a> </li>
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
              <button className='get-started'> Get Started </button>
            </div>
          </div>

          <div className='guitar-image'>
            <img className='guitar1' src={guitar1} alt='Guitar Image'/>
          </div>

          <div className='features-section'>
            <div className='features'>
              Features
            </div>

            <div className='features-list'>
              <div className='feature-item'>
                <div className='feature-item-photo'>
                  <img src={test} alt='Feature Item 1'/>
                </div>

                <div className='feature-item-title'>
                  Coaching with AI
                </div>

                <div className='feature-item-body'>
                  The quick brown fox jumped over the lazy river. Hello hi hey
                </div>
              </div>

              <div className='feature-item'>
                <div className='feature-item-photo'>
                  <img src={test} alt='Feature Item 2'/>
                </div>

                <div className='feature-item-title'>
                  Song Recommendations
                </div> 

                <div className='feature-item-body'>
                  The quick brown fox jumped over the lazy river. Hello hi hey
                </div>
              </div>

              <div className='feature-item'>
                <div className='feature-item-photo'>
                  <img src={test} alt='Feature Item 3'/>
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
      </body>
    </html>

    </>
  )
}

export default HomePage