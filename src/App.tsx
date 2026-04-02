import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import PlayEditorPage from './pages/PlayEditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/games/:gameId" element={<GamePage />} />
        <Route path="/games/:gameId/plays/:playId" element={<PlayEditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}
