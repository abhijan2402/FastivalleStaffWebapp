import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

export default function FamilyQr({ value, className = '' }) {
  const svg = useMemo(() => {
    const code = qrcode(0, 'M')
    code.addData(value)
    code.make()
    return code.createSvgTag({ cellSize: 5, margin: 3, scalable: true })
  }, [value])
  return <div id="print-qr" className={`qr ${className}`} role="img" aria-label="Family QR code" dangerouslySetInnerHTML={{ __html: svg }} />
}
