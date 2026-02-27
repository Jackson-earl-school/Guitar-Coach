import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './protection/ProtectedRoute'
import QuestionnairePage from './pages/Questionnaire.tsx'
import LoginPage from './pages/LoginPage.tsx'
import HomePage from './pages/HomePage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import DashboardPage from './pages/Dashboard.tsx'
import SchedulePage from './pages/SchedulePage.tsx'
import FindSongs from './pages/FindSongs.tsx'
import PracticePlansPage from './pages/PracticePlans.tsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />


      <Route path="/profile" element={     // Protected Routes
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      
      <Route path="/questionnaire" element={
        <ProtectedRoute>
          <QuestionnairePage />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      <Route path="/schedule" element={
        <ProtectedRoute>
          <SchedulePage />
        </ProtectedRoute>
      } />

      <Route path="/find-songs" element={
        <ProtectedRoute>
          <FindSongs />
        </ProtectedRoute>
      } />

      <Route path="/practice-plans" element={
        <ProtectedRoute>
          <PracticePlansPage />
        </ProtectedRoute>
      } />

     </Routes>
  )
}

export default App
