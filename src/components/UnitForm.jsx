import { useState } from 'react'
import { currentDay } from '../domain.mjs'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitForm() {
  const { planUnit } = useWorkspace()
  const [form, setForm] = useState({ name: '', date: currentDay(), packs: '', price: '' })
  const [items, setItems] = useState([]), [draft, setDraft] = useState(''), [error, setError] = useState('')
  const field = name => ({ value: form[name], onChange: event => setForm(current => ({ ...current, [name]: event.target.value })) })
  function addItem() {
    if (!draft.trim()) return
    setItems(current => [...current, draft.trim()])
    setDraft('')
    setError('')
  }
  function submit(event) {
    event.preventDefault()
    const foodItems = draft.trim() ? [...items, draft.trim()] : items
    if (!foodItems.length) { setError('Add at least one food item.'); return }
    planUnit({ ...form, name: form.name.trim(), items: foodItems, packs: Number(form.packs), price: Number(form.price) })
  }
  return <form onSubmit={submit}>
    <label className="field">Distribution name *<input {...field('name')} required placeholder="e.g. Lunch" /></label>
    <div className="form-grid"><label className="field">Distribution date *<input {...field('date')} type="date" required /></label><label className="field">Number of packs *<input {...field('packs')} type="number" min="1" max="100000" required placeholder="200" /></label></div>
    <label className="field" htmlFor="food-item">Food items *</label>
    <div className="inline-form"><input id="food-item" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addItem() } }} placeholder="Type an item, then press Enter" /><button type="button" className="btn secondary" onClick={addItem} disabled={!draft.trim()}>Add item</button></div>
    <p className="small-note">Add each food item separately, for example Dal, Rice, then Vegetables.</p>
    <ul className="food-item-list" aria-label="Added food items">{items.map((item, index) => <li key={index}><span>{item}</span><button type="button" className="icon-btn" aria-label={`Remove ${item}`} onClick={() => setItems(current => current.filter((_, position) => position !== index))}>×</button></li>)}</ul>
    <p className="error" role="alert">{error}</p>
    <label className="field">Total cost (BDT) *<input {...field('price')} type="number" min="0" step="0.01" required placeholder="16000" /></label>
    <button className="btn primary full">Create food unit</button>
  </form>
}
