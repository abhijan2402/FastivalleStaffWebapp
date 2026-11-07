import { useMemo } from 'react'
import { qrSvg } from '../lib/qrExport.mjs'

export default function FamilyQr({ value, className = '' }) {
  const svg = useMemo(() => qrSvg(value), [value])
  return <div id="print-qr" className={`qr ${className}`} role="img" aria-label="Family QR code" dangerouslySetInnerHTML={{ __html: svg }} />
}
