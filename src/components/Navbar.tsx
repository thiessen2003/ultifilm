import { useNavigate } from 'react-router-dom'

export default function Navbar({ title = 'Ultifilm' }: { title?: string }) {
  const navigate = useNavigate()

  return (
    <nav className="bg-blue-600 text-white flex items-center px-4 h-12 shrink-0 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute left-4 p-1 rounded hover:bg-blue-700 transition-colors"
        aria-label="Home"
      >
        {/* house icon */}
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </button>
      <span className="mx-auto text-xl font-semibold tracking-wide">{title}</span>
    </nav>
  )
}
