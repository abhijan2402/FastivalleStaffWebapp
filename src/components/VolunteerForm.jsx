import { useState } from 'react'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function VolunteerForm() {
  const { dialog, saveVolunteer, staffMutationBusy } = useWorkspace()
  const volunteer = dialog.volunteer
  const [form, setForm] = useState({ name: volunteer?.name || '', email: volunteer?.email || '', phone: volunteer?.phone || '' })
  const [error, setError] = useState(''), [needsReview, setNeedsReview] = useState(false)
  const field = name => ({ value: form[name], onChange: event => setForm(current => ({ ...current, [name]: event.target.value })) })
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!form.name.trim() || !form.phone.trim() || (!volunteer && !form.email.trim())) { setError('Enter a name, email and phone number.'); return }
    try { await saveVolunteer(form, volunteer?.id) }
    catch (issue) {
      const uncertain = !issue.status || issue.status < 400 || issue.status >= 500
      setNeedsReview(uncertain)
      setError(uncertain ? `${issue.message} The request may have been saved. Close this form and refresh volunteers before trying again.` : issue.message)
    }
  }
  return <form onSubmit={submit}>
    <fieldset className="family-form-fields" disabled={staffMutationBusy || needsReview}>
      <label className="field">Volunteer name<input {...field('name')} required autoComplete="name" /></label>
      <label className="field">Email<input {...field('email')} type="email" required disabled={!!volunteer} autoComplete="email" /></label>
      <label className="field">Phone number<input {...field('phone')} type="tel" required autoComplete="tel" /></label>
    </fieldset>
    <p className="error" role="alert">{error}</p>
    <button className="btn primary full" disabled={staffMutationBusy || needsReview}>{staffMutationBusy ? 'Saving…' : volunteer ? 'Save volunteer' : 'Create volunteer'}</button>
  </form>
}
