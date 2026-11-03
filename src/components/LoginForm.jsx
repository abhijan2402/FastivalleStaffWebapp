import { useState } from 'react'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function LoginForm() {
  const { signIn } = useWorkspace()
  const [email, setEmail] = useState('agent@fastivalle.demo'), [password, setPassword] = useState('demo123'), [error, setError] = useState('')
  function fill(role) { setEmail(`${role}@fastivalle.demo`); setPassword('demo123'); setError('') }
  function submit(event) { event.preventDefault(); try { signIn(email, password) } catch (issue) { setError(issue.message) } }
  return <><p className="subtle">One app. A shared purpose. Sign in with a demo account.</p><div className="demo-accounts"><button data-action="fill:agent" onClick={() => fill('agent')}><strong>Field Agent</strong><small>agent@fastivalle.demo</small></button><button data-action="fill:volunteer" onClick={() => fill('volunteer')}><strong>Volunteer</strong><small>volunteer@fastivalle.demo</small></button></div><form onSubmit={submit}><label className="field">Email<input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="username" required /></label><label className="field">Password<input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label><p className="small-note">Demo password for both accounts: <b>demo123</b></p><p className="error" role="alert">{error}</p><button className="btn primary full">Sign in to your workspace <Icon name="arrow" /></button></form></>
}
