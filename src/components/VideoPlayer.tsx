import { useRef, useState, useEffect } from 'react'

interface Marker {
  timestamp: number
  label: string
}

interface Props {
  src: string | null
  onTimeUpdate?: (seconds: number) => void
  seekTo?: number
  markers?: Marker[]          // annotation timestamps shown on the scrubber
  showMarkers?: boolean
  onMarkerClick?: (timestamp: number) => void
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function VideoPlayer({ src, onTimeUpdate, seekTo, markers = [], showMarkers = true, onMarkerClick }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  // Seek externally when parent passes seekTo
  useEffect(() => {
    if (seekTo !== undefined && ref.current) {
      ref.current.currentTime = seekTo
    }
  }, [seekTo])

  const toggle = () => {
    if (!ref.current) return
    if (playing) ref.current.pause()
    else ref.current.play()
    setPlaying(!playing)
  }

  const skip = (delta: number) => {
    if (!ref.current) return
    ref.current.currentTime = Math.max(0, Math.min(duration, ref.current.currentTime + delta))
  }

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (ref.current) ref.current.currentTime = val
    setCurrent(val)
  }

  return (
    <div className="flex flex-col w-full bg-black">
      {src ? (
        <video
          ref={ref}
          src={src}
          className="w-full max-h-[65vh] object-contain bg-black"
          onTimeUpdate={() => {
            const t = ref.current?.currentTime ?? 0
            setCurrent(t)
            onTimeUpdate?.(t)
          }}
          onDurationChange={() => setDuration(ref.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
          No video uploaded
        </div>
      )}

      {/* Controls */}
      <div className="bg-gray-900 px-3 py-2 flex flex-col gap-1">
        {/* Scrubber */}
        <div className="flex items-center gap-2 text-gray-300 text-xs">
          <span className="w-12 text-right shrink-0">{fmt(current)}</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={current}
              onChange={onScrub}
              className="w-full accent-blue-500 h-1 cursor-pointer"
            />
            {/* Annotation markers on the timeline */}
            {showMarkers && duration > 0 && markers.map((m, i) => (
              <button
                key={i}
                title={m.label}
                onClick={() => onMarkerClick?.(m.timestamp)}
                style={{ left: `${(m.timestamp / duration) * 100}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-600 hover:bg-yellow-300 transition-colors z-10 pointer-events-auto"
              />
            ))}
          </div>
          <span className="w-12 shrink-0">{fmt(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => skip(-10)} className="text-white hover:text-blue-400 transition-colors" title="−10s">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              <text x="8" y="16" fontSize="6" fill="currentColor">10</text>
            </svg>
          </button>

          <button onClick={toggle} className="text-white hover:text-blue-400 transition-colors">
            {playing ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button onClick={() => skip(10)} className="text-white hover:text-blue-400 transition-colors" title="+10s">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V2l4 4-4 4V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
