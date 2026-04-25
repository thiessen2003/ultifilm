import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PlayCanvas from '../components/PlayCanvas'
import DrawingCanvas from '../components/DrawingCanvas'
import type { DrawingCanvasHandle } from '../components/DrawingCanvas'
import InfoButton from '../components/InfoButton'
import { useGame } from '../hooks/useGames'
import { usePlays, usePlayPositions } from '../hooks/usePlays'
import type { PlayerPosition, Team } from '../domain/entities/PlayerPosition'

type DrawSurface = 'field' | 'video'
type EditMode = 'draw' | 'track'

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

  const { game, gameService } = useGame(gameId!)
  const { plays, playService } = usePlays(gameId!)
  const { positions, setPositions, playService: ps } = usePlayPositions(playId!)

  const [drawSurface, setDrawSurface] = useState<DrawSurface>('field')
  const [editMode, setEditMode] = useState<EditMode>('draw')
  const [activeTrackedId, setActiveTrackedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [keyframes, setKeyframes] = useState<Record<string, Array<{ time_ms: number; x: number; y: number }>>>(() => {
    try { return JSON.parse(localStorage.getItem(`keyframes_${playId}`) || '{}') } catch { return {} }
  })
  const [stagedKeyframesByTime, setStagedKeyframesByTime] = useState<Record<number, Record<string, { x: number; y: number }>>>({})
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlayingKeyframes, setIsPlayingKeyframes] = useState(false)
  const [maxKeyframeTime, setMaxKeyframeTime] = useState(() => {
    const times = Object.values(keyframes).flat().map(kf => kf.time_ms)
    return Math.max(10000, times.length > 0 ? Math.max(...times) + 1000 : 0)
  })

  // Single shared drawing canvas — lives across both field and video surfaces
  const drawRef = useRef<DrawingCanvasHandle>(null)
  const positionsRef = useRef(positions)
  positionsRef.current = positions
  const videoOverlayRef = useRef<HTMLDivElement>(null)
  const videoDragging = useRef<{ id: string } | null>(null)
  const keyframePlaybackRef = useRef<number | null>(null)
  const lastPlaybackTimeRef = useRef<number>(0)

  const play = plays.find(p => p.id === playId)
  const videoUrl = game ? gameService.getVideoUrl(game) : null

  // Load saved drawing + keyframes when play data arrives
  useEffect(() => {
    if (!play) return
    if (play.drawing_data) drawRef.current?.loadDataUrl(play.drawing_data)
    if (play.tracking_data) {
      try {
        const kf = JSON.parse(play.tracking_data)
        setKeyframes(kf)
        const times = Object.values(kf as Record<string, Array<{ time_ms: number }>>).flat().map(k => k.time_ms)
        setMaxKeyframeTime(Math.max(10000, times.length > 0 ? Math.max(...times) + 1000 : 0))
        localStorage.setItem(`keyframes_${playId}`, play.tracking_data)
      } catch { /* ignore */ }
    }
  }, [play?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((updated: PlayerPosition[]) => {
    setPositions(updated)
    setSaved(false)
  }, [setPositions])

  useEffect(() => {
    if (editMode !== 'track') setActiveTrackedId(null)
    // When entering track mode, ensure all players have a keyframe at t=0.
    // Use positionsRef so this effect doesn't re-run on every drag.
    if (editMode === 'track') {
      setKeyframes(prev => {
        const next = { ...prev }
        positionsRef.current.forEach(pos => {
          if (!next[pos.id]) next[pos.id] = []
          if (!next[pos.id].some(kf => kf.time_ms === 0)) {
            next[pos.id].unshift({ time_ms: 0, x: pos.x, y: pos.y })
          }
        })
        localStorage.setItem(`keyframes_${playId}`, JSON.stringify(next))
        return next
      })
    }
  }, [editMode, playId]) // eslint-disable-line react-hooks/exhaustive-deps

  const addDot = (team: Team) => {
    // Restrict disc to max 1
    if (team === 'disc' && positions.some(p => p.team === 'disc')) return
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
    // If already in track mode, give the new dot a t=0 keyframe immediately
    if (editMode === 'track') {
      setKeyframes(prev => {
        const next = { ...prev }
        next[newPos.id] = [{ time_ms: 0, x: newPos.x, y: newPos.y }]
        localStorage.setItem(`keyframes_${playId}`, JSON.stringify(next))
        return next
      })
    }
    setSaved(false)
  }

  const removeLast = (team: Team) => {
    const lastIdx = [...positions].map((p, i) => ({ p, i })).filter(({ p }) => p.team === team).pop()
    if (!lastIdx) return
    setPositions(prev => prev.filter((_, i) => i !== lastIdx.i))
    setSaved(false)
  }

  // Keyframe helpers
  const stagedAtCurrentTime = stagedKeyframesByTime[currentTime] || {}
  const hasUnsavedCurrentKeyframes = Object.keys(stagedAtCurrentTime).length > 0

  const saveCurrentKeyframes = () => {
    if (!hasUnsavedCurrentKeyframes) return
    setKeyframes(prev => {
      const next = { ...prev }
      Object.entries(stagedAtCurrentTime).forEach(([positionId, point]) => {
        next[positionId] = [...(next[positionId] || [])]
        const existing = next[positionId].findIndex(kf => kf.time_ms === currentTime)
        if (existing >= 0) next[positionId][existing] = { time_ms: currentTime, x: point.x, y: point.y }
        else next[positionId].push({ time_ms: currentTime, x: point.x, y: point.y })
      })
      localStorage.setItem(`keyframes_${playId}`, JSON.stringify(next))
      return next
    })
    setStagedKeyframesByTime(prev => {
      const next = { ...prev }
      delete next[currentTime]
      return next
    })
    setMaxKeyframeTime(prev => Math.max(prev, currentTime + 1000))
    setSaved(false)
  }

  const hasKeyframeAtTime = (positionId: string) => {
    if (stagedAtCurrentTime[positionId]) return true
    const kfs = keyframes[positionId] || []
    return kfs.some(kf => kf.time_ms === currentTime)
  }

  const getDisplayPosition = (pos: PlayerPosition): { x: number; y: number } => {
    const staged = stagedAtCurrentTime[pos.id]
    if (staged) return staged
    if (Object.keys(keyframes).length === 0) return { x: pos.x, y: pos.y }
    return interpolatePosition(pos.id, pos)
  }

  const interpolatePosition = (positionId: string, fallbackPos: PlayerPosition): { x: number; y: number } => {
    const kfs = keyframes[positionId]
    if (!kfs || kfs.length === 0) return { x: fallbackPos.x, y: fallbackPos.y }
    const sorted = [...kfs].sort((a, b) => a.time_ms - b.time_ms)
    if (currentTime <= sorted[0].time_ms) return { x: sorted[0].x, y: sorted[0].y }
    if (currentTime >= sorted[sorted.length - 1].time_ms) {
      const last = sorted[sorted.length - 1]
      return { x: last.x, y: last.y }
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1]
      if (currentTime >= a.time_ms && currentTime <= b.time_ms) {
        const t = (currentTime - a.time_ms) / (b.time_ms - a.time_ms)
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      }
    }
    return { x: fallbackPos.x, y: fallbackPos.y }
  }

  // Keyframe playback animation loop
  useEffect(() => {
    if (!isPlayingKeyframes) {
      if (keyframePlaybackRef.current !== null) cancelAnimationFrame(keyframePlaybackRef.current)
      return
    }
    lastPlaybackTimeRef.current = Date.now()
    const tick = () => {
      const now = Date.now()
      const delta = now - lastPlaybackTimeRef.current
      lastPlaybackTimeRef.current = now
      setCurrentTime(prev => {
        const next = prev + delta
        if (next >= maxKeyframeTime) {
          setIsPlayingKeyframes(false)
          return maxKeyframeTime
        }
        return next
      })
      keyframePlaybackRef.current = requestAnimationFrame(tick)
    }
    keyframePlaybackRef.current = requestAnimationFrame(tick)
    return () => {
      if (keyframePlaybackRef.current !== null) cancelAnimationFrame(keyframePlaybackRef.current)
    }
  }, [isPlayingKeyframes, maxKeyframeTime])

  const handleSave = async () => {
    if (!playId) return
    setSaving(true)
    try {
      // Merge any uncommitted staged keyframes so Save doesn't require a separate
      // "Save Current Keyframes" click first.
      const mergedKeyframes = { ...keyframes }
      Object.entries(stagedKeyframesByTime).forEach(([timeStr, posMap]) => {
        const t = Number(timeStr)
        Object.entries(posMap).forEach(([posId, { x, y }]) => {
          mergedKeyframes[posId] = [...(mergedKeyframes[posId] || [])]
          const idx = mergedKeyframes[posId].findIndex(kf => kf.time_ms === t)
          if (idx >= 0) mergedKeyframes[posId][idx] = { time_ms: t, x, y }
          else mergedKeyframes[posId].push({ time_ms: t, x, y })
        })
      })

      const savedPositions = await ps.savePositions(playId, positions.map(({ id: _id, ...rest }) => rest))

      // replacePositions regenerates IDs — remap keyframes so they stay linked
      const idMap = new Map(positions.map((p, i) => [p.id, savedPositions[i].id]))
      const remappedKeyframes: typeof keyframes = {}
      Object.entries(mergedKeyframes).forEach(([oldId, kfs]) => {
        remappedKeyframes[idMap.get(oldId) ?? oldId] = kfs
      })

      setPositions(savedPositions)
      setKeyframes(remappedKeyframes)
      setStagedKeyframesByTime({})
      localStorage.setItem(`keyframes_${playId}`, JSON.stringify(remappedKeyframes))

      await playService.updatePlay(playId, {
        drawing_data: drawRef.current?.getDataUrl() ?? null,
        tracking_data: Object.keys(remappedKeyframes).length > 0 ? JSON.stringify(remappedKeyframes) : null,
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
    if (editMode !== 'track') return
    const rect = videoOverlayRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const W = rect.width
    const H = rect.height
    for (const pos of [...positions].reverse()) {
      const displayPos = getDisplayPosition(pos)
      const cx = (displayPos.x / 100) * W
      const cy = (displayPos.y / 100) * H
      if (Math.hypot(mx - cx, my - cy) <= DOT_SIZE / 2 + 4) {
        videoDragging.current = { id: pos.id }
        setActiveTrackedId(pos.id)
        e.preventDefault()
        return
      }
    }
  }

  const onVideoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoDragging.current || editMode !== 'track') return
    const rect = videoOverlayRef.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setStagedKeyframesByTime(prev => ({
      ...prev,
      [currentTime]: {
        ...(prev[currentTime] || {}),
        [videoDragging.current!.id]: { x, y },
      },
    }))
    setSaved(false)
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
      </div>

      <div className="flex flex-1 overflow-hidden">

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
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setEditMode('track')}
                  className={`text-xs py-1.5 rounded font-medium transition-colors ${
                    editMode === 'track' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Track
                </button>
                <button
                  onClick={() => setEditMode('draw')}
                  className={`text-xs py-1.5 rounded font-medium transition-colors ${
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
                    content="Use Track mode with Select tool to drag players. Use + / − to add or remove dots."
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
                      disabled={team === 'disc' && positions.some(p => p.team === 'disc')}
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-40 text-sm font-bold leading-none px-1"
                    >+</button>
                  </div>
                ))}

                <hr className="border-gray-100 my-1" />
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Keyframes</div>
                  <InfoButton
                    title="Keyframes"
                    content="Use Track mode to animate movement. Scrub the timeline, drag players to stage changes, then click Save Current Keyframes."
                  />
                </div>

                <div className="space-y-1 text-xs min-h-36 overflow-y-auto">
                  {positions.length === 0 ? (
                    <p className="text-gray-400 italic">No players to keyframe</p>
                  ) : (
                    positions.map(pos => (
                      <div
                        key={pos.id}
                        className={`flex items-center gap-1 p-1 rounded border transition-colors ${
                          activeTrackedId === pos.id
                            ? 'bg-brand-50 border-brand-300'
                            : 'bg-gray-50 border-transparent'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${TEAM_COLORS_CLASS[pos.team]}`} />
                        <span className="text-gray-700 flex-1">{pos.label || 'Disc'}</span>
                        {keyframes[pos.id] && keyframes[pos.id].length > 0 && (
                          <span className="text-gray-500 text-xs font-mono shrink-0">{keyframes[pos.id].length}</span>
                        )}
                        {hasKeyframeAtTime(pos.id) && (
                          <span className="text-green-600 text-[10px] font-semibold shrink-0">KF</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {hasUnsavedCurrentKeyframes && (
                  <button
                    onClick={saveCurrentKeyframes}
                    className="w-full text-xs bg-brand-500 hover:bg-brand-600 text-white py-1.5 px-2 rounded transition-colors mt-2"
                  >
                    Save Current Keyframes
                  </button>
                )}

                {Object.keys(keyframes).length > 0 && (
                  <button
                    onClick={() => {
                      setKeyframes({})
                      setStagedKeyframesByTime({})
                      localStorage.removeItem(`keyframes_${playId}`)
                      setCurrentTime(0)
                      setMaxKeyframeTime(10000)
                    }}
                    className="w-full text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 py-1 px-2 rounded transition-colors mt-2"
                  >
                    Clear all keyframes
                  </button>
                )}
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
                {editMode === 'track'
                  ? 'Track mode - scrub timeline, drag players to stage keyframes, then save current keyframes'
                  : drawSurface === 'field'
                    ? 'Draw mode - use toolbar on the right to annotate'
                    : 'Draw mode - annotations appear on both Field and Video'}
              </span>
              <InfoButton
                title="Draw tab"
                content="Use Track to stage and save keyframes, and Draw for annotations."
              />
            </div>

            {/*
              Both surfaces are always mounted (CSS-hidden when inactive).
              This keeps refs alive so the shared DrawingCanvas can read/write
              pixel data regardless of which surface is visible.
            */}
            <div className="flex-1 relative overflow-hidden">

              {/* ── Field surface ── */}
              <div className={`absolute inset-0 bg-gray-200 flex ${drawSurface !== 'field' ? 'hidden' : ''}`}>
                <div className="flex-1 p-3 overflow-hidden">
                  <div className="w-full h-full rounded overflow-hidden shadow-inner border border-gray-300 relative">
                    <PlayCanvas
                      positions={positions.map(p => {
                        const display = getDisplayPosition(p)
                        return { ...p, x: display.x, y: display.y }
                      })}
                      onChange={editMode !== 'track' ? handleChange : () => {}}
                      onSelect={setActiveTrackedId}
                      selectedId={activeTrackedId}
                      onPositionDrag={(id, x, y) => {
                        if (editMode !== 'track') return
                        setActiveTrackedId(id)
                        setStagedKeyframesByTime(prev => ({
                          ...prev,
                          [currentTime]: {
                            ...(prev[currentTime] || {}),
                            [id]: { x, y },
                          },
                        }))
                        setSaved(false)
                      }}
                      readOnly={editMode === 'draw'}
                    />
                  </div>
                </div>
              </div>

              {/* ── Video surface ── */}
              {videoUrl && (
                <div
                  ref={videoOverlayRef}
                  className={`absolute inset-0 bg-black ${drawSurface !== 'video' ? 'hidden' : ''}`}
                  style={{ cursor: editMode === 'track' ? 'crosshair' : 'default' }}
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
                  {positions.map(pos => {
                    const interpPos = getDisplayPosition(pos)
                    return (
                    <div
                      key={pos.id}
                      style={{
                        position: 'absolute',
                        left: `${interpPos.x}%`,
                        top: `${interpPos.y}%`,
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
                    )
                  })}
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
                interactive in Draw and Track modes.
              */}
              <DrawingCanvas
                ref={drawRef}
                visible={editMode === 'draw'}
                interactive={editMode === 'draw'}
                defaultTool='pen'
                onStrokeEnd={() => setSaved(false)}
              />
            </div>

            {/* Field timeline (outside draw bounds) */}
            {drawSurface === 'field' && (
              <div className="bg-gray-900 px-4 py-2 flex items-center gap-3 shrink-0 border-t border-gray-800">
                <button
                  onClick={() => {
                    setCurrentTime(0)
                    setIsPlayingKeyframes(false)
                  }}
                  className="text-gray-400 hover:text-white text-lg leading-none"
                  title="Jump to start"
                >⏮</button>

                <button
                  onClick={() => setIsPlayingKeyframes(!isPlayingKeyframes)}
                  className="text-white hover:text-brand-300 transition-colors flex-shrink-0"
                  title={isPlayingKeyframes ? 'Pause playback' : 'Play keyframes'}
                >
                  {isPlayingKeyframes
                    ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  }
                </button>

                <button
                  onClick={() => {
                    setCurrentTime(maxKeyframeTime)
                    setIsPlayingKeyframes(false)
                  }}
                  className="text-gray-400 hover:text-white text-lg leading-none"
                  title="Jump to end"
                >⏭</button>

                <span className="text-gray-400 text-xs font-mono w-16 shrink-0 text-center">
                  {Math.floor(currentTime / 1000)}.{String(Math.floor((currentTime % 1000) / 100)).padStart(1, '0')}s
                </span>

                <div className="flex-1 flex items-center justify-center">
                  <input
                    type="range"
                    min={0}
                    max={maxKeyframeTime}
                    step={10}
                    value={currentTime}
                    onChange={e => {
                      setCurrentTime(Number(e.target.value))
                      setIsPlayingKeyframes(false)
                    }}
                    className="w-full h-1 accent-blue-500 appearance-none"
                  />
                </div>

                <span className="text-gray-400 text-xs font-mono w-16 shrink-0 text-right">
                  {Math.floor(maxKeyframeTime / 1000)}.{String(Math.floor((maxKeyframeTime % 1000) / 100)).padStart(1, '0')}s
                </span>
              </div>
            )}

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
    </div>
  )
}
