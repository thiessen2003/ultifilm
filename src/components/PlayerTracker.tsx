import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Keyframe {
  id: string
  timestamp_ms: number
  x_pct: number
  y_pct: number
}

interface TrackedPlayer {
  id: string
  name: string
  team: 'offense' | 'defense'
  keyframes: Keyframe[]
}

interface Props {
  videoSrc: string | null
  playId: string
  playName: string
  onClose: () => void
}

const TEAM_COLOR = { offense: '#3535e0', defense: '#EF4444' }
const STORAGE_KEY = (playId: string) => `player_tracking_${playId}`

function fmt(ms: number) {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`
}

function interpolate(kfs: Keyframe[], timeMs: number): { x: number; y: number } | null {
  if (kfs.length === 0) return null
  const sorted = [...kfs].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
  if (timeMs <= sorted[0].timestamp_ms) return { x: sorted[0].x_pct, y: sorted[0].y_pct }
  if (timeMs >= sorted[sorted.length - 1].timestamp_ms) {
    const last = sorted[sorted.length - 1]
    return { x: last.x_pct, y: last.y_pct }
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1]
    if (timeMs >= a.timestamp_ms && timeMs <= b.timestamp_ms) {
      const t = (timeMs - a.timestamp_ms) / (b.timestamp_ms - a.timestamp_ms)
      return { x: a.x_pct + (b.x_pct - a.x_pct) * t, y: a.y_pct + (b.y_pct - a.y_pct) * t }
    }
  }
  return null
}

// ── Field map (horizontal — end zones on left/right) ──────────────────────────
function FieldMap({
  players,
  currentTimeMs,
  durationMs,
  onSeek,
}: {
  players: TrackedPlayer[]
  currentTimeMs: number
  durationMs: number
  onSeek: (ms: number) => void
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    // ── Field background — landscape orientation ──
    ctx.fillStyle = '#1a5c2a'
    ctx.fillRect(0, 0, W, H)

    // Alternating vertical strips (left → right)
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 1) {
        ctx.fillStyle = '#1e6630'
        ctx.fillRect(i * W / 10, 0, W / 10, H)
      }
    }

    // End zones (left 18% and right 18%)
    const ez = W * 0.18
    ctx.fillStyle = 'rgba(20,85,40,0.6)'
    ctx.fillRect(0, 0, ez, H)
    ctx.fillRect(W - ez, 0, ez, H)

    // Boundary
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2
    ctx.strokeRect(3, 3, W - 6, H - 6)

    // End zone lines (vertical)
    ctx.beginPath()
    ctx.moveTo(ez, 3);     ctx.lineTo(ez, H - 3)
    ctx.moveTo(W - ez, 3); ctx.lineTo(W - ez, H - 3)
    ctx.stroke()

    // Yard lines (vertical, in playing area)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    const playing = W - 2 * ez
    for (let i = 1; i < 8; i++) {
      const x = ez + playing * i / 8
      ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x, H - 3); ctx.stroke()
    }

    // Centre line slightly brighter
    const cx = ez + playing / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx, 3); ctx.lineTo(cx, H - 3); ctx.stroke()

    // ── Player paths ──
    players.forEach(player => {
      if (player.keyframes.length === 0) return
      const sorted = [...player.keyframes].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
      const color  = TEAM_COLOR[player.team]

      // Full path (dashed)
      ctx.beginPath()
      sorted.forEach((kf, i) => {
        const x = kf.x_pct * W, y = kf.y_pct * H
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color + '55'
      ctx.lineWidth   = 2
      ctx.setLineDash([6, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // Keyframe dots
      sorted.forEach(kf => {
        ctx.beginPath()
        ctx.arc(kf.x_pct * W, kf.y_pct * H, 3, 0, Math.PI * 2)
        ctx.fillStyle = color + '99'
        ctx.fill()
      })

      // Current interpolated position
      const pos = interpolate(player.keyframes, currentTimeMs)
      if (!pos) return
      const px = pos.x * W, py = pos.y * H

      ctx.beginPath()
      ctx.arc(px, py, 20, 0, Math.PI * 2)
      ctx.strokeStyle = color + '33'
      ctx.lineWidth = 6
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(px, py, 14, 0, Math.PI * 2)
      ctx.fillStyle = color + 'dd'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2.5
      ctx.stroke()

      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(player.name.slice(0, 3).toUpperCase(), px, py)
    })
  }, [players, currentTimeMs])

  useEffect(() => {
    const canvas  = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const ro = new ResizeObserver(() => {
      canvas.width  = wrapper.clientWidth
      canvas.height = wrapper.clientHeight
      draw()
    })
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [draw])

  useEffect(draw, [draw])

  return (
    <div ref={wrapperRef} className="absolute inset-0 bg-green-900">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
        {players.filter(p => p.team === 'offense').length > 0 && (
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded text-xs text-white">
            <span className="w-3 h-3 rounded-full bg-brand-500 inline-block" />
            Offense
          </div>
        )}
        {players.filter(p => p.team === 'defense').length > 0 && (
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded text-xs text-white">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            Defense
          </div>
        )}
      </div>

      {/* Time scrubber */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 flex items-center gap-3">
        <span className="text-white text-xs font-mono w-20">{fmt(currentTimeMs)}</span>
        <input
          type="range"
          min={0}
          max={durationMs || 100}
          step={10}
          value={currentTimeMs}
          onChange={e => onSeek(Number(e.target.value))}
          className="flex-1 accent-brand-400"
        />
        <span className="text-gray-400 text-xs font-mono w-20 text-right">{fmt(durationMs)}</span>
      </div>
    </div>
  )
}

// ── Tracking canvas overlay ────────────────────────────────────────────────────
function TrackingCanvas({
  players,
  activePlayerId,
  currentTimeMs,
  onPlace,
}: {
  players: TrackedPlayer[]
  activePlayerId: string | null
  currentTimeMs: number
  onPlace: (x: number, y: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const ro = new ResizeObserver(() => {
      canvas.width = wrapper.clientWidth
      canvas.height = wrapper.clientHeight
    })
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    players.forEach(player => {
      const sorted = [...player.keyframes].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
      const pos = interpolate(player.keyframes, currentTimeMs)
      if (!pos) return

      const cx = pos.x * canvas.width
      const cy = pos.y * canvas.height
      const color = TEAM_COLOR[player.team]
      const isActive = player.id === activePlayerId
      const radius = isActive ? 16 : 11

      const trail = sorted.filter(k => k.timestamp_ms <= currentTimeMs).slice(-10)
      if (trail.length > 1) {
        ctx.beginPath()
        trail.forEach((k, i) => {
          const tx = k.x_pct * canvas.width
          const ty = k.y_pct * canvas.height
          i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty)
        })
        ctx.strokeStyle = color + '55'
        ctx.lineWidth = isActive ? 3 : 2
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.beginPath()
      ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = color + (isActive ? 'dd' : '99')
      ctx.fill()
      ctx.strokeStyle = isActive ? '#fff' : color
      ctx.lineWidth = isActive ? 2.5 : 1.5
      ctx.stroke()

      ctx.font = `bold ${isActive ? 12 : 10}px Inter, sans-serif`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(player.name.slice(0, 3).toUpperCase(), cx, cy)
    })
  }, [players, activePlayerId, currentTimeMs])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activePlayerId) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    onPlace((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }, [activePlayerId, onPlace])

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: activePlayerId ? 'crosshair' : 'default' }}
        onClick={handleClick}
      />
    </div>
  )
}

// ── Drawing canvas overlay ─────────────────────────────────────────────────────
interface DrawHandle { clear(): void }

const VideoDrawingCanvas = forwardRef<DrawHandle, { enabled: boolean; color: string }>(
  ({ enabled, color }, ref) => {
    const canvasRef   = useRef<HTMLCanvasElement>(null)
    const isDrawing   = useRef(false)
    const lastPt      = useRef<{ x: number; y: number } | null>(null)

    useImperativeHandle(ref, () => ({
      clear() {
        const c = canvasRef.current
        if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const wrapper = canvas.parentElement!
      const ro = new ResizeObserver(() => {
        canvas.width  = wrapper.clientWidth
        canvas.height = wrapper.clientHeight
      })
      ro.observe(wrapper)
      return () => ro.disconnect()
    }, [])

    const getPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const c = canvasRef.current!
      const r = c.getBoundingClientRect()
      return {
        x: (e.clientX - r.left) * (c.width  / r.width),
        y: (e.clientY - r.top)  * (c.height / r.height),
      }
    }

    const onDown  = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!enabled) return
      isDrawing.current = true
      lastPt.current = getPoint(e)
    }
    const onMove  = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!enabled || !isDrawing.current || !lastPt.current) return
      const c   = canvasRef.current!
      const ctx = c.getContext('2d')!
      const pt  = getPoint(e)
      ctx.beginPath()
      ctx.moveTo(lastPt.current.x, lastPt.current.y)
      ctx.lineTo(pt.x, pt.y)
      ctx.strokeStyle = color
      ctx.lineWidth   = 3
      ctx.lineCap     = 'round'
      ctx.stroke()
      lastPt.current = pt
    }
    const onUp = () => { isDrawing.current = false; lastPt.current = null }

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: enabled ? 'crosshair' : 'default',
          pointerEvents: enabled ? 'auto' : 'none',
        }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      />
    )
  },
)

// ── Main component ─────────────────────────────────────────────────────────────
export default function PlayerTracker({ videoSrc, playId, playName, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const drawRef  = useRef<DrawHandle>(null)

  const [players, setPlayers] = useState<TrackedPlayer[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY(playId)) || '[]') } catch { return [] }
  })
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [currentTimeMs, setCurrentTimeMs]   = useState(0)
  const [durationMs,    setDurationMs]       = useState(0)
  const [isPlaying,     setIsPlaying]        = useState(false)
  const [nameInput,     setNameInput]        = useState('')
  const [addingTeam,    setAddingTeam]       = useState<'offense' | 'defense'>('offense')
  const [toast,         setToast]            = useState<string | null>(null)
  const [view,          setView]             = useState<'video' | 'map'>('video')
  const [drawMode,      setDrawMode]         = useState(false)
  const [drawColor,     setDrawColor]        = useState('#ffff00')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(playId), JSON.stringify(players))
  }, [players, playId])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime  = () => setCurrentTimeMs(v.currentTime * 1000)
    const onMeta  = () => setDurationMs(v.duration * 1000)
    const onPlay  = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        const v = videoRef.current
        if (!v) return
        isPlaying ? v.pause() : v.play()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, onClose])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  const addPlayer = (team: 'offense' | 'defense') => {
    const name = nameInput.trim()
    if (!name) return
    const p: TrackedPlayer = { id: crypto.randomUUID(), name, team, keyframes: [] }
    setPlayers(prev => [...prev, p])
    setActivePlayerId(p.id)
    setNameInput('')
    setAddingTeam('offense')
    showToast(`"${name}" added`)
  }

  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id))
    if (activePlayerId === id) setActivePlayerId(null)
  }

  const placeKeyframe = useCallback((x_pct: number, y_pct: number) => {
    if (!activePlayerId) return
    setPlayers(prev => prev.map(p => {
      if (p.id !== activePlayerId) return p
      const existing = p.keyframes.findIndex(kf => Math.abs(kf.timestamp_ms - currentTimeMs) < 80)
      const kf = { id: crypto.randomUUID(), timestamp_ms: currentTimeMs, x_pct, y_pct }
      const keyframes = existing >= 0
        ? p.keyframes.map((k, i) => i === existing ? kf : k)
        : [...p.keyframes, kf]
      return { ...p, keyframes }
    }))
    showToast(`Keyframe @ ${fmt(currentTimeMs)}`)
  }, [activePlayerId, currentTimeMs])

  const deleteKeyframe = (playerId: string, kfId: string) => {
    setPlayers(prev => prev.map(p =>
      p.id !== playerId ? p : { ...p, keyframes: p.keyframes.filter(k => k.id !== kfId) }
    ))
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    isPlaying ? v.pause() : v.play()
  }

  const seekTo = (ms: number) => {
    if (videoRef.current) videoRef.current.currentTime = ms / 1000
    setCurrentTimeMs(ms)
  }

  const skip = (ms: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + ms / 1000))
  }

  const activePlayer = players.find(p => p.id === activePlayerId)

  const DRAW_COLORS = ['#ffff00', '#ff4444', '#44ff44', '#44aaff', '#ffffff', '#ff8800']

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">

      {/* Top bar */}
      <div className="bg-brand-500 text-white px-5 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base tracking-wide">Player Tracker</span>
          <span className="text-brand-200 text-sm">— {playName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {activePlayer && view === 'video' && !drawMode && (
            <span className="flex items-center gap-1.5 bg-brand-600 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              Tracking {activePlayer.name}
            </span>
          )}

          {/* Draw mode controls */}
          {view === 'video' && drawMode && (
            <div className="flex items-center gap-1.5">
              {DRAW_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: drawColor === c ? '#fff' : 'transparent',
                  }}
                />
              ))}
              <button
                onClick={() => drawRef.current?.clear()}
                className="text-brand-200 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-brand-600 transition-colors ml-1"
              >
                Clear
              </button>
            </div>
          )}

          {/* Draw toggle (video mode only) */}
          {view === 'video' && (
            <button
              onClick={() => setDrawMode(d => !d)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                drawMode ? 'bg-white text-brand-600' : 'text-brand-200 hover:text-white hover:bg-brand-600'
              }`}
              title="Draw over video"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              Draw
            </button>
          )}

          {/* Video / Map toggle */}
          <div className="flex bg-brand-600 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => { setView('video'); setDrawMode(false) }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                view === 'video' ? 'bg-white text-brand-600' : 'text-brand-200 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              </svg>
              Video
            </button>
            <button
              onClick={() => { setView('map'); setDrawMode(false) }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                view === 'map' ? 'bg-white text-brand-600' : 'text-brand-200 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7"/>
              </svg>
              Field Map
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-brand-200 hover:text-white px-3 py-1 rounded hover:bg-brand-600 transition-colors text-sm"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video / Map side */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 relative overflow-hidden">

            {/* Video layer — always mounted */}
            <div className={`absolute inset-0 ${view === 'map' ? 'invisible' : 'visible'}`}>
              {videoSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                  {/* Tracking canvas — disabled when drawing */}
                  {!drawMode && (
                    <TrackingCanvas
                      players={players}
                      activePlayerId={activePlayerId}
                      currentTimeMs={currentTimeMs}
                      onPlace={placeKeyframe}
                    />
                  )}
                  {/* Drawing canvas */}
                  <VideoDrawingCanvas ref={drawRef} enabled={drawMode} color={drawColor} />
                  {activePlayer && !drawMode && (
                    <div
                      className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white pointer-events-none"
                      style={{ backgroundColor: TEAM_COLOR[activePlayer.team] + 'cc' }}
                    >
                      Click anywhere to place {activePlayer.name}
                    </div>
                  )}
                  {drawMode && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white pointer-events-none bg-gray-800/80">
                      Draw mode — click and drag to draw
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                  No video loaded
                </div>
              )}
            </div>

            {/* Field map layer */}
            {view === 'map' && (
              <FieldMap
                players={players}
                currentTimeMs={currentTimeMs}
                durationMs={durationMs}
                onSeek={seekTo}
              />
            )}
          </div>

          {/* Controls — always visible */}
          <div className="bg-gray-900 px-4 py-2 flex items-center gap-3 shrink-0">
            <button onClick={() => skip(-5000)} className="text-gray-400 hover:text-white text-xs px-1">−5s</button>
            <button onClick={() => skip(-1000)} className="text-gray-400 hover:text-white text-xs px-1">−1s</button>

            <button onClick={togglePlay} className="text-white hover:text-brand-300 transition-colors">
              {isPlaying
                ? <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>

            <button onClick={() => skip(1000)} className="text-gray-400 hover:text-white text-xs px-1">+1s</button>
            <button onClick={() => skip(5000)} className="text-gray-400 hover:text-white text-xs px-1">+5s</button>

            <span className="text-gray-400 text-xs font-mono w-28 shrink-0">{fmt(currentTimeMs)} / {fmt(durationMs)}</span>

            <input
              type="range"
              min={0}
              max={durationMs || 100}
              step={10}
              value={currentTimeMs}
              onChange={e => {
                const t = Number(e.target.value)
                if (videoRef.current) videoRef.current.currentTime = t / 1000
                setCurrentTimeMs(t)
              }}
              className="flex-1 accent-brand-500"
            />

            <span className="text-gray-600 text-xs shrink-0">Space · Esc</span>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 bg-gray-900 flex flex-col overflow-hidden border-l border-gray-800">

          {/* Add player form */}
          <div className="p-3 border-b border-gray-800 shrink-0">
            <div className="flex gap-1.5 mb-2">
              {(['offense', 'defense'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setAddingTeam(t)}
                  className={`flex-1 text-xs py-1 rounded font-medium transition-colors ${
                    addingTeam === t
                      ? t === 'offense' ? 'bg-brand-500 text-white' : 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {t === 'offense' ? 'Offense' : 'Defense'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer(addingTeam)}
                placeholder="Player name or #…"
                className="flex-1 bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded border border-gray-700 focus:outline-none focus:border-brand-400 placeholder-gray-600"
              />
              <button
                onClick={() => addPlayer(addingTeam)}
                disabled={!nameInput.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs px-2.5 py-1.5 rounded font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Player list */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {(['offense', 'defense'] as const).map(team => {
              const teamPlayers = players.filter(p => p.team === team)
              return (
                <div key={team}>
                  <div className="text-xs font-semibold uppercase tracking-wider px-1 py-1.5"
                    style={{ color: TEAM_COLOR[team] }}>
                    {team} {teamPlayers.length > 0 && `(${teamPlayers.length})`}
                  </div>
                  {teamPlayers.length === 0 && (
                    <div className="text-xs text-gray-600 px-1 pb-2 italic">None added</div>
                  )}
                  {teamPlayers.map(p => {
                    const isActive = p.id === activePlayerId
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setActivePlayerId(isActive ? null : p.id); setDrawMode(false) }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors group ${
                          isActive ? 'bg-gray-700 ring-1 ring-gray-500' : 'hover:bg-gray-800'
                        }`}
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: TEAM_COLOR[p.team] }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm text-white flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-gray-500">{p.keyframes.length} kf</span>
                        <button
                          onClick={e => { e.stopPropagation(); removePlayer(p.id) }}
                          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-1 text-base leading-none"
                        >×</button>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Keyframe list for active player */}
          {activePlayer && activePlayer.keyframes.length > 0 && (
            <div className="border-t border-gray-800 p-2 shrink-0 max-h-48 overflow-y-auto">
              <div className="text-xs font-semibold uppercase tracking-wider px-1 py-1 text-gray-400">
                {activePlayer.name} — keyframes
              </div>
              {[...activePlayer.keyframes]
                .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
                .map(kf => (
                  <div key={kf.id} className="flex items-center gap-2 px-1 py-0.5 group hover:bg-gray-800 rounded">
                    <button
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = kf.timestamp_ms / 1000
                        setCurrentTimeMs(kf.timestamp_ms)
                      }}
                      className="text-xs font-mono text-brand-300 hover:text-brand-200"
                    >
                      {fmt(kf.timestamp_ms)}
                    </button>
                    <span className="text-xs text-gray-600 flex-1">
                      {(kf.x_pct * 100).toFixed(0)}%, {(kf.y_pct * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => deleteKeyframe(activePlayer.id, kf.id)}
                      className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm leading-none"
                    >×</button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
