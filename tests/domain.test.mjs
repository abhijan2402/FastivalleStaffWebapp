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
