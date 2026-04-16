import { useNavigate } from 'react-router-dom'

export default function Navbar({ title = 'Ultifilm' }: { title?: string }) {
  const navigate = useNavigate()

  return (
    <nav className="bg-brand-500 text-white flex items-center px-4 h-12 shrink-0 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute left-4 p-1 rounded hover:bg-brand-600 transition-colors"
        aria-label="Home"
      >
        {/* house icon */}
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </button>
      <button
        onClick={() => navigate('/')}
        className="mx-auto text-xl font-semibold tracking-wide hover:text-brand-100 transition-colors"
      >
        {title}
      </button>
    </nav>
  )
}
