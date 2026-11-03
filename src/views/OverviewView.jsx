import Icon from '../components/Icon.jsx'
import PageHeading from '../components/PageHeading.jsx'
import StatCard from '../components/StatCard.jsx'
import UnitCard from '../components/UnitCard.jsx'
import HeroArt from '../components/HeroArt.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
const quickActions = [['users', 'Register a family', 'Help a new family get started', 'family-form'], ['box', 'Plan a food unit', 'Prepare for your next distribution', 'unit-form'], ['scan', 'Scan a family card', 'One scan. One meal. One smile.', 'scan']]
export default function OverviewView() {
  const { state, profile, todayUnits, navigate, openDialog } = useWorkspace()
  const meals = todayUnits.reduce((sum, unit) => sum + unit.served, 0)
  const remaining = todayUnits.reduce((sum, unit) => sum + unit.packs - unit.served, 0)
  const target = Math.ceil((state.total + 1) / 500) * 500
  return <>
    <PageHeading eyebrow="MONDAY, 2 NOVEMBER 2026" title="A little care. A big difference." subtitle={`Welcome back, ${profile.name.split(' ')[0]}. Here’s what’s happening in your community.`}><button className="btn primary" onClick={() => navigate('scan')}><Icon name="scan" />Scan & serve</button></PageHeading>
    <section className="hero"><div className="hero-content"><div className="hero-label"><span className="live-dot"></span> HERE FOR OUR COMMUNITY</div><h2>Good food.<br />A little more hope.</h2><p>Every family reached is a reason to keep going.<br />Let’s make today count, together.</p><button className="btn cream" onClick={() => navigate('scan')}>Start serving <Icon name="arrow" /></button></div><HeroArt /></section>
    <section className="stats-grid"><StatCard icon="box" label="Meals served today" value={meals} detail="↑ 24 since this morning" kind="green" /><StatCard icon="users" label="Families registered" value={state.families.length} detail={`${state.families.filter(family => family.card === 'active').length} active family cards`} /><StatCard icon="leaf" label="Packs remaining" value={remaining} detail={`Across ${todayUnits.length} food units`} /><StatCard icon="heart" label="All-time meals" value={state.total.toLocaleString()} detail="Every meal makes a difference" kind="orange" /></section>
    <div className="dashboard-grid">
      <section className="panel distributions"><div className="section-title"><div><h2>Today’s distributions <span className="count">{todayUnits.length}</span></h2><p>A shared purpose. One food unit at a time.</p></div><button className="text-btn" onClick={() => navigate('units')}>View all <Icon name="arrow" /></button></div>{todayUnits.map(unit => <UnitCard key={unit.id} unit={unit} />)}</section>
      <section className="panel quick-panel"><div className="section-title"><h2>Make a difference</h2></div>{quickActions.map(([icon, title, subtitle, action]) => <button key={action} className="quick-action" onClick={() => action === 'scan' ? navigate('scan') : openDialog(action)}><span className="quick-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><Icon name="arrow" /></button>)}<div className="offline-note"><Icon name="check" /><div><strong>Built for the field</strong><p>Keep going, even without a signal.<br />Your demo changes stay on this device.</p></div></div></section>
      <section className="panel activity-panel"><div className="section-title"><h2>A little good, lately</h2><span className="subtle">Recent activity</span></div>{state.activity.slice(0, 3).map((activity, index) => <div key={index} className="activity"><span className={`activity-icon ${index === 1 ? 'sand' : ''}`}><Icon name={index === 1 ? 'users' : 'check'} /></span><div><p><strong>{activity.name}</strong> {activity.text}</p><small>{activity.detail}</small></div><time>{activity.time}</time></div>)}</section>
      <section className="impact-teaser"><span className="eyebrow">GROWING TOGETHER</span><div className="impact-number">{state.total.toLocaleString()} <span>meals & counting</span><Icon name="heart" /></div><div className="progress"><span style={{ width: Math.min(100, state.total / target * 100) + '%' }}></span></div><div className="progress-label"><span>Our next little celebration</span><strong>{target.toLocaleString()} meals</strong></div><button className="text-btn" onClick={() => navigate('impact')}>See our collective impact <Icon name="arrow" /></button></section>
    </div>
  </>
}
