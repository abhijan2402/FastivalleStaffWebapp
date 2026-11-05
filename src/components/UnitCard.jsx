import Icon from './Icon.jsx'
import { foodItemsText } from '../domain.mjs'
import Badge from './Badge.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitCard({ unit }) {
  const { openUnit, demoMode, role } = useWorkspace()
  const status = unit.isActive === false ? 'Inactive' : unit.status ? unit.status.replaceAll('_', ' ') : unit.served >= unit.packs ? 'Completed' : unit.served ? 'In progress' : 'Planned'
  return <article className="unit-card">
    <div className="unit-top"><span className="unit-icon"><Icon name="box" /></span><div><h3>{unit.name}</h3><span className="location">{unit.id}</span></div><Badge text={status} kind={status === 'In progress' ? 'green' : status === 'Planned' ? 'amber' : 'gray'} /></div>
    {unit.location && <p>{unit.location}</p>}<p className="food-items">{foodItemsText(unit.items)}</p><div className="unit-progress-label"><span><b>{unit.served}</b> / {unit.packs} packs served</span><strong>{unit.packs ? Math.round(unit.served / unit.packs * 100) : 0}%</strong></div>
    <div className="progress"><span style={{ width: (unit.packs ? unit.served / unit.packs * 100 : 0) + '%' }}></span></div>
    <div className="unit-bottom"><span><Icon name="clock" />{unit.dateTime ? new Date(unit.dateTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : unit.date} <span className="cost">· {unit.currency || 'BDT'} {unit.price.toLocaleString()}</span></span><button className="text-btn" onClick={() => openUnit(unit)}>{!demoMode ? (role === 'agent' ? 'Manage event' : 'View event') : status === 'Planned' ? 'View plan' : status === 'Completed' ? 'View summary' : 'Continue serving'} <Icon name="arrow" /></button></div>
  </article>
}
