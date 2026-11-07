import qrcode from 'qrcode-generator'

export function qrSvg(value) {
  const code = qrcode(0, 'M')
  code.addData(value)
  code.make()
  // Four clear modules around the code preserve its scanning quiet zone.
  return code.createSvgTag({ cellSize: 5, margin: 20, scalable: true })
}

const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])
const lines = value => Array.from(String(value)).reduce((rows, char, index) => {
  if (index % 32 === 0) rows.push('')
  rows[rows.length - 1] += char
  return rows
}, [])

export function familyQrSvg(family, demoMode = false) {
  const value = demoMode ? `${family.id}:${family.version}` : family.id
  const details = [
    ...lines(family.name).map(text => ({ text, bold: true })),
    ...lines(`Phone: ${family.mobile || 'Not provided'}`).map(text => ({ text })),
    ...lines(`Family ID: ${family.id}`).map(text => ({ text })),
    ...(demoMode && family.card === 'inactive' ? [{ text: 'DEACTIVATED — DO NOT USE', bold: true }] : []),
  ]
  const height = 310 + details.length * 22
  const qr = qrSvg(value).replace('<svg ', '<svg x="55" y="35" width="250" height="250" ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}" role="img" aria-label="${escapeXml(family.name)} QR card"><rect width="360" height="${height}" fill="white"/><g fill="black" font-family="sans-serif" text-anchor="middle"><text x="180" y="25" font-size="16" font-weight="bold">Fastivalle · Family QR</text>${qr}${details.map((line, index) => `<text x="180" y="${305 + index * 22}" font-size="16"${line.bold ? ' font-weight="bold"' : ''}>${escapeXml(line.text)}</text>`).join('')}</g></svg>`
}

// Store-only ZIP: no dependency or server upload is needed for personal data.
export function zipFiles(files) {
  const encoder = new TextEncoder(), parts = [], directory = []
  let offset = 0, directorySize = 0
  for (const file of files) {
    const name = encoder.encode(file.name), data = encoder.encode(file.content)
    let crc = 0xffffffff
    for (const byte of data) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    crc = (crc ^ 0xffffffff) >>> 0
    const header = new Uint8Array(30), local = new DataView(header.buffer)
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true); local.setUint16(12, 33, true)
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    const central = new Uint8Array(46), entry = new DataView(central.buffer)
    entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true); entry.setUint16(14, 33, true)
    entry.setUint32(16, crc, true); entry.setUint32(20, data.length, true); entry.setUint32(24, data.length, true)
    entry.setUint16(28, name.length, true); entry.setUint32(42, offset, true)
    parts.push(header, name, data); directory.push(central, name)
    offset += header.length + name.length + data.length
    directorySize += central.length + name.length
  }
  const end = new Uint8Array(22), trailer = new DataView(end.buffer)
  trailer.setUint32(0, 0x06054b50, true)
  trailer.setUint16(8, files.length, true); trailer.setUint16(10, files.length, true)
  trailer.setUint32(12, directorySize, true); trailer.setUint32(16, offset, true)
  return new Blob([...parts, ...directory, end], { type: 'application/zip' })
}

export function familyQrArchive(families, demoMode = false) {
  const cards = families.map(family => familyQrSvg(family, demoMode))
  const files = families.map((family, index) => ({
    name: `${String(index + 1).padStart(3, '0')}-${String(family.name).replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 60) || 'family'}.svg`,
    content: cards[index],
  }))
  files.push({ name: 'print-all.html', content: `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fastivalle · All family QR cards</title><style>body{font:16px sans-serif;margin:20px;color:#000;background:#fff}header{margin-bottom:20px}main{display:grid;grid-template-columns:repeat(2,minmax(0,85mm));gap:5mm}article{break-inside:avoid;border:1px solid #ccc}article>svg{display:block;width:100%;height:auto}@page{size:A4;margin:12mm}@media print{body{margin:0}header{display:none}}@media screen and (max-width:600px){main{grid-template-columns:1fr}}</style><header><h1>Family QR cards (${families.length})</h1><p>Print this file to print every card together, or choose Save as PDF in your browser’s print dialog.</p><button onclick="window.print()">Print all QR cards / Save as PDF</button></header><main>${cards.map(card => `<article>${card}</article>`).join('')}</main></html>` })
  return zipFiles(files)
}

export function downloadFamilyQrs(families, demoMode = false) {
  const url = URL.createObjectURL(familyQrArchive(families, demoMode))
  const link = document.createElement('a')
  link.href = url; link.download = 'fastivalle-all-qr-codes.zip'
  document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
