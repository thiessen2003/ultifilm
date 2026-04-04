import { useState } from 'react'

interface Props {
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function InfoButton({ title, content, position = 'bottom' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className="w-5 h-5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs font-bold leading-none flex items-center justify-center transition-colors shrink-0"
        aria-label={`Info: ${title}`}
        title="Learn more"
      >
        i
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>

            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <span className="text-blue-600 font-bold text-lg">i</span>
            </div>

            <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{content}</p>

            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
