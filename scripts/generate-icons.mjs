// Prepare standard app-icon canvases from the supplied brand symbol, preserving
// its proportions and color. Run only when the source symbol changes.
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
const artwork = await readFile(new URL('../public/brand-mark.png', import.meta.url))
const source = `data:image/png;base64,${artwork.toString('base64')}`
const sourceWidth = artwork.readUInt32BE(16), sourceHeight = artwork.readUInt32BE(20)
const scale = 512 * 0.76 / Math.max(sourceWidth, sourceHeight)
const width = sourceWidth * scale, height = sourceHeight * scale
await writeFile(new URL('../public/icon.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f6f7f4"/><image href="${source}" x="${(512 - width) / 2}" y="${(512 - height) / 2}" width="${width}" height="${height}"/></svg>\n`)
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [file, size, fraction] of [
    ['favicon-32.png', 32, 0.84],
    ['apple-touch-icon.png', 180, 0.70],
    ['icon-192.png', 192, 0.76],
    ['icon-512.png', 512, 0.76],
    ['icon-maskable-512.png', 512, 0.56],
  ]) {
    const url = await page.evaluate(async ({ source, size, fraction }) => {
      const symbol = new Image()
      symbol.src = source
      await symbol.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const context = canvas.getContext('2d')
      context.fillStyle = '#f6f7f4'
      context.fillRect(0, 0, size, size)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      const scale = size * fraction / Math.max(symbol.width, symbol.height)
      const width = symbol.width * scale, height = symbol.height * scale
      context.drawImage(symbol, (size - width) / 2, (size - height) / 2, width, height)
      return canvas.toDataURL('image/png')
    }, { source, size, fraction })
    await writeFile(new URL(`../public/${file}`, import.meta.url), Buffer.from(url.split(',')[1], 'base64'))
    console.log(`${file}: ${size}×${size}`)
  }
} finally { await browser.close() }
