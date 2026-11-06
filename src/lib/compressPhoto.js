const MAX_DIMENSION = 1280
const MAX_BYTES = 250 * 1024

export async function compressPhotoCanvas(source, name = 'family-photo') {
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height))
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  let quality = 0.8
  while (true) {
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('The photo could not be compressed. Please try another image.')), 'image/jpeg', quality))
    if (blob.size <= MAX_BYTES) return new File([blob], `${name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
    if (quality > 0.5) { quality = Math.max(0.5, quality - 0.15); continue }
    const smaller = document.createElement('canvas')
    smaller.width = Math.max(1, Math.floor(canvas.width * 0.75))
    smaller.height = Math.max(1, Math.floor(canvas.height * 0.75))
    smaller.getContext('2d').drawImage(canvas, 0, 0, smaller.width, smaller.height)
    canvas.width = smaller.width
    canvas.height = smaller.height
    context.drawImage(smaller, 0, 0)
  }
}

export async function compressPhoto(file) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try { await image.decode() } catch { throw Error('This image could not be opened. Choose a supported photo such as JPEG, PNG or WebP.') }
    return await compressPhotoCanvas(image, file.name)
  } finally { URL.revokeObjectURL(url) }
}
