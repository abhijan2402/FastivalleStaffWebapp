import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { seed, serve, createFamily, changeCard } from '../domain.mjs'
import { shareImpact } from '../lib/shareImpact.js'
export const DEMO_DAY = '2026-11-02'
const WorkspaceContext = createContext(null)
const agentNavs = [['overview', 'home', 'Overview'], ['scan', 'scan', 'Scan & serve'], ['families', 'users', 'Families'], ['units', 'box', 'Food units'], ['impact', 'heart', 'Our impact']]
const volunteerNavs = [['scan', 'scan', 'Scan & serve'], ['impact', 'heart', 'Our impact']]
const agentDialogs = ['family-form', 'family', 'unit-form', 'card-confirm', 'unit-summary']
function loadState() {
  try { return JSON.parse(localStorage.getItem('fv-data')) || seed() } catch { return seed() }
}
function initialRole() { return sessionStorage.getItem('fv-role') === 'volunteer' ? 'volunteer' : 'agent' }

export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(loadState)
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
  const navs = role === 'agent' ? agentNavs : volunteerNavs
  const todayUnits = state.units.filter(unit => unit.date === DEMO_DAY)
  const ownServings = state.servings.filter(serving => serving.role === role)
  const notify = useCallback(message => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 4000)
  }, [])
  const persist = useCallback(value => {
    try { localStorage.setItem('fv-data', JSON.stringify(value)) }
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
  const closeDialog = useCallback(() => setDialog(null), [])
  function navigate(next) {
    if (!navs.some(item => item[0] === next)) return
    closeDialog()
    setPage(next)
    window.scrollTo(0, 0)
  }
  function openDialog(type, data = {}) {
    if (agentDialogs.includes(type) && role !== 'agent') return
    setDialog({ ...data, type })
  }
  function registerFamily(data) {
    if (role !== 'agent') return
    const family = commit(next => createFamily(next, data))
    openDialog('family', { familyId: family.id })
    notify('Family registered on this device')
  }
  function updateCard(familyId, action) {
    if (role !== 'agent') return
    commit(next => changeCard(next.families.find(family => family.id === familyId), action))
    openDialog('family', { familyId })
    notify('Family card updated')
  }
  function planUnit(data) {
    if (role !== 'agent') return
    commit(next => next.units.unshift({ ...data, id: `FU-${String(Math.max(...next.units.map(unit => +unit.id.slice(3))) + 1).padStart(3, '0')}`, served: 0 }))
    navigate('units')
    notify('Food unit planned successfully')
  }
  function openUnit(unit) {
    if (role !== 'agent') return
    if (unit.date === DEMO_DAY && unit.served < unit.packs) { setUnitId(unit.id); navigate('scan') }
    else openDialog('unit-summary', { unitId: unit.id })
  }
  function checkCard(code) {
    const result = serve(structuredClone(stateRef.current), { code, unitId, role, online })
    if (!result.ok) openDialog('result', { result })
    else openDialog('serve', { code, familyId: result.family.id, unitId })
  }
  function confirmServing() {
    if (dialog?.type !== 'serve') return
    const result = commit(next => serve(next, { code: dialog.code, unitId: dialog.unitId, role, online }))
    openDialog('result', { result })
  }
  function signIn(email, password) {
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
  function updateProfile(value) { commit(next => { next.profile[role] = { ...value } }); closeDialog(); notify('Profile saved') }
  function resetDemo() {
    const next = seed()
    stateRef.current = next
    persist(next)
    setState(next)
    setUnitId('FU-008')
    closeDialog()
    notify('Demo workspace restored')
  }
  function simulateSync() {
    commit(next => { next.servings.forEach(serving => { serving.pending = false }); next.queue = [] })
    closeDialog()
    notify('Demo sync complete · records remain local')
  }
  async function install() {
    if (installPrompt.current) { await installPrompt.current.prompt(); installPrompt.current = null }
    else openDialog('install')
  }
  useEffect(() => {
    function onBeforeInstall(event) { event.preventDefault(); installPrompt.current = event }
    function onConnection() {
      setOnline(navigator.onLine)
      notify(navigator.onLine ? 'You’re back online. Demo records stay on this device.' : 'Offline. Your work will be saved on this device.')
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
  }, [notify])
  const workspace = { state, role, roleLabel, page, online, dialog, toast, unitId, setUnitId, profile, todayUnits, ownServings, navs, notify, navigate, openDialog, closeDialog, registerFamily, updateCard, planUnit, openUnit, checkCard, confirmServing, signIn, updateProfile, resetDemo, simulateSync, install, share: count => shareImpact(count ?? state.total, notify) }
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw Error('Workspace provider is required')
  return workspace
}
