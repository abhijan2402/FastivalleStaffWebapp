import { useState } from 'react'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function FoodEventManagement({ unit }) {
  const { openDialog, updateFoodStatus, deleteFoodUnit, foodMutationBusy } = useWorkspace()
  const [status, setStatus] = useState(unit.status || '')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  async function run(action) {
    setError('')
    try { await action() } catch (issue) { setError(issue.message) }
  }
  return <div className="food-management">
    <p><strong>Event status:</strong> {unit.status || 'Not supplied'} · {unit.isActive === false ? 'Inactive' : 'Active'}</p>
    <button className="btn secondary full" disabled={foodMutationBusy} onClick={() => openDialog('unit-form', { unitId: unit.id })}>Edit food event</button>
    <button className="btn secondary full" disabled={foodMutationBusy} onClick={() => run(() => updateFoodStatus(unit.id, { isActive: unit.isActive === false }))}>{unit.isActive === false ? 'Activate event' : 'Deactivate event'}</button>
    <form onSubmit={event => { event.preventDefault(); run(() => updateFoodStatus(unit.id, { status: status.trim() })) }}>
      <label className="field">Event status<select aria-label="Event status" value={status} disabled={foodMutationBusy} onChange={event => setStatus(event.target.value)} required><option value="" disabled>Choose status</option>{unit.status && unit.status !== 'IN_PROGRESS' && <option value={unit.status}>{unit.status.replaceAll('_', ' ')}</option>}<option value="IN_PROGRESS">In progress</option></select></label>
      <button className="btn secondary full" disabled={foodMutationBusy || !status.trim()}>Update event status</button>
    </form>
    {!deleting ? <button className="btn danger full" disabled={foodMutationBusy} onClick={() => setDeleting(true)}>Delete food event</button> : <div><p>Delete “{unit.name}” from the server? This cannot be undone.</p><button className="btn danger full" disabled={foodMutationBusy} onClick={() => run(() => deleteFoodUnit(unit.id))}>Confirm deletion</button><button className="btn secondary full" disabled={foodMutationBusy} onClick={() => setDeleting(false)}>Keep event</button></div>}
    {foodMutationBusy && <p role="status">Saving changes…</p>}
    <p className="error" role="alert">{error}</p>
  </div>
}
