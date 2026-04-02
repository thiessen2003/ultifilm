import type { Play } from '../domain/entities/Play'

interface Props {
  plays: Play[]
  activePlayId: string | null
  onSelect: (play: Play) => void
  onNewPlay: () => void
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function PlayListSidebar({ plays, activePlayId, onSelect, onNewPlay }: Props) {
  return (
    <div className="w-44 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-3 py-2 font-semibold text-sm border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span>Plays</span>
        <span className="text-xs text-gray-400 font-normal">{plays.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {plays.length === 0 && (
          <p className="text-xs text-gray-400 p-3 leading-relaxed">
            No plays yet. Click "New Play" to create one.
          </p>
        )}
        {plays.map(play => (
          <button
            key={play.id}
            onClick={() => onSelect(play)}
            className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
              play.id === activePlayId ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="text-sm font-medium truncate">{play.name}</div>
            <div className="text-xs text-gray-500">{fmt(play.start_time)}</div>
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={onNewPlay}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded transition-colors"
        >
          + New Play
        </button>
      </div>
    </div>
  )
}
