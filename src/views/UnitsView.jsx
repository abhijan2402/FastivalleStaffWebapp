import Icon from '../components/Icon.jsx'
import PageHeading from '../components/PageHeading.jsx'
import UnitCard from '../components/UnitCard.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function UnitsView() {
  const { state, openDialog } = useWorkspace()
  return <><PageHeading eyebrow="PLAN. PREPARE. SERVE." title="Food brings us together." subtitle="Plan food units and follow every pack to a shared table."><button className="btn primary" onClick={() => openDialog('unit-form')}><Icon name="plus" />Create food unit</button></PageHeading><div className="units-grid">{state.units.map(unit => <UnitCard key={unit.id} unit={unit} />)}</div></>
}
