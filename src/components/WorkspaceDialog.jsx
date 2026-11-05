import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { foodItemsText } from '../domain.mjs'
import Badge from './Badge.jsx'
import FamilyManagement from './FamilyManagement.jsx'
import VolunteerForm from './VolunteerForm.jsx'
import VolunteerDetails from './VolunteerDetails.jsx'
import FamilyForm from './FamilyForm.jsx'
import FoodEventManagement from './FoodEventManagement.jsx'
import UnitForm from './UnitForm.jsx'
import LoginForm from './LoginForm.jsx'
import ProfileForm from './ProfileForm.jsx'
import FamilyCard from './FamilyCard.jsx'
import ProcessFood from './ProcessFood.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function WorkspaceDialog() {
  const { state, demoMode, role, foodMutationBusy, staffMutationBusy, online, dialog, closeDialog, updateCard, resetDemo } = useWorkspace()
  const panel = useRef(null)
  const family = state.families.find(family => family.id === dialog.familyId)
  const unit = state.units.find(unit => unit.id === dialog.unitId)
  const title = {
    'family-form': 'A place at the table.', family: 'Family & meal card', 'unit-form': dialog.unitId ? 'Edit food event' : 'Plan a little good.',
    'volunteer-form': dialog.volunteer ? 'Edit volunteer' : 'Create volunteer', volunteer: 'Volunteer details', 'family-manage': 'Manage family',
    account: 'Your field companion', login: 'Good to have you here.',
    install: 'Keep Fastivalle close.', reset: 'Start fresh?',
    serve: 'Process food', 'unit-summary': 'Distribution summary',
    result: dialog.result?.ok ? 'Entry saved' : 'Unable to process food',
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
    case 'volunteer-form': content = <VolunteerForm />; break
    case 'volunteer': content = <VolunteerDetails />; break
    case 'family-manage': content = family && <FamilyManagement family={family} />; break
    case 'family-form': content = <FamilyForm />; break
    case 'unit-form': content = <UnitForm />; break
    case 'login': content = <LoginForm />; break
    case 'account': content = <ProfileForm />; break
    case 'family': content = family && <FamilyCard family={family} />; break
    case 'card-confirm': content = <><p>{dialog.action === 'deactivate' ? 'Scans of this card will be rejected.' : 'The old QR code will stop working immediately. Print the new card for this family.'}</p><button className={`btn full ${dialog.action === 'deactivate' ? 'danger' : 'primary'}`} onClick={() => updateCard(dialog.familyId, dialog.action)}>Confirm {dialog.action === 'deactivate' ? 'deactivation' : 'replacement'}</button></>; break
    case 'serve': content = family && <ProcessFood family={family} />; break
    case 'result': content = <div className="serve-confirm"><span className={`confirm-icon ${dialog.result.ok ? '' : 'rejected'}`}><Icon name={dialog.result.ok ? 'check' : 'close'} /></span><h3>{dialog.result.message}</h3><p>{dialog.result.detail}</p>{dialog.result.ok && !online && <p className="subtle">Saved offline on this device.</p>}<button className="btn primary full" onClick={closeDialog}>{dialog.result.ok ? 'Scan next family' : 'Try another card'}</button></div>; break
    case 'unit-summary': content = unit && <><h3>{unit.name}</h3><p>{foodItemsText(unit.items)}</p><p>{unit.served} / {unit.packs} packs served · {unit.currency || 'BDT'} {unit.price.toLocaleString()}</p><p>{unit.dateTime ? new Date(unit.dateTime).toLocaleString('en-IN', { timeZone: unit.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone }) : unit.date}</p>{unit.location && <p>{unit.location}</p>}<Badge text={unit.served >= unit.packs ? 'Completed' : 'Planned'} kind="green" />{!demoMode && role === 'agent' && <FoodEventManagement key={unit.id} unit={unit} />}</>; break
    case 'reset': content = <><p>This clears local demo families, scans, and plans, then restores the sample workspace.</p><button className="btn danger full" onClick={resetDemo}>Reset demo workspace</button></>; break
    case 'install': content = <><p>Install this field companion for quick access and offline use.</p><ol><li><b>Android / desktop:</b> Open your browser menu and choose “Install app” or “Add to Home screen”.</li><li><b>iPhone:</b> In Safari, tap Share, then “Add to Home Screen”.</li></ol><p className="subtle">Installation and offline caching are available in the production build. If already installed, open Fastivalle from your home screen.</p></>; break
  }
  return createPortal(<div className="modal-backdrop"><section ref={panel} className={`modal ${['family', 'family-manage'].includes(dialog.type) ? 'wide' : ''} ${dialog.type === 'account' ? 'profile-modal' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-title"><h2>{title}</h2><button className="icon-btn" aria-label="Close dialog" disabled={foodMutationBusy || staffMutationBusy} onClick={closeDialog}><Icon name="close" /></button></div>{content}</section></div>, document.body)
}
