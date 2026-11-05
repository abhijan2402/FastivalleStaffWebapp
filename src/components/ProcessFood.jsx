import { useState } from 'react'
import Badge from './Badge.jsx'
import { recipients, familyMembers, foodItemsText } from '../domain.mjs'
import { useWorkspace } from '../state/WorkspaceContext.jsx'

export default function ProcessFood({ family }) {
  const { state, demoMode, todayUnits, unitId, confirmServing } = useWorkspace()
  const [step, setStep] = useState('members')
  const [selected, setSelected] = useState([])
  const [eventId, setEventId] = useState(() => todayUnits.some(unit => unit.id === unitId) ? unitId : '')
  const people = recipients(family)
  const members = familyMembers(family)
  const event = todayUnits.find(unit => unit.id === eventId)
  const alreadyProcessed = event && state.servings.some(entry => entry.family === family.id && entry.unit === eventId && (!entry.memberIds || entry.memberIds.some(id => selected.includes(id))))
  const enoughPacks = event && event.packs - event.served >= selected.length
  return <div className="process-food">
    <p className="subtle">{step === 'members' ? 'Step 1 of 2 · Select recipients' : 'Step 2 of 2 · Choose food event'}</p>
    <section className="scan-family-details">
      {family.photo && <img className="scanned-photo" src={family.photo} alt={family.name} />}
      <h3>{family.name}</h3>
      <p>{family.id}</p>
      {family.mobile && <p>Mobile: {family.mobile}</p>}
      {family.email && <p>Email: {family.email}</p>}
      <p>{people.length} members · {family.status === 'full' ? 'Complete profile' : 'Open profile'}</p>
      <Badge text="Active card" kind="green" />
    </section>
    {step === 'members' ? <>
      <h3>Select who will receive food</h3>
      <p className="small-note">Select self and/or family members. One food pack is recorded per person.</p>
      <fieldset className="recipient-list"><legend className="sr-only">Family members</legend>{people.map((name, id) => <label className="recipient-option" key={id}>
        <input type="checkbox" checked={selected.includes(id)} onChange={e => setSelected(current => e.target.checked ? [...current, id] : current.filter(value => value !== id))} />
        <span><strong>{name}</strong><small>{id === 0 ? 'Self · card holder' : members[id].relation || 'Family member'}</small></span>
      </label>)}</fieldset>
      <button className="btn primary full" disabled={!selected.length} onClick={() => setStep('event')}>Next</button>
    </> : <>
      <div className="serve-summary"><span>Selected recipients</span><strong>{selected.map(id => people[id]).join(', ')}</strong></div>
      <label className="field">Food event (today only)<select value={event ? eventId : ''} onChange={e => setEventId(e.target.value)}>
        <option value="">Choose a food event</option>
        {todayUnits.map(unit => <option value={unit.id} key={unit.id} disabled={unit.served >= unit.packs}>{unit.name} · {unit.packs - unit.served} packs left</option>)}
      </select></label>
      {!todayUnits.length && <p role="status" className="small-note">No food events are scheduled for today. Ask a field agent to create one.</p>}
      {event && <div className="food-event-details"><h3>{event.name}</h3><p>{foodItemsText(event.items)}</p><p>{event.date}</p><p>{selected.length} food pack{selected.length === 1 ? '' : 's'}</p></div>}
      {alreadyProcessed && <p role="alert" className="error">Already processed: one or more selected people have an entry for this event. Go back to change recipients.</p>}
      {event && !enoughPacks && <p role="alert" className="error">Not enough packs for the selected people. Choose another event or fewer recipients.</p>}
      <p className="small-note">{demoMode ? 'Process food updates the entry. Food is handed over to the selected people outside the app.' : 'Sample processing only: no food entry or pack count will be saved to the API.'}</p>
      <div className="process-actions"><button className="btn secondary" onClick={() => setStep('members')}>Back</button><button className="btn primary" disabled={!event || !enoughPacks || alreadyProcessed || !selected.length} onClick={() => confirmServing(eventId, selected)}>Process food</button></div>
    </>}
  </div>
}
