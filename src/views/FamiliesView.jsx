import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Badge from '../components/Badge.jsx'
import PageHeading from '../components/PageHeading.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
const filters = ['All families', 'Active cards', 'Deactivated', 'Open profiles']
export default function FamiliesView() {
  const { state, openDialog } = useWorkspace()
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('All families')
  const families = state.families.filter(family => (family.name + ' ' + family.id).toLowerCase().includes(search.toLowerCase()) && (filter === 'All families' || filter === 'Active cards' && family.card === 'active' || filter === 'Deactivated' && family.card === 'inactive' || filter === 'Open profiles' && family.status === 'open'))
  return <>
    <PageHeading eyebrow="FAMILIES" title="Every family matters." subtitle="Register families and keep their meal cards ready."><button className="btn primary" onClick={() => openDialog('family-form')}><Icon name="plus" />Register family</button></PageHeading>
    <section className="panel"><div className="list-toolbar"><label className="search"><Icon name="search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or family ID" /></label><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter families">{filters.map(option => <option key={option}>{option}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Receiver / family</th><th>Members</th><th>Contact</th><th>Card status</th><th></th></tr></thead><tbody>{families.map(family => <tr key={family.id}><td><div className="family-name"><span className="family-avatar">{family.photo ? <img src={family.photo} alt="" /> : family.name.split(' ').map(name => name[0]).join('')}</span><div><strong>{family.name}</strong><small>{family.id}</small></div></div></td><td>{family.members.length} members</td><td>{family.mobile || family.email || '—'}</td><td><Badge text={family.card === 'active' ? 'Active' : family.card === 'inactive' ? 'Deactivated' : 'Open profile'} kind={family.card === 'active' ? 'green' : family.card === 'inactive' ? 'red' : 'amber'} /></td><td><button className="text-btn" onClick={() => openDialog('family', { familyId: family.id })}>View card <Icon name="arrow" /></button></td></tr>)}</tbody></table></div>{!families.length && <div className="empty">No matching families. Try a different name or filter.</div>}</section>
  </>
}
