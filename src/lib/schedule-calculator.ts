import type { ScheduleType, ScheduleConfig } from '@/types/database'

/**
 * Calculates the next run time for a scheduled task.
 * All calculations respect the configured timezone.
 */
export function calculateNextRun(
  scheduleType: ScheduleType,
  config: ScheduleConfig,
  fromDate?: Date
): Date | null {
  const now = fromDate ?? new Date()

  switch (scheduleType) {
    case 'once': {
      if (!config.run_at) return null
      const runAt = new Date(config.run_at)
      return runAt > now ? runAt : null
    }

    case 'daily': {
      return getNextDailyRun(config.time || '09:00', config.timezone || 'Europe/Paris', now)
    }

    case 'weekly': {
      return getNextWeeklyRun(
        config.day ?? 1,
        config.time || '09:00',
        config.timezone || 'Europe/Paris',
        now
      )
    }

    case 'monthly': {
      return getNextMonthlyRun(
        config.day_of_month ?? 1,
        config.time || '09:00',
        config.timezone || 'Europe/Paris',
        now
      )
    }

    case 'cron': {
      if (!config.expression) return null
      return getNextCronRun(config.expression, config.timezone || 'Europe/Paris', now)
    }

    default:
      return null
  }
}

/**
 * Converts a time string (HH:MM) and timezone to the next occurrence as a UTC Date.
 */
function getNextDailyRun(time: string, timezone: string, now: Date): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const candidate = getDateInTimezone(now, timezone, hours, minutes)
  if (candidate > now) return candidate
  // Next day
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getDateInTimezone(tomorrow, timezone, hours, minutes)
}

function getNextWeeklyRun(dayOfWeek: number, time: string, timezone: string, now: Date): Date {
  const [hours, minutes] = time.split(':').map(Number)

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + offset)
    const candidateInTz = getDateInTimezone(candidate, timezone, hours, minutes)
    if (candidateInTz > now && candidateInTz.getDay() === dayOfWeek) {
      // Verify day in the target timezone
      const tzDay = getDayInTimezone(candidateInTz, timezone)
      if (tzDay === dayOfWeek) return candidateInTz
    }
  }

  // Fallback: next week
  const next = new Date(now)
  next.setDate(next.getDate() + ((dayOfWeek - next.getDay() + 7) % 7 || 7))
  return getDateInTimezone(next, timezone, hours, minutes)
}

function getNextMonthlyRun(dayOfMonth: number, time: string, timezone: string, now: Date): Date {
  const [hours, minutes] = time.split(':').map(Number)

  // Try this month
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  const candidate = getDateInTimezone(thisMonth, timezone, hours, minutes)
  if (candidate > now) return candidate

  // Next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth)
  return getDateInTimezone(nextMonth, timezone, hours, minutes)
}

/**
 * Minimal cron parser for 5-field cron expressions.
 * Supports: minute hour dayOfMonth month dayOfWeek
 * Supports ranges (1-5), lists (1,3,5), and wildcards (*)
 */
function getNextCronRun(expression: string, timezone: string, now: Date): Date {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return new Date(now.getTime() + 3600000) // fallback: 1 hour

  const [minuteSpec, hourSpec, domSpec, monthSpec, dowSpec] = parts

  // Check every minute for the next 7 days (10080 minutes)
  const candidate = new Date(now)
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1) // Start from next minute

  for (let i = 0; i < 10080; i++) {
    const tz = getTimeComponentsInTimezone(candidate, timezone)

    if (
      matchesCronField(minuteSpec, tz.minute) &&
      matchesCronField(hourSpec, tz.hour) &&
      matchesCronField(domSpec, tz.day) &&
      matchesCronField(monthSpec, tz.month) &&
      matchesCronField(dowSpec, tz.dayOfWeek)
    ) {
      return candidate
    }

    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  // Fallback: 1 hour from now
  return new Date(now.getTime() + 3600000)
}

function matchesCronField(spec: string, value: number): boolean {
  if (spec === '*') return true

  // Handle step values: */5
  if (spec.startsWith('*/')) {
    const step = parseInt(spec.slice(2))
    return value % step === 0
  }

  // Handle lists: 1,3,5
  const parts = spec.split(',')
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (value >= start && value <= end) return true
    } else {
      if (parseInt(part) === value) return true
    }
  }

  return false
}

/**
 * Creates a Date object in UTC that corresponds to the given time in the specified timezone.
 */
function getDateInTimezone(baseDate: Date, timezone: string, hours: number, minutes: number): Date {
  // Format the base date in the target timezone to get the date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = formatter.format(baseDate) // YYYY-MM-DD

  // Create a date string in the target timezone and parse it
  const isoString = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

  // Get the UTC offset for this specific time in the timezone
  const tempDate = new Date(isoString + 'Z')
  const utcStr = tempDate.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = tempDate.toLocaleString('en-US', { timeZone: timezone })
  const utcDate = new Date(utcStr)
  const tzDate = new Date(tzStr)
  const offsetMs = utcDate.getTime() - tzDate.getTime()

  return new Date(tempDate.getTime() + offsetMs)
}

function getDayInTimezone(date: Date, timezone: string): number {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date)
    .replace('Sun', '0').replace('Mon', '1').replace('Tue', '2').replace('Wed', '3')
    .replace('Thu', '4').replace('Fri', '5').replace('Sat', '6'))
}

function getTimeComponentsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => {
    const p = parts.find(p => p.type === type)
    return p ? parseInt(p.value) : 0
  }

  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon'
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

  return {
    minute: get('minute'),
    hour: get('hour'),
    day: get('day'),
    month: get('month'),
    dayOfWeek: dowMap[weekdayStr] ?? 1,
  }
}
