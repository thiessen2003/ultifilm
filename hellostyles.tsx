import './App.css'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil, faPenClip, faHighlighter, faT, faEraser } from '@fortawesome/free-solid-svg-icons'
import VideoAnnotator from './VideoAnnotator'
import PlayVisualizationPage from './PlayVisualizationPage'
import videoUrl from '/public/test.mp4'

export type Page = 'annotator' | 'visualization' | 'styles'

export function StylesPage() {
  return (
    <div className="main">
      <h1>Hello, world!</h1>
      <div className="styles-container">
        <div className="color-container">
          <h2>Color Palette</h2>
          <div className="colors">
            <div className="colorRow">
              <div className="lightestGray color"></div>
              <div className="lightGray color"></div>
              <div className="gray color"></div>
              <div className="darkGray color"></div>
              <div className="darkestGray color"></div>
            </div>
            <div className="colorRow">
              <div className="lightestBlue color"></div>
              <div className="lightBlue color"></div>
              <div className="blue color"></div>
              <div className="darkBlue color"></div>
              <div className="darkestBlue color"></div>
            </div>
            <div className="colorRow">
              <div className="lightestRed color"></div>
              <div className="lightRed color"></div>
              <div className="red color"></div>
              <div className="darkRed color"></div>
              <div className="darkestRed color"></div>
            </div>
            <div className="colorRow">
              <div className="lightestGreen color"></div>
              <div className="lightGreen color"></div>
              <div className="green color"></div>
              <div className="darkGreen color"></div>
              <div className="darkestGreen color"></div>
            </div>
            <div className="colorRow">
              <div className="lightestYellow color"></div>
              <div className="lightYellow color"></div>
              <div className="yellow color"></div>
              <div className="darkYellow color"></div>
              <div className="darkestYellow color"></div>
            </div>
          </div>
        </div>
        <div className="typography">
          <h2>Typography</h2>
          <p className="light">This is a sample paragraph using the primary font at a light font weight.</p>
          <p className="normal">This is a sample paragraph using the primary font at a normal font weight.</p>
          <p className="bold">This is a sample paragraph using the primary font at a bold font weight.</p>
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <h3>Heading 3</h3>
        </div>
        <div className="icons">
          <h2>Icons</h2>
          <p>HeroIcons</p>
          <div className="icon-list" id="hero-icons">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-12 -12 48 48" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-12 -12 48 48" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-12 -12 48 48" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-12 -12 48 48" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-12 -12 48 48" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125
                1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" />
            </svg>
          </div>
          <p>FontAwesome</p>
          <div className="icon-list" id="font-awesome">
            <FontAwesomeIcon icon={faPencil} />
            <FontAwesomeIcon icon={faPenClip} />
            <FontAwesomeIcon icon={faHighlighter} />
            <FontAwesomeIcon icon={faT} />
            <FontAwesomeIcon icon={faEraser} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('annotator')

  return (
    <div className="app-container">
      {currentPage === 'annotator' && (
        <VideoAnnotator 
          videoSrc={videoUrl}
          onNavigateVisualization={() => setCurrentPage('visualization')}
          onNavigateStyles={() => setCurrentPage('styles')}
        />
      )}
      {currentPage === 'visualization' && (
        <PlayVisualizationPage 
          onNavigateAnnotator={() => setCurrentPage('annotator')}
          onNavigateStyles={() => setCurrentPage('styles')}
        />
      )}
      {currentPage === 'styles' && (
        <div className="styles-page-wrapper">
          <button 
            className="styles-nav-button"
            onClick={() => setCurrentPage('annotator')}
          >
            ← Back to Annotator
          </button>
          <StylesPage />
        </div>
      )}
    </div>
  )
}

export default App