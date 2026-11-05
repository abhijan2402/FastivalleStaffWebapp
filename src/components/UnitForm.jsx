import { useState } from 'react'
import { foodItemForForm, serializeFoodItems } from '../lib/foodItems.mjs'
import { eventDateTime, eventTimeParts, localTimeZone, timeZoneOptions } from '../lib/eventTime.mjs'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitForm() {
  const { planUnit, demoMode, dialog, state, foodMutationBusy } = useWorkspace()
  const unit = state.units.find(item => item.id === dialog.unitId)
  const [form, setForm] = useState(() => {
    const timeZone = unit?.timeZone || localTimeZone()
    const parts = eventTimeParts(unit?.dateTime || new Date(), timeZone)
    return { name: unit?.name || '', date: unit?.dateTime ? parts.date : unit?.date || parts.date, time: unit?.dateTime ? parts.time : '12:00', timeZone, location: unit?.location || '', packs: unit?.packs ?? '', price: unit?.price ?? '', currency: unit?.currency || 'BDT', isActive: unit?.isActive !== false, mealType: unit?.mealType || 'SINGLE_MEAL', mealsPerPerson: unit?.mealsPerPerson ?? 1 }
  })
  const [zones] = useState(() => timeZoneOptions(form.timeZone))
  const [saving, setSaving] = useState(false), [needsReview, setNeedsReview] = useState(false)
  const [items, setItems] = useState(() => demoMode ? unit?.items || [] : (unit?.items || []).map(foodItemForForm)), [draft, setDraft] = useState(''), [error, setError] = useState('')
  const field = name => ({ value: form[name], onChange: event => setForm(current => ({ ...current, [name]: event.target.value })) })
  function addItem() {
    if (!draft.trim()) return
    setItems(current => [...current, demoMode ? draft.trim() : { name: draft.trim(), quantity: '', unit: '', price: '' }])
    setDraft('')
    setError('')
  }
  async function submit(event) {
    event.preventDefault()
    let foodItems
    try {
      if (!demoMode && draft.trim()) throw Error('Click Add item and enter its quantity, unit and price before saving.')
      foodItems = demoMode ? (draft.trim() ? [...items, draft.trim()] : items) : serializeFoodItems(items)
    } catch (issue) { setError(issue.message); return }
    const mealsPerPerson = form.mealType === 'SINGLE_MEAL' ? 1 : Number(form.mealsPerPerson)
    if (!Number.isInteger(mealsPerPerson) || mealsPerPerson < 1) { setError('Enter a whole-number meals per person greater than zero.'); return }
    if (!foodItems.length) { setError('Add at least one food item.'); return }
    const packs = Number(form.packs), price = Number(form.price)
    if (!form.name.trim() || (!demoMode && !form.location.trim())) { setError('Enter a name and location.'); return }
    if (!Number.isInteger(packs) || packs < 1 || packs < (unit?.served || 0) || !Number.isInteger(price) || price < 0) { setError('Enter a whole-number cost and pack count. Packs cannot be fewer than those already served.'); return }
    let dateTime
    try { dateTime = eventDateTime(form.date, form.time, form.timeZone) }
    catch (issue) { setError(issue.message); return }
    setSaving(true); setError('')
    try { await planUnit({ ...form, name: form.name.trim(), location: form.location.trim(), items: foodItems, packs, price, dateTime, mealsPerPerson }, unit?.id) }
    catch (issue) {
      const uncertain = !demoMode && (!issue.status || issue.status >= 500)
      setNeedsReview(uncertain)
      setError(uncertain ? `${issue.message} The request may have been saved. Close this form and refresh food events before trying again.` : issue.message)
    } finally { setSaving(false) }
  }
  return <form onSubmit={submit}><fieldset disabled={saving || foodMutationBusy || needsReview} className="family-form-fields">
    <label className="field">Distribution name *<input {...field('name')} required placeholder="e.g. Lunch" /></label>
    {!demoMode && <label className="field">Location *<input {...field('location')} required placeholder="Community centre" /></label>}
    <label className="field">Timezone *<select {...field('timeZone')} required>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select></label>
    <p className="small-note">Defaults to your device’s local timezone. Set it before entering the distribution time.</p>
    <label className="field">Distribution time *<input {...field('time')} type="time" step="60" required /></label>
    <div className="form-grid"><label className="field">Distribution date *<input {...field('date')} type="date" required /></label><label className="field">Number of packs *<input {...field('packs')} type="number" step="1" min="1" max="100000" required placeholder="200" /></label></div>
    {!demoMode && <div className="form-grid">
      <label className="field">Meal type<select aria-label="Meal type" value={form.mealType} onChange={event => setForm(current => ({ ...current, mealType: event.target.value, mealsPerPerson: event.target.value === 'FULL_DAY' ? 3 : 1 }))}><option value="SINGLE_MEAL">Single meal</option><option value="FULL_DAY">Full day</option></select></label>
      <label className="field">Meals per person<input {...field('mealsPerPerson')} type="number" min="1" step="1" required readOnly={form.mealType === 'SINGLE_MEAL'} /></label>
    </div>}
    <label className="field" htmlFor="food-item">Food items *</label>
    <div className="inline-form"><input id="food-item" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addItem() } }} placeholder="Type an item, then press Enter" /><button type="button" className="btn secondary" onClick={addItem} disabled={!draft.trim()}>Add item</button></div>
    <p className="small-note">{demoMode ? 'Add each food item separately, for example Dal, Rice, then Vegetables.' : 'Add each food item with its quantity, unit and total price.'}</p>
    {demoMode ? <ul className="food-item-list" aria-label="Added food items">{items.map((item, index) => <li key={index}><span>{item}</span><button type="button" className="icon-btn" aria-label={`Remove ${item}`} onClick={() => setItems(current => current.filter((_, position) => position !== index))}>×</button></li>)}</ul> : <div className="food-item-editor">{items.map((item, index) => <fieldset className="food-item-fields" key={index}>
      <legend>Food item {index + 1}</legend>
      <div className="form-grid">{[['name', 'Item name', 'text'], ['quantity', 'Quantity', 'text'], ['unit', 'Unit', 'text'], ['price', `Item price (${form.currency})`, 'text']].map(([key, label, type]) => <label className="field" key={key}>{label}<input type={type} inputMode={['quantity', 'price'].includes(key) ? 'decimal' : undefined} value={item[key]} required placeholder={key === 'unit' ? 'e.g. kg, litre, portion' : undefined} onChange={event => setItems(current => current.map((entry, position) => position === index ? { ...entry, [key]: event.target.value } : entry))} /></label>)}</div>
      <button type="button" className="text-btn" aria-label={`Remove ${item.name || 'item ' + (index + 1)}`} onClick={() => setItems(current => current.filter((_, position) => position !== index))}>Remove item</button>
    </fieldset>)}</div>}

    <p className="error" role="alert">{error}</p>
    <label className="field">Total cost ({form.currency}) *<input {...field('price')} type="number" min="0" step="1" required placeholder="16000" /></label>
    {!demoMode && <><label className="field">Currency<input {...field('currency')} pattern="[A-Z]{3}" maxLength="3" required /></label><label className="check-field"><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} />Active event</label></>}
    </fieldset><button className="btn primary full" disabled={saving || foodMutationBusy || needsReview}>{saving ? 'Saving…' : unit ? 'Save food event' : 'Create food unit'}</button>
  </form>
}
