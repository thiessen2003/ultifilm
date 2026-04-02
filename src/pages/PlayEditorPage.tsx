import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PlayCanvas from '../components/PlayCanvas'
import { useGame } from '../hooks/useGames'
import { usePlays, usePlayPositions } from '../hooks/usePlays'
import type { PlayerPosition } from '../domain/entities/PlayerPosition'
import type { Team } from '../domain/entities/PlayerPosition'

const TEAM_LABELS: Record<Team, string> = {
  offense: 'Offense',
  defense: 'Defense',
  disc: 'Disc',
}

const TEAM_COLORS: Record<Team, string> = {
  offense: 'bg-blue-500',
  defense: 'bg-red-500',
  disc:    'bg-gray-900',
}

export default function PlayEditorPage() {
  const { gameId, playId } = useParams<{ gameId: string; playId: string }>()
  const navigate = useNavigate()
  const { game } = useGame(gameId!)
  const { plays, playService } = usePlays(gameId!)
  const { positions, setPositions, playService: ps } = usePlayPositions(playId!)

  const [showAnnotations, setShowAnnotations] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const play = plays.find(p => p.id === playId)

  const handleChange = useCallback((updated: PlayerPosition[]) => {
    setPositions(updated)
    setSaved(false)
  }, [setPositions])

  const addDot = (team: Team) => {
    const newPos: PlayerPosition = {
      id: `temp-${Date.now()}`,
      play_id: playId!,
      team,
      x: 40 + Math.random() * 20,
      y: 30 + Math.random() * 40,
      label: team !== 'disc'
        ? `${team === 'offense' ? 'O' : 'D'}${positions.filter(p => p.team === team).length + 1}`
        : '',
    }
    setPositions(prev => [...prev, newPos])
    setSaved(false)
  }

  const removeLast = (team: Team) => {
    const lastIdx = [...positions].map((p, i) => ({ p, i })).filter(({ p }) => p.team === team).pop()
    if (!lastIdx) return
    setPositions(prev => prev.filter((_, i) => i !== lastIdx.i))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!playId) return
    setSaving(true)
    try {
      const saved = await ps.savePositions(playId, positions.map(({ id: _id, ...rest }) => rest))
      setPositions(saved)
      setSaved(true)
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100" style={{ height: '100vh' }}>
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left controls panel */}
        <div className="w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col p-3 gap-3">
          <button
            onClick={() => navigate(`/games/${gameId}`)}
            className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 rounded transition-colors"
          >
            Stop Editing
          </button>

          <p className="text-xs text-gray-500 leading-relaxed">
            Click a dot to select it, then drag to reposition.
          </p>

          <hr className="border-gray-100" />

          {/* Add player controls */}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Players</div>

          {(['offense', 'defense', 'disc'] as Team[]).map(team => (
            <div key={team} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full shrink-0 ${TEAM_COLORS[team]}`} />
              <span className="text-xs text-gray-700 flex-1">{TEAM_LABELS[team]}</span>
              <button
                onClick={() => removeLast(team)}
                className="text-gray-400 hover:text-red-500 text-sm font-bold leading-none px-1"
                title={`Remove last ${team}`}
              >−</button>
              <button
                onClick={() => addDot(team)}
                className="text-gray-400 hover:text-blue-600 text-sm font-bold leading-none px-1"
                title={`Add ${team}`}
              >+</button>
            </div>
          ))}

          <hr className="border-gray-100" />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded transition-colors"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
            <span className="text-sm text-gray-500">
              {game?.title} &rsaquo; <strong className="text-gray-800">{play?.name ?? 'Play'}</strong>
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-600">Annotations:</span>
                <button
                  onClick={() => setShowAnnotations(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    showAnnotations ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    showAnnotations ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className={`text-xs font-medium ${showAnnotations ? 'text-red-600' : 'text-gray-400'}`}>
                  {showAnnotations ? 'On' : 'Off'}
                </span>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
                Annotate
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-200 p-3 overflow-hidden">
            <div className="w-full h-full rounded overflow-hidden shadow-inner border border-gray-300">
              {showAnnotations ? (
                <PlayCanvas
                  positions={positions}
                  onChange={handleChange}
                  readOnly={false}
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                  Annotations hidden
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
            {play ? (
              <>
                <div className="font-semibold text-sm text-gray-800">{play.name}</div>
                <p className="text-sm text-gray-700 mt-1">{play.notes || <span className="text-gray-400 italic">No notes.</span>}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Loading play…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
