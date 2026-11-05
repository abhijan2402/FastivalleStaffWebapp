import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from './Icon.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function QrScanner({ onScan, paused = false }) {
  const { notify } = useWorkspace()
  const video = useRef(null), stream = useRef(null), frame = useRef(null), generation = useRef(0)
  const [scanning, setScanning] = useState(false), [requesting, setRequesting] = useState(false)
  const releaseCamera = useCallback(() => {
    generation.current++
    cancelAnimationFrame(frame.current)
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }, [])
  const stopCamera = useCallback(() => { releaseCamera(); setScanning(false); setRequesting(false) }, [releaseCamera])
  useEffect(() => releaseCamera, [releaseCamera])
  useEffect(() => { if (paused) stopCamera() }, [paused, stopCamera])
  async function startCamera() {
    if (paused) return
    if (!navigator.mediaDevices?.getUserMedia) { notify('Camera unavailable. Open this app in a browser with camera support.'); return }
    stopCamera()
    const requestGeneration = generation.current
    setRequesting(true)
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (requestGeneration !== generation.current || !video.current) { acquired.getTracks().forEach(track => track.stop()); return }
      stream.current = acquired
      video.current.srcObject = acquired
      await video.current.play()
      if (requestGeneration !== generation.current) return
      setScanning(true)
      setRequesting(false)
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true })
      function scan() {
        const element = video.current
        if (!stream.current || !element) return
        if (element.readyState >= 2 && element.videoWidth) {
          canvas.width = element.videoWidth
          canvas.height = element.videoHeight
          ctx.drawImage(element, 0, 0)
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const result = jsQR(pixels.data, pixels.width, pixels.height)
          if (result) { stopCamera(); onScan(result.data); return }
        }
        frame.current = requestAnimationFrame(scan)
      }
      scan()
    } catch (error) {
      if (requestGeneration !== generation.current) return
      stopCamera()
      notify(error.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in your browser settings and try again.' : 'Camera could not start. Check your camera and try again.')
    }
  }
  return <>
    <div className="scanner-only"><section className="panel scanner-panel"><div className="camera-frame"><video ref={video} playsInline muted />{!scanning && <div className="camera-placeholder"><Icon name="scan" /><h3>Ready when you are</h3><p>Position the family QR card inside the frame.</p><button className="btn cream" disabled={requesting || paused} onClick={startCamera}>{requesting ? 'Opening camera…' : 'Enable camera'}</button></div>}<div className="scan-corners"></div></div><p className="camera-hint">{scanning ? 'Scanning… point the camera at a Fastivalle QR card.' : 'Camera access stays on your device.'}</p></section>
    </div>
  </>
}
