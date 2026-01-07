export const CALENDAR_CONFIG = {
  SLOT_INTERVAL: 15, // minutes
  SLOT_HEIGHT: 20,   // pixels per 15 min
  HOUR_HEIGHT: 80,   // pixels per hour (4 slots × 20px)
  START_HOUR: 0,
  END_HOUR: 24,
  COLUMN_MIN_WIDTH: 180,
  COLUMN_MOBILE_WIDTH: 280,
  LONG_PRESS_DELAY: 300, // ms for mobile drag
} as const

export const HOURS = Array.from({ length: 24 }, (_, i) => i)

export const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4)
  const minute = (i % 4) * 15
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

export const STATUS_COLORS = {
  PENDING: {
    bg: 'bg-yellow-200',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
  },
  CONFIRMED: {
    bg: 'bg-blue-200',
    border: 'border-blue-400',
    text: 'text-blue-900',
  },
  CHECKED_IN: {
    bg: 'bg-green-200',
    border: 'border-green-400',
    text: 'text-green-900',
  },
  IN_PROGRESS: {
    bg: 'bg-purple-200',
    border: 'border-purple-400',
    text: 'text-purple-900',
  },
  COMPLETED: {
    bg: 'bg-gray-200',
    border: 'border-gray-400',
    text: 'text-gray-700',
  },
  CANCELLED: {
    bg: 'bg-gray-300',
    border: 'border-gray-400',
    text: 'text-gray-600',
  },
} as const

// Staff avatar colors (rotating)
export const STAFF_COLORS = [
  '#bca37f', '#9d8565', '#7d6a4f', '#d4c4a8',
  '#e8b4b8', '#c9a9a6', '#a67c52', '#8b7355',
]
