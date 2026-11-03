import { useState } from 'react'
import { DEMO_DAY, useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitForm() {
  const { planUnit } = useWorkspace()
  const [form, setForm] = useState({ name: '', date: DEMO_DAY, packs: '', items: '', price: '', area: 'Korail · Block A' })
  const field = name => ({ value: form[name], onChange: event => setForm(current => ({ ...current, [name]: event.target.value })) })
  function submit(event) { event.preventDefault(); planUnit({ ...form, name: form.name.trim(), items: form.items.trim(), packs: Number(form.packs), price: Number(form.price) }) }
  return <><p className="subtle">Get everything ready for your next community distribution.</p><form onSubmit={submit}><label className="field">Distribution name *<input {...field('name')} required placeholder="e.g. Community lunch" /></label><div className="form-grid"><label className="field">Distribution date *<input {...field('date')} type="date" required /></label><label className="field">Number of packs *<input {...field('packs')} type="number" min="1" max="100000" required placeholder="200" /></label></div><label className="field">Food items *<input {...field('items')} required placeholder="Rice, dal, vegetables & egg" /></label><div className="form-grid"><label className="field">Total cost (BDT) *<input {...field('price')} type="number" min="0" step="0.01" required placeholder="16000" /></label><label className="field">Community<select {...field('area')}><option>Korail · Block A</option><option>Korail · Block B</option><option>Korail · Block C</option></select></label></div><button className="btn primary full">Create food unit</button></form></>
}
