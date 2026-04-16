import { useState, useRef, useEffect, useCallback } from 'react'

// ── Types (mirrors PlayerTracker internals) ────────────────────────────────────
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
  playId: string
  playName: string
}

const STORAGE_KEY = (id: string) => `player_tracking_${id}`
const TEAM_COLOR: Record<string, string> = { offense: '#3535e0', defense: '#EF4444' }

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

export default function PlayVisualizer({ playId, playName }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [players] = useState<TrackedPlayer[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY(playId)) || '[]') } catch { return [] }
  })

  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [speed, setSpeed]                 = useState(1)

  const durationMs = players.length > 0
    ? Math.max(...players.flatMap(p => p.keyframes.map(k => k.timestamp_ms)), 0)
    : 0

  // Refs for rAF loop (avoid stale closures)
  const isPlayingRef = useRef(false)
  isPlayingRef.current = isPlaying
  const speedRef = useRef(1)
  speedRef.current = speed
  const currentTimeMsRef = useRef(0)
  currentTimeMsRef.current = currentTimeMs

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return
    let rafId: number
    let lastNow: number | null = null
    const tick = (now: number) => {
      if (!isPlayingRef.current) return
      if (lastNow !== null) {
        const delta = (now - lastNow) * speedRef.current
        setCurrentTimeMs(prev => {
          const next = prev + delta
          if (next >= durationMs) { setIsPlaying(false); return durationMs }
          return next
        })
      }
      lastNow = now
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, durationMs])

  // ── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    // Field background
    ctx.fillStyle = '#1a5c2a'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 1) { ctx.fillStyle = '#1e6630'; ctx.fillRect(i * W / 10, 0, W / 10, H) }
    }

    const ez = W * 0.18
    ctx.fillStyle = 'rgba(20,85,40,0.6)'
    ctx.fillRect(0, 0, ez, H)
    ctx.fillRect(W - ez, 0, ez, H)

    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2
    ctx.strokeRect(3, 3, W - 6, H - 6)
    ctx.beginPath()
    ctx.moveTo(ez, 3);     ctx.lineTo(ez, H - 3)
    ctx.moveTo(W - ez, 3); ctx.lineTo(W - ez, H - 3)
    ctx.stroke()

    const playW = W - 2 * ez
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1
    for (let i = 1; i < 8; i++) {
      const x = ez + playW * i / 8
      ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x, H - 3); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(ez + playW / 2, 3); ctx.lineTo(ez + playW / 2, H - 3); ctx.stroke()

    // Players
    players.forEach(player => {
      if (player.keyframes.length === 0) return
      const sorted = [...player.keyframes].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
      const color  = TEAM_COLOR[player.team]

      // Dim full path
      ctx.beginPath()
      sorted.forEach((kf, i) => {
        i === 0 ? ctx.moveTo(kf.x_pct * W, kf.y_pct * H) : ctx.lineTo(kf.x_pct * W, kf.y_pct * H)
      })
      ctx.strokeStyle = color + '33'; ctx.lineWidth = 2
      ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([])

      // Bright traversed path
      const traversed = sorted.filter(kf => kf.timestamp_ms <= currentTimeMs)
      if (traversed.length > 1) {
        ctx.beginPath()
        traversed.forEach((kf, i) => {
          i === 0 ? ctx.moveTo(kf.x_pct * W, kf.y_pct * H) : ctx.lineTo(kf.x_pct * W, kf.y_pct * H)
        })
        ctx.strokeStyle = color + 'bb'; ctx.lineWidth = 3; ctx.stroke()
      }

      // Keyframe dots
      sorted.forEach(kf => {
        ctx.beginPath()
        ctx.arc(kf.x_pct * W, kf.y_pct * H, 3, 0, Math.PI * 2)
        ctx.fillStyle = color + '99'; ctx.fill()
      })

      // Current position dot
      const pos = interpolate(player.keyframes, currentTimeMs)
      if (!pos) return
      const px = pos.x * W, py = pos.y * H

      ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2)
      ctx.strokeStyle = color + '22'; ctx.lineWidth = 8; ctx.stroke()

      ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2)
      ctx.fillStyle = color + 'dd'; ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke()

      ctx.font = 'bold 12px Inter, sans-serif'
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(player.name.slice(0, 3).toUpperCase(), px, py)
    })
  }, [players, currentTimeMs])

  useEffect(() => { draw() }, [draw])

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

  // ── Export JSON ────────────────────────────────────────────────────────────
  const exportJSON = () => {
    const data = {
      playId,
      playName,
      exportedAt: new Date().toISOString(),
      players: players.map(p => ({
        name: p.name,
        team: p.team,
        keyframes: [...p.keyframes]
          .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
          .map(kf => ({
            timestamp_ms: kf.timestamp_ms,
            x_pct: Math.round(kf.x_pct * 1000) / 1000,
            y_pct: Math.round(kf.y_pct * 1000) / 1000,
          })),
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${playName.replace(/\s+/g, '_')}_tracking.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-950">

      {/* Field canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={wrapperRef} className="flex-1 relative overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {players.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              No tracking data yet — go to the Track Players tab to add keyframes.
            </div>
          )}
        </div>

        {/* Playback controls */}
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-3 shrink-0">
          <button
            onClick={() => { setCurrentTimeMs(0); setIsPlaying(false) }}
            className="text-gray-400 hover:text-white text-lg leading-none"
            title="Reset"
          >⏮</button>

          <button
            onClick={() => {
              if (currentTimeMs >= durationMs) setCurrentTimeMs(0)
              setIsPlaying(p => !p)
            }}
            disabled={durationMs === 0}
            className="text-white hover:text-brand-300 disabled:opacity-40 transition-colors"
          >
            {isPlaying
              ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>

          <span className="text-gray-400 text-xs font-mono w-32 shrink-0 text-center">
            {fmt(currentTimeMs)} / {fmt(durationMs)}
          </span>

          <input
            type="range" min={0} max={durationMs || 100} step={10}
            value={currentTimeMs}
            onChange={e => { setCurrentTimeMs(Number(e.target.value)); setIsPlaying(false) }}
            className="flex-1 accent-brand-500"
            disabled={durationMs === 0}
          />

          <div className="flex items-center gap-0.5 ml-1">
            {([0.5, 1, 2] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  speed === s ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col p-4 gap-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Players</div>

        {players.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No tracking data</p>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: TEAM_COLOR[p.team] }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.keyframes.length} keyframes</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto">
          <button
            onClick={exportJSON}
            disabled={players.length === 0}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-medium py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Export JSON
          </button>
        </div>
      </div>
    </div>
  )
}
