import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import Badge from './Badge.jsx'
import FamilyForm from './FamilyForm.jsx'
import UnitForm from './UnitForm.jsx'
import LoginForm from './LoginForm.jsx'
import ProfileForm from './ProfileForm.jsx'
import FamilyCard from './FamilyCard.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function WorkspaceDialog() {
  const { state, online, dialog, closeDialog, openDialog, updateCard, confirmServing, simulateSync, resetDemo } = useWorkspace()
  const panel = useRef(null)
  const family = state.families.find(family => family.id === dialog.familyId)
  const unit = state.units.find(unit => unit.id === dialog.unitId)
  const title = {
    'family-form': 'A place at the table.', family: 'Family & meal card', 'unit-form': 'Plan a little good.',
    account: 'Your field companion', login: 'Good to have you here.', help: 'A little help, along the way.',
    install: 'Keep Fastivalle close.', notifications: 'Your field updates', reset: 'Start fresh?',
    serve: 'A meal, ready to share.', 'unit-summary': 'Distribution summary',
    result: dialog.result?.ok ? 'A little good, done.' : 'Unable to serve this card',
    'card-confirm': dialog.action === 'deactivate' ? 'Deactivate this card?' : 'Replace this QR card?',
  }[dialog.type]
  useEffect(() => {
    const previousFocus = document.activeElement
    function keyboard(event) {
      if (event.key === 'Escape') closeDialog()
      if (event.key !== 'Tab') return
      const elements = [...panel.current.querySelectorAll('button,input,select,a')].filter(element => !element.disabled)
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus() }
    }
    document.addEventListener('keydown', keyboard)
    panel.current?.querySelector('input,button')?.focus()
    return () => { document.removeEventListener('keydown', keyboard); if (previousFocus?.isConnected) previousFocus.focus() }
  }, [closeDialog])
  let content
  switch (dialog.type) {
    case 'family-form': content = <FamilyForm />; break
    case 'unit-form': content = <UnitForm />; break
    case 'login': content = <LoginForm />; break
    case 'account': content = <ProfileForm />; break
    case 'family': content = family && <FamilyCard family={family} />; break
    case 'card-confirm': content = <><p>{dialog.action === 'deactivate' ? 'Scans of this card will be rejected.' : 'The old QR code will stop working immediately. Print the new card for this family.'}</p><button className={`btn full ${dialog.action === 'deactivate' ? 'danger' : 'primary'}`} onClick={() => updateCard(dialog.familyId, dialog.action)}>Confirm {dialog.action === 'deactivate' ? 'deactivation' : 'replacement'}</button></>; break
    case 'serve': content = family && unit && <div className="serve-confirm"><span className="confirm-icon"><Icon name="users" /></span><h3>{family.name}</h3><p>{family.id} · {family.members.length} family members</p><Badge text="Active card" kind="green" /><div className="serve-summary"><span>{unit.name}</span><strong>1 food pack</strong></div><p>Hand over the food pack, then confirm below.</p><button className="btn primary full" onClick={confirmServing}><Icon name="check" />Confirm food served</button></div>; break
    case 'result': content = <div className="serve-confirm"><span className={`confirm-icon ${dialog.result.ok ? '' : 'rejected'}`}><Icon name={dialog.result.ok ? 'check' : 'close'} /></span><h3>{dialog.result.message}</h3><p>{dialog.result.detail}</p>{dialog.result.ok && !online && <p className="subtle">Saved offline on this device.</p>}<button className="btn primary full" onClick={closeDialog}>{dialog.result.ok ? 'Scan next family' : 'Try another card'}</button></div>; break
    case 'unit-summary': content = unit && <><h3>{unit.name}</h3><p>{unit.items}</p><p>{unit.served} / {unit.packs} packs served · ৳{unit.price.toLocaleString()}</p><p>{unit.date} · {unit.area}</p><Badge text={unit.served >= unit.packs ? 'Completed' : 'Planned'} kind="green" /></>; break
    case 'reset': content = <><p>This clears local demo families, scans, and plans, then restores the sample workspace.</p><button className="btn danger full" onClick={resetDemo}>Reset demo workspace</button></>; break
    case 'notifications': content = <><div className="notice"><Icon name="box" /><div><strong>Today’s distributions are ready</strong><p>Korail community lunch and Evening essentials are available for serving.</p></div></div><div className="notice"><Icon name="check" /><div><strong>{state.queue.length ? 'Offline records saved' : 'You’re up to date'}</strong><p>{state.queue.length} records awaiting a simulated sync. This prototype has no live server.</p></div></div>{state.queue.length > 0 && <button className="btn secondary" onClick={simulateSync}>Simulate sync</button>}<hr /><button className="btn secondary" onClick={() => openDialog('account')}>My profile & demo accounts</button></>; break
    case 'help': content = <><h3>Serving a family</h3><p>Select today’s food unit, scan a card or try a sample, then confirm after handing over one food pack.</p><h3>Working offline</h3><p>Open the production app once while online. Families, cards and scans are saved in this browser. A production server will be needed to sync across devices.</p><h3>Demo accounts</h3><p>agent@fastivalle.demo<br />volunteer@fastivalle.demo<br />Password: <b>demo123</b></p><button className="btn secondary" onClick={() => openDialog('login')}>Switch account</button></>; break
    case 'install': content = <><p>Install this field companion for quick access and offline use.</p><ol><li><b>Android / desktop:</b> Open your browser menu and choose “Install app” or “Add to Home screen”.</li><li><b>iPhone:</b> In Safari, tap Share, then “Add to Home Screen”.</li></ol><p className="subtle">Installation and offline caching are available in the production build. If already installed, open Fastivalle from your home screen.</p></>; break
  }
  return createPortal(<div className="modal-backdrop"><section ref={panel} className={`modal ${dialog.type === 'family' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-title"><h2>{title}</h2><button className="icon-btn" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" /></button></div>{content}</section></div>, document.body)
}
