import { useState } from 'react'
import { currentDay } from '../domain.mjs'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitForm() {
  const { planUnit, demoMode, dialog, state, foodMutationBusy } = useWorkspace()
  const unit = state.units.find(item => item.id === dialog.unitId)
  const [form, setForm] = useState(() => {
    const parts = unit?.dateTime ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(unit.dateTime)) : '12:00'
    return { name: unit?.name || '', date: unit?.date || currentDay(), time: parts, location: unit?.location || '', packs: unit?.packs ?? '', price: unit?.price ?? '', currency: unit?.currency || 'BDT', isActive: unit?.isActive !== false }
  })
  const [saving, setSaving] = useState(false), [needsReview, setNeedsReview] = useState(false)
  const [items, setItems] = useState(unit?.items || []), [draft, setDraft] = useState(''), [error, setError] = useState('')
  const field = name => ({ value: form[name], onChange: event => setForm(current => ({ ...current, [name]: event.target.value })) })
  function addItem() {
    if (!draft.trim()) return
    setItems(current => [...current, draft.trim()])
    setDraft('')
    setError('')
  }
  async function submit(event) {
    event.preventDefault()
    const foodItems = draft.trim() ? [...items, draft.trim()] : items
    if (!foodItems.length) { setError('Add at least one food item.'); return }
    const packs = Number(form.packs), price = Number(form.price)
    if (!form.name.trim() || (!demoMode && !form.location.trim())) { setError('Enter a name and location.'); return }
    if (!Number.isInteger(packs) || packs < 1 || packs < (unit?.served || 0) || !Number.isFinite(price) || price < 0) { setError('Enter a valid cost and pack count. Packs cannot be fewer than those already served.'); return }
    setSaving(true); setError('')
    try { await planUnit({ ...form, name: form.name.trim(), location: form.location.trim(), items: foodItems, packs, price }, unit?.id) }
    catch (issue) {
      const uncertain = !demoMode && (!issue.status || issue.status >= 500)
      setNeedsReview(uncertain)
      setError(uncertain ? `${issue.message} The request may have been saved. Close this form and refresh food events before trying again.` : issue.message)
    } finally { setSaving(false) }
  }
  return <form onSubmit={submit}><fieldset disabled={saving || foodMutationBusy || needsReview} className="family-form-fields">
    <label className="field">Distribution name *<input {...field('name')} required placeholder="e.g. Lunch" /></label>
    {!demoMode && <><label className="field">Location *<input {...field('location')} required placeholder="Community centre" /></label><label className="field">Distribution time (India time) *<input {...field('time')} type="time" required /></label></>}
    <div className="form-grid"><label className="field">Distribution date *<input {...field('date')} type="date" required /></label><label className="field">Number of packs *<input {...field('packs')} type="number" min="1" max="100000" required placeholder="200" /></label></div>
    <label className="field" htmlFor="food-item">Food items *</label>
    <div className="inline-form"><input id="food-item" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addItem() } }} placeholder="Type an item, then press Enter" /><button type="button" className="btn secondary" onClick={addItem} disabled={!draft.trim()}>Add item</button></div>
    <p className="small-note">Add each food item separately, for example Dal, Rice, then Vegetables.</p>
    <ul className="food-item-list" aria-label="Added food items">{items.map((item, index) => <li key={index}><span>{item}</span><button type="button" className="icon-btn" aria-label={`Remove ${item}`} onClick={() => setItems(current => current.filter((_, position) => position !== index))}>×</button></li>)}</ul>
    <p className="error" role="alert">{error}</p>
    <label className="field">Total cost ({form.currency}) *<input {...field('price')} type="number" min="0" step="0.01" required placeholder="16000" /></label>
    {!demoMode && !unit && <><label className="field">Currency<input {...field('currency')} pattern="[A-Z]{3}" maxLength="3" required /></label><label className="check-field"><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} />Active event</label></>}
    </fieldset><button className="btn primary full" disabled={saving || foodMutationBusy || needsReview}>{saving ? 'Saving…' : unit ? 'Save food event' : 'Create food unit'}</button>
  </form>
}
