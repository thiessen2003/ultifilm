import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PlayCanvas from '../components/PlayCanvas'
import DrawingCanvas from '../components/DrawingCanvas'
import type { DrawingCanvasHandle } from '../components/DrawingCanvas'
import InfoButton from '../components/InfoButton'
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

  const [showDrawing, setShowDrawing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const drawingRef = useRef<DrawingCanvasHandle>(null)

  const play = plays.find(p => p.id === playId)

  // Load existing drawing data when play is available
  useEffect(() => {
    if (play?.drawing_data && drawingRef.current) {
      drawingRef.current.loadDataUrl(play.drawing_data)
    }
  }, [play?.id, play?.drawing_data])

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
      // Save positions
      const savedPositions = await ps.savePositions(playId, positions.map(({ id: _id, ...rest }) => rest))
      setPositions(savedPositions)

      // Save drawing data
      const drawingData = drawingRef.current?.getDataUrl() ?? null
      await playService.updatePlay(playId, { drawing_data: drawingData })

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

          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-500 leading-relaxed">
              Click a dot to select it, then drag to reposition.
            </p>
            <InfoButton
              title="Play canvas"
              content="This is the play diagram editor. Each dot represents a player on the field.

• Click a dot to select it (yellow ring)
• Drag a selected dot to move it
• Use the +/− buttons to add or remove players
• Blue = offense, Red = defense, Black = disc
• Use the drawing toolbar on the right to annotate
• Hit Save when done"
            />
          </div>

          <hr className="border-gray-100" />

          {/* Add player controls */}
          <div className="flex items-center gap-1.5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Players</div>
            <InfoButton
              title="Adding players"
              content="Use + to drop a new player dot at the center of the field, then drag it into position. Use − to remove the last placed dot of that type."
            />
          </div>

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

          {/* Drawing layer toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 flex-1">Drawing layer</span>
            <button
              onClick={() => setShowDrawing(v => !v)}
              className={`w-11 h-6 rounded-full px-0.5 flex items-center transition-colors duration-200 ${showDrawing ? 'bg-brand-500' : 'bg-gray-300'}`}
            >
              <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${showDrawing ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium py-2 rounded transition-colors"
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
            <div className="flex items-center gap-2">
              <InfoButton
                title="Drawing toolbar"
                content="The toolbar on the right side of the canvas lets you draw on top of the play diagram.

• Pick a tool (pen, marker, arrow, shapes, etc.)
• Pick a color and stroke size
• Use Undo (↩) / Redo (↪) to step through history
• Toggle the drawing layer on/off with the switch in the left panel
• Click Save to persist both dots and drawing"
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-200 p-3 overflow-hidden">
            <div className="w-full h-full rounded overflow-hidden shadow-inner border border-gray-300 relative">
              {/* Player dot canvas always rendered underneath */}
              <PlayCanvas
                positions={positions}
                onChange={handleChange}
                readOnly={showDrawing}
              />
              {/* Drawing canvas overlaid on top */}
              <DrawingCanvas
                ref={drawingRef}
                visible={showDrawing}
                onStrokeEnd={() => setSaved(false)}
              />
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
