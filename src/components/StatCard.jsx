import Icon from './Icon.jsx'
export default function StatCard({ icon, label, value, detail, kind = '' }) {
  return <article className="stat"><span className={`stat-icon ${kind}`}><Icon name={icon} /></span><span className="stat-label">{label}</span><strong>{value}</strong><small className={kind}>{detail}</small></article>
}
