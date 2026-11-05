import Icon from '../components/Icon.jsx'
import PageHeading from '../components/PageHeading.jsx'
import FoodEventsStatus from '../components/FoodEventsStatus.jsx'
import UnitCard from '../components/UnitCard.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitsView() {
  const { state, demoMode, role, foodMutationBusy, openDialog } = useWorkspace()
  return <><PageHeading eyebrow="PLAN. PREPARE. SERVE." title="Food brings us together." subtitle={!demoMode ? 'Food events loaded from the API.' : 'Plan sample food units and follow every pack to a shared table.'}>{(demoMode || role === 'agent') && <button className="btn primary" disabled={foodMutationBusy} onClick={() => openDialog('unit-form')}><Icon name="plus" />Create food unit</button>}</PageHeading><FoodEventsStatus /><div className="units-grid">{state.units.map(unit => <UnitCard key={unit.id} unit={unit} />)}</div></>
}
