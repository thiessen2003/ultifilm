import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PlayCanvas from '../components/PlayCanvas'
import DrawingCanvas from '../components/DrawingCanvas'
import type { DrawingCanvasHandle } from '../components/DrawingCanvas'
import PlayerTracker from '../components/PlayerTracker'
import InfoButton from '../components/InfoButton'
import { useGame } from '../hooks/useGames'
import { usePlays, usePlayPositions } from '../hooks/usePlays'
import type { PlayerPosition, Team } from '../domain/entities/PlayerPosition'

type EditorTab = 'draw' | 'track'
type DrawSurface = 'field' | 'video'

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
  const [searchParams] = useSearchParams()

  const { game, gameService } = useGame(gameId!)
  const { plays, playService } = usePlays(gameId!)
  const { positions, setPositions, playService: ps } = usePlayPositions(playId!)

  const [tab, setTab] = useState<EditorTab>(
    searchParams.get('tab') === 'track' ? 'track' : 'draw'
  )
  const [drawSurface, setDrawSurface] = useState<DrawSurface>('field')
  const [showDrawing, setShowDrawing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fieldDrawRef = useRef<DrawingCanvasHandle>(null)
  const videoDrawRef = useRef<DrawingCanvasHandle>(null)

  const play = plays.find(p => p.id === playId)
  const videoUrl = game ? gameService.getVideoUrl(game) : null

  // Load saved drawing into the field canvas
  useEffect(() => {
    if (play?.drawing_data && fieldDrawRef.current) {
      fieldDrawRef.current.loadDataUrl(play.drawing_data)
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
      const savedPositions = await ps.savePositions(playId, positions.map(({ id: _id, ...rest }) => rest))
      setPositions(savedPositions)
      const drawingData = fieldDrawRef.current?.getDataUrl() ?? null
      await playService.updatePlay(playId, { drawing_data: drawingData })
      setSaved(true)
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <Navbar />

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-3 h-10 shrink-0">
        <button
          onClick={() => navigate(`/games/${gameId}`)}
          className="text-gray-400 hover:text-gray-700 text-sm transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="text-xs text-gray-400 truncate hidden sm:block">
          {game?.title} › <span className="text-gray-600 font-medium">{play?.name ?? '…'}</span>
        </span>
        <div className="flex gap-0.5 ml-auto">
          {([['draw', 'Draw'], ['track', 'Track Players']] as [EditorTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1 text-sm font-medium rounded transition-colors ${
                tab === t
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Draw tab ───────────────────────────────────────────────────────────── */}
      {tab === 'draw' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel */}
          <div className="w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col p-3 gap-3 overflow-y-auto">

            {/* Surface toggle */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Draw on</div>
              <div className="flex gap-1">
                <button
                  onClick={() => setDrawSurface('field')}
                  className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                    drawSurface === 'field' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Field
                </button>
                <button
                  onClick={() => setDrawSurface('video')}
                  disabled={!videoUrl}
                  title={!videoUrl ? 'No video uploaded' : undefined}
                  className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors disabled:opacity-40 ${
                    drawSurface === 'video' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Video
                </button>
              </div>
            </div>

            {/* Field-specific controls */}
            {drawSurface === 'field' && (
              <>
                <hr className="border-gray-100" />

                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Players</div>
                  <InfoButton
                    title="Adding players"
                    content="Use + to drop a player dot on the field, then drag it into position. − removes the last dot of that type."
                  />
                </div>

                {(['offense', 'defense', 'disc'] as Team[]).map(team => (
                  <div key={team} className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${TEAM_COLORS[team]}`} />
                    <span className="text-xs text-gray-700 flex-1">{TEAM_LABELS[team]}</span>
                    <button
                      onClick={() => removeLast(team)}
                      className="text-gray-400 hover:text-red-500 text-sm font-bold leading-none px-1"
                    >−</button>
                    <button
                      onClick={() => addDot(team)}
                      className="text-gray-400 hover:text-blue-600 text-sm font-bold leading-none px-1"
                    >+</button>
                  </div>
                ))}

                <hr className="border-gray-100" />

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 flex-1">Drawing layer</span>
                  <button
                    onClick={() => setShowDrawing(v => !v)}
                    className={`w-11 h-6 rounded-full px-0.5 flex items-center transition-colors duration-200 ${showDrawing ? 'bg-brand-500' : 'bg-gray-300'}`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${showDrawing ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </>
            )}

            {drawSurface === 'video' && (
              <>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Draw annotations directly on the video. Use the toolbar on the right side of the video.
                </p>
                <p className="text-xs text-amber-600 leading-relaxed">
                  Video drawings are not saved — switch to Field to save diagram annotations.
                </p>
              </>
            )}

            {/* Save button — field mode only */}
            {drawSurface === 'field' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium py-2 rounded transition-colors mt-auto"
              >
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
              </button>
            )}
          </div>

          {/* Canvas / video area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Field surface */}
            {drawSurface === 'field' && (
              <>
                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
                  <span className="text-sm text-gray-500">
                    Drag dots to reposition · Drawing toolbar on the right
                  </span>
                  <InfoButton
                    title="Play diagram"
                    content="Click a dot to select it (yellow ring), then drag to move it. Use the drawing toolbar to annotate with arrows, shapes, and freehand strokes. Hit Save to persist."
                  />
                </div>
                <div className="flex-1 bg-gray-200 p-3 overflow-hidden">
                  <div className="w-full h-full rounded overflow-hidden shadow-inner border border-gray-300 relative">
                    <PlayCanvas
                      positions={positions}
                      onChange={handleChange}
                      readOnly={showDrawing}
                    />
                    <DrawingCanvas
                      ref={fieldDrawRef}
                      visible={showDrawing}
                      onStrokeEnd={() => setSaved(false)}
                    />
                  </div>
                </div>

                {play && (
                  <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
                    <div className="font-semibold text-sm text-gray-800">{play.name}</div>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {play.notes || <span className="text-gray-400 italic">No notes.</span>}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Video draw surface */}
            {drawSurface === 'video' && videoUrl && (
              <div className="flex-1 bg-black overflow-hidden relative">
                <video
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  preload="metadata"
                  style={{ pointerEvents: 'auto' }}
                />
                {/* DrawingCanvas overlaid — intercepts pointer events for drawing */}
                <DrawingCanvas
                  ref={videoDrawRef}
                  visible={true}
                  onStrokeEnd={() => {}}
                />
              </div>
            )}

            {drawSurface === 'video' && !videoUrl && (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                No video uploaded — go back to the game page to upload footage.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Track Players tab ─────────────────────────────────────────────────── */}
      {tab === 'track' && (
        <PlayerTracker
          embedded
          videoSrc={videoUrl}
          playId={playId!}
          playName={play?.name ?? 'Play'}
          onClose={() => navigate(`/games/${gameId}`)}
        />
      )}
    </div>
  )
}
