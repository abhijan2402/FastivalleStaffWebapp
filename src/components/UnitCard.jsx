import Icon from './Icon.jsx'
import { currentDay, foodItemsText } from '../domain.mjs'
import Badge from './Badge.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitCard({ unit }) {
  const { openUnit } = useWorkspace()
  const status = unit.served >= unit.packs ? 'Completed' : unit.served ? 'In progress' : 'Planned'
  return <article className="unit-card">
    <div className="unit-top"><span className="unit-icon"><Icon name="box" /></span><div><h3>{unit.name}</h3><span className="location">{unit.id}</span></div><Badge text={status} kind={status === 'In progress' ? 'green' : status === 'Planned' ? 'amber' : 'gray'} /></div>
    <p className="food-items">{foodItemsText(unit.items)}</p><div className="unit-progress-label"><span><b>{unit.served}</b> / {unit.packs} packs served</span><strong>{Math.round(unit.served / unit.packs * 100)}%</strong></div>
    <div className="progress"><span style={{ width: unit.served / unit.packs * 100 + '%' }}></span></div>
    <div className="unit-bottom"><span><Icon name="clock" />{unit.date === currentDay() ? 'Today, 12:00 – 3:00 PM' : unit.date} <span className="cost">· ৳{unit.price.toLocaleString()}</span></span><button className="text-btn" onClick={() => openUnit(unit)}>{status === 'Planned' ? 'View plan' : status === 'Completed' ? 'View summary' : 'Continue serving'} <Icon name="arrow" /></button></div>
  </article>
}
