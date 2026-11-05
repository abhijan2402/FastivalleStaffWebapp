import { test, expect } from '@playwright/test'
import qrcode from 'qrcode-generator'
test.skip(process.env.VITE_DEMO_MODE === 'true', 'Serving API tests use the live build.')

async function mockServing(page, options = {}) {
  const control = { requests: [], assigned: new Set(), assignStatus: 204, eligibilityStatus: 200, eventCount: 2, ...options }
  await page.route('https://api.fastivalle.org/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    control.requests.push({ path, query: Object.fromEntries(url.searchParams), method: request.method(), token: request.headers().authorization, body: request.postDataJSON() })
    if (path.endsWith('/login')) return route.fulfill({ json: { data: { accessToken: 'serving-token' } } })
    if (path.endsWith('/profile')) return route.fulfill({ json: { data: { name: 'Serving Staff' } } })
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 })
    if (path.endsWith('/eligible-members')) {
      if (control.eligibilityGate) await control.eligibilityGate
      if (control.eligibilityStatus !== 200) return route.fulfill({ status: control.eligibilityStatus, json: { message: 'Eligibility is unavailable' } })
      const eventId = path.split('/')[4], receiverId = path.split('/')[6]
      if (control.malformed) return route.fulfill({ json: { data: { unknown: [] } } })
      return route.fulfill({ json: { data: { receiver: { id: receiverId, name: `Family ${receiverId}` }, members: [
        { personId: 'SELF', name: 'Receiver Self', eligible: !control.assigned.has(`${eventId}:SELF`), isSelf: true },
        { personId: 'member-child', name: 'Child Member', relationship: 'DAUGHTER', eligible: !control.assigned.has(`${eventId}:member-child`) },
        { personId: 'member-served', name: 'Already Served', eligible: false, reason: 'Already assigned to this event' },
      ] } } })
    }
    if (path.endsWith('/assign')) {
      if (control.assignmentGate) await control.assignmentGate
      const body = request.postDataJSON(), eventId = path.split('/')[4]
      if (control.assignStatus === 204 || control.saveBeforeFailure) body.personIds.forEach(id => control.assigned.add(`${eventId}:${id}`))
      return control.assignStatus === 204 ? route.fulfill({ status: 204 }) : route.fulfill({ status: control.assignStatus, json: { message: 'Assignment service failed' } })
    }
    if (path.endsWith('/food-events')) {
      if (control.eventsStatus) return route.fulfill({ status: control.eventsStatus, json: { message: 'Serving is not permitted' } })
      const events = Array.from({ length: control.eventCount }, (_, index) => ({ id: `event-${index + 1}`, name: `Lunch ${index + 1}`, dateTime: '2026-11-06T12:00:00+05:30', foodItems: ['Rice'], totalPacks: 30, servedPacks: [...control.assigned].filter(id => id.startsWith(`event-${index + 1}:`)).length, isActive: true, budget: '1000' }))
      const offset = Number(url.searchParams.get('offset'))
      return route.fulfill({ json: { data: { foodEvents: events.slice(offset, offset + 20), total: events.length } } })
    }
    if (path.endsWith('/receivers') || path.endsWith('/volunteers')) return route.fulfill({ json: { data: [] } })
    return route.fulfill({ status: 404, json: { message: 'Unexpected serving request' } })
  })
  return control
}
async function login(page, role = 'volunteer') {
  await page.goto('/')
  await page.getByLabel('Account type').selectOption(role)
  await page.getByLabel('Email', { exact: true }).fill('staff@example.com')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click()
  await expect(page.locator('.account')).toContainText('Serving Staff')
  if (role === 'agent') await page.getByRole('button', { name: 'Scan & serve', exact: true }).last().click()
}
async function scan(page, code = 'receiver-real:1') {
  const qr = qrcode(0, 'M')
  qr.addData(code); qr.make()
  await page.evaluate(async dataUrl => {
    const image = new Image(); image.src = dataUrl; await image.decode()
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 400
      const ctx = canvas.getContext('2d')
      const draw = () => { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 400, 400); ctx.drawImage(image, 40, 40, 320, 320) }
      draw()
      const stream = canvas.captureStream(10)
      const timer = setInterval(() => { if (stream.getVideoTracks()[0].readyState === 'ended') clearInterval(timer); else draw() }, 100)
      window.servingCamera = stream
      return stream
    }
  }, qr.createDataURL(8, 4))
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click()
}

for (const role of ['volunteer', 'agent']) {
  test(`${role} chooses an event, scans and assigns SELF plus a family member through the API`, async ({ page }) => {
    const control = await mockServing(page, { eventCount: 21 })
    await login(page, role)
    await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Food event', { exact: true }).getByRole('option')).toHaveCount(22)
    await page.getByLabel('Food event', { exact: true }).selectOption('event-1')
    await scan(page)
    await expect(page.getByLabel('Receiver Self')).toBeEnabled()
    await expect(page.getByLabel('Already Served')).toBeDisabled()
    expect(await page.evaluate(() => window.servingCamera.getVideoTracks()[0].readyState)).toBe('ended')
    await page.getByLabel('Receiver Self').check()
    await page.getByLabel('Child Member').check()
    await page.getByRole('button', { name: 'Proceed', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Food assigned successfully' })).toBeVisible()
    const post = control.requests.filter(r => r.path.endsWith('/assign'))
    expect(post).toHaveLength(1)
    expect(post[0]).toMatchObject({ path: '/api/volunteer/food-events/event-1/assign', method: 'POST', token: 'Bearer serving-token', body: { receiverId: 'receiver-real', personIds: ['SELF', 'member-child'] } })
    expect(control.requests.find(r => r.path.endsWith('/eligible-members'))).toMatchObject({ method: 'GET', token: 'Bearer serving-token', body: null })
    const lists = control.requests.filter(r => r.path === '/api/volunteer/food-events')
    expect(lists.every(r => r.query.dateScope === 'today_and_upcoming' && r.method === 'GET' && r.body === null)).toBe(true)
    expect(lists.some(r => r.query.offset === '20')).toBe(true)
    await expect(page.getByLabel('Food event', { exact: true })).toContainText('28 packs left')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fv-data')).servings.length)).toBe(0)
    await page.getByRole('button', { name: 'Scan next family', exact: true }).click()
    await scan(page)
    await expect(page.getByLabel('Receiver Self')).toBeDisabled()
    await expect(page.getByLabel('Child Member')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Proceed', exact: true })).toBeDisabled()
  })
}

test('eligibility failure and malformed responses block assignment and allow a fresh check', async ({ page }) => {
  const control = await mockServing(page, { eligibilityStatus: 403 })
  await login(page)
  await page.getByLabel('Food event', { exact: true }).selectOption('event-1')
  await scan(page)
  await expect(page.getByRole('alert')).toContainText('Eligibility is unavailable')
  await expect(page.getByRole('button', { name: 'Proceed', exact: true })).toBeDisabled()
  control.eligibilityStatus = 200; control.malformed = true
  await page.getByRole('button', { name: 'Refresh eligibility', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('unsupported format')
  control.malformed = false
  await page.getByRole('button', { name: 'Refresh eligibility', exact: true }).click()
  await expect(page.getByLabel('Receiver Self')).toBeEnabled()
  expect(control.requests.some(r => r.path.endsWith('/assign'))).toBe(false)
})

test('uncertain assignment requires fresh eligibility and cannot repeat an already saved serving', async ({ page }) => {
  const control = await mockServing(page, { assignStatus: 500, saveBeforeFailure: true })
  await login(page)
  await page.getByLabel('Food event', { exact: true }).selectOption('event-1')
  await scan(page)
  await page.getByLabel('Receiver Self').check()
  await page.getByRole('button', { name: 'Proceed', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('request may have been saved')
  await expect(page.getByRole('heading', { name: 'Food assigned successfully' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Proceed', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Refresh eligibility', exact: true }).click()
  await expect(page.getByLabel('Receiver Self')).toBeDisabled()
  await expect(page.getByLabel('Child Member')).toBeEnabled()
  expect(control.requests.filter(r => r.path.endsWith('/assign'))).toHaveLength(1)
})

test('a pending eligibility response cannot populate a different event', async ({ page }) => {
  const control = await mockServing(page)
  let release
  control.eligibilityGate = new Promise(resolve => { release = resolve })
  await login(page)
  await page.getByLabel('Food event', { exact: true }).selectOption('event-1')
  await scan(page)
  await expect(page.locator('.live-serving .panel[role=status]')).toContainText('Checking eligible')
  await page.getByLabel('Food event', { exact: true }).selectOption('event-2')
  const response = page.waitForResponse(r => r.url().includes('event-1/receivers/receiver-real/eligible-members'))
  release(); await response
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeVisible()
  await expect(page.getByLabel('Receiver Self')).toHaveCount(0)
  expect(control.requests.some(r => r.path.endsWith('/assign'))).toBe(false)
})

test('pending assignments prevent repeated submission and navigation', async ({ page }) => {
  const control = await mockServing(page)
  let release
  control.assignmentGate = new Promise(resolve => { release = resolve })
  await login(page)
  await page.getByLabel('Food event', { exact: true }).selectOption('event-1')
  await scan(page)
  await page.getByLabel('Child Member').check()
  await page.getByRole('button', { name: 'Proceed', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Assigning food…' })).toBeDisabled()
  await expect(page.getByLabel('Food event', { exact: true })).toBeDisabled()
  await page.locator('.sidebar [data-page="units"]').click()
  await expect(page.getByRole('button', { name: 'Assigning food…' })).toBeVisible()
  release()
  await expect(page.getByRole('heading', { name: 'Food assigned successfully' })).toBeVisible()
  expect(control.requests.filter(r => r.path.endsWith('/assign'))).toHaveLength(1)
})

test('field agent serving permissions show the API error without falling back to sample events', async ({ page }) => {
  await mockServing(page, { eventsStatus: 403 })
  await login(page, 'agent')
  await expect(page.locator('.live-serving').getByRole('alert')).toContainText('Serving is not permitted')
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Food event', { exact: true }).getByRole('option')).toHaveCount(1)
})

test('mobile serving blocks offline assignment and invalid QR codes never reach eligibility', async ({ page, context }) => {
  const control = await mockServing(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.getByLabel('Food event', { exact: true }).selectOption('event-1')
  await scan(page, 'https://untrusted.example/anything')
  await expect(page.getByRole('alert')).toContainText('valid receiver ID')
  expect(control.requests.some(r => r.path.endsWith('/eligible-members'))).toBe(false)
  await scan(page)
  await page.getByLabel('Child Member').check()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.setOffline(true)
  await expect(page.getByRole('alert')).toContainText('You are offline')
  await expect(page.getByRole('button', { name: 'Proceed', exact: true })).toBeDisabled()
  expect(control.requests.some(r => r.path.endsWith('/assign'))).toBe(false)
  await context.setOffline(false)
})
