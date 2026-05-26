'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type ScanResult = 'valid' | 'already_used' | 'invalid' | 'expired'

interface ScanResponse {
  valid: boolean
  result: ScanResult
  message: string
  buyer_name?: string
  buyer_dni?: string
  ticket_type?: string
  event_name?: string
}

interface ScanHistoryItem extends ScanResponse {
  scannedAt: Date
}

// Genera o recupera un device_id persistente para los scan_logs
function getDeviceId(): string {
  const key = 'mts_scanner_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

const RESULT_CONFIG = {
  valid: {
    bg: 'bg-green-500',
    icon: '✓',
    title: 'ACCESO PERMITIDO',
  },
  already_used: {
    bg: 'bg-yellow-500',
    icon: '!',
    title: 'YA USADO',
  },
  invalid: {
    bg: 'bg-red-500',
    icon: '✗',
    title: 'INVÁLIDO',
  },
  expired: {
    bg: 'bg-red-500',
    icon: '✗',
    title: 'EXPIRADO',
  },
}

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [manualToken, setManualToken] = useState('')
  const [processing, setProcessing] = useState(false)
  const cooldownRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  const validate = useCallback(async (token: string) => {
    if (processing || cooldownRef.current) return
    cooldownRef.current = true
    setProcessing(true)

    try {
      const res = await fetch('/api/admin/scanner/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, device_id: getDeviceId() }),
      })
      const data = (await res.json()) as ScanResponse
      setLastResult(data)
      setHistory((prev) => [{ ...data, scannedAt: new Date() }, ...prev.slice(0, 9)])
    } catch {
      setLastResult({ valid: false, result: 'invalid', message: 'Error de conexión' })
    } finally {
      setProcessing(false)
      // Cooldown de 2.5 segundos para evitar escanear el mismo QR dos veces
      setTimeout(() => { cooldownRef.current = false }, 2500)
    }
  }, [processing])

  useEffect(() => {
    // BarcodeDetector no tiene tipos en TS, se accede via window
    const BarcodeDetector = (window as unknown as { BarcodeDetector?: { getSupportedFormats(): Promise<string[]> } & (new (opts: object) => { detect(src: HTMLVideoElement): Promise<Array<{ rawValue: string }>> }) }).BarcodeDetector

    if (!BarcodeDetector) {
      setCameraError('Tu navegador no soporta escaneo automático. Usá la entrada manual.')
      return
    }

    let animationId: number
    let detector: ReturnType<typeof BarcodeDetector['prototype']['detect']> extends Promise<infer T> ? never : unknown

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const det = new BarcodeDetector!({ formats: ['qr_code'] })
        setScanning(true)

        async function scan() {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationId = requestAnimationFrame(scan)
            return
          }
          try {
            const barcodes = await det.detect(videoRef.current)
            if (barcodes.length > 0) {
              await validate(barcodes[0].rawValue)
            }
          } catch { /* frame skip */ }
          animationId = requestAnimationFrame(scan)
        }
        scan()
      } catch {
        setCameraError('No se pudo acceder a la cámara. Verificá los permisos del navegador.')
      }
    }

    startCamera()

    return () => {
      cancelAnimationFrame(animationId)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [validate])

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualToken.trim()) return
    await validate(manualToken.trim())
    setManualToken('')
  }

  const cfg = lastResult ? RESULT_CONFIG[lastResult.result] : null

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto">

      {/* Cámara */}
      <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-[4/3]">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {!scanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/60 text-sm">Iniciando cámara...</p>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-white/50 rounded-2xl" />
          </div>
        )}
        {/* Overlay de resultado */}
        {lastResult && cfg && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${cfg.bg} bg-opacity-90 transition-opacity`}>
            <span className="text-white text-7xl font-bold mb-2">{cfg.icon}</span>
            <p className="text-white text-2xl font-bold">{cfg.title}</p>
            {lastResult.buyer_name && (
              <p className="text-white/90 text-lg mt-1">{lastResult.buyer_name}</p>
            )}
            {lastResult.buyer_dni && (
              <p className="text-white/70 text-sm">DNI {lastResult.buyer_dni}</p>
            )}
            {lastResult.ticket_type && (
              <p className="text-white/70 text-sm">{lastResult.ticket_type}</p>
            )}
            <button
              onClick={() => setLastResult(null)}
              className="mt-4 text-white/60 text-xs underline"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {cameraError && (
        <p className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          {cameraError}
        </p>
      )}

      {/* Entrada manual */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          placeholder="Pegar token manualmente..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          disabled={processing}
        />
        <button
          type="submit"
          disabled={processing || !manualToken.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          Validar
        </button>
      </form>

      {/* Historial */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <p className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide border-b border-zinc-100">
            Últimos escaneos
          </p>
          <div className="divide-y divide-zinc-100">
            {history.map((item, i) => {
              const c = RESULT_CONFIG[item.result]
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {c.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {item.buyer_name ?? item.message}
                    </p>
                    {item.buyer_dni && (
                      <p className="text-xs text-zinc-400">DNI {item.buyer_dni} · {item.ticket_type}</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">
                    {item.scannedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
