export function receiverIdFromQr(text) {
  let value = String(text).trim()
  if (value.startsWith('{')) {
    try {
      const data = JSON.parse(value)
      value = data.receiverId ?? data.receiver?.id ?? data.id
    } catch { throw Error('This QR code does not contain a valid receiver ID.') }
  }
  // Cards previously printed by this app contain receiverId:version.
  if (typeof value === 'string') value = value.replace(/:\d+$/, '')
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw Error('This QR code does not contain a valid receiver ID. Scan a family QR code.')
  return value
}

export function mapEligibility(payload, receiverId) {
  const receiver = payload?.receiver
  if (receiver?.id && receiver.id !== receiverId) throw Error('The eligibility response belongs to another receiver. Scan the family again.')
  const list = Array.isArray(payload) ? payload : payload?.eligibleMembers ?? payload?.members ?? payload?.familyMembers ?? payload?.persons ?? payload?.people
  if (!Array.isArray(list)) throw Error('The eligibility response has an unsupported format. Refresh eligibility or contact support.')
  const entries = payload?.self ? [{ ...payload.self, isSelf: true }, ...list] : list
  const seen = new Set()
  const members = entries.map(person => {
    if (!person || typeof person !== 'object') throw Error('The eligibility response contains an invalid member.')
    for (const key of ['eligible', 'isEligible', 'canReceive', 'isSelf', 'alreadyAssigned', 'isAssigned', 'alreadyServed']) {
      if (person[key] !== undefined && typeof person[key] !== 'boolean') throw Error('The eligibility response contains invalid eligibility flags.')
    }
    const isSelf = person.isSelf === true || person.relationship === 'SELF' || person.personId === 'SELF' || person.id === 'SELF'
    const id = isSelf ? 'SELF' : person.personId ?? person.id
    if (typeof id !== 'string' || !id || seen.has(id)) throw Error('The eligibility response contains missing or duplicate person IDs.')
    seen.add(id)
    const eligible = person.eligible !== false && person.isEligible !== false && person.canReceive !== false && person.alreadyAssigned !== true && person.isAssigned !== true && person.alreadyServed !== true && !['INELIGIBLE', 'ASSIGNED', 'SERVED'].includes(person.status)
    return { id, name: person.name || (isSelf ? receiver?.name || 'Self' : id), relation: isSelf ? 'Self' : person.relationship || person.relation || 'Family member', eligible, reason: person.reason || person.ineligibleReason || 'Already assigned or unavailable for this event' }
  })
  return { receiverId, name: receiver?.name || payload?.receiverName || receiverId, members }
}

export function canServeEvent(event) {
  return event && event.isActive !== false && !['COMPLETED', 'CANCELLED'].includes(event.status) && event.served < event.packs
}
