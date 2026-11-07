import { familyMembers } from '../domain.mjs'
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Badge from '../components/Badge.jsx'
import PageHeading from '../components/PageHeading.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
import { downloadFamilyQrs } from '../lib/qrExport.mjs'
const demoFilters = ['All families', 'Active cards', 'Deactivated', 'Open profiles']
const liveFilters = ['All families', 'Active', 'Inactive']
export default function FamiliesView() {
  const { state, demoMode, familiesLoading, familiesError, refreshFamilies, openDialog } = useWorkspace()
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('All families')
  const [exportError, setExportError] = useState('')
  const qrFamilies = state.families.filter(family => !demoMode || !!family.card)
  function downloadAll() {
    setExportError('')
    try { downloadFamilyQrs(qrFamilies, demoMode) }
    catch { setExportError('Unable to download QR codes. Please try again.') }
  }
  const filters = demoMode ? demoFilters : liveFilters
  function matchesStatus(family) {
    if (filter === 'All families') return true
    if (!demoMode) return filter === 'Active' ? family.isActive === true : family.isActive === false
    return filter === 'Active cards' && family.card === 'active' || filter === 'Deactivated' && family.card === 'inactive' || filter === 'Open profiles' && family.status === 'open'
  }
  function statusBadge(family) {
    if (!demoMode) return <Badge text={family.isActive === true ? 'Active' : family.isActive === false ? 'Inactive' : 'Unknown'} kind={family.isActive === true ? 'green' : family.isActive === false ? 'red' : 'amber'} />
    return <Badge text={family.card === 'active' ? 'Active' : family.card === 'inactive' ? 'Deactivated' : 'Open profile'} kind={family.card === 'active' ? 'green' : family.card === 'inactive' ? 'red' : 'amber'} />
  }
  const families = state.families.filter(family => (family.name + ' ' + family.id).toLowerCase().includes(search.toLowerCase()) && matchesStatus(family))
  return <>
    <PageHeading eyebrow="FAMILIES" title="Every family matters." subtitle="Register families and keep their meal cards ready."><button className="btn primary" onClick={() => openDialog('family-form')}><Icon name="plus" />Register family</button></PageHeading>
    {!demoMode && <section className="panel"><button className="btn secondary" disabled={familiesLoading} onClick={refreshFamilies}>{familiesLoading ? 'Loading families…' : 'Refresh families'}</button>{familiesError && <p className="error" role="alert">{familiesError}</p>}</section>}
    <section className="panel qr-download-panel">
      <button className="btn secondary" disabled={familiesLoading || !!familiesError || !qrFamilies.length} onClick={downloadAll}><Icon name="download" />Download all QR codes ({qrFamilies.length})</button>
      <p className="small-note">Downloads every family’s QR card with name, phone and family ID, including families outside the current filter. Extract the ZIP and open print-all.html to print together or save as PDF.</p>
      {exportError && <p className="error" role="alert">{exportError}</p>}
    </section>
    <section className="panel"><div className="list-toolbar"><label className="search"><Icon name="search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or family ID" /></label><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter families">{filters.map(option => <option key={option}>{option}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Receiver / family</th><th>Members</th><th>Contact</th><th>{demoMode ? 'Card status' : 'Status'}</th><th></th></tr></thead><tbody>{families.map(family => <tr key={family.id}><td><div className="family-name"><span className="family-avatar">{family.photo ? <img crossOrigin="anonymous" src={family.photo} alt="" /> : family.name.split(' ').map(name => name[0]).join('')}</span><div><strong>{family.name}</strong><small>{family.id}</small></div></div></td><td>{familyMembers(family).length} members</td><td>{family.mobile || family.email || '—'}</td><td>{statusBadge(family)}</td><td><button className="text-btn" onClick={() => openDialog('family', { familyId: family.id })}>View card <Icon name="arrow" /></button></td></tr>)}</tbody></table></div>{!families.length && !familiesLoading && !familiesError && <div className="empty">No matching families. Try a different name or filter.</div>}</section>
  </>
}
