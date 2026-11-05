export default function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`} src={`${import.meta.env.BASE_URL}brand-logo.png`} alt="Fastivalle" width="139" height="51" />
}
