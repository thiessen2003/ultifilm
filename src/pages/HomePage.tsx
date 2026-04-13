import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import InfoButton from '../components/InfoButton'
import { useGames } from '../hooks/useGames'
import { isMockMode } from '../infrastructure/ServiceProvider'

export default function HomePage() {
  const navigate = useNavigate()
  const { games, loading, error, reload, gameService } = useGames()
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const game = await gameService.createGame(title.trim(), videoFile ?? undefined)
      reload()
      setShowNew(false)
      setTitle('')
      setVideoFile(null)
      navigate(`/games/${game.id}`)
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800">Games</h1>
            <InfoButton
              title="Games"
              content="Each game is a match recording. Click a game to open it and watch the footage, review plays, and read annotations.

To get started:
1. Click '+ New Game' and give it a name
2. Upload your match video
3. Use 'Annotate' to leave timestamped comments
4. Use '+ New Play' to mark and diagram key moments"
            />
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            + New Game
          </button>
        </div>

        {isMockMode && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded">
            Running in <strong>demo mode</strong> — data is stored in memory only. Add Supabase credentials in <code>.env</code> for persistence.
          </div>
        )}

        {loading && <p className="text-gray-500">Loading…</p>}
        {error   && <p className="text-red-500">{error}</p>}

        {!loading && !error && games.length === 0 && (
          <p className="text-gray-400 text-center mt-16">No games yet. Click "+ New Game" to get started.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {games.map(game => (
            <button
              key={game.id}
              onClick={() => navigate(`/games/${game.id}`)}
              className="bg-white rounded-lg shadow hover:shadow-md p-4 text-left transition-shadow border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800 text-lg">{game.title}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(game.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
                  game.video_path
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {game.video_path ? 'Video' : 'No video'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* New game modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">New Game</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Pennsylvania vs. Tufts"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video file <span className="text-gray-400 font-normal">(optional — you can upload later)</span>
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null
                    if (file && file.size > 500 * 1024 * 1024) {
                      alert('Video must be under 500 MB.')
                      e.target.value = ''
                      return
                    }
                    setVideoFile(file)
                  }}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-400 mt-1">Max 500 MB</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setTitle(''); setVideoFile(null) }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
