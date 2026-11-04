import { useState } from 'react'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
const relations = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter', 'Father-in-law', 'Mother-in-law', 'Son-in-law', 'Daughter-in-law', 'Brother-in-law', 'Sister-in-law', 'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin', 'Guardian', 'Other']

export default function FamilyForm() {
  const { registerFamily } = useWorkspace()
  const [name, setName] = useState(''), [mobile, setMobile] = useState(''), [email, setEmail] = useState('')
  const [members, setMembers] = useState([]), [full, setFull] = useState(true)
  const [photo, setPhoto] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  function updateMember(index, field, value) { setMembers(current => current.map((member, position) => position === index ? { ...member, [field]: value } : member)) }
  async function submit(event) {
    event.preventDefault()
    setError('')
    if (photo && photo.size > 2 * 1024 * 1024) { setError('Choose a photo smaller than 2 MB.'); return }
    setSaving(true)
    try {
      let image
      if (photo) image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('The photo could not be read.')); reader.readAsDataURL(photo) })
      registerFamily({ name, mobile, email, members: [{ name: name.trim(), relation: 'Self' }, ...members], full, photo: image })
    } catch (issue) { setError(issue.message); setSaving(false) }
  }
  return <form onSubmit={submit}>
    <label className="field">Receiver name *<input value={name} onChange={event => setName(event.target.value)} required placeholder="Full name" /></label>
    <label className="field">Mobile number (optional)<input type="tel" value={mobile} onChange={event => setMobile(event.target.value)} autoComplete="tel" /></label>
    <label className="field">Email (optional)<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
    <label className="field">Photo (optional)<input type="file" accept="image/*" onChange={event => setPhoto(event.target.files[0])} /></label>
    <h3>Family members</h3><p className="small-note">The receiver is included as Self. Add other family members below.</p>
    <div id="member-fields">{members.map((member, index) => <div key={index} className="family-member-fields">
      <label className="field">Member name *<input value={member.name} onChange={event => updateMember(index, 'name', event.target.value)} required placeholder="Member’s full name" /></label>
      <label className="field">Relation to receiver *<select value={member.relation} onChange={event => updateMember(index, 'relation', event.target.value)} required><option value="" disabled>Select relation</option>{relations.map(relation => <option key={relation} value={relation}>{relation}</option>)}</select></label>
      <button type="button" className="text-btn" aria-label={`Remove member ${index + 1}`} onClick={() => setMembers(current => current.filter((_, position) => position !== index))}>Remove member</button>
    </div>)}</div>
    <button className="text-btn add-member" type="button" onClick={() => setMembers(current => [...current, { name: '', relation: '' }])}><Icon name="plus" />Add another member</button>
    <label className="check-field"><input checked={full} onChange={event => setFull(event.target.checked)} type="checkbox" /><span>Family is complete — generate an active QR card</span></label>
    <p className="error" role="alert">{error}</p><button className="btn primary full" disabled={saving}>{saving ? 'Saving…' : 'Register family'}</button>
  </form>
}
