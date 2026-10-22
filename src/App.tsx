import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LevelShell from './components/LevelShell'
import Browse from './pages/Browse'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Review from './pages/Review'
import SectionDetail from './pages/SectionDetail'
import Sections from './pages/Sections'
import Settings from './pages/Settings'
import Write from './pages/Write'

export default function App() {
  return (
    <Routes>
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
