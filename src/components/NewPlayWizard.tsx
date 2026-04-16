import { useState, useRef } from 'react'
import type { PlayerPosition, Team } from '../domain/entities/PlayerPosition'

type Step = 'name' | 'offense' | 'defense' | 'disc'

interface Props {
  videoSrc: string | null
  currentTime: number
  onCreated: (playId: string) => void
  onCancel: () => void
  onCreate: (name: string, positions: Omit<PlayerPosition, 'id' | 'play_id'>[]) => Promise<string>
}

const TEAM_COLOR: Record<'offense' | 'defense' | 'disc', string> = {
  offense: '#3B82F6',
  defense: '#EF4444',
  disc:    '#F59E0B',
}

const DOT_SIZE = 28  // px

const STEPS: Step[] = ['name', 'offense', 'defense', 'disc']

export default function NewPlayWizard({ videoSrc, currentTime, onCreated, onCancel, onCreate }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [positions, setPositions] = useState<Array<{ id: string; team: Team; x: number; y: number; label: string }>>([])
  const [saving, setSaving] = useState(false)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Capture a single frame from the video at currentTime
  const captureFrame = () => {
    const v = videoRef.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width  = v.videoWidth  || 1280
    canvas.height = v.videoHeight || 720
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    setFrameUrl(canvas.toDataURL('image/jpeg', 0.9))
  }

  const onVideoLoad = () => {
    if (videoRef.current) videoRef.current.currentTime = currentTime
  }

  const currentTeam: 'offense' | 'defense' = step === 'offense' ? 'offense' : 'defense'

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'offense' && step !== 'defense' && step !== 'disc') return
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    const clamped = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }

    if (step === 'disc') {
      // Replace any existing disc marker with one new one
      setPositions(prev => [
        ...prev.filter(p => p.team !== 'disc'),
        { id: `tmp-disc-${Date.now()}`, team: 'disc', ...clamped, label: 'DISC' },
      ])
      return
    }

    const count = positions.filter(p => p.team === currentTeam).length
    setPositions(prev => [...prev, {
      id: `tmp-${Date.now()}-${Math.random()}`,
      team: currentTeam,
      ...clamped,
      label: `${currentTeam === 'offense' ? 'O' : 'D'}${count + 1}`,
    }])
  }

  const removeLast = () => {
    if (step === 'disc') {
      setPositions(prev => prev.filter(p => p.team !== 'disc'))
      return
    }
    const items = positions.filter(p => p.team === currentTeam)
    if (!items.length) return
    const last = items[items.length - 1]
    setPositions(prev => prev.filter(p => p.id !== last.id))
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const stripped = positions.map(({ id: _id, ...rest }) => rest)
      const playId = await onCreate(name.trim(), stripped)
      onCreated(playId)
    } catch (e) {
      alert(`Failed to create play: ${(e as Error).message}`)
      setSaving(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)

  const hintBar = {
    offense: { bg: 'bg-blue-50 text-blue-700', text: 'Click each offensive player in the video to place a blue dot.' },
    defense: { bg: 'bg-red-50 text-red-700',  text: 'Click each defensive player to place a red dot.' },
    disc:    { bg: 'bg-amber-50 text-amber-700', text: 'Click once to mark where the disc is at the start of this play.' },
  }

  const discPlaced = positions.some(p => p.team === 'disc')

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '95vw', maxWidth: '1400px', height: '92vh' }}>

        {/* Header */}
        <div className="bg-brand-500 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            {step === 'name'    && <h2 className="font-bold text-lg">New Play — Name it</h2>}
            {step === 'offense' && <h2 className="font-bold text-lg">Place offensive players <span className="text-blue-200 font-normal text-sm">(blue)</span></h2>}
            {step === 'defense' && <h2 className="font-bold text-lg">Place defensive players <span className="text-red-200 font-normal text-sm">(red)</span></h2>}
            {step === 'disc'    && <h2 className="font-bold text-lg">Mark the disc position <span className="text-amber-200 font-normal text-sm">(optional)</span></h2>}
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full ${stepIndex >= i ? 'bg-white' : 'bg-blue-400'}`} />
            ))}
          </div>
        </div>

        {/* Name step */}
        {step === 'name' && (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500">Give this play a name, then click through to place players and the disc.</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Barnyard, Stack Reset, ISO…"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('offense')}
              autoFocus
            />
          </div>
        )}

        {/* Video overlay steps */}
        {(step === 'offense' || step === 'defense' || step === 'disc') && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Hint bar */}
            <div className={`px-4 py-2 text-sm shrink-0 ${hintBar[step].bg}`}>
              {hintBar[step].text}
            </div>

            {/* Video + overlay */}
            <div className="flex-1 relative bg-black min-h-0 overflow-hidden">
              {videoSrc ? (
                <>
                  {/* Hidden video — used only to capture a single frame */}
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="hidden"
                    muted
                    playsInline
                    preload="auto"
                    onLoadedMetadata={onVideoLoad}
                    onSeeked={captureFrame}
                  />
                  {/* Static frame screenshot */}
                  {frameUrl ? (
                    <img
                      src={frameUrl}
                      className="w-full h-full object-contain"
                      alt="Video frame"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      Loading frame…
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No video — positions will be placed on the play canvas instead.
                </div>
              )}

              {/* Click capture overlay */}
              <div
                ref={overlayRef}
                className="absolute inset-0 cursor-crosshair"
                onClick={handleOverlayClick}
              >
                {positions.map(pos => (
                  <div
                    key={pos.id}
                    style={{
                      position: 'absolute',
                      left:   `calc(${pos.x}% - ${DOT_SIZE / 2}px)`,
                      top:    `calc(${pos.y}% - ${DOT_SIZE / 2}px)`,
                      width:  DOT_SIZE,
                      height: DOT_SIZE,
                      backgroundColor: TEAM_COLOR[pos.team as keyof typeof TEAM_COLOR],
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
                    }}
                  >
                    {pos.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Counter bar */}
            <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-4 text-sm shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                Offense: <strong>{positions.filter(p => p.team === 'offense').length}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                Defense: <strong>{positions.filter(p => p.team === 'defense').length}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                Disc: <strong>{discPlaced ? 'placed' : 'none'}</strong>
              </span>
              <button onClick={removeLast} className="ml-auto text-gray-300 hover:text-white text-xs underline">
                {step === 'disc' ? 'Remove disc' : 'Remove last'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between shrink-0 bg-gray-50">
          <button
            onClick={() => {
              if (step === 'name')    onCancel()
              else if (step === 'offense') setStep('name')
              else if (step === 'defense') setStep('offense')
              else setStep('defense')
            }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            {step === 'name' ? 'Cancel' : '← Back'}
          </button>

          <div className="flex items-center gap-2">
            {step === 'name' && (
              <button
                onClick={() => setStep('offense')}
                disabled={!name.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium"
              >
                Next →
              </button>
            )}
            {step === 'offense' && (
              <button
                onClick={() => setStep('defense')}
                className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded text-sm font-medium"
              >
                Next: Defense →
              </button>
            )}
            {step === 'defense' && (
              <button
                onClick={() => setStep('disc')}
                className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded text-sm font-medium"
              >
                Next: Disc →
              </button>
            )}
            {step === 'disc' && (
              <>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  {discPlaced ? '' : 'Skip & '}Create Play →
                </button>
                {discPlaced && (
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded text-sm font-medium"
                  >
                    {saving ? 'Saving…' : 'Create Play →'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
