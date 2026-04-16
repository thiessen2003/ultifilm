import {
  useRef, useState, useEffect, useCallback,
  useImperativeHandle, forwardRef,
} from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type Tool =
  | 'pen' | 'marker' | 'dashed' | 'calligraphy' | 'spray'
  | 'eraser' | 'text' | 'arrow' | 'circle' | 'rect' | 'triangle'

export interface DrawingCanvasHandle {
  getDataUrl: () => string | null
  loadDataUrl: (url: string | null) => void
  clear: () => void
}

interface Props {
  visible: boolean
  onStrokeEnd?: () => void   // called after every completed stroke so parent can save
  interactive?: boolean      // when false, canvas is shown but pointer events pass through
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = ['#E53535','#3543D0','#22c55e','#f59e0b','#ffffff','#111111']

const TOOLS: { id: Tool; tip: string; svg: React.ReactNode }[] = [
  { id: 'pen',         tip: 'Pen',         svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
  { id: 'marker',      tip: 'Marker',      svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.9-5.7a8.5 8.5 0 113.8 3.8z"/></svg> },
  { id: 'dashed',      tip: 'Dashed',      svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="7" y2="12"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/></svg> },
  { id: 'calligraphy', tip: 'Calligraphy', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20L20 4"/><path d="M4 20l4-1-3-3z"/></svg> },
  { id: 'spray',       tip: 'Spray',       svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="15" r="4"/><line x1="12" y1="15" x2="20" y2="15"/><line x1="17" y1="9" x2="17" y2="13"/></svg> },
  { id: 'eraser',      tip: 'Eraser',      svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l9.5-9.5 7.5 7.5-2.5 2.5"/><path d="M6.5 17.5l4-4"/></svg> },
  { id: 'text',        tip: 'Text',        svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
  { id: 'arrow',       tip: 'Arrow',       svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> },
  { id: 'circle',      tip: 'Circle',      svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg> },
  { id: 'rect',        tip: 'Rectangle',   svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
  { id: 'triangle',    tip: 'Triangle',    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 22 22 22"/></svg> },
]

const FREE_TOOLS: Tool[] = ['pen','marker','dashed','calligraphy','spray','eraser']
const SHAPE_TOOLS: Tool[] = ['arrow','circle','rect','triangle']

// ── Component ─────────────────────────────────────────────────────────────────
const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  ({ visible, onStrokeEnd, interactive = true }, ref) => {
    const canvasRef   = useRef<HTMLCanvasElement>(null)
    const wrapperRef  = useRef<HTMLDivElement>(null)
    const eraserRef   = useRef<HTMLDivElement>(null)

    const [activeTool,  setActiveTool]  = useState<Tool>('pen')
    const [activeColor, setActiveColor] = useState(COLORS[0])
    const [strokeWidth, setStrokeWidth] = useState(3)

    // Mutable drawing state (no re-renders needed)
    const undoStack  = useRef<ImageData[]>([])
    const redoStack  = useRef<ImageData[]>([])
    const isDrawing  = useRef(false)
    const startX     = useRef(0)
    const startY     = useRef(0)
    const snapshot   = useRef<ImageData | null>(null)
    const textInpRef = useRef<HTMLInputElement | null>(null)
    const toolRef    = useRef<Tool>('pen')
    const colorRef   = useRef(COLORS[0])
    const sizeRef    = useRef(3)

    // Keep refs in sync with state
    useEffect(() => { toolRef.current  = activeTool  }, [activeTool])
    useEffect(() => { colorRef.current = activeColor }, [activeColor])
    useEffect(() => { sizeRef.current  = strokeWidth }, [strokeWidth])

    // ── Canvas resize ──────────────────────────────────────────────────
    useEffect(() => {
      const canvas  = canvasRef.current
      const wrapper = wrapperRef.current
      if (!canvas || !wrapper) return
      const ro = new ResizeObserver(() => {
        const ctx = canvas.getContext('2d')!
        const saved = canvas.width > 0
          ? ctx.getImageData(0, 0, canvas.width, canvas.height)
          : null
        canvas.width  = wrapper.clientWidth
        canvas.height = wrapper.clientHeight
        if (saved) ctx.putImageData(saved, 0, 0)
      })
      ro.observe(wrapper)
      return () => ro.disconnect()
    }, [])

    // ── Expose imperative handle ───────────────────────────────────────
    useImperativeHandle(ref, () => ({
      getDataUrl() {
        const canvas = canvasRef.current
        if (!canvas) return null
        return canvas.toDataURL('image/png')
      },
      loadDataUrl(url: string | null) {
        const canvas = canvasRef.current
        if (!canvas || !url) return
        const ctx = canvas.getContext('2d')!
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        img.src = url
      },
      clear() {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        saveUndo()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        redoStack.current = []
      },
    }))

    // ── Helpers ────────────────────────────────────────────────────────
    const getPos = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current!
      const rect   = canvas.getBoundingClientRect()
      const scaleX = canvas.width  / rect.width
      const scaleY = canvas.height / rect.height
      const src    = 'touches' in e ? e.touches[0] : e
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top)  * scaleY,
      }
    }

    const saveUndo = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      if (undoStack.current.length > 40) undoStack.current.shift()
      redoStack.current = []
    }

    const undo = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas || !undoStack.current.length) return
      const ctx = canvas.getContext('2d')!
      redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      ctx.putImageData(undoStack.current.pop()!, 0, 0)
    }, [])

    const redo = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas || !redoStack.current.length) return
      const ctx = canvas.getContext('2d')!
      undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      ctx.putImageData(redoStack.current.pop()!, 0, 0)
    }, [])

    // Keyboard shortcuts
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
          if (e.shiftKey && e.key === 'z') { e.preventDefault(); redo() }
          else if (e.key === 'z') { e.preventDefault(); undo() }
          else if (e.key === 'y') { e.preventDefault(); redo() }
        }
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [undo, redo])

    const applyStyle = (ctx: CanvasRenderingContext2D) => {
      const tool  = toolRef.current
      const color = colorRef.current
      const size  = sizeRef.current
      ctx.strokeStyle = color
      ctx.fillStyle   = color
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.globalAlpha = 1
      ctx.setLineDash([])
      switch (tool) {
        case 'marker':
          ctx.lineWidth   = size * 3
          ctx.globalAlpha = 0.35
          ctx.lineCap     = 'square'
          break
        case 'dashed':
          ctx.lineWidth = size
          ctx.setLineDash([size * 4, size * 2])
          break
        case 'calligraphy':
          ctx.lineWidth   = size * 4
          ctx.lineCap     = 'butt'
          ctx.globalAlpha = 0.85
          break
        default:
          ctx.lineWidth = size
      }
    }

    const drawShape = (ctx: CanvasRenderingContext2D, tool: Tool, x1: number, y1: number, x2: number, y2: number) => {
      applyStyle(ctx)
      ctx.globalAlpha = 1
      ctx.beginPath()
      switch (tool) {
        case 'arrow': {
          const dx = x2 - x1, dy = y2 - y1
          const angle = Math.atan2(dy, dx)
          const head  = Math.max(12, sizeRef.current * 4)
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x2, y2)
          ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6))
          ctx.moveTo(x2, y2)
          ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6))
          ctx.stroke(); break
        }
        case 'circle': {
          const rx = (x2 - x1) / 2, ry = (y2 - y1) / 2
          ctx.ellipse(x1 + rx, y1 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
          ctx.stroke(); break
        }
        case 'rect':
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); break
        case 'triangle':
          ctx.moveTo((x1 + x2) / 2, y1)
          ctx.lineTo(x2, y2); ctx.lineTo(x1, y2)
          ctx.closePath(); ctx.stroke(); break
      }
    }

    const placeTextInput = (x: number, y: number) => {
      if (textInpRef.current) textInpRef.current.remove()
      const canvas  = canvasRef.current!
      const wrapper = wrapperRef.current!
      const rect    = canvas.getBoundingClientRect()
      const scaleX  = rect.width  / canvas.width
      const scaleY  = rect.height / canvas.height
      const wRect   = wrapper.getBoundingClientRect()

      const inp = document.createElement('input')
      inp.type        = 'text'
      inp.placeholder = 'Type here…'
      Object.assign(inp.style, {
        position:   'absolute',
        left:       (x * scaleX + rect.left - wRect.left) + 'px',
        top:        (y * scaleY + rect.top  - wRect.top)  + 'px',
        background: 'rgba(255,255,255,0.15)',
        border:     `1.5px dashed ${colorRef.current}`,
        color:      colorRef.current,
        fontSize:   Math.max(14, sizeRef.current * 4) + 'px',
        fontFamily: 'sans-serif',
        fontWeight: '600',
        padding:    '2px 6px',
        borderRadius: '4px',
        outline:    'none',
        minWidth:   '80px',
        zIndex:     '10',
      })
      wrapper.appendChild(inp)
      textInpRef.current = inp
      inp.focus()

      const commit = () => {
        if (inp.value.trim()) {
          const ctx = canvas.getContext('2d')!
          saveUndo()
          ctx.globalAlpha = 1
          ctx.font      = `600 ${Math.max(14, sizeRef.current * 4)}px sans-serif`
          ctx.fillStyle = colorRef.current
          ctx.fillText(inp.value.trim(), x, y + Math.max(14, sizeRef.current * 4))
          onStrokeEnd?.()
        }
        inp.remove(); textInpRef.current = null
      }
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { inp.remove(); textInpRef.current = null }
      })
      inp.addEventListener('blur', commit)
    }

    // ── Pointer events (native to support passive:false for touch) ────
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const onDown = (e: MouseEvent | TouchEvent) => {
        if (!visible) return
        const tool = toolRef.current
        const ctx  = canvas.getContext('2d')!
        if (tool === 'text') {
          const pos = getPos(e)
          placeTextInput(pos.x, pos.y)
          return
        }
        saveUndo()
        isDrawing.current = true
        const pos = getPos(e)
        startX.current = pos.x
        startY.current = pos.y
        if (FREE_TOOLS.includes(tool)) {
          ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
        } else {
          snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
        }
      }

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current || !visible) return
        const tool = toolRef.current
        const ctx  = canvas.getContext('2d')!
        const pos  = getPos(e)

        // Update eraser cursor
        if (tool === 'eraser' && eraserRef.current) {
          const rect = canvas.getBoundingClientRect()
          const src  = 'touches' in e ? e.touches[0] : e
          eraserRef.current.style.left = (src.clientX - rect.left) + 'px'
          eraserRef.current.style.top  = (src.clientY - rect.top)  + 'px'
        }

        if (['pen','marker','dashed','calligraphy'].includes(tool)) {
          applyStyle(ctx)
          ctx.lineTo(pos.x, pos.y); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
        } else if (tool === 'spray') {
          applyStyle(ctx)
          const density = 20, radius = sizeRef.current * 5
          ctx.globalAlpha = 0.6
          for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2
            const r     = Math.random() * radius
            ctx.fillStyle = colorRef.current
            ctx.beginPath()
            ctx.arc(pos.x + r * Math.cos(angle), pos.y + r * Math.sin(angle), Math.random() * 1.5 + 0.5, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        } else if (tool === 'eraser') {
          const s = sizeRef.current * 8
          ctx.clearRect(pos.x - s / 2, pos.y - s / 2, s, s)
        } else if (SHAPE_TOOLS.includes(tool) && snapshot.current) {
          ctx.putImageData(snapshot.current, 0, 0)
          drawShape(ctx, tool, startX.current, startY.current, pos.x, pos.y)
        }
      }

      const onUp = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return
        isDrawing.current = false
        const tool = toolRef.current
        const ctx  = canvas.getContext('2d')!
        ctx.globalAlpha = 1
        if (FREE_TOOLS.includes(tool)) {
          ctx.beginPath(); ctx.setLineDash([])
        } else if (SHAPE_TOOLS.includes(tool) && snapshot.current) {
          const pos = getPos(e)
          ctx.putImageData(snapshot.current, 0, 0)
          drawShape(ctx, tool, startX.current, startY.current, pos.x, pos.y)
        }
        onStrokeEnd?.()
      }

      const onEraserMove = (e: MouseEvent) => {
        if (toolRef.current !== 'eraser' || !eraserRef.current) return
        const rect = canvas.getBoundingClientRect()
        eraserRef.current.style.left = (e.clientX - rect.left) + 'px'
        eraserRef.current.style.top  = (e.clientY - rect.top)  + 'px'
      }

      canvas.addEventListener('mousedown',  onDown)
      canvas.addEventListener('mousemove',  onMove)
      canvas.addEventListener('mouseup',    onUp)
      canvas.addEventListener('mouseleave', onUp)
      canvas.addEventListener('mousemove',  onEraserMove)
      canvas.addEventListener('touchstart', onDown as EventListener, { passive: false })
      canvas.addEventListener('touchmove',  onMove as EventListener, { passive: false })
      canvas.addEventListener('touchend',   onUp   as EventListener, { passive: false })

      return () => {
        canvas.removeEventListener('mousedown',  onDown)
        canvas.removeEventListener('mousemove',  onMove)
        canvas.removeEventListener('mouseup',    onUp)
        canvas.removeEventListener('mouseleave', onUp)
        canvas.removeEventListener('mousemove',  onEraserMove)
        canvas.removeEventListener('touchstart', onDown as EventListener)
        canvas.removeEventListener('touchmove',  onMove as EventListener)
        canvas.removeEventListener('touchend',   onUp   as EventListener)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, onStrokeEnd])

    const eraserSize = strokeWidth * 8

    // ── Render ─────────────────────────────────────────────────────────
    return (
      <div ref={wrapperRef} className="absolute inset-0 flex" style={interactive ? undefined : { pointerEvents: 'none' }}>
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            display: visible ? 'block' : 'none',
            cursor: activeTool === 'eraser' ? 'none'
                  : activeTool === 'text'   ? 'text'
                  : 'crosshair',
            zIndex: 10,
            pointerEvents: interactive === false ? 'none' : 'auto',
          }}
        />

        {/* Eraser cursor ring */}
        {activeTool === 'eraser' && visible && (
          <div
            ref={eraserRef}
            style={{
              position: 'absolute', pointerEvents: 'none', zIndex: 11,
              width: eraserSize, height: eraserSize,
              border: '2px solid rgba(255,255,255,0.8)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            }}
          />
        )}

        {/* Right toolbar — only shown when interactive (draw mode) */}
        {interactive !== false && <div className="absolute right-0 top-0 bottom-0 w-14 bg-white border-l border-gray-200 flex flex-col items-center py-2 gap-1 overflow-y-auto z-20">
          {/* Tools */}
          {TOOLS.map(t => (
            <button
              key={t.id}
              title={t.tip}
              onClick={() => setActiveTool(t.id)}
              className={`w-9 h-9 rounded flex items-center justify-center transition-colors ${
                activeTool === t.id
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:bg-brand-50 hover:text-brand-500'
              }`}
            >
              <span className="w-4 h-4">{t.svg}</span>
            </button>
          ))}

          <div className="w-7 h-px bg-gray-200 my-1" />

          {/* Colors */}
          {COLORS.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => setActiveColor(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                activeColor === c ? 'border-gray-800 scale-110' : 'border-transparent'
              } ${c === '#ffffff' ? '!border-gray-300' : ''}`}
            />
          ))}

          <div className="w-7 h-px bg-gray-200 my-1" />

          {/* Stroke size */}
          <span className="text-gray-400 font-mono" style={{ fontSize: 9 }}>{strokeWidth}px</span>
          <input
            type="range" min={1} max={20} value={strokeWidth}
            onChange={e => setStrokeWidth(Number(e.target.value))}
            className="accent-blue-600"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 4, height: 56, cursor: 'pointer' }}
          />

          <div className="w-7 h-px bg-gray-200 my-1" />

          {/* Undo / Redo */}
          <button onClick={undo} title="Undo (⌘Z)" className="w-9 h-7 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded hover:bg-blue-50">↩</button>
          <button onClick={redo} title="Redo (⌘Y)" className="w-9 h-7 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded hover:bg-blue-50">↪</button>

          {/* Clear */}
          <button
            onClick={() => {
              const canvas = canvasRef.current
              if (!canvas) return
              saveUndo()
              canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
              redoStack.current = []
              onStrokeEnd?.()
            }}
            title="Clear all"
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>}
      </div>
    )
  }
)

DrawingCanvas.displayName = 'DrawingCanvas'
export default DrawingCanvas
