export function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function timeZoneOptions(local = localTimeZone()) {
  return [...new Set([local, 'UTC', ...(Intl.supportedValuesOf?.('timeZone') || [])])].sort()
}

export function eventTimeParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const part = type => parts.find(item => item.type === type).value
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

// Resolve the wall-clock time using offsets near the requested date, including
// both sides of daylight-saving transitions. Never silently shift a missing time.
export function eventDateTime(date, time, timeZone) {
  const wallTime = Date.parse(`${date}T${time}:00Z`)
  if (!Number.isFinite(wallTime)) throw Error('Enter a valid distribution date and time.')
  const offsets = new Set()
  for (let hours = -36; hours <= 36; hours += 12) {
    const sample = wallTime + hours * 3600000
    const local = eventTimeParts(sample, timeZone)
    offsets.add(Date.parse(`${local.date}T${local.time}:00Z`) - sample)
  }
  const matches = [...offsets].map(offset => ({ offset, instant: wallTime - offset }))
    .filter(({ instant }) => {
      const local = eventTimeParts(instant, timeZone)
      return local.date === date && local.time === time
    }).sort((a, b) => a.instant - b.instant)
  if (!matches.length) throw Error('This time does not exist in the selected timezone because the clocks change. Choose another distribution time.')
  if (matches.length > 1) throw Error('This time occurs twice in the selected timezone because the clocks change. Choose an unambiguous distribution time.')
  const minutes = Math.round(matches[0].offset / 60000)
  const pad = value => String(value).padStart(2, '0')
  return `${date}T${time}:00${minutes >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`
}
