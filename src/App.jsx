import BrandLogo from './components/BrandLogo.jsx'
import FoodEventsStatus from './components/FoodEventsStatus.jsx'
import LoginForm from './components/LoginForm.jsx'
import Icon from './components/Icon.jsx'
import WorkspaceDialog from './components/WorkspaceDialog.jsx'
import OverviewView from './views/OverviewView.jsx'
import FamiliesView from './views/FamiliesView.jsx'
import VolunteersView from './views/VolunteersView.jsx'
import UnitsView from './views/UnitsView.jsx'
import ScanView from './views/ScanView.jsx'
import { useWorkspace } from './state/WorkspaceContext.jsx'
const views = { overview: OverviewView, families: FamiliesView, units: UnitsView, volunteers: VolunteersView, scan: ScanView }
export default function App() {
  const { state, demoMode, authenticated, role, roleLabel, page, online, dialog, toast, profile, navs, navigate, openDialog, install } = useWorkspace()
  if (!demoMode && !authenticated) return <main className="login-shell"><section className="panel login-panel"><BrandLogo className="login-brand" /><h1>Staff Panel</h1><LoginForm /></section></main>
  const initials = profile.name.split(' ').map(name => name[0]).join('')
  const View = views[page]
  return <>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate(role === 'agent' ? 'overview' : 'scan') }}><BrandLogo /></a>
      <div className="workspace-label">FIELD COMPANION</div><div className="role-card"><span className="role-icon"><Icon name={role === 'agent' ? 'leaf' : 'heart'} /></span><div><strong>{roleLabel}</strong></div><span className="tiny-dot"></span></div>
      <nav>{navs.map(([id, icon, label]) => <button key={id} data-page={id} className={`nav-item ${page === id ? 'selected' : ''}`} onClick={() => navigate(id)}><Icon name={icon} />{label}{id === 'families' && <span className="nav-count">{state.families.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={install}><Icon name="download" />Install app <span className="small-tag">PWA</span></button><button className="account" onClick={() => openDialog('account')}><span className="avatar">{initials}</span><span><strong>{profile.name}</strong><small>{roleLabel}</small></span><Icon name="settings" /></button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><a className="mobile-brand" href="#" onClick={event => { event.preventDefault(); navigate(role === 'agent' ? 'overview' : 'scan') }}><BrandLogo /></a><div className="breadcrumb">Workspace <span>/</span> <b>{navs.find(item => item[0] === page)?.[2]}</b></div><div className="top-actions"><span className="demo-pill">{demoMode ? 'DEMO WORKSPACE' : 'STAFF WORKSPACE'}</span><span className="connection"><i className={online ? '' : 'offline'}></i>{online ? (demoMode ? 'All changes saved locally' : 'Online') : 'Offline'}</span><button className="icon-btn top-profile" aria-label="Your profile" onClick={() => openDialog('account')}><Icon name="users" /></button></div></header><main>{!demoMode && <section className="panel data-notice" role="note"><strong>Connected staff account</strong><p>Food events, eligibility and food assignments are saved through the API. Family QR codes identify the receiver. All-time meal totals remain sample data.</p></section>}{!demoMode && role === 'volunteer' && !['units', 'scan'].includes(page) && <FoodEventsStatus />}<View /></main><footer>Made for the people who show up. <span>Fastivalle · Field companion</span></footer></div>
    <nav className="mobile-nav">{navs.map(([id, icon, label]) => <button key={id} data-page={id} className={page === id ? 'selected' : ''} onClick={() => navigate(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
    {dialog && <WorkspaceDialog key={dialog.type + (dialog.familyId || '')} />}
    <div id="toast" role="status" className={toast ? 'show' : ''}>{toast}</div>
  </>
}
