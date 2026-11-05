import { useState } from 'react'
import Badge from './Badge.jsx'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function ProfileForm() {
  const { profile, demoMode, loading, signOut, roleLabel, updateProfile, openDialog, install } = useWorkspace()
  const [form, setForm] = useState(() => ({ ...profile }))
  if (!demoMode) return <><div className="account-role"><Badge text={roleLabel} kind="green" /><p>Profile loaded from the API.</p></div><dl><dt>Name</dt><dd>{profile.name}</dd><dt>Email</dt><dd>{profile.email || '—'}</dd><dt>Contact</dt><dd>{profile.contact || '—'}</dd></dl><p className="small-note">Contact your administrator to update your profile.</p><button className="btn primary full" disabled={loading} onClick={signOut}>{loading ? 'Signing out…' : 'Sign out'}</button></>
  return <><div className="account-role"><Badge text={roleLabel} kind="green" /><p>You’re exploring with a demo account. Data is saved in this browser.</p></div><form onSubmit={event => { event.preventDefault(); updateProfile(form) }}><label className="field">Name<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} required /></label><label className="field">Contact<input value={form.contact} onChange={event => setForm(current => ({ ...current, contact: event.target.value }))} required /></label><button className="btn secondary full">Save profile</button></form><hr /><button className="btn primary full" onClick={() => openDialog('login')}>Switch demo account</button><div className="profile-tools"><button className="text-btn" onClick={install}><Icon name="download" />Install app</button></div><button className="text-btn reset-btn" onClick={() => openDialog('reset')}>Reset demo data</button></>
}
