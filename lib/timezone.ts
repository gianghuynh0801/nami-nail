import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const DEFAULT_SALON_TIMEZONE = 'Asia/Ho_Chi_Minh'

export function getSalonTz(tz?: string | null) {
  return tz || DEFAULT_SALON_TIMEZONE
}

export function salonTodayISO(tz?: string | null) {
  return formatInTimeZone(new Date(), getSalonTz(tz), 'yyyy-MM-dd')
}

export function salonDateLabel(dateISO: string, tz?: string | null, pattern = 'EEEE, dd/MM/yyyy') {
  // Convert date-only ISO to a stable moment in salon timezone (midnight)
  const utcMidnight = fromZonedTime(`${dateISO}T00:00:00`, getSalonTz(tz))
  return formatInTimeZone(utcMidnight, getSalonTz(tz), pattern)
}

export function salonLocalToUtcISOString(dateISO: string, timeHHmm: string, tz?: string | null) {
  const utc = fromZonedTime(`${dateISO}T${timeHHmm}:00`, getSalonTz(tz))
  return utc.toISOString()
}

