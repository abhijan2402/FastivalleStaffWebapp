import Icon from '../components/Icon.jsx'
import PageHeading from '../components/PageHeading.jsx'
import StatCard from '../components/StatCard.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function ImpactView() {
  const { state, ownServings, share } = useWorkspace()
  const target = Math.ceil((state.total + 1) / 500) * 500
  const milestones = [{ count: 1000, date: '2026-10-28' }, ...state.milestones]
  return <>
    <PageHeading eyebrow="SMALL ACTS. SHARED TABLES." title="Look what we can do together." subtitle="Behind every number is a meal, a family, and someone who showed up." />
    <section className="impact-hero"><span className="eyebrow">OUR COLLECTIVE IMPACT</span><h2>{state.total.toLocaleString()}</h2><p>meals shared. Countless reasons to care.</p><div className="progress"><span style={{ width: state.total / target * 100 + '%' }}></span></div><p className="subtle">{target - state.total} meals until our next {target.toLocaleString()}-meal celebration</p><button className="btn primary" onClick={() => share()}><Icon name="heart" />Share our impact</button></section>
    <div className="stats-grid three"><StatCard icon="users" label="Families in our community" value={state.families.length} detail="Growing, one family at a time" /><StatCard icon="box" label="Planned food packs" value={state.units.reduce((sum, unit) => sum + unit.packs, 0)} detail="Across every food unit" /><StatCard icon="heart" label="Your demo servings" value={ownServings.length} detail="Thank you for showing up" /></div>
    <section className="panel"><h2>Reasons to celebrate</h2><p className="subtle">Milestones appear automatically as the demo reaches each 50-meal mark.</p><div className="milestone-grid">{milestones.map(milestone => <article key={milestone.count} className="milestone"><span>✳</span><h3>{milestone.count.toLocaleString()} meals</h3><p>One community. So much care.</p><small>{new Date(milestone.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small><button className="text-btn" onClick={() => share(milestone.count)}>Share celebration <Icon name="arrow" /></button></article>)}</div></section>
  </>
}
