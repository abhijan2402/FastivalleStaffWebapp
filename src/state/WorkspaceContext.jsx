import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { seed, serve, createFamily, changeCard, currentDay, checkFamilyCard } from '../domain.mjs'
import { mapEligibility } from '../lib/serving.mjs'
import { shareImpact } from '../lib/shareImpact.js'
import { createApi, mapFoodEvent, mapReceiver, mapVolunteer } from '../api/client.mjs'
const WorkspaceContext = createContext(null)
const agentNavs = [['overview', 'home', 'Overview'], ['scan', 'scan', 'Scan & serve'], ['families', 'users', 'Families'], ['units', 'box', 'Food units']]
const volunteerNavs = [['scan', 'scan', 'Scan & serve']]
const agentDialogs = ['family-form', 'family', 'unit-form', 'card-confirm', 'unit-summary', 'volunteer', 'volunteer-form', 'family-manage']
function loadState() {
  try { return JSON.parse(localStorage.getItem('fv-data')) || seed() } catch { return seed() }
}
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.fastivalle.org'
function readSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem('fv-api-session'))
    return value?.token && ['agent', 'volunteer'].includes(value.role) ? value : null
  } catch { return null }
}
function initialRole() { return (!demoMode ? readSession()?.role : sessionStorage.getItem('fv-role')) === 'volunteer' ? 'volunteer' : 'agent' }

export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(() => {
    const value = loadState()
    // Live account profiles and event responses are never loaded from demo storage.
    if (!demoMode) value.profile = { agent: { name: 'Field Agent', contact: '' }, volunteer: { name: 'Volunteer', contact: '' } }
    return value
  })
  const [session, setSession] = useState(() => demoMode ? null : readSession())
  const sessionRef = useRef(session)
  const [authenticated, setAuthenticated] = useState(demoMode)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [liveUnits, setLiveUnits] = useState([])
  const [foodMutationBusy, setFoodMutationBusy] = useState(false)
  const [staffMutationBusy, setStaffMutationBusy] = useState(false)
  const staffMutationLock = useRef(false)
  const [volunteers, setVolunteers] = useState([])
  const [volunteersLoading, setVolunteersLoading] = useState(false)
  const [volunteersError, setVolunteersError] = useState('')
  const volunteersVersion = useRef(0)
  const foodMutationLock = useRef(false)
  const eventsVersion = useRef(0)
  const [liveFamilies, setLiveFamilies] = useState([])
  const [familiesLoading, setFamiliesLoading] = useState(false)
  const [familiesError, setFamiliesError] = useState('')
  const familiesVersion = useRef(0)
  const requestVersion = useRef(0)
  const apiRef = useRef(null)
  if (!apiRef.current) apiRef.current = createApi({
    baseUrl: apiBaseUrl, getToken: () => sessionRef.current?.token,
    onUnauthorized: () => {
      requestVersion.current++
      sessionRef.current = null
      sessionStorage.removeItem('fv-api-session')
      setSession(null); setAuthenticated(false); setDialog(null); setLiveUnits([]); setLiveFamilies([]); setVolunteers([]); setVolunteersError('')
      setApiError('Your session expired. Please sign in again.')
    },
  })
  const stateRef = useRef(state)
  const [role, setRole] = useState(initialRole)
  const [page, setPage] = useState(() => initialRole() === 'agent' ? 'overview' : 'scan')
  const [online, setOnline] = useState(navigator.onLine)
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState('')
  const [unitId, setUnitId] = useState('FU-008')
  const toastTimer = useRef(null), installPrompt = useRef(null)
  const profile = state.profile[role]
  const roleLabel = role === 'agent' ? 'Field Agent' : 'Volunteer'
  const navs = role === 'agent' ? (demoMode ? agentNavs : [...agentNavs, ['volunteers', 'users', 'Volunteers']]) : demoMode ? volunteerNavs : [...volunteerNavs, ['units', 'box', 'Food events']]
  const [today, setToday] = useState(currentDay)
  useEffect(() => { const timer = setInterval(() => setToday(currentDay()), 1000); return () => clearInterval(timer) }, [])
  const displayedState = demoMode ? state : { ...state, units: liveUnits, ...(role === 'agent' ? { families: liveFamilies } : {}) }
  const todayUnits = displayedState.units.filter(unit => unit.date === today && unit.isActive !== false && !['COMPLETED', 'CANCELLED'].includes(unit.status))
  const ownServings = state.servings.filter(serving => serving.role === role)
  const notify = useCallback(message => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 4000)
  }, [])
  const persist = useCallback(value => {
    try {
      const saved = !demoMode ? { ...value, profile: seed().profile } : value
      localStorage.setItem('fv-data', JSON.stringify(saved))
    }
    catch { notify('Device storage is full. Remove a large photo or reset demo data before continuing.') }
  }, [notify])
  useEffect(() => { persist(stateRef.current) }, [persist])
  // Keep domain functions independent of React and publish immutable snapshots.
  // The ref advances synchronously so repeated clicks cannot record two servings.
  function commit(operation) {
    const next = structuredClone(stateRef.current)
    const result = operation(next)
    stateRef.current = next
    persist(next)
    setState(next)
    return result
  }
  const closeDialog = useCallback(() => { if (!foodMutationLock.current && !staffMutationLock.current) setDialog(null) }, [])
  function navigate(next) {
    if (foodMutationLock.current || staffMutationLock.current) return
    if (!navs.some(item => item[0] === next)) return
    closeDialog()
    setPage(next)
    window.scrollTo(0, 0)
  }
  function openDialog(type, data = {}) {
    if (foodMutationLock.current || staffMutationLock.current) return
    if (agentDialogs.includes(type) && role !== 'agent' && !(type === 'unit-summary' && !demoMode)) return
    setDialog({ ...data, type })
  }
  async function registerFamily(data, progress = {}) {
    if (role !== 'agent') return
    if (demoMode) {
      const family = commit(next => createFamily(next, data))
      openDialog('family', { familyId: family.id })
      notify('Sample family registered on this device')
      return
    }
    if (progress.needsReview) throw Error('The previous request may have been saved. Refresh the family list before starting a new registration.')
    const activeSession = sessionRef.current
    if (!activeSession) throw Error('Please sign in again before registering a family.')
    familiesVersion.current++
    setFamiliesLoading(false)
    const otherMembers = data.members.filter(member => member.relation !== 'Self')
    function publish() {
      if (sessionRef.current !== activeSession || !progress.receiver?.id) return
      const family = mapReceiver({ ...progress.receiver, familyMembers: progress.members || [] })
      setLiveFamilies(current => [family, ...current.filter(item => item.id !== family.id)])
      return family
    }
    try {
      if (!progress.receiver) {
        const response = await apiRef.current.createReceiver({ name: data.name.trim(), ...(data.email.trim() ? { email: data.email.trim() } : {}), ...(data.mobile.trim() ? { phone: data.mobile.trim() } : {}), profilePic: data.photo || null })
        const receiver = response?.receiver ?? response
        if (!receiver?.id) { progress.needsReview = true; throw Error('The receiver API did not return an ID.') }
        progress.receiver = { name: data.name.trim(), phone: data.mobile.trim(), email: data.email.trim(), ...receiver }
        progress.members = []
      }
      for (let index = progress.members.length; index < otherMembers.length; index++) {
        if (sessionRef.current !== activeSession) throw Error('Your session changed. Sign in again and review the registered receiver.')
        const member = otherMembers[index]
        const body = { name: member.name.trim(), relationship: member.relation.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_'), isSelf: false }
        const response = await apiRef.current.addFamilyMember(progress.receiver.id, body)
        progress.members.push({ ...body, ...(response?.familyMember ?? response?.member ?? response) })
      }
      const family = publish()
      if (family) {
        setFamiliesError('')
        openDialog('family', { familyId: family.id })
        notify('Family registered successfully on the server')
      }
    } catch (error) {
      publish()
      if (!error.status || error.status >= 500) {
        progress.needsReview = true
        throw Error(`The request may have been saved. Close this form and refresh the family list before starting another registration. ${error.message}`)
      }
      throw Error(progress.receiver ? `Receiver saved. ${progress.members.length} of ${otherMembers.length} additional members saved. Retry to continue with the remaining members. ${error.message}` : error.message)
    }
  }
  function updateCard(familyId, action) {
    if (role !== 'agent') return
    if (!demoMode) {
      setLiveFamilies(current => current.map(family => {
        if (family.id !== familyId) return family
        const updated = structuredClone(family); changeCard(updated, action); return updated
      }))
    } else commit(next => changeCard(next.families.find(family => family.id === familyId), action))
    openDialog('family', { familyId })
    notify(demoMode ? 'Family card updated' : 'Sample QR card updated locally; no server card was changed')
  }
  async function refreshVolunteers() {
    if (demoMode || role !== 'agent' || !authenticated || !sessionRef.current) return
    const activeSession = sessionRef.current
    const version = ++volunteersVersion.current
    setVolunteersLoading(true); setVolunteersError('')
    try {
      const records = (await apiRef.current.volunteers()).map(mapVolunteer)
      if (sessionRef.current === activeSession && version === volunteersVersion.current) setVolunteers(records)
    } catch (error) {
      if (sessionRef.current === activeSession && version === volunteersVersion.current) setVolunteersError(error.message)
    } finally {
      if (sessionRef.current === activeSession && version === volunteersVersion.current) setVolunteersLoading(false)
    }
  }
  async function inspectVolunteer(id) {
    if (demoMode || role !== 'agent' || !sessionRef.current) return
    const activeSession = sessionRef.current
    const record = mapVolunteer(await apiRef.current.volunteer(id))
    if (sessionRef.current === activeSession) return record
  }
  async function changeStaff(operation, refresh, message) {
    if (demoMode || role !== 'agent' || !sessionRef.current) throw Error('Please sign in as a field agent to manage these records.')
    if (staffMutationLock.current) throw Error('A record is already being saved.')
    const activeSession = sessionRef.current
    staffMutationLock.current = true; setStaffMutationBusy(true)
    // Invalidate in-flight list responses before any server mutation.
    volunteersVersion.current++; familiesVersion.current++
    setVolunteersLoading(false); setFamiliesLoading(false)
    try {
      await operation()
      if (sessionRef.current !== activeSession) return false
      await refresh()
      if (sessionRef.current !== activeSession) return false
      notify(message)
      return true
    } finally { staffMutationLock.current = false; setStaffMutationBusy(false) }
  }
  async function saveVolunteer(data, id) {
    const saved = await changeStaff(() => id
      ? apiRef.current.updateVolunteer(id, { name: data.name.trim(), phone: data.phone.trim() })
      : apiRef.current.createVolunteer({ name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim() }), refreshVolunteers, id ? 'Volunteer updated on the server' : 'Volunteer created on the server')
    if (saved) navigate('volunteers')
  }
  async function deleteVolunteer(id) {
    if (await changeStaff(() => apiRef.current.deleteVolunteer(id), refreshVolunteers, 'Volunteer deleted from the server')) closeDialog()
  }
  async function saveReceiverName(id, name) {
    if (await changeStaff(() => apiRef.current.updateReceiver(id, { name: name.trim() }), refreshFamilies, 'Receiver updated on the server')) closeDialog()
  }
  async function deleteReceiver(id) {
    if (await changeStaff(() => apiRef.current.deleteReceiver(id), refreshFamilies, 'Receiver deleted from the server')) closeDialog()
  }
  async function saveFamilyMember(receiverId, data, id) {
    const saved = await changeStaff(() => id
      ? apiRef.current.updateFamilyMember(receiverId, id, { name: data.name.trim() })
      : apiRef.current.addFamilyMember(receiverId, { name: data.name.trim(), relationship: data.relation.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_'), isSelf: false }), refreshFamilies, id ? 'Family member updated on the server' : 'Family member added on the server')
    if (saved) closeDialog()
  }
  async function deleteFamilyMember(receiverId, id) {
    if (await changeStaff(() => apiRef.current.deleteFamilyMember(receiverId, id), refreshFamilies, 'Family member deleted from the server')) closeDialog()
  }
  async function changeFood(operation, message) {
    if (demoMode || role !== 'agent' || !sessionRef.current) throw Error('Please sign in as a field agent to manage food events.')
    if (foodMutationLock.current) throw Error('A food event is already being saved.')
    const activeSession = sessionRef.current
    foodMutationLock.current = true; setFoodMutationBusy(true)
    eventsVersion.current++; setEventsLoading(false)
    try {
      await operation()
      if (sessionRef.current !== activeSession) return false
      // Reload authoritative records even when mutations return an empty 204.
      await refreshEvents()
      if (sessionRef.current !== activeSession) return false
      notify(message)
      return true
    } finally { foodMutationLock.current = false; setFoodMutationBusy(false) }
  }
  async function planUnit(data, editingId) {
    if (role !== 'agent') return
    if (!demoMode) {
      const body = { name: data.name, location: data.location, foodItems: data.items, dateTime: data.dateTime, timezone: data.timeZone, mealType: data.mealType, mealsPerPerson: data.mealsPerPerson, totalPacks: data.packs, budget: data.price.toFixed(2), currency: data.currency, isActive: data.isActive }
      const saved = await changeFood(() => editingId
        ? apiRef.current.updateFoodEvent(editingId, body)
        : apiRef.current.createFoodEvent(body), editingId ? 'Food event updated on the server' : 'Food event created on the server')
      if (saved) navigate('units')
      return
    }
    commit(next => next.units.unshift({ ...data, id: `FU-${String(Math.max(...next.units.map(unit => +unit.id.slice(3))) + 1).padStart(3, '0')}`, served: 0 }))
    navigate('units')
    notify('Sample food unit saved on this device')
  }
  async function updateFoodStatus(id, body) {
    if (await changeFood(() => apiRef.current.setFoodEventStatus(id, body), 'Food event status updated on the server')) closeDialog()
  }
  async function deleteFoodUnit(id) {
    if (await changeFood(() => apiRef.current.deleteFoodEvent(id), 'Food event deleted from the server')) closeDialog()
  }
  function openUnit(unit) {
    if (!demoMode) { openDialog('unit-summary', { unitId: unit.id }); return }
    if (role !== 'agent') return
    if (unit.date === currentDay() && unit.served < unit.packs) { setUnitId(unit.id); navigate('scan') }
    else openDialog('unit-summary', { unitId: unit.id })
  }
  const loadServingEvents = useCallback(async () => {
    const activeSession = sessionRef.current
    if (!activeSession) throw Error('Please sign in again.')
    const events = (await apiRef.current.foodEvents()).map(mapFoodEvent)
    if (sessionRef.current !== activeSession) throw Error('Your session changed. Please sign in again.')
    return events
  }, [])
  const loadEligibleMembers = useCallback(async (eventId, receiverId) => {
    const activeSession = sessionRef.current
    if (!activeSession) throw Error('Please sign in again.')
    const result = await apiRef.current.eligibleMembers(eventId, receiverId)
    if (sessionRef.current !== activeSession) throw Error('Your session changed. Please sign in again.')
    return mapEligibility(result, receiverId)
  }, [])
  async function assignFood(eventId, receiverId, personIds) {
    const activeSession = sessionRef.current
    if (!activeSession) throw Error('Please sign in again.')
    if (foodMutationLock.current) throw Error('Food assignment is already in progress.')
    if (!navigator.onLine) throw Error('You are offline. Reconnect and check eligibility before assigning food.')
    if (!personIds.length || new Set(personIds).size !== personIds.length) throw Error('Select eligible family members.')
    foodMutationLock.current = true; setFoodMutationBusy(true)
    try {
      await apiRef.current.assignFood(eventId, receiverId, personIds)
      if (sessionRef.current !== activeSession) throw Error('Your session changed. Review the assignment after signing in again.')
      // Only a confirmed server response is reported as success; no local serving is created.
      void refreshEvents()
    } finally { foodMutationLock.current = false; setFoodMutationBusy(false) }
  }
  function checkCard(code) {
    if (!demoMode) return
    const result = checkFamilyCard(stateRef.current, code)
    if (!result.ok) openDialog('result', { result })
    else openDialog('serve', { code, familyId: result.family.id })
  }
  function confirmServing(selectedUnitId, memberIds) {
    if (!demoMode || dialog?.type !== 'serve') return
    const result = commit(next => serve(next, { code: dialog.code, unitId: selectedUnitId, memberIds, role, online }))
    openDialog('result', { result })
  }
  async function signIn(email, password, selectedRole = 'agent') {
    if (!demoMode) {
      const version = ++requestVersion.current
      setLoading(true); setApiError('')
      try {
        const result = await apiRef.current.login(selectedRole, email.trim(), password)
        const token = result?.accessToken ?? result?.token ?? result?.tokens?.accessToken
        if (!token || typeof token !== 'string') throw Error('The login response did not contain an access token.')
        const next = { role: selectedRole, token }
        sessionRef.current = next
        const response = await apiRef.current.profile(selectedRole)
        if (requestVersion.current !== version) return
        const user = response?.user ?? response?.fieldManager ?? response?.volunteer ?? response
        if (!user?.name) throw Error('The profile response did not contain a name.')
        commit(value => { value.profile[selectedRole] = { name: user.name, contact: user.phone || '', email: user.email || '' } })
        sessionStorage.setItem('fv-api-session', JSON.stringify(next))
        setRole(selectedRole); setSession(next); setAuthenticated(true); setLiveUnits([]); setLiveFamilies([]); setVolunteers([]); setVolunteersError('')
        closeDialog(); setPage(selectedRole === 'agent' ? 'overview' : 'scan')
        notify(`Welcome, ${user.name}`)
      } catch (error) {
        if (requestVersion.current === version) {
          sessionRef.current = null; setSession(null); setAuthenticated(false)
          sessionStorage.removeItem('fv-api-session')
          setApiError(error.message)
        }
        throw error
      } finally { setLoading(false) }
      return
    }
    const normalized = email.trim().toLowerCase()
    if (!['agent@fastivalle.demo', 'volunteer@fastivalle.demo'].includes(normalized) || password !== 'demo123') throw Error('Use a demo email above and password demo123.')
    const nextRole = normalized.startsWith('agent') ? 'agent' : 'volunteer'
    setRole(nextRole)
    sessionStorage.setItem('fv-role', nextRole)
    closeDialog()
    setPage(nextRole === 'agent' ? 'overview' : 'scan')
    window.scrollTo(0, 0)
    notify(`Welcome, ${stateRef.current.profile[nextRole].name}`)
  }
  function updateProfile(value) { if (!demoMode) return; commit(next => { next.profile[role] = { ...value } }); closeDialog(); notify('Profile saved') }
  function resetDemo() {
    const next = seed()
    stateRef.current = next
    persist(next)
    setState(next)
    setUnitId('FU-008')
    closeDialog()
    notify('Demo workspace restored')
  }
  async function refreshFamilies() {
    if (demoMode || !authenticated || role !== 'agent' || !sessionRef.current) return
    const activeSession = sessionRef.current
    const version = ++familiesVersion.current
    setFamiliesLoading(true); setFamiliesError('')
    try {
      const families = (await apiRef.current.receivers()).map(mapReceiver)
      if (sessionRef.current === activeSession && version === familiesVersion.current) setLiveFamilies(current => families.map(family => {
        const previous = current.find(item => item.id === family.id)
        return previous ? { ...family, card: previous.card, version: previous.version, status: previous.status } : family
      }))
    } catch (error) { if (sessionRef.current === activeSession && version === familiesVersion.current) setFamiliesError(error.message) }
    finally { if (sessionRef.current === activeSession && version === familiesVersion.current) setFamiliesLoading(false) }
  }
  async function refreshEvents() {
    if (demoMode || !authenticated || !sessionRef.current) return
    const activeSession = sessionRef.current
    const version = ++eventsVersion.current
    setEventsLoading(true); setEventsError('')
    try {
      const response = role === 'agent' ? await apiRef.current.adminFoodEvents() : await apiRef.current.foodEvents()
      const events = response.map(mapFoodEvent)
      if (sessionRef.current === activeSession && version === eventsVersion.current) setLiveUnits(events)
    } catch (error) { if (sessionRef.current === activeSession && version === eventsVersion.current) setEventsError(error.message) }
    finally { if (sessionRef.current === activeSession && version === eventsVersion.current) setEventsLoading(false) }
  }
  async function signOut() {
    setLoading(true)
    try { await apiRef.current.logout(role) }
    catch (error) { notify(error.message) }
    finally {
      requestVersion.current++; sessionRef.current = null
      sessionStorage.removeItem('fv-api-session'); setSession(null)
      setAuthenticated(false); setLiveUnits([]); setLiveFamilies([]); setVolunteers([]); setVolunteersError(''); closeDialog(); setLoading(false); setApiError('')
    }
  }
  useEffect(() => {
    if (demoMode || !session || authenticated) return
    let cancelled = false
    setLoading(true)
    apiRef.current.profile(session.role).then(response => {
      if (cancelled || sessionRef.current !== session) return
      const user = response?.user ?? response?.fieldManager ?? response?.volunteer ?? response
      if (!user?.name) throw Error('The profile response did not contain a name.')
      commit(value => { value.profile[session.role] = { name: user.name, contact: user.phone || '', email: user.email || '' } })
      setAuthenticated(true)
    }).catch(error => {
      if (cancelled) return
      setApiError(error.message); sessionRef.current = null; setSession(null)
      sessionStorage.removeItem('fv-api-session')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session, authenticated])
  useEffect(() => { if (authenticated && !demoMode) refreshEvents() }, [authenticated, role])
  useEffect(() => { if (authenticated && !demoMode && page === 'units') refreshEvents() }, [authenticated, role, page])
  useEffect(() => { if (authenticated && !demoMode && role === 'agent') refreshFamilies() }, [authenticated, role])
  useEffect(() => { if (authenticated && !demoMode && role === 'agent' && page === 'volunteers') refreshVolunteers() }, [authenticated, role, page])
  async function install() {
    if (installPrompt.current) { await installPrompt.current.prompt(); installPrompt.current = null }
    else openDialog('install')
  }
  useEffect(() => {
    function onBeforeInstall(event) { event.preventDefault(); installPrompt.current = event }
    function onConnection() {
      setOnline(navigator.onLine)
      notify(navigator.onLine ? 'You’re back online.' : 'Offline. Live API data is unavailable; sample changes stay on this device.')
      if (navigator.onLine && !demoMode) { refreshEvents(); refreshFamilies(); if (page === 'volunteers') refreshVolunteers() }
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('online', onConnection)
    window.addEventListener('offline', onConnection)
    return () => {
      clearTimeout(toastTimer.current)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('online', onConnection)
      window.removeEventListener('offline', onConnection)
    }
  }, [notify, authenticated, role, page])
  const workspace = { loadServingEvents, loadEligibleMembers, assignFood, demoMode, authenticated, loading, apiError, staffMutationBusy, volunteers, volunteersLoading, volunteersError, refreshVolunteers, inspectVolunteer, saveVolunteer, deleteVolunteer, saveReceiverName, deleteReceiver, saveFamilyMember, deleteFamilyMember, foodMutationBusy, updateFoodStatus, deleteFoodUnit, familiesLoading, familiesError, refreshFamilies, eventsLoading, eventsError, refreshEvents, signOut, state: displayedState, role, roleLabel, page, online, dialog, toast, unitId, setUnitId, profile, todayUnits, ownServings, navs, notify, navigate, openDialog, closeDialog, registerFamily, updateCard, planUnit, openUnit, checkCard, confirmServing, signIn, updateProfile, resetDemo, install, share: count => shareImpact(count ?? state.total, notify) }
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw Error('Workspace provider is required')
  return workspace
}
