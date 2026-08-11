import { IconContext } from '@phosphor-icons/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Icon defaults in one place. `currentColor` is the important one: it lets an
 * icon inherit its parent's colour, so a button's hover and disabled states
 * carry the icon with them instead of needing a rule per icon.
 *
 * Size stays per call site — icons here range from an 11px sort caret to an
 * 18px modal close, and a single default would be wrong more often than right.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IconContext.Provider value={{ color: 'currentColor', weight: 'bold' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
)
