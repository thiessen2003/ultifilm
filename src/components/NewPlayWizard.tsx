import { useState, useRef } from 'react'
import type { PlayerPosition, Team } from '../domain/entities/PlayerPosition'

type Step = 'name' | 'offense' | 'defense'

interface Props {
  videoSrc: string | null
  currentTime: number
  onCreated: (playId: string) => void
  onCancel: () => void
  onCreate: (name: string, positions: Omit<PlayerPosition, 'id' | 'play_id'>[]) => Promise<string>
}

const TEAM_COLOR: Record<'offense' | 'defense', string> = {
  offense: '#3B82F6',
  defense: '#EF4444',
}

const DOT_SIZE = 28  // px

export default function NewPlayWizard({ videoSrc, currentTime, onCreated, onCancel, onCreate }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [positions, setPositions] = useState<Array<{ id: string; team: Team; x: number; y: number; label: string }>>([])
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Seek the video thumbnail to currentTime when it loads
  const onVideoLoad = () => {
    if (videoRef.current) videoRef.current.currentTime = currentTime
  }

  const currentTeam: 'offense' | 'defense' = step === 'offense' ? 'offense' : 'defense'

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'offense' && step !== 'defense') return
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    const count = positions.filter(p => p.team === currentTeam).length
    setPositions(prev => [...prev, {
      id: `tmp-${Date.now()}-${Math.random()}`,
      team: currentTeam,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      label: `${currentTeam === 'offense' ? 'O' : 'D'}${count + 1}`,
    }])
  }

  const removeLast = () => {
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '95vw', maxWidth: '1400px', height: '92vh' }}>

        {/* Header */}
        <div className="bg-brand-500 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            {step === 'name' && <h2 className="font-bold text-lg">New Play — Name it</h2>}
            {step === 'offense' && <h2 className="font-bold text-lg">Click on offensive players <span className="text-blue-200 font-normal text-sm">(blue)</span></h2>}
            {step === 'defense' && <h2 className="font-bold text-lg">Click on defensive players <span className="text-blue-200 font-normal text-sm">(red)</span></h2>}
          </div>
          <div className="flex gap-1.5">
            {(['name','offense','defense'] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full ${['name','offense','defense'].indexOf(step) >= i ? 'bg-white' : 'bg-blue-400'}`} />
            ))}
          </div>
        </div>

        {/* Name step */}
        {step === 'name' && (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500">Give this play a name first, then you'll click on players in the video.</p>
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
        {(step === 'offense' || step === 'defense') && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Hint bar */}
            <div className={`px-4 py-2 text-sm shrink-0 ${step === 'offense' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
              {step === 'offense'
                ? 'Click each offensive player in the video to place a blue dot. Click "Remove last" to undo.'
                : 'Now click each defensive player to place a red dot. Offense dots are locked.'}
            </div>

            {/* Video + overlay */}
            <div className="flex-1 relative bg-black min-h-0 overflow-hidden">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                  onLoadedMetadata={onVideoLoad}
                />
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
                {/* Render placed dots */}
                {positions.map(pos => (
                  <div
                    key={pos.id}
                    style={{
                      position: 'absolute',
                      left:   `calc(${pos.x}% - ${DOT_SIZE / 2}px)`,
                      top:    `calc(${pos.y}% - ${DOT_SIZE / 2}px)`,
                      width:  DOT_SIZE,
                      height: DOT_SIZE,
                      backgroundColor: TEAM_COLOR[pos.team as 'offense' | 'defense'],
                      borderRadius: '50%',
                      border: '2px solid white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 10,
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
              <button onClick={removeLast} className="ml-auto text-gray-300 hover:text-white text-xs underline">
                Remove last
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between shrink-0 bg-gray-50">
          <button
            onClick={() => {
              if (step === 'name') onCancel()
              else if (step === 'offense') setStep('name')
              else setStep('offense')
            }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            {step === 'name' ? 'Cancel' : '← Back'}
          </button>

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
              Next: Add Defense →
            </button>
          )}
          {step === 'defense' && (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded text-sm font-medium"
            >
              {saving ? 'Saving…' : 'Create Play →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
