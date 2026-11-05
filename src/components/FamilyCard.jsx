import BrandLogo from './BrandLogo.jsx'
import { useMemo } from 'react'
import qrcode from 'qrcode-generator'
import Icon from './Icon.jsx'
import { familyMembers } from '../domain.mjs'
import Badge from './Badge.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function FamilyCard({ family }) {
  const { openDialog, updateCard, demoMode, role } = useWorkspace()
  const qr = useMemo(() => {
    if (!family.card) return ''
    const code = qrcode(0, 'M')
    code.addData(`${family.id}:${family.version}`)
    code.make()
    return code.createSvgTag({ cellSize: 5, margin: 3, scalable: true })
  }, [family.id, family.version, family.card])
  return <div className="family-detail">{!demoMode && <p className="small-note">Family details are saved on the server. QR generation and card status below are local samples only.</p>}<div id="print-card" className="family-card"><div className="card-brand"><BrandLogo /></div><span className="eyebrow">A PLACE AT THE TABLE</span><h2>{family.name}</h2><p>{family.id} · {familyMembers(family).length} family members</p>{family.card ? <><div id="print-qr" className={`qr ${family.card === 'inactive' ? 'inactive-qr' : ''}`} dangerouslySetInnerHTML={{ __html: qr }} /><code>{family.id}:{family.version}</code></> : <div className="open-card">Complete this family to create a QR card.</div>}<p>{family.card === 'inactive' ? 'DEACTIVATED — DO NOT USE' : family.card ? 'Please bring this card to every distribution.' : 'Family profile is open'}</p></div><div><h3>Family members</h3>{familyMembers(family).map((member, index) => <p key={index} className="member-name"><Icon name="users" />{member.name}{member.relation && ` · ${member.relation}`}</p>)}{family.mobile && <p className="small-note">Mobile: {family.mobile}</p>}{family.email && <p className="small-note">Email: {family.email}</p>}<Badge text={family.card === 'active' ? 'Active card' : family.card === 'inactive' ? 'Deactivated' : 'Open profile'} kind={family.card === 'active' ? 'green' : 'amber'} /><div className="card-actions">{!demoMode && role === 'agent' && <button className="btn secondary" onClick={() => openDialog('family-manage', { familyId: family.id })}>Manage family</button>}{family.card ? <><button className="btn secondary" disabled><Icon name="download" />Print family card</button><button className="btn secondary" onClick={() => window.print()}><Icon name="download" />Print QR code</button><button className="btn secondary" onClick={() => openDialog('card-confirm', { familyId: family.id, action: 'regenerate' })}>Regenerate QR card</button>{family.card === 'active' && <button className="btn danger" onClick={() => openDialog('card-confirm', { familyId: family.id, action: 'deactivate' })}>Deactivate card</button>}</> : <button className="btn primary" onClick={() => updateCard(family.id, 'complete')}><Icon name="check" />Mark family complete</button>}</div><p className="small-note">Regenerating a card immediately invalidates its previous QR code.</p></div></div>
}
