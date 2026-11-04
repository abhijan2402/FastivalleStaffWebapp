export function currentDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = type => parts.find(part => part.type === type).value
  return `${value('year')}-${value('month')}-${value('day')}`
}
export function familyMembers(family) {
  const members = family.members.map(member => typeof member === 'string' ? { name: member, relation: member === family.name ? 'Self' : '' } : member)
  return [{ name: family.name, relation: 'Self' }, ...members.filter(member => member.name !== family.name)]
}
export function recipients(family) { return familyMembers(family).map(member => member.name) }
export function foodItemsText(items) { return Array.isArray(items) ? items.join(', ') : items }
export function checkFamilyCard(state, code) {
  const family = state.families.find(family => `${family.id}:${family.version}` === code)
  if (!family) return { ok: false, message: 'Card not recognized', detail: 'This card may have been replaced. Use the latest family card.' }
  if (family.card !== 'active') return { ok: false, message: 'Card is deactivated', detail: 'Ask a Field Agent to review this family card.' }
  return { ok: true, family }
}
export const seed=()=>({families:[{id:'FV-1024',name:'Rahima Begum',members:['Rahima Begum','Karim Uddin','Rafi','Mina'],status:'full',card:'active',version:1},{id:'FV-1025',name:'Abdul Karim',members:['Abdul Karim','Salma Begum','Riya'],status:'full',card:'active',version:1},{id:'FV-1026',name:'Fatema Akter',members:['Fatema Akter','Hasan'],status:'full',card:'active',version:1},{id:'FV-1027',name:'Jamal Hossain',members:['Jamal Hossain','Nusrat','Arif','Sadia','Imran'],status:'full',card:'inactive',version:1},{id:'FV-1028',name:'Ayesha Siddika',members:['Ayesha Siddika','Noor','Lamia'],status:'open',card:null,version:0}],units:[{id:'FU-008',name:'Korail community lunch',date:currentDay(),packs:200,items:['Rice','Dal','Vegetables','Egg'],price:16000,served:124},{id:'FU-009',name:'Evening essentials',date:currentDay(),packs:150,items:['Rice','Dal','Oil','Salt'],price:22500,served:0},{id:'FU-010',name:'Community breakfast',date:currentDay(new Date(Date.now() - 86400000)),packs:100,items:['Khichuri','Boiled egg'],price:6500,served:100}],servings:[],activity:[{name:'Nasima Akter',text:'served a family',detail:'Korail community lunch',time:'12:42 PM'},{name:'You',text:'registered a family',detail:'Ayesha Siddika · 3 members',time:'12:35 PM'},{name:'Rafiq Ahmed',text:'served a family',detail:'Korail community lunch',time:'12:31 PM'}],total:1248,milestones:[],queue:[],profile:{agent:{name:'Arif Rahman',contact:'01712 345678'},volunteer:{name:'Nasima Akter',contact:'01812 345678'}}});
export function serve(state, { code, unitId, memberIds, role, online = true }) {
  const checked = checkFamilyCard(state, code)
  if (!checked.ok) return checked
  const { family } = checked
  const people = recipients(family)
  if (!Array.isArray(memberIds) || !memberIds.length || new Set(memberIds).size !== memberIds.length || memberIds.some(id => !Number.isInteger(id) || id < 0 || id >= people.length)) {
    return { ok: false, message: 'Select family members', detail: 'Select at least one person to receive food.' }
  }
  const unit = state.units.find(unit => unit.id === unitId)
  if (!unit || unit.date !== currentDay()) return { ok: false, message: 'Select today’s food event', detail: 'Choose a food event scheduled for today.' }
  const previous = state.servings.filter(entry => entry.family === family.id && entry.unit === unitId)
  if (previous.some(entry => !entry.memberIds || entry.memberIds.some(id => memberIds.includes(id)))) {
    return { ok: false, message: 'Already processed', detail: 'One or more selected people already have an entry for this food event. Go back and select other members.' }
  }
  if (unit.packs - unit.served < memberIds.length) return { ok: false, message: 'Not enough food packs', detail: 'Choose fewer people or another food event.' }
  const names = memberIds.map(id => people[id])
  const entry = { id: crypto.randomUUID(), family: family.id, unit: unitId, memberIds: [...memberIds], recipients: names, packs: names.length, role, time: new Date().toISOString(), pending: !online }
  unit.served += names.length
  const previousTotal = state.total
  state.total += names.length
  state.servings.unshift(entry)
  if (!online) state.queue.push(entry.id)
  for (let count = (Math.floor(previousTotal / 50) + 1) * 50; count <= state.total; count += 50) state.milestones.unshift({ count, date: entry.time })
  state.activity.unshift({ name: state.profile[role].name, text: 'processed food entries', detail: `${unit.name} · ${names.join(', ')}`, time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) })
  return { ok: true, message: 'Food entry updated', detail: `${names.length} pack${names.length === 1 ? '' : 's'} recorded for ${names.join(', ')}. Food handover takes place outside the app.`, family, entry }
}
export function createFamily(state, { name, members, mobile = '', email = '', full, photo }) {
  if (!name.trim() || !members.length || members.some(member => typeof member === 'string' ? !member.trim() : !member.name?.trim() || !member.relation?.trim())) throw Error('Enter the receiver name and a name and relation for each family member.')
  const family = { id: `FV-${Math.max(1023, ...state.families.map(family => Number(family.id.slice(3)))) + 1}`, name: name.trim(), mobile: mobile.trim(), email: email.trim(), members: members.map(member => typeof member === 'string' ? member.trim() : { name: member.name.trim(), relation: member.relation.trim() }), status: full ? 'full' : 'open', card: full ? 'active' : null, version: full ? 1 : 0, photo }
  state.families.unshift(family)
  return family
}
export function changeCard(f,action){if(action==='deactivate')f.card='inactive';else if(action==='regenerate'||action==='complete'){if(!f.members.length)throw Error('Add at least one family member.');f.version++;f.card='active';f.status='full';}}
