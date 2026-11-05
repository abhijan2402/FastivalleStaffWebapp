import { useEffect, useRef, useState } from 'react'

export default function FamilyPhoto({ photo, onChange, disabled }) {
  const upload = useRef(null), video = useRef(null), stream = useRef(null), request = useRef(0)
  const [opening, setOpening] = useState(false), [camera, setCamera] = useState(false)
  const [preview, setPreview] = useState(''), [error, setError] = useState('')

  function stopCamera() {
    request.current++
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
  }
  function closeCamera() {
    stopCamera()
    setCamera(false)
    setOpening(false)
  }
  useEffect(() => () => stopCamera(), [])
  useEffect(() => {
    if (!photo) { setPreview(''); return }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  useEffect(() => {
    if (camera && video.current) {
      video.current.srcObject = stream.current
      video.current.play().catch(() => {
        closeCamera()
        setError('Camera could not start. Try again or upload a photo.')
      })
    }
  }, [camera])

  function selectPhoto(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Choose a photo smaller than 2 MB.'); return }
    setError('')
    onChange(file)
    closeCamera()
  }
  async function openCamera() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera unavailable. Open this app over HTTPS in a browser with camera support, or upload a photo.')
      return
    }
    setOpening(true)
    const current = ++request.current
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (current !== request.current) { media.getTracks().forEach(track => track.stop()); return }
      stream.current = media
      setCamera(true)
    } catch (issue) {
      if (current !== request.current) return
      setError(issue.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in your browser settings or upload a photo.' : 'Camera could not start. Check your camera or upload a photo.')
    } finally {
      if (current === request.current) setOpening(false)
    }
  }
  function takePhoto() {
    const source = video.current
    if (!source?.videoWidth) { setError('Camera is getting ready. Try taking the photo again.'); return }
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1600 / Math.max(source.videoWidth, source.videoHeight))
    canvas.width = Math.round(source.videoWidth * scale)
    canvas.height = Math.round(source.videoHeight * scale)
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
    const current = request.current
    canvas.toBlob(blob => {
      if (current !== request.current) return
      if (!blob) { setError('The photo could not be captured. Please try again.'); return }
      selectPhoto(new File([blob], 'family-photo.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.85)
  }

  return <fieldset className="family-photo" disabled={disabled}>
    <legend>Photo (optional)</legend>
    <input ref={upload} type="file" accept="image/*" hidden aria-label="Upload family photo" onChange={event => { selectPhoto(event.target.files?.[0]); event.target.value = '' }} />
    <div className="photo-actions">
      <button type="button" className="btn secondary" disabled={opening || camera} onClick={openCamera}>{opening ? 'Opening camera…' : 'Camera'}</button>
      <button type="button" className="btn secondary" onClick={() => upload.current.click()}>Upload photo</button>
    </div>
    {(opening || camera) && <div className="photo-camera">
      <video ref={video} autoPlay playsInline muted aria-label="Family photo camera preview" />
      <div className="photo-actions">
        {camera && <button type="button" className="btn primary" onClick={takePhoto}>Take photo</button>}
        <button type="button" className="btn secondary" onClick={closeCamera}>Cancel camera</button>
      </div>
    </div>}
    {photo && preview && <div className="photo-selection"><img src={preview} alt="Selected family photo" /><span>{photo.name}</span><button type="button" className="text-btn" onClick={() => onChange(null)}>Remove photo</button></div>}
    <p className="small-note">Take a photo or choose an image up to 2 MB.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </fieldset>
}
