import QrScanner from '../components/QrScanner.jsx'
import LiveServingFlow from '../components/LiveServingFlow.jsx'
import { useWorkspace } from '../state/WorkspaceContext.jsx'

export default function ScanView() {
  const { demoMode, dialog, checkCard } = useWorkspace()
  return demoMode ? <QrScanner onScan={checkCard} paused={!!dialog} /> : <LiveServingFlow />
}
