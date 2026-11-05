import { useState } from 'react'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function LoginForm() {
  const { signIn, demoMode, loading, apiError } = useWorkspace()
  const [email, setEmail] = useState(demoMode ? 'agent@fastivalle.demo' : ''), [password, setPassword] = useState(demoMode ? 'demo123' : ''), [error, setError] = useState('')
  const [role, setRole] = useState('agent')
  function fill(role) { setEmail(`${role}@fastivalle.demo`); setPassword('demo123'); setError('') }
  async function submit(event) { event.preventDefault(); setError(''); try { await signIn(email, password, role) } catch (issue) { setError(issue.message) } }
  return <><p className="subtle">{demoMode ? 'One app. A shared purpose. Sign in with a demo account.' : 'Sign in with your staff account.'}</p>{demoMode && <div className="demo-accounts"><button data-action="fill:agent" onClick={() => fill('agent')}><strong>Field Agent</strong><small>agent@fastivalle.demo</small></button><button data-action="fill:volunteer" onClick={() => fill('volunteer')}><strong>Volunteer</strong><small>volunteer@fastivalle.demo</small></button></div>}<form onSubmit={submit}>{!demoMode && <label className="field">Account type<select value={role} disabled={loading} onChange={event => setRole(event.target.value)}><option value="agent">Field Manager</option><option value="volunteer">Volunteer</option></select></label>}<label className="field">Email<input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="username" required /></label><label className="field">Password<input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>{demoMode && <p className="small-note">Demo password for both accounts: <b>demo123</b></p>}<p className="error" role="alert">{error || apiError}</p><button className="btn primary full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in to your workspace'} <Icon name="arrow" /></button></form></>
}
