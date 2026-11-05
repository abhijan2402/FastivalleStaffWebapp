import test from 'node:test'
import assert from 'node:assert/strict'
import { seed, serve, createFamily, changeCard, currentDay, checkFamilyCard, recipients } from '../src/domain.mjs'
const request = { code: 'FV-1024:1', unitId: 'FU-008', memberIds: [0], role: 'agent' }
test('processing records selected people and prevents overlapping entries per event', () => {
  const state = seed()
  const result = serve(state, { ...request, memberIds: [0, 2] })
  assert.equal(result.ok, true)
  assert.deepEqual(result.entry.recipients, ['Rahima Begum', 'Rafi'])
  assert.equal(state.total, 1250)
  assert.equal(state.units[0].served, 126)
  assert.equal(state.milestones[0].count, 1250)
  assert.equal(serve(state, { ...request, memberIds: [2, 3] }).message, 'Already processed')
  assert.equal(state.total, 1250)
  assert.equal(serve(state, { ...request, memberIds: [3] }).ok, true)
  assert.equal(serve(state, { ...request, unitId: 'FU-009', memberIds: [0, 2] }).ok, true)
})
test('checking a card works before choosing an event and never changes state', () => {
  const state = seed(), before = structuredClone(state)
  state.units = []
  assert.equal(checkFamilyCard(state, request.code).ok, true)
  state.units = before.units
  assert.deepEqual(state, before)
})
test('inactive and replaced QR codes are rejected again at processing', () => {
  const state = seed()
  assert.equal(serve(state, { ...request, code: 'FV-1027:1' }).ok, false)
  changeCard(state.families[0], 'regenerate')
  assert.equal(serve(state, request).ok, false)
  assert.equal(serve(state, { ...request, code: 'FV-1024:2' }).ok, true)
  changeCard(state.families[0], 'deactivate')
  assert.equal(serve(state, { ...request, code: 'FV-1024:2', unitId: 'FU-009' }).ok, false)
})
test('requires valid recipients without mutating counters on rejected requests', () => {
  for (const memberIds of [undefined, [], [-1], [99], [0, 0], ['0']]) {
    const state = seed(), before = structuredClone(state)
    assert.equal(serve(state, { ...request, memberIds }).ok, false)
    assert.deepEqual(state, before)
  }
})
test('family completion validates members and self is always a recipient', () => {
  const state = seed()
  assert.throws(() => createFamily(state, { name: 'A', members: [], area: 'Korail' }))
  const family = createFamily(state, { name: 'Test Family', members: ['Child'], area: 'Korail', full: false })
  assert.deepEqual(recipients(family), ['Test Family', 'Child'])
  assert.equal(family.card, null)
  changeCard(family, 'complete')
  assert.equal(family.card, 'active')
  assert.equal(family.version, 1)
})
test('offline entries persist recipients, reject other dates and require capacity for everyone', () => {
  const state = seed()
  const result = serve(state, { ...request, online: false })
  assert.equal(result.entry.pending, true)
  assert.deepEqual(result.entry.memberIds, [0])
  assert.deepEqual(state.queue, [result.entry.id])
  assert.equal(serve(state, { ...request, unitId: 'FU-010' }).ok, false)
  state.units[1].date = '2099-01-01'
  assert.equal(serve(state, { ...request, unitId: 'FU-009' }).ok, false)
  state.units[0].served = state.units[0].packs - 1
  assert.equal(serve(state, { ...request, memberIds: [1, 2] }).ok, false)
  assert.equal(state.units[0].served, state.units[0].packs - 1)
})
test('India calendar date changes at midnight and legacy family entries block duplicates', () => {
  assert.equal(currentDay(new Date('2026-11-03T18:29:59Z')), '2026-11-03')
  assert.equal(currentDay(new Date('2026-11-03T18:30:00Z')), '2026-11-04')
  const state = seed()
  state.servings.push({ family: 'FV-1024', unit: 'FU-008' })
  assert.equal(serve(state, request).message, 'Already processed')
})

test('member relations and optional contacts persist and remain compatible with processing', () => {
  const state = seed()
  const family = createFamily(state, { name: 'Receiver', mobile: ' 1234567890 ', email: ' receiver@example.com ', members: [{ name: 'Receiver', relation: 'Self' }, { name: 'Child', relation: 'Daughter' }], full: true })
  assert.equal(family.mobile, '1234567890')
  assert.equal(family.email, 'receiver@example.com')
  assert.equal(family.members[1].relation, 'Daughter')
  assert.deepEqual(recipients(family), ['Receiver', 'Child'])
  assert.equal(serve(state, { ...request, code: `${family.id}:1`, memberIds: [1] }).ok, true)
  assert.throws(() => createFamily(state, { name: 'Other', members: [{ name: 'Child', relation: ' ' }] }))
  assert.equal(Object.hasOwn(family, 'area'), false)
})

const { eventDateTime, eventTimeParts } = await import('../src/lib/eventTime.mjs')
test('event wall times use the selected timezone and date-specific offset', () => {
  assert.equal(eventDateTime('2026-11-06', '14:30', 'Asia/Kolkata'), '2026-11-06T14:30:00+05:30')
  assert.equal(eventDateTime('2026-11-06', '14:30', 'Asia/Kathmandu'), '2026-11-06T14:30:00+05:45')
  assert.equal(eventDateTime('2026-07-06', '14:30', 'America/New_York'), '2026-07-06T14:30:00-04:00')
  assert.equal(eventDateTime('2026-11-06', '14:30', 'America/New_York'), '2026-11-06T14:30:00-05:00')
  assert.equal(eventDateTime('2026-11-06', '00:00', 'UTC'), '2026-11-06T00:00:00+00:00')
  assert.deepEqual(eventTimeParts('2026-11-06T01:30:00+05:30', 'America/Los_Angeles'), { date: '2026-11-05', time: '12:00' })
})
test('event wall times reject daylight-saving gaps and ambiguous clock changes', () => {
  assert.throws(() => eventDateTime('2026-03-08', '02:30', 'America/New_York'), /does not exist/)
  assert.throws(() => eventDateTime('2026-11-01', '01:30', 'America/New_York'), /occurs twice/)
})

const { receiverIdFromQr, mapEligibility } = await import('../src/lib/serving.mjs')
test('live QR parsing extracts receiver IDs without trusting local demo cards', () => {
  assert.equal(receiverIdFromQr('receiver-1'), 'receiver-1')
  assert.equal(receiverIdFromQr('receiver-1:2'), 'receiver-1')
  assert.equal(receiverIdFromQr('{"receiverId":"receiver-1"}'), 'receiver-1')
  assert.throws(() => receiverIdFromQr('https://untrusted.example/receivers/receiver-1'), /valid receiver ID/)
  assert.throws(() => receiverIdFromQr('{"receiverId":"../../admin"}'), /valid receiver ID/)
  assert.throws(() => receiverIdFromQr('{broken'), /valid receiver ID/)
})
test('eligibility maps self and stable member IDs and respects server restrictions', () => {
  const family = mapEligibility({ receiver: { id: 'receiver-1', name: 'Receiver' }, self: { id: 'receiver-1', name: 'Receiver', eligible: false }, members: [{ id: 'member-1', name: 'Child', eligible: true }, { personId: 'member-2', name: 'Sibling', alreadyAssigned: true }] }, 'receiver-1')
  assert.deepEqual(family.members.map(member => [member.id, member.eligible]), [['SELF', false], ['member-1', true], ['member-2', false]])
  assert.throws(() => mapEligibility({ members: [{ name: 'No ID' }] }, 'receiver-1'), /person IDs/)
  assert.throws(() => mapEligibility({ members: [{ id: 'member-1', eligible: 'false' }] }, 'receiver-1'), /invalid eligibility flags/)
  assert.throws(() => mapEligibility({ members: [{ id: 'member-1' }, { id: 'member-1' }] }, 'receiver-1'), /duplicate/)
  assert.throws(() => mapEligibility({ receiver: { id: 'receiver-2' }, members: [] }, 'receiver-1'), /another receiver/)
  assert.throws(() => mapEligibility({}, 'receiver-1'), /unsupported format/)
  assert.equal(mapEligibility({ eligibleMembers: [] }, 'receiver-1').members.length, 0)
})
