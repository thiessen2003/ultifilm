import { useRef, useEffect, useCallback, useState } from 'react'
import type { PlayerPosition, Team } from '../domain/entities/PlayerPosition'

interface Props {
  positions: PlayerPosition[]
  onChange: (positions: PlayerPosition[]) => void
  readOnly?: boolean
  // When set, clicking empty canvas space places a new dot of this team
  placementTeam?: Team
  // Teams that are locked (rendered but not draggable)
  lockedTeams?: Team[]
}

const COLORS: Record<Team, string> = {
  offense: '#3B82F6',  // blue-500
  defense: '#EF4444',  // red-500
  disc:    '#1F2937',  // gray-900
}

const DOT_RADIUS = 14

function hitTest(pos: PlayerPosition, mx: number, my: number, w: number, h: number) {
  const cx = (pos.x / 100) * w
  const cy = (pos.y / 100) * h
  return Math.hypot(mx - cx, my - cy) <= DOT_RADIUS + 4
}

export default function PlayCanvas({ positions, onChange, readOnly = false, placementTeam, lockedTeams = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const dragging = useRef<{ id: string; offX: number; offY: number } | null>(null)
  const posRef = useRef(positions)
  posRef.current = positions

  // ── draw ────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    // Field background
    ctx.fillStyle = '#3a7d44'
    ctx.fillRect(0, 0, W, H)

    // End-zone lines (20 yd zones, 110 yd total field)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    const ez = W * (20 / 110)
    ctx.beginPath()
    ctx.moveTo(ez, 0); ctx.lineTo(ez, H)
    ctx.moveTo(W - ez, 0); ctx.lineTo(W - ez, H)
    ctx.stroke()

    // Centre line
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H)
    ctx.stroke()
    ctx.setLineDash([])

    // Outer border
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(2, 2, W - 4, H - 4)

    // Dots
    for (const pos of posRef.current) {
      const cx = (pos.x / 100) * W
      const cy = (pos.y / 100) * H
      const color = COLORS[pos.team]
      const isSelected = pos.id === selected

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 6

      // Fill
      ctx.beginPath()
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      ctx.shadowBlur = 0

      // Selection ring
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(cx, cy, DOT_RADIUS + 4, 0, Math.PI * 2)
        ctx.strokeStyle = '#FCD34D'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // Disc inner ring
      if (pos.team === 'disc') {
        ctx.beginPath()
        ctx.arc(cx, cy, DOT_RADIUS - 4, 0, Math.PI * 2)
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Label
      if (pos.label) {
        ctx.fillStyle = 'white'
        ctx.font = `bold ${DOT_RADIUS - 2}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(pos.label, cx, cy)
      }
    }
  }, [selected])

  useEffect(() => { draw() }, [positions, selected, draw])

  // Resize observer keeps canvas resolution matching its CSS size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      draw()
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  // ── mouse events ────────────────────────────────────────────────────────────
  const toPercent = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width)  * 100,
      y: ((e.clientY - r.top)  / r.height) * 100,
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return
    const canvas = canvasRef.current!
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    const mx = e.clientX - canvas.getBoundingClientRect().left
    const my = e.clientY - canvas.getBoundingClientRect().top

    // Check if clicking an existing draggable dot
    for (const pos of [...posRef.current].reverse()) {
      if (lockedTeams.includes(pos.team)) continue
      if (hitTest(pos, mx, my, W, H)) {
        setSelected(pos.id)
        dragging.current = { id: pos.id, offX: 0, offY: 0 }
        return
      }
    }

    // Placement mode: clicking empty space adds a new dot
    if (placementTeam) {
      const { x, y } = {
        x: (mx / W) * 100,
        y: (my / H) * 100,
      }
      const count = posRef.current.filter(p => p.team === placementTeam).length
      const label = placementTeam === 'disc' ? '' : `${placementTeam === 'offense' ? 'O' : 'D'}${count + 1}`
      const newPos: PlayerPosition = {
        id: `temp-${Date.now()}-${Math.random()}`,
        play_id: posRef.current[0]?.play_id ?? '',
        team: placementTeam,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        label,
      }
      onChange([...posRef.current, newPos])
      return
    }

    setSelected(null)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || readOnly) return
    const { x, y } = toPercent(e)
    const updated = posRef.current.map(p =>
      p.id === dragging.current!.id
        ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
        : p
    )
    onChange(updated)
  }

  const onMouseUp = () => { dragging.current = null }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  )
}
