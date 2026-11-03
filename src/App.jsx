import Icon from './components/Icon.jsx'
import WorkspaceDialog from './components/WorkspaceDialog.jsx'
import OverviewView from './views/OverviewView.jsx'
import FamiliesView from './views/FamiliesView.jsx'
import UnitsView from './views/UnitsView.jsx'
import ScanView from './views/ScanView.jsx'
import ImpactView from './views/ImpactView.jsx'
import { useWorkspace } from './state/WorkspaceContext.jsx'
const views = { overview: OverviewView, families: FamiliesView, units: UnitsView, scan: ScanView, impact: ImpactView }
export default function App() {
  const { state, role, roleLabel, page, online, dialog, toast, profile, navs, navigate, openDialog, install } = useWorkspace()
  const initials = profile.name.split(' ').map(name => name[0]).join('')
  const View = views[page]
  return <>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate(role === 'agent' ? 'overview' : 'scan') }}><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" /><span>fastivalle<span className="brand-dot">.</span></span></a>
      <div className="workspace-label">FIELD COMPANION</div><div className="role-card"><span className="role-icon"><Icon name={role === 'agent' ? 'leaf' : 'heart'} /></span><div><strong>{roleLabel}</strong><small>Korail community</small></div><span className="tiny-dot"></span></div>
      <nav>{navs.map(([id, icon, label]) => <button key={id} data-page={id} className={`nav-item ${page === id ? 'selected' : ''}`} onClick={() => navigate(id)}><Icon name={icon} />{label}{id === 'families' && <span className="nav-count">{state.families.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="kind-note"><span>Every meal.<br />Someone’s better day.</span><div className="little-sprout">✳</div></div><button className="nav-item" onClick={install}><Icon name="download" />Install app <span className="small-tag">PWA</span></button><button className="nav-item" onClick={() => openDialog('help')}><Icon name="heart" />Help & support</button><button className="account" onClick={() => openDialog('account')}><span className="avatar">{initials}</span><span><strong>{profile.name}</strong><small>{roleLabel}</small></span><Icon name="settings" /></button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{navs.find(item => item[0] === page)?.[2]}</b></div><div className="top-actions"><span className="demo-pill">DEMO WORKSPACE</span><span className="connection"><i className={online ? '' : 'offline'}></i>{online ? 'All changes saved locally' : 'Offline · saved on device'}</span><button className="icon-btn top-profile" aria-label="Your profile" onClick={() => openDialog('account')}><Icon name="users" /></button><button className="icon-btn" aria-label="Notifications" onClick={() => openDialog('notifications')}><Icon name="bell" /><i className="notification-dot"></i></button></div></header><main><View /></main><footer>Made for the people who show up. <span>Fastivalle · Field companion</span></footer></div>
    <nav className="mobile-nav">{navs.map(([id, icon, label]) => <button key={id} data-page={id} className={page === id ? 'selected' : ''} onClick={() => navigate(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
    {dialog && <WorkspaceDialog key={dialog.type + (dialog.familyId || '')} />}
    <div id="toast" role="status" className={toast ? 'show' : ''}>{toast}</div>
  </>
}
