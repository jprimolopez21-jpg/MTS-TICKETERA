import type { Metadata } from 'next'
import QRScanner from './components/qr-scanner'

export const metadata: Metadata = { title: 'Scanner QR' }

export default function ScannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Scanner QR</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Apuntá la cámara al QR de la entrada para validarla.
        </p>
      </div>
      <QRScanner />
    </div>
  )
}
