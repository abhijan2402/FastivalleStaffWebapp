import { currentDay } from '../domain.mjs'
import Icon from '../components/Icon.jsx'
import PageHeading from '../components/PageHeading.jsx'
import StatCard from '../components/StatCard.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
const shortcuts = [
  ['scan', 'Scan & serve', 'scan'],
  ['users', 'Register a family', 'family-form'],
  ['box', 'Plan a food unit', 'unit-form'],
  ['users', 'View families', 'families'],
  ['box', 'View food events', 'units'],
]
export default function OverviewView() {
  const { state, demoMode, profile, todayUnits, navigate, openDialog } = useWorkspace()
  const allTodayUnits = state.units.filter(unit => unit.date === currentDay())
  const meals = allTodayUnits.reduce((sum, unit) => sum + unit.served, 0)
  const remaining = todayUnits.reduce((sum, unit) => sum + Math.max(0, unit.packs - unit.served), 0)
  return <>
    <PageHeading title="Dashboard" subtitle={`Welcome, ${profile.name.split(' ')[0]}.`} />
    <section className="stats-grid">
      <StatCard icon="box" label="Meals recorded today" value={meals} detail={`${allTodayUnits.length} food events today`} kind="green" />
      <StatCard icon="users" label="Families registered" value={state.families.length} detail={`${state.families.filter(family => family.card === 'active').length} active cards`} />
      <StatCard icon="leaf" label="Packs remaining today" value={remaining} detail="Available across today’s events" />
      <StatCard icon="heart" label="All-time meals" value={state.total.toLocaleString()} kind="orange" />
    </section>
    <section className="panel"><div className="section-title"><h2>Shortcuts</h2></div><div className="dashboard-shortcuts">
      {[...shortcuts, ...(!demoMode ? [['users', 'Create a volunteer', 'volunteer-form'], ['users', 'View volunteers', 'volunteers']] : [])].map(([icon, label, action]) => <button className="btn secondary" key={action} onClick={() => action.endsWith('-form') ? openDialog(action) : navigate(action)}><Icon name={icon} />{label}</button>)}
    </div></section>
  </>
}
