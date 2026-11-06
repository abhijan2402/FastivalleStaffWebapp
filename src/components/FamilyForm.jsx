import { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import FamilyPhoto from './FamilyPhoto.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
import { familyRelations as relations } from '../lib/familyRelations.js'

export default function FamilyForm() {
  const { registerFamily, demoMode } = useWorkspace()
  const progress = useRef({})
  const [name, setName] = useState(''), [mobile, setMobile] = useState(''), [email, setEmail] = useState('')
  const [members, setMembers] = useState([]), [full, setFull] = useState(true)
  const [photo, setPhoto] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const [processingPhoto, setProcessingPhoto] = useState(false)
  function updateMember(index, field, value) { setMembers(current => current.map((member, position) => position === index ? { ...member, [field]: value } : member)) }
  async function submit(event) {
    event.preventDefault()
    if (processingPhoto || saving) return
    setError('')
    if (photo && photo.size > 2 * 1024 * 1024) { setError('Choose a photo smaller than 2 MB.'); return }
    setSaving(true)
    try {
      await registerFamily({ name, mobile, email, members: [{ name: name.trim(), relation: 'Self' }, ...members], full, photo }, progress.current)
    } catch (issue) { setError(issue.message); setSaving(false) }
  }
  return <form onSubmit={submit}><fieldset disabled={saving} className="family-form-fields">
    <label className="field">Receiver name *<input disabled={!!progress.current.receiver} value={name} onChange={event => setName(event.target.value)} required placeholder="Full name" /></label>
    <label className="field">Mobile number (optional)<input disabled={!!progress.current.receiver} type="tel" value={mobile} onChange={event => setMobile(event.target.value)} autoComplete="tel" /></label>
    <label className="field">Email (optional)<input disabled={!!progress.current.receiver} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
    <FamilyPhoto photo={photo} onChange={setPhoto} onProcessingChange={setProcessingPhoto} disabled={saving || !!progress.current.receiver} />
    <h3>Family members</h3><p className="small-note">The receiver is included as Self. Add other family members below.</p>
    <div id="member-fields">{members.map((member, index) => <div key={index} className="family-member-fields">
      <label className="field">Member name *<input disabled={index < (progress.current.members?.length || 0)} value={member.name} onChange={event => updateMember(index, 'name', event.target.value)} required placeholder="Member’s full name" /></label>
      <label className="field">Relation to receiver *<select disabled={index < (progress.current.members?.length || 0)} value={member.relation} onChange={event => updateMember(index, 'relation', event.target.value)} required><option value="" disabled>Select relation</option>{relations.map(relation => <option key={relation} value={relation}>{relation}</option>)}</select></label>
      <button type="button" disabled={index < (progress.current.members?.length || 0)} className="text-btn" aria-label={`Remove member ${index + 1}`} onClick={() => setMembers(current => current.filter((_, position) => position !== index))}>Remove member</button>
    </div>)}</div>
    <button className="text-btn add-member" type="button" onClick={() => setMembers(current => [...current, { name: '', relation: '' }])}><Icon name="plus" />Add another member</button>
    {demoMode && <label className="check-field"><input checked={full} onChange={event => setFull(event.target.checked)} type="checkbox" /><span>Family is complete — generate an active QR card</span></label>}
    </fieldset>{!demoMode && <p className="small-note">Receiver and members are saved to the server. QR card actions remain a local sample.</p>}<p className="error" role="alert">{error}</p><button className="btn primary full" disabled={saving || processingPhoto || progress.current.needsReview}>{saving ? 'Saving…' : 'Register family'}</button>
  </form>
}
