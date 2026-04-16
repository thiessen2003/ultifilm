import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import VideoPlayer from '../components/VideoPlayer'
import PlayListSidebar from '../components/PlayListSidebar'
import NewPlayWizard from '../components/NewPlayWizard'
import InfoButton from '../components/InfoButton'
import { useGame } from '../hooks/useGames'
import { usePlays } from '../hooks/usePlays'
import { useAnnotations } from '../hooks/useAnnotations'
import type { Play } from '../domain/entities/Play'
import type { PlayerPosition } from '../domain/entities/PlayerPosition'

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()

  const { game, setGame, gameService } = useGame(gameId!)
  const { plays, reload: reloadPlays, playService } = usePlays(gameId!)
  const { annotations, setAnnotations, annotationService } = useAnnotations(gameId!)

  const [currentTime, setCurrentTime] = useState(0)
  const [activePlay, setActivePlay] = useState<Play | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined)
  const [uploading, setUploading] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  // Inline play notes editing
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState('')

  const startEditingNotes = (play: Play) => {
    setNotesText(play.notes)
    setEditingNotes(true)
  }

  const saveNotes = async () => {
    if (!activePlay) return
    const updated = await playService.updatePlay(activePlay.id, { notes: notesText })
    setActivePlay(updated)
    setEditingNotes(false)
  }

  const createdPlayRef = useRef<Play | null>(null)

  // Annotate modal state
  const [showAnnotateModal, setShowAnnotateModal] = useState(false)
  const [annotateText, setAnnotateText] = useState('')
  const annotateTimestamp = useRef(0)

  const videoUrl = game ? gameService.getVideoUrl(game) : null

  // ── Annotate ────────────────────────────────────────────────────────────────
  const openAnnotateModal = () => {
    annotateTimestamp.current = currentTime
    setAnnotateText('')
    setShowAnnotateModal(true)
  }

  const saveAnnotation = async () => {
    if (!annotateText.trim() || !gameId) return
    const ann = await annotationService.createAnnotation({
      game_id: gameId,
      timestamp: annotateTimestamp.current,
      text: annotateText.trim(),
    })
    setAnnotations(prev => [...prev, ann].sort((a, b) => a.timestamp - b.timestamp))
    setShowAnnotateModal(false)
  }

  const deleteAnnotation = async (id: string) => {
    await annotationService.deleteAnnotation(id)
    setAnnotations(prev => prev.filter(a => a.id !== id))
  }

  // ── Play wizard ─────────────────────────────────────────────────────────────
  const handleCreatePlay = async (
    name: string,
    positions: Omit<PlayerPosition, 'id' | 'play_id'>[],
  ): Promise<string> => {
    const play = await playService.createPlay({
      game_id: gameId!,
      name,
      start_time: currentTime,
      end_time: null,
      notes: '',
    })
    await playService.savePositions(play.id, positions.map(p => ({ ...p, play_id: play.id })))
    createdPlayRef.current = play
    await reloadPlays()
    return play.id
  }

  const deletePlay = async (playId: string) => {
    if (!confirm('Delete this play?')) return
    await playService.deletePlay(playId)
    if (activePlay?.id === playId) setActivePlay(null)
    await reloadPlays()
  }

  // ── Play select ─────────────────────────────────────────────────────────────
  const handlePlaySelect = (play: Play) => {
    setActivePlay(play)
    setSeekTo(play.start_time)
    setTimeout(() => setSeekTo(undefined), 300)
  }

  // ── Video upload ─────────────────────────────────────────────────────────────
  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !gameId) return
    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be under 50 MB.')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const updated = await gameService.uploadVideo(gameId, file)
      setGame(updated)
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  if (!game) {
    return (
      <div className="h-screen flex flex-col bg-gray-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <PlayListSidebar
          plays={plays}
          activePlayId={activePlay?.id ?? null}
          onSelect={handlePlaySelect}
          onNewPlay={() => setShowWizard(true)}
          onDelete={deletePlay}
          onEdit={playId => navigate(`/games/${gameId}/plays/${playId}`)}
        />

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
            <h1 className="font-semibold text-gray-800">{game.title}</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-600">Annotations:</span>
                <button
                  onClick={() => setShowAnnotations(v => !v)}
                  className={`w-11 h-6 rounded-full px-0.5 flex items-center transition-colors duration-200 ${showAnnotations ? 'bg-red-500' : 'bg-gray-300'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${showAnnotations ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <InfoButton
                  title="Annotations toggle"
                  content="Toggle the annotations overlay on or off. When on, yellow dots appear on the video scrubber at each annotated timestamp, and the annotation list is shown below the video."
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openAnnotateModal}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                >
                  Annotate
                </button>
                <InfoButton
                  title="Annotate"
                  content="Pause the video at any moment and click Annotate to save a timestamped comment. The comment is linked to that exact point in the video — click the timestamp badge later to jump back to it."
                />
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="bg-black shrink-0">
            <VideoPlayer
              src={videoUrl}
              onTimeUpdate={setCurrentTime}
              seekTo={seekTo}
              markers={annotations.map(a => ({ timestamp: a.timestamp, label: a.text }))}
              showMarkers={showAnnotations}
              onMarkerClick={t => { setSeekTo(t); setTimeout(() => setSeekTo(undefined), 300) }}
            />
          </div>

          {/* Upload prompt */}
          {!game.video_path && (
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
              <span className="text-sm text-gray-600">Upload match footage:</span>
              <label className="cursor-pointer bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
                {uploading ? 'Uploading…' : 'Choose Video'}
                <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploading} />
              </label>
            </div>
          )}

          {/* Active play panel */}
          {activePlay && (
            <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
              {/* Play name + action buttons */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-gray-800">{activePlay.name}</span>
                <div className="flex items-center gap-1.5">
                  {/* Edit notes */}
                  <button
                    onClick={() => editingNotes ? setEditingNotes(false) : startEditingNotes(activePlay)}
                    title="Edit notes"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-500 border border-gray-200 hover:border-brand-300 px-2 py-1 rounded transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Notes
                  </button>
                  {/* Edit play — opens Draw tab */}
                  <button
                    onClick={() => navigate(`/games/${gameId}/plays/${activePlay.id}`)}
                    title="Edit play diagram"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-500 border border-gray-200 hover:border-brand-300 px-2 py-1 rounded transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Draw
                  </button>
                </div>
              </div>

              {/* Notes section */}
              {editingNotes ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
                    rows={3}
                    autoFocus
                    placeholder="Add notes about this play…"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingNotes(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                    <button onClick={saveNotes} className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 rounded font-medium">Save</button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm text-gray-600 cursor-text hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  onClick={() => startEditingNotes(activePlay)}
                  title="Click to edit notes"
                >
                  {activePlay.notes || <span className="italic text-gray-400">No notes — click to add</span>}
                </p>
              )}
            </div>
          )}

          {/* Annotations list */}
          <div className="flex-1 overflow-y-auto bg-white min-h-[140px]">
            {showAnnotations && (
              <>
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Annotations {annotations.length > 0 && `(${annotations.length})`}
                  </span>
                  <InfoButton
                    title="Annotations list"
                    content="Each row is a comment tied to a specific moment in the video. Click the blue timestamp badge to jump the video to that moment. Hover over a row to reveal the × delete button."
                  />
                </div>
                {annotations.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 py-4">
                    No annotations yet — click <strong>Annotate</strong> while watching to add a comment at the current timestamp.
                  </p>
                ) : (
                  annotations.map(ann => (
                    <div key={ann.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 group">
                      <button
                        onClick={() => { setSeekTo(ann.timestamp); setTimeout(() => setSeekTo(undefined), 300) }}
                        className="shrink-0 bg-brand-50 text-brand-600 text-xs font-mono px-2 py-0.5 rounded hover:bg-blue-200 transition-colors mt-0.5"
                      >
                        {fmt(ann.timestamp)}
                      </button>
                      <p className="text-sm text-gray-700 flex-1 leading-relaxed">{ann.text}</p>
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none shrink-0"
                        title="Delete annotation"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Annotate modal */}
      {showAnnotateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-brand-50 text-brand-600 text-xs font-mono px-2 py-1 rounded">
                {fmt(annotateTimestamp.current)}
              </span>
              <h2 className="text-lg font-bold">Add annotation</h2>
            </div>
            <textarea
              value={annotateText}
              onChange={e => setAnnotateText(e.target.value)}
              placeholder="What's happening at this moment?"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveAnnotation() }}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAnnotateModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button
                onClick={saveAnnotation}
                disabled={!annotateText.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Play wizard */}
      {showWizard && (
        <NewPlayWizard
          videoSrc={videoUrl}
          currentTime={currentTime}
          onCreate={handleCreatePlay}
          onCreated={playId => {
            setShowWizard(false)
            createdPlayRef.current = null
            navigate(`/games/${gameId}/plays/${playId}`)
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}

    </div>
  )
}
