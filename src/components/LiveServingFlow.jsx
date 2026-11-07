import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
import { canServeEvent, receiverIdFromQr } from '../lib/serving.mjs'
import { foodItemsText } from '../domain.mjs'
import QrScanner from './QrScanner.jsx'

export default function LiveServingFlow() {
  const { loadServingEvents, loadEligibleMembers, assignFood, online, dialog } = useWorkspace()
  const [events, setEvents] = useState([]), [eventsLoading, setEventsLoading] = useState(true), [eventsError, setEventsError] = useState('')
  const [eventId, setEventId] = useState(''), [receiverId, setReceiverId] = useState('')
  const [family, setFamily] = useState(null), [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [needsCheck, setNeedsCheck] = useState(false), [result, setResult] = useState(null)
  const [eventRefresh, setEventRefresh] = useState(0), [eligibilityRefresh, setEligibilityRefresh] = useState(0)
  const pending = useRef(false), generation = useRef(0)
  const event = events.find(item => item.id === eventId)

  useEffect(() => {
    let cancelled = false
    setEventsLoading(true); setEventsError('')
    loadServingEvents().then(items => { if (!cancelled) setEvents(items) })
      .catch(issue => { if (!cancelled) { setEvents([]); setEventsError(issue.message) } })
      .finally(() => { if (!cancelled) setEventsLoading(false) })
    return () => { cancelled = true }
  }, [loadServingEvents, eventRefresh])

  useEffect(() => {
    const current = ++generation.current
    setFamily(null); setSelected([]); setError('')
    if (!receiverId || !eventId) { setLoading(false); return }
    setLoading(true)
    loadEligibleMembers(eventId, receiverId).then(value => {
      if (generation.current === current) { setFamily(value); setNeedsCheck(false) }
    }).catch(issue => { if (generation.current === current) setError(issue.message) })
      .finally(() => { if (generation.current === current) setLoading(false) })
    return () => { generation.current++ }
  }, [eventId, receiverId, eligibilityRefresh, loadEligibleMembers])

  function scan(code) {
    try { setReceiverId(receiverIdFromQr(code)); setError('') }
    catch (issue) { setError(issue.message) }
  }
  function resetFamily() {
    setReceiverId(''); setFamily(null); setSelected([]); setError(''); setResult(null); setNeedsCheck(false)
  }
  async function proceed() {
    if (pending.current || !family || !canServeEvent(event) || needsCheck || !online || !selected.length) return
    const ids = family.members.filter(member => member.eligible && selected.includes(member.id)).map(member => member.id)
    if (ids.length !== selected.length) return
    pending.current = true; setSaving(true); setError('')
    const current = generation.current
    try {
      await assignFood(eventId, receiverId, ids, family.foodCardId)
      if (current !== generation.current) return
      setResult({ names: family.members.filter(member => ids.includes(member.id)).map(member => member.name), count: ids.length })
      setFamily(null); setSelected([]); setEventRefresh(value => value + 1)
    } catch (issue) {
      if (current !== generation.current) return
      setNeedsCheck(true); setSelected([])
      setError(`${issue.message} ${!issue.status || issue.status >= 500 ? 'The request may have been saved. ' : ''}Refresh eligibility before trying again.`)
    } finally { pending.current = false; setSaving(false) }
  }

  return <div className="live-serving">
    <section className="panel serving-event-picker" aria-label="Choose serving event">
      <h2>Scan &amp; serve</h2>
      <p className="small-note">Choose a food event, scan a family QR code, then select who will receive food.</p>
      <label className="field">Food event<select aria-label="Food event" value={event ? eventId : ''} disabled={saving || eventsLoading || !!result} onChange={e => { resetFamily(); setEventId(e.target.value) }}>
        <option value="">Choose a food event</option>
        {events.map(item => <option key={item.id} value={item.id} disabled={!canServeEvent(item)}>{item.name} · {Math.max(0, item.packs - item.served)} packs left{!canServeEvent(item) ? ' · Unavailable' : ''}</option>)}
      </select></label>
      {!receiverId && !result && <button className="btn secondary" disabled={saving || eventsLoading || !online} onClick={() => setEventRefresh(value => value + 1)}>Refresh food events</button>}
      {eventsLoading && <p role="status">Loading food events…</p>}
      {eventsError && <p role="alert" className="error">{eventsError}</p>}
      {!eventsLoading && !eventsError && !events.length && <div className="empty"><h3>No food events available</h3><p>No food events are available for your account. Ask a field agent to check that an event is active, then refresh.</p></div>}
      {event && <div className="food-event-details"><h3>{event.name}</h3><p>{foodItemsText(event.items)}</p>{event.location && <p>{event.location}</p>}<p>{new Date(event.dateTime).toLocaleString()}</p></div>}
      {!online && <p role="alert" className="error">You are offline. Reconnect before checking eligibility or assigning food.</p>}
    </section>

    {event && canServeEvent(event) && !eventsLoading && !receiverId && !result && <QrScanner key={eventId} onScan={scan} paused={!!dialog || !online} />}
    {event && !canServeEvent(event) && !result && <p role="status">This event is unavailable. Choose another food event.</p>}
    {loading && <section className="panel" role="status">Checking eligible family members…</section>}
    {receiverId && !loading && !result && <section className="panel process-food" aria-label="Eligible family members">
      <h2>{family?.name || receiverId}</h2>
      <p className="small-note">Select eligible members. One food pack will be assigned per person.</p>
      {family && <fieldset className="recipient-list" disabled={saving || needsCheck || !online}><legend className="sr-only">Family members</legend>
        {family.members.map(member => <label className="recipient-option" key={member.id}>
          <input type="checkbox" disabled={!member.eligible} checked={selected.includes(member.id)} onChange={e => setSelected(current => e.target.checked ? [...current, member.id] : current.filter(id => id !== member.id))} />
          <span><strong>{member.name}</strong><small>{member.relation}{!member.eligible && ` · ${member.reason}`}</small></span>
        </label>)}
      </fieldset>}
      {family && !family.members.some(member => member.eligible) && <p role="status">No family members are eligible for this food event.</p>}
      {family && selected.length > Math.max(0, (event?.packs || 0) - (event?.served || 0)) && <p role="alert" className="error">Not enough packs for the selected members. Choose fewer people.</p>}
      <div className="photo-actions">
        <button className="btn primary" disabled={saving || loading || needsCheck || !online || !canServeEvent(event) || !selected.length || selected.length > event.packs - event.served} onClick={proceed}>{saving ? 'Assigning food…' : 'Proceed'}</button>
        <button className="btn secondary" disabled={saving || !online} onClick={() => { setNeedsCheck(true); setEligibilityRefresh(value => value + 1) }}>Refresh eligibility</button>
        <button className="btn secondary" disabled={saving} onClick={resetFamily}>Scan another family</button>
      </div>
    </section>}
    {error && <p className="error" role="alert">{error}</p>}
    {result && <section className="panel serve-confirm" role="status"><h2>Food assigned successfully</h2><p>{result.count} food pack{result.count === 1 ? '' : 's'} assigned to {result.names.join(', ')}.</p><button className="btn primary" disabled={eventsLoading} onClick={resetFamily}>Scan next family</button></section>}
  </div>
}
