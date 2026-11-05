import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function FoodEventsStatus() {
  const { state, demoMode, role, online, eventsLoading, eventsError, foodMutationBusy, refreshEvents } = useWorkspace()
  if (demoMode) return null
  return <section className="panel food-events-status" aria-label="Food event availability">
    <button className="btn secondary" disabled={eventsLoading || foodMutationBusy || !online} onClick={refreshEvents}>Refresh food events</button>
    {eventsLoading && <p role="status">Loading food events…</p>}
    {eventsError && <p className="error" role="alert">{eventsError}</p>}
    {!eventsLoading && !eventsError && !state.units.length && <div className="empty"><h3>No food events available</h3><p>{role === 'agent' ? 'Create a food unit to get started.' : 'No food events are available for your account. Ask a field manager to check that an event is active, then refresh.'}</p></div>}
  </section>
}
