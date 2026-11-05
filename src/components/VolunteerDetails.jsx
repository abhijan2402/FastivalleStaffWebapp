import { useState } from 'react'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function VolunteerDetails() {
  const { dialog, openDialog, deleteVolunteer, staffMutationBusy } = useWorkspace()
  const volunteer = dialog.volunteer
  const [confirming, setConfirming] = useState(false), [error, setError] = useState('')
  async function remove() {
    setError('')
    try { await deleteVolunteer(volunteer.id) } catch (issue) { setError(issue.message) }
  }
  return <>
    <dl className="record-details"><dt>Name</dt><dd>{volunteer.name}</dd><dt>Email</dt><dd>{volunteer.email || '—'}</dd><dt>Phone</dt><dd>{volunteer.phone || '—'}</dd><dt>Account status</dt><dd>{typeof volunteer.isActive === 'boolean' ? volunteer.isActive ? 'Active' : 'Inactive' : 'Not supplied'}</dd></dl>
    <div className="record-actions"><button className="btn secondary full" disabled={staffMutationBusy} onClick={() => openDialog('volunteer-form', { volunteer })}>Edit volunteer</button>
    {!confirming ? <button className="btn danger full" onClick={() => setConfirming(true)}>Delete volunteer</button> : <><p>Delete “{volunteer.name}” from the server? This cannot be undone.</p><button className="btn danger full" disabled={staffMutationBusy} onClick={remove}>Confirm deletion</button><button className="btn secondary full" disabled={staffMutationBusy} onClick={() => setConfirming(false)}>Keep volunteer</button></>}</div>
    <p className="error" role="alert">{error}</p>
  </>
}
