import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PlayCanvas from '../components/PlayCanvas'
import DrawingCanvas from '../components/DrawingCanvas'
import type { DrawingCanvasHandle } from '../components/DrawingCanvas'
import PlayerTracker from '../components/PlayerTracker'
import PlayVisualizer from '../components/PlayVisualizer'
import InfoButton from '../components/InfoButton'
import { useGame } from '../hooks/useGames'
import { usePlays, usePlayPositions } from '../hooks/usePlays'
import type { PlayerPosition, Team } from '../domain/entities/PlayerPosition'

type EditorTab = 'draw' | 'track' | 'visualize'
type DrawSurface = 'field' | 'video'
type EditMode = 'move' | 'draw'

const TEAM_LABELS: Record<Team, string> = {
  offense: 'Offense',
  defense: 'Defense',
  disc: 'Disc',
}

const TEAM_COLORS_CLASS: Record<Team, string> = {
  offense: 'bg-blue-500',
  defense: 'bg-red-500',
  disc:    'bg-gray-900',
}

const DOT_COLORS: Record<Team, string> = {
  offense: '#3B82F6',
  defense: '#EF4444',
  disc:    '#F59E0B',
}

const DOT_SIZE = 28

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
  const [editMode, setEditMode] = useState<EditMode>('draw')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Single shared drawing canvas — lives across both field and video surfaces
  const drawRef = useRef<DrawingCanvasHandle>(null)
  const videoOverlayRef = useRef<HTMLDivElement>(null)
  const videoDragging = useRef<{ id: string } | null>(null)

  const play = plays.find(p => p.id === playId)
  const videoUrl = game ? gameService.getVideoUrl(game) : null

  // Load saved drawing when play data arrives
  useEffect(() => {
    if (!play) return
    if (play.drawing_data) drawRef.current?.loadDataUrl(play.drawing_data)
  }, [play?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
      await playService.updatePlay(playId, {
        drawing_data: drawRef.current?.getDataUrl() ?? null,
      })
      setSaved(true)
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Video dot drag handlers ────────────────────────────────────────────────
  const onVideoMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editMode === 'draw') return
    const rect = videoOverlayRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const W = rect.width
    const H = rect.height
    for (const pos of [...positions].reverse()) {
      const cx = (pos.x / 100) * W
      const cy = (pos.y / 100) * H
      if (Math.hypot(mx - cx, my - cy) <= DOT_SIZE / 2 + 4) {
        videoDragging.current = { id: pos.id }
        e.preventDefault()
        return
      }
    }
  }

  const onVideoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoDragging.current) return
    const rect = videoOverlayRef.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    handleChange(positions.map(p =>
      p.id === videoDragging.current!.id ? { ...p, x, y } : p
    ))
  }

  const onVideoMouseUp = () => { videoDragging.current = null }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <Navbar />

      {/* Top bar */}
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
          {([['draw', 'Draw'], ['track', 'Track Players'], ['visualize', 'Visualize']] as [EditorTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1 text-sm font-medium rounded transition-colors ${
                tab === t ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'draw' && <div className="flex flex-1 overflow-hidden">

          {/* Left panel */}
          <div className="w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col p-3 gap-3 overflow-y-auto">

            {/* Surface toggle */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Surface</div>
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

            {/* Mode toggle */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mode</div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditMode('move')}
                  className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                    editMode === 'move' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Move
                </button>
                <button
                  onClick={() => setEditMode('draw')}
                  className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                    editMode === 'draw' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Draw
                </button>
              </div>
            </div>

            {/* Field-specific player controls */}
            {drawSurface === 'field' && (
              <>
                <hr className="border-gray-100" />
                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Players</div>
                  <InfoButton
                    title="Adding players"
                    content="Switch to Move mode then drag dots to reposition. Use + / − to add or remove dots."
                  />
                </div>
                {(['offense', 'defense', 'disc'] as Team[]).map(team => (
                  <div key={team} className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${TEAM_COLORS_CLASS[team]}`} />
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
              </>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium py-2 rounded transition-colors mt-auto"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>

          {/* Right: canvas + video area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Hint bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
              <span className="text-sm text-gray-500">
                {editMode === 'move'
                  ? 'Move mode — drag dots to reposition'
                  : drawSurface === 'field'
                    ? 'Draw mode — use toolbar on the right to annotate'
                    : 'Draw mode — annotations appear on both Field and Video'}
              </span>
              <InfoButton
                title="Draw tab"
                content="The drawing layer is shared between Field and Video views. Switch to Move mode to drag dots; Draw mode to annotate."
              />
            </div>

            {/*
              Both surfaces are always mounted (CSS-hidden when inactive).
              This keeps refs alive so the shared DrawingCanvas can read/write
              pixel data regardless of which surface is visible.
            */}
            <div className="flex-1 relative overflow-hidden">

              {/* ── Field surface ── */}
              <div className={`absolute inset-0 bg-gray-200 p-3 ${drawSurface !== 'field' ? 'hidden' : ''}`}>
                <div className="w-full h-full rounded overflow-hidden shadow-inner border border-gray-300 relative">
                  <PlayCanvas
                    positions={positions}
                    onChange={handleChange}
                    readOnly={editMode === 'draw'}
                  />
                </div>
              </div>

              {/* ── Video surface ── */}
              {videoUrl && (
                <div
                  ref={videoOverlayRef}
                  className={`absolute inset-0 bg-black ${drawSurface !== 'video' ? 'hidden' : ''}`}
                  style={{ cursor: editMode === 'move' ? 'crosshair' : 'default' }}
                  onMouseDown={onVideoMouseDown}
                  onMouseMove={onVideoMouseMove}
                  onMouseUp={onVideoMouseUp}
                  onMouseLeave={onVideoMouseUp}
                >
                  <video
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    preload="metadata"
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Player dots overlay */}
                  {positions.map(pos => (
                    <div
                      key={pos.id}
                      style={{
                        position: 'absolute',
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        backgroundColor: DOT_COLORS[pos.team],
                        borderRadius: '50%',
                        border: pos.team === 'disc' ? '3px solid white' : '2px solid white',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: pos.team === 'disc' ? 7 : 10,
                        fontWeight: 'bold',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: 5,
                      }}
                    >
                      {pos.label}
                    </div>
                  ))}
                </div>
              )}

              {/* No-video placeholder */}
              {drawSurface === 'video' && !videoUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
                  No video uploaded — go back to the game page to upload footage.
                </div>
              )}

              {/*
                Shared DrawingCanvas — always mounted, always rendered on top.
                Because it's a sibling of the surface divs (not inside them),
                it survives surface switches and holds its pixel data.
                interactive=false hides the toolbar and blocks pointer events
                so dots can be dragged underneath in Move mode.
              */}
              <DrawingCanvas
                ref={drawRef}
                visible={true}
                interactive={editMode === 'draw'}
                onStrokeEnd={() => setSaved(false)}
              />
            </div>

            {/* Notes (field only) */}
            {drawSurface === 'field' && play && (
              <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
                <div className="font-semibold text-sm text-gray-800">{play.name}</div>
                <p className="text-sm text-gray-700 mt-0.5">
                  {play.notes || <span className="text-gray-400 italic">No notes.</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      }

      {tab === 'track' && (
        <PlayerTracker
          embedded
          videoSrc={videoUrl}
          playId={playId!}
          playName={play?.name ?? 'Play'}
          onClose={() => navigate(`/games/${gameId}`)}
        />
      )}

      {tab === 'visualize' && (
        <PlayVisualizer
          playId={playId!}
          playName={play?.name ?? 'Play'}
        />
      )}
    </div>
  )
}
