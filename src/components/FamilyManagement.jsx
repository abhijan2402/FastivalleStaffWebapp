import { useState } from 'react'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
import { familyRelations as relations } from '../lib/familyRelations.js'
export default function FamilyManagement({ family }) {
  const { saveReceiverName, deleteReceiver, saveFamilyMember, deleteFamilyMember, staffMutationBusy } = useWorkspace()
  const [name, setName] = useState(family.name)
  const [memberNames, setMemberNames] = useState(() => Object.fromEntries(family.members.filter(member => member.relation !== 'Self').map(member => [member.id, member.name])))
  const [newName, setNewName] = useState(''), [relation, setRelation] = useState('')
  const [confirming, setConfirming] = useState(null), [error, setError] = useState(''), [needsReview, setNeedsReview] = useState(false)
  const members = family.members.filter(member => member.relation !== 'Self')
  async function run(operation, creates = false) {
    setError('')
    try { await operation() } catch (issue) {
      const uncertain = creates && (!issue.status || issue.status < 400 || issue.status >= 500)
      setNeedsReview(uncertain)
      setError(uncertain ? `${issue.message} The member may have been saved. Close this form and refresh families before trying again.` : issue.message)
    }
  }
  const busy = staffMutationBusy || needsReview
  return <div className="family-management">
    <form aria-label="Edit receiver" onSubmit={event => { event.preventDefault(); if (name.trim()) run(() => saveReceiverName(family.id, name)) }}>
      <label className="field">Receiver name<input value={name} disabled={busy} onChange={event => setName(event.target.value)} required /></label><button className="btn secondary full" disabled={busy || !name.trim()}>Save receiver</button>
    </form>
    <h3>Family members</h3>
    {members.map(member => <form key={member.id} aria-label={`Edit ${member.name}`} onSubmit={event => { event.preventDefault(); if (memberNames[member.id]?.trim()) run(() => saveFamilyMember(family.id, { name: memberNames[member.id] }, member.id)) }}>
      <label className="field">Member name<input value={memberNames[member.id] || ''} disabled={busy || !member.id} onChange={event => setMemberNames(current => ({ ...current, [member.id]: event.target.value }))} required /></label>
      <p>{member.relation}</p><div className="record-actions"><button className="btn secondary" disabled={busy || !member.id || !memberNames[member.id]?.trim()}>Save member</button><button className="btn danger" type="button" disabled={busy || !member.id} onClick={() => setConfirming({ memberId: member.id, name: member.name })}>Delete member</button></div>
    </form>)}
    <form aria-label="Add family member" onSubmit={event => { event.preventDefault(); if (newName.trim() && relation) run(() => saveFamilyMember(family.id, { name: newName, relation }), true) }}>
      <h3>Add family member</h3><label className="field">New member name<input value={newName} disabled={busy} onChange={event => setNewName(event.target.value)} required /></label><label className="field">Relationship<select aria-label="Relationship" value={relation} disabled={busy} onChange={event => setRelation(event.target.value)} required><option value="" disabled>Select relationship</option>{relations.map(value => <option key={value} value={value}>{value}</option>)}</select></label><button className="btn secondary full" disabled={busy || !newName.trim() || !relation}>Add member</button>
    </form>
    <button className="btn danger full" disabled={busy} onClick={() => setConfirming({ name: family.name })}>Delete receiver</button>
    {confirming && <section className="delete-confirm" role="group" aria-label="Confirm removal"><p>Delete “{confirming.name}”{!confirming.memberId && ' and their family record'} from the server? This cannot be undone.</p><button className="btn danger" disabled={busy} onClick={() => run(() => confirming.memberId ? deleteFamilyMember(family.id, confirming.memberId) : deleteReceiver(family.id))}>Confirm deletion</button><button className="btn secondary" disabled={busy} onClick={() => setConfirming(null)}>Keep record</button></section>}
    {staffMutationBusy && <p role="status">Saving changes…</p>}<p className="error" role="alert">{error}</p>
  </div>
}
