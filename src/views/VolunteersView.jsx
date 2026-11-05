import { useEffect, useRef, useState } from 'react'
import PageHeading from '../components/PageHeading.jsx'
import Icon from '../components/Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function VolunteersView() {
  const { role, volunteers, volunteersLoading, volunteersError, refreshVolunteers, inspectVolunteer, openDialog, staffMutationBusy } = useWorkspace()
  const [search, setSearch] = useState(''), [viewing, setViewing] = useState(false), [error, setError] = useState('')
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  if (role !== 'agent') return null
  const records = volunteers.filter(record => `${record.name} ${record.email} ${record.phone}`.toLowerCase().includes(search.trim().toLowerCase()))
  async function view(id) {
    setViewing(true); setError('')
    try { const volunteer = await inspectVolunteer(id); if (mounted.current && volunteer) openDialog('volunteer', { volunteer }) } catch (issue) { if (mounted.current) setError(issue.message) } finally { if (mounted.current) setViewing(false) }
  }
  return <>
    <PageHeading eyebrow="YOUR TEAM" title="Volunteers" subtitle="Create volunteer accounts and manage your field team."><button className="btn primary" disabled={staffMutationBusy || viewing} onClick={() => openDialog('volunteer-form')}><Icon name="plus" />Create volunteer</button></PageHeading>
    <section className="panel">
      <div className="list-toolbar"><label className="search"><Icon name="search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search volunteers by name, email or phone" /></label><button className="btn secondary" disabled={volunteersLoading || staffMutationBusy} onClick={refreshVolunteers}>{volunteersLoading ? 'Loading volunteers…' : 'Refresh volunteers'}</button></div>
      {(volunteersError || error) && <p className="error" role="alert">{volunteersError || error}</p>}
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr></thead><tbody>{records.map(volunteer => <tr key={volunteer.id}><td><strong>{volunteer.name}</strong></td><td>{volunteer.email || '—'}</td><td>{volunteer.phone || '—'}</td><td><button className="text-btn" disabled={viewing || staffMutationBusy} onClick={() => view(volunteer.id)}>View volunteer <Icon name="arrow" /></button></td></tr>)}</tbody></table></div>
      {!volunteersLoading && !volunteersError && !records.length && <p className="empty">{search ? 'No matching volunteers.' : 'No volunteers yet. Create a volunteer to grow your team.'}</p>}
    </section>
  </>
}
