import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LevelShell from './components/LevelShell'
import RequireAuth from './components/RequireAuth'
import AuthCallback from './pages/AuthCallback'
import Browse from './pages/Browse'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import ListeningExercise from './pages/ListeningExercise'
import ListeningExercises from './pages/ListeningExercises'
import ListeningLevels from './pages/ListeningLevels'
import Login from './pages/Login'
import Quiz from './pages/Quiz'
import Review from './pages/Review'
import SectionDetail from './pages/SectionDetail'
import Sections from './pages/Sections'
import Settings from './pages/Settings'
import VocabLesson from './pages/VocabLesson'
import VocabLessons from './pages/VocabLessons'
import VocabQuiz from './pages/VocabQuiz'
import Write from './pages/Write'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="auth/callback" element={<AuthCallback />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="settings" element={<Settings />} />
          <Route path=":level" element={<LevelShell />}>
            <Route index element={<Dashboard />} />
            <Route path="review" element={<Review />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="write" element={<Write />} />
            <Route path="browse" element={<Browse />} />
            <Route path="sections" element={<Sections />} />
            <Route path="sections/:sectionId" element={<SectionDetail />} />
            <Route path="vocab" element={<VocabLessons />} />
            <Route path="vocab/:lessonId" element={<VocabLesson />} />
            <Route path="vocab/:lessonId/quiz" element={<VocabQuiz />} />
            <Route path="listening" element={<ListeningLevels />} />
            <Route path="listening/:listeningLevel" element={<ListeningExercises />} />
            <Route path="listening/:listeningLevel/:exerciseId" element={<ListeningExercise />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
