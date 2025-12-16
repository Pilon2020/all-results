import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats race distance strings for display.
 * Converts "Half Distance (70.3)" to "70.3"
 */
export function formatDistance(distance: string): string {
  if (!distance) return distance
  
  // Match "Half Distance (70.3)" or similar patterns
  const match = distance.match(/\((\d+\.\d+)\)/)
  if (match) {
    return match[1]
  }
  
  return distance
}
