import { useParams } from 'react-router-dom'
import { isLevel } from '../lib/levels'
import type { Level } from '../types'

export function useLevel(): Level | null {
  const { level } = useParams()
  return isLevel(level) ? level : null
}
