import { useState } from 'react'
import Badge from './Badge.jsx'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'

export default function ProfileForm() {
  const { profile, demoMode, loading, signOut, roleLabel, updateProfile, openDialog, install } = useWorkspace()
  const [form, setForm] = useState(() => ({ ...profile }))
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  return <div className="profile-content">
    <div className="profile-hero">
      <span className="profile-avatar" aria-hidden="true">{initials}</span>
      <h3>{profile.name}</h3>
      <Badge text={roleLabel} kind="green" />
    </div>
    {!demoMode ? <>
      <section className="profile-details" aria-label="Account details">
        <h3>Account details</h3>
        <dl>
          <div className="profile-detail-row"><span className="profile-detail-icon"><Icon name="mail" /></span><div><dt>Email address</dt><dd>{profile.email || 'Not provided'}</dd></div></div>
          <div className="profile-detail-row"><span className="profile-detail-icon"><Icon name="phone" /></span><div><dt>Phone number</dt><dd>{profile.contact || 'Not provided'}</dd></div></div>
        </dl>
      </section>
      <div className="profile-help"><Icon name="settings" /><p>Need to update your details?<span>Contact your administrator for help.</span></p></div>
      <div className="profile-footer"><button className="btn full profile-signout" disabled={loading} onClick={signOut}><Icon name="out" />{loading ? 'Signing out…' : 'Sign out'}</button></div>
    </> : <>
      <p className="profile-demo-note">You’re exploring with a demo account. Data is saved in this browser.</p>
      <form className="profile-edit" onSubmit={event => { event.preventDefault(); updateProfile(form) }}>
        <label className="field">Name<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} required /></label>
        <label className="field">Contact<input value={form.contact} onChange={event => setForm(current => ({ ...current, contact: event.target.value }))} required /></label>
        <button className="btn secondary full">Save profile</button>
      </form>
      <div className="profile-footer"><button className="btn primary full" onClick={() => openDialog('login')}>Switch demo account</button></div>
      <div className="profile-tools"><button className="text-btn" onClick={install}><Icon name="download" />Install app</button><button className="text-btn profile-reset" onClick={() => openDialog('reset')}>Reset demo data</button></div>
    </>}
  </div>
}
