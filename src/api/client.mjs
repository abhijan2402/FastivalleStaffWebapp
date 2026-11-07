import { validFoodItem } from '../lib/foodItems.mjs'
export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status }
}
export function createApi({ baseUrl, getToken = () => null, onUnauthorized = () => {}, fetcher = fetch }) {
  async function request(path, { method = 'GET', body, authenticated = true } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const token = authenticated ? getToken() : null
      const multipart = body instanceof FormData
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method, headers: { Accept: 'application/json', ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}), signal: controller.signal, cache: 'no-store',
      })
      if (response.status === 401 && authenticated) onUnauthorized()
      const raw = await response.text()
      let payload
      try { payload = raw ? JSON.parse(raw) : null } catch { throw new ApiError('The API returned an invalid response.', response.status) }
      if (!response.ok || payload?.success === false) {
        throw new ApiError(payload?.message || payload?.error?.message || `Request failed (${response.status}).`, response.status)
      }
      return payload?.data ?? payload
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(error.name === 'AbortError' ? 'The request timed out. Please try again.' : 'Unable to reach the API. Check your connection and try again.')
    } finally { clearTimeout(timer) }
  }
  async function list(path, keys) {
    const items = []
    for (let offset = 0; ; offset += 20) {
      const payload = await request(`${path}?limit=20&offset=${offset}`)
      const page = Array.isArray(payload) ? payload : keys.map(key => payload?.[key]).find(Array.isArray)
      if (!Array.isArray(page)) throw new ApiError('The API returned an unsupported list format.')
      items.push(...page)
      if (page.length < 20 || (Number.isFinite(payload?.total) && items.length >= payload.total)) return items
      if (offset >= 9980) throw new ApiError('Too many records to load.')
    }
  }
  const authPath = role => `/api/${role === 'agent' ? 'field-manager' : 'volunteer'}/auth`
  function receiverBody(body) {
    if (!(body.profilePic instanceof Blob)) return body
    const form = new FormData()
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) form.append(key, value)
    }
    return form
  }
  return {
    login: (role, email, password) => request(`${authPath(role)}/login`, { method: 'POST', authenticated: false, body: { email, password } }),
    profile: role => request(`${authPath(role)}/profile`),
    logout: role => request(`${authPath(role)}/logout`, { method: 'POST' }),
    volunteers: () => list('/api/admin/volunteers', ['volunteers', 'items', 'results']),
    volunteer: id => request(`/api/admin/volunteers/${encodeURIComponent(id)}`),
    createVolunteer: body => request('/api/admin/volunteers', { method: 'POST', body }),
    updateVolunteer: (id, body) => request(`/api/admin/volunteers/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    deleteVolunteer: id => request(`/api/admin/volunteers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    updateReceiver: (id, body) => request(`/api/admin/receivers/${encodeURIComponent(id)}`, { method: 'PATCH', body: receiverBody(body) }),
    deleteReceiver: id => request(`/api/admin/receivers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    updateFamilyMember: (receiverId, id, body) => request(`/api/admin/receivers/${encodeURIComponent(receiverId)}/family-members/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    deleteFamilyMember: (receiverId, id) => request(`/api/admin/receivers/${encodeURIComponent(receiverId)}/family-members/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createReceiver: body => request('/api/admin/receivers', { method: 'POST', body: receiverBody(body) }),
    addFamilyMember: (receiverId, body) => request(`/api/admin/receivers/${encodeURIComponent(receiverId)}/family-members`, { method: 'POST', body }),
    async receivers() {
      const receivers = await list('/api/admin/receivers', ['receivers', 'items', 'results'])
      return Promise.all(receivers.map(async receiver => ({ ...receiver, familyMembers: await list(`/api/admin/receivers/${encodeURIComponent(receiver.id)}/family-members`, ['familyMembers', 'members', 'items', 'results']) })))
    },
    adminFoodEvents: () => list('/api/admin/food-events', ['foodEvents', 'events', 'items', 'results']),
    createFoodEvent: body => request('/api/admin/food-events', { method: 'POST', body }),
    updateFoodEvent: (id, body) => request(`/api/admin/food-events/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    deleteFoodEvent: id => request(`/api/admin/food-events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    setFoodEventStatus: (id, body) => request(`/api/admin/food-events/${encodeURIComponent(id)}/status`, { method: 'PATCH', body }),
    eligibleMembers: (eventId, receiverId) => request(`/api/volunteer/food-events/${encodeURIComponent(eventId)}/receivers/${encodeURIComponent(receiverId)}/eligible-members`),
    assignFood: (eventId, receiverId, personIds, foodCardId) => request(`/api/volunteer/food-events/${encodeURIComponent(eventId)}/assign`, { method: 'POST', body: { receiverId, personIds, foodCardId } }),
    async foodEvents() {
      const items = []
      for (let offset = 0; ; offset += 20) {
        const payload = await request(`/api/volunteer/food-events?dateScope=today_and_upcoming&limit=20&offset=${offset}`)
        const page = Array.isArray(payload) ? payload : payload?.foodEvents ?? payload?.events ?? payload?.items ?? payload?.results
        if (!Array.isArray(page)) throw new ApiError('The food-event response has an unsupported format.')
        items.push(...page)
        if (page.length < 20 || (Number.isFinite(payload?.total) && items.length >= payload.total)) return items
        if (offset >= 9980) throw new ApiError('Too many food events to load. Please contact support.')
      }
    },
  }
}
export function mapFoodEvent(event) {
  if (!event.id || !event.name || !event.dateTime) throw new ApiError('A food event is missing required fields.')
  const packs = Number(event.totalPacks ?? 0), served = Number(event.servedPacks ?? 0), price = Number(event.budget ?? 0)
  if (!Number.isInteger(packs) || packs < 0 || !Number.isInteger(served) || served < 0 || !Number.isFinite(price) || price < 0 || !Array.isArray(event.foodItems ?? []) || (event.foodItems ?? []).some(item => typeof item === 'string' ? !item.trim() : !validFoodItem(item, { allowMissing: true }))) throw new ApiError('A food event contains invalid pack counts, budget or food items.')
  const mealType = event.mealType ?? 'SINGLE_MEAL'
  const mealsPerPerson = Number(event.mealsPerPerson ?? (mealType === 'FULL_DAY' ? 3 : 1))
  if (!['SINGLE_MEAL', 'FULL_DAY'].includes(mealType) || !Number.isInteger(mealsPerPerson) || mealsPerPerson < 1 || (mealType === 'SINGLE_MEAL' && mealsPerPerson !== 1)) throw new ApiError('A food event has an invalid meal type or meals per person.')
  if (event.timezone) { try { new Intl.DateTimeFormat('en', { timeZone: event.timezone }) } catch { throw new ApiError('A food event has an invalid timezone.') } }
  const date = new Date(event.dateTime)
  if (Number.isNaN(date.getTime())) throw new ApiError('A food event has an invalid date.')
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = type => parts.find(p => p.type === type).value
  return { id: event.id, name: event.name, date: `${part('year')}-${part('month')}-${part('day')}`, dateTime: event.dateTime, timeZone: event.timezone, mealType, mealsPerPerson, location: event.location, items: event.foodItems ?? [], packs, served, price, currency: event.currency ?? 'BDT', status: event.status, isActive: event.isActive }
}

export function mapReceiver(receiver) {
  if (!receiver?.id || !receiver?.name) throw new ApiError('The receiver response is missing an ID or name.')
  return {
    id: receiver.id, name: receiver.name, mobile: receiver.phone || '', email: receiver.email || '', photo: receiver.profilePic || null,
    isActive: receiver.isActive,
    members: [{ id: receiver.id, name: receiver.name, relation: 'Self' }, ...(receiver.familyMembers || []).filter(member => !member.isSelf).map(member => ({ id: member.id, name: member.name, relation: member.relationship || '' }))],
    // Profile completeness is separate from the stable receiver-ID QR shown on live family cards.
    status: 'open', card: null, version: 0,
  }
}

export function mapVolunteer(response) {
  const volunteer = response?.volunteer ?? response?.user ?? response
  if (!volunteer?.id || !volunteer?.name) throw new ApiError('A volunteer response is missing an ID or name.')
  return { id: volunteer.id, name: volunteer.name, email: volunteer.email || '', phone: volunteer.phone || '', isActive: volunteer.isActive }
}
