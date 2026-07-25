import { useContext } from 'react'
import { FplContext } from '../context/FplContext'

/** Access the cached bootstrap-static / fixtures data. */
export function useFpl() {
  const value = useContext(FplContext)
  if (!value) throw new Error('useFpl must be used inside <FplProvider>')
  return value
}
