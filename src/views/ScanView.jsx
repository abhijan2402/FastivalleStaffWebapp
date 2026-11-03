import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from '../components/Icon.jsx'
import Badge from '../components/Badge.jsx'
import PageHeading from '../components/PageHeading.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'
export default function ScanView() {
  const { state, unitId, setUnitId, todayUnits, ownServings, dialog, checkCard, notify } = useWorkspace()
  const video = useRef(null), stream = useRef(null), frame = useRef(null), generation = useRef(0)
  const [scanning, setScanning] = useState(false), [requesting, setRequesting] = useState(false), [cardCode, setCardCode] = useState('')
  const samples = state.families.filter(family => family.card).slice(0, 4)
  const releaseCamera = useCallback(() => {
    generation.current++
    cancelAnimationFrame(frame.current)
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }, [])
  const stopCamera = useCallback(() => { releaseCamera(); setScanning(false); setRequesting(false) }, [releaseCamera])
  useEffect(() => releaseCamera, [releaseCamera])
  useEffect(() => { if (dialog) stopCamera() }, [dialog, stopCamera])
  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { notify('Camera unavailable. Use a sample card or enter a code.'); return }
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
          if (result) { stopCamera(); checkCard(result.data); return }
        }
        frame.current = requestAnimationFrame(scan)
      }
      scan()
    } catch (error) {
      if (requestGeneration !== generation.current) return
      stopCamera()
      notify(error.name === 'NotAllowedError' ? 'Camera permission denied. Use a sample or enter a code.' : 'Camera could not start. Use a sample or enter a code.')
    }
  }
  return <>
    <PageHeading eyebrow="ONE SCAN. ONE ACT OF CARE." title="Scan & serve" subtitle="Choose a food unit, scan an active family card, and confirm the handover." />
    <div className="scan-grid"><section className="panel scanner-panel"><label className="field">Food unit<select value={unitId} onChange={event => { stopCamera(); setUnitId(event.target.value) }}>{todayUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.packs - unit.served} packs left</option>)}</select></label><div className="camera-frame"><video ref={video} playsInline muted />{!scanning && <div className="camera-placeholder"><Icon name="scan" /><h3>Ready when you are</h3><p>Position the family QR card inside the frame.</p><button className="btn cream" disabled={requesting} onClick={startCamera}>{requesting ? 'Opening camera…' : 'Enable camera'}</button></div>}<div className="scan-corners"></div></div><p className="camera-hint">{scanning ? 'Scanning… point the camera at a Fastivalle QR card.' : 'Camera access stays on your device.'}</p><div className="divider-label">OR ENTER CARD CODE</div><form className="inline-form" onSubmit={event => { event.preventDefault(); checkCard(cardCode.trim()) }}><input value={cardCode} onChange={event => setCardCode(event.target.value)} aria-label="Family card code" placeholder="e.g. FV-1024:1" required /><button className="btn primary">Check card</button></form></section>
      <aside><section className="panel demo-scan"><span className="eyebrow">TRY THE DEMO</span><h2>A family card, a fresh start.</h2><p>Choose a sample card to try the complete serving flow. No camera needed.</p>{samples.map(family => <button key={family.id} className="sample-card" data-action={`sample:${family.id}:${family.version}`} onClick={() => checkCard(`${family.id}:${family.version}`)}><span className="sample-qr"><Icon name="scan" /></span><span><strong>{family.name}</strong><small>{family.id} · {family.members.length} members</small></span><Badge text={family.card === 'active' ? 'Active' : 'Inactive'} kind={family.card === 'active' ? 'green' : 'red'} /></button>)}</section><div className="scan-tip"><Icon name="leaf" /><p><strong>One family. One pack per food unit.</strong><br />Repeated scans are checked before serving. Offline records are stored locally in this demo.</p></div><section className="panel"><h3>Your serving activity</h3><p className="large-count">{ownServings.length} <small>families served in this demo</small></p>{ownServings.slice(0, 3).map(serving => <div key={serving.id} className="mini-serving"><Icon name="check" />{state.families.find(family => family.id === serving.family)?.name}<small>{serving.pending ? 'Saved offline' : 'Saved locally'}</small></div>)}</section></aside>
    </div>
  </>
}
