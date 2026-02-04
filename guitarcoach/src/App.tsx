import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './protection/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
// import QuestionnairePage from './pages/QuestionnairePage'
import './style/App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />

      <Route path="/profile" element={ // the profile page should be protected
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      
     </Routes>
  )
}

export default App
