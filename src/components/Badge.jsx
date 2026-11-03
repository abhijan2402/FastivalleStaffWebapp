export default function Badge({ text, kind = '' }) {
  return <span className={`badge ${kind}`}><i></i>{text}</span>
}
