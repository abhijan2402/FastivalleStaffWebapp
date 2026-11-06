import BrandLogo from './BrandLogo.jsx'
import FamilyQr from './FamilyQr.jsx'
import Icon from './Icon.jsx'
import { familyMembers } from '../domain.mjs'
import Badge from './Badge.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'

export default function FamilyCard({ family }) {
  const { openDialog, updateCard, demoMode, role } = useWorkspace()
  const hasQr = !demoMode || !!family.card
  const qrValue = demoMode ? `${family.id}:${family.version}` : family.id

  return <div className="family-detail">
    <div id="print-card" className="family-card">
      <div className="card-brand"><BrandLogo /></div>
      <span className="eyebrow">A PLACE AT THE TABLE</span>
      <h2>{family.name}</h2>
      <p>{family.id} · {familyMembers(family).length} family members</p>
      {hasQr ? <>
        <FamilyQr value={qrValue} className={demoMode && family.card === 'inactive' ? 'inactive-qr' : ''} />
        <code>{qrValue}</code>
      </> : <div className="open-card">Complete this family to create a QR card.</div>}
      <p>{demoMode && family.card === 'inactive' ? 'DEACTIVATED — DO NOT USE' : hasQr ? 'Please bring this QR code to every distribution.' : 'Family profile is open'}</p>
    </div>
    <div>
      <h3>Family members</h3>
      {familyMembers(family).map((member, index) => <p key={index} className="member-name"><Icon name="users" />{member.name}{member.relation && ` · ${member.relation}`}</p>)}
      {family.mobile && <p className="small-note">Mobile: {family.mobile}</p>}
      {family.email && <p className="small-note">Email: {family.email}</p>}
      <Badge text={!demoMode ? 'QR ready' : family.card === 'active' ? 'Active card' : family.card === 'inactive' ? 'Deactivated' : 'Open profile'} kind={!demoMode || family.card === 'active' ? 'green' : 'amber'} />
      <div className="card-actions">
        {!demoMode && role === 'agent' && <button className="btn secondary" onClick={() => openDialog('family-manage', { familyId: family.id })}>Manage family</button>}
        {hasQr && <>
          <button className="btn secondary" disabled><Icon name="download" />Print family card</button>
          <button className="btn secondary" onClick={() => openDialog('qr-print', { familyId: family.id })}><Icon name="download" />Print QR code</button>
        </>}
        {demoMode && (family.card ? <>
          <button className="btn secondary" onClick={() => openDialog('card-confirm', { familyId: family.id, action: 'regenerate' })}>Regenerate QR card</button>
          {family.card === 'active' && <button className="btn danger" onClick={() => openDialog('card-confirm', { familyId: family.id, action: 'deactivate' })}>Deactivate card</button>}
        </> : <button className="btn primary" onClick={() => updateCard(family.id, 'complete')}><Icon name="check" />Mark family complete</button>)}
      </div>
      <p className="small-note">{demoMode ? 'Regenerating a card immediately invalidates its previous QR code.' : 'Scan this QR after choosing a food event to check eligible family members.'}</p>
    </div>
  </div>
}
