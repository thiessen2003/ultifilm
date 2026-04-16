import type { Play } from '../domain/entities/Play'
import InfoButton from './InfoButton'

interface Props {
  plays: Play[]
  activePlayId: string | null
  onSelect: (play: Play) => void
  onNewPlay: () => void
  onDelete: (playId: string) => void
  onEdit: (playId: string) => void
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function PlayListSidebar({ plays, activePlayId, onSelect, onNewPlay, onDelete, onEdit }: Props) {
  return (
    <div className="w-44 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-3 py-2 font-semibold text-sm border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>Plays</span>
          <InfoButton
            title="Plays"
            content="Plays are key moments you've marked in the game footage. Click any play to jump to that timestamp. Hover a play to reveal the delete (×) button."
          />
        </div>
        <span className="text-xs text-gray-400 font-normal">{plays.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {plays.length === 0 && (
          <p className="text-xs text-gray-400 p-3 leading-relaxed">
            No plays yet. Click "+ New Play" to create one.
          </p>
        )}
        {plays.map(play => (
          <button
            key={play.id}
            onClick={() => onSelect(play)}
            className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-blue-50 transition-colors group ${
              play.id === activePlayId ? 'bg-brand-50 border-l-4 border-l-brand-500' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{play.name}</div>
                <div className="text-xs text-gray-500">{fmt(play.start_time)}</div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <span
                  role="button"
                  onClick={e => { e.stopPropagation(); onEdit(play.id) }}
                  className="text-gray-400 hover:text-brand-500 cursor-pointer p-0.5"
                  title="Edit play"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </span>
                <span
                  role="button"
                  onClick={e => { e.stopPropagation(); onDelete(play.id) }}
                  className="text-gray-300 hover:text-red-500 text-base leading-none cursor-pointer p-0.5"
                  title="Delete play"
                >
                  ×
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={onNewPlay}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded transition-colors"
        >
          + New Play
        </button>
      </div>
    </div>
  )
}
