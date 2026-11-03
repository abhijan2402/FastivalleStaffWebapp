import { useState } from 'react'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function FamilyForm() {
  const { registerFamily } = useWorkspace()
  const [name, setName] = useState(''), [area, setArea] = useState('Korail · Block A'), [members, setMembers] = useState(['']), [full, setFull] = useState(true)
  const [photo, setPhoto] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    if (photo && photo.size > 2 * 1024 * 1024) { setError('Choose a photo smaller than 2 MB.'); return }
    setSaving(true)
    try {
      let image
      if (photo) image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('The photo could not be read.')); reader.readAsDataURL(photo) })
      registerFamily({ name, area, members: members.map(member => member.trim()), full, photo: image })
    } catch (issue) { setError(issue.message); setSaving(false) }
  }
  return <>
    <p className="subtle">Start with the receiver, then add everyone in their family.</p>
    <form onSubmit={submit}><label className="field">Receiver name *<input value={name} onChange={event => setName(event.target.value)} required placeholder="Full name" /></label><label className="field">Community<select value={area} onChange={event => setArea(event.target.value)}><option>Korail · Block A</option><option>Korail · Block B</option><option>Korail · Block C</option></select></label><label className="field">Photo <span className="subtle">(optional)</span><input type="file" accept="image/*" onChange={event => setPhoto(event.target.files[0])} /></label><label className="field">Family members *<span className="subtle">Include the receiver. Add at least one member.</span></label><div id="member-fields">{members.map((member, index) => <div key={index} className="member-row"><input value={member} onChange={event => setMembers(current => current.map((value, position) => position === index ? event.target.value : value))} required placeholder="Member’s full name" aria-label={`Family member ${index + 1}`} />{index > 0 && <button type="button" className="icon-btn" aria-label="Remove member" onClick={() => setMembers(current => current.filter((_, position) => position !== index))}>×</button>}</div>)}</div><button className="text-btn add-member" type="button" onClick={() => setMembers(current => [...current, ''])}><Icon name="plus" />Add another member</button><label className="check-field"><input checked={full} onChange={event => setFull(event.target.checked)} type="checkbox" /><span>Family is complete — generate an active QR card</span></label><p className="error" role="alert">{error}</p><button className="btn primary full" disabled={saving}>{saving ? 'Saving…' : 'Register family'}</button></form>
  </>
}
