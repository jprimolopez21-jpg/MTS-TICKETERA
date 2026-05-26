import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pago no procesado' }

export default async function FailurePage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const { order_id } = await searchParams

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">No pudimos procesar tu pago</h1>
        <p className="text-zinc-600 mb-2">
          El pago fue rechazado o cancelado. No se realizó ningún cargo.
        </p>
        {order_id && (
          <p className="text-xs text-zinc-400 mb-8">
            Referencia: <span className="font-mono">{order_id}</span>
          </p>
        )}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            Podés intentarlo de nuevo con otro medio de pago.
          </p>
          <Link
            href="/eventos"
            className="inline-block rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Volver a intentar
          </Link>
          <Link
            href="/eventos"
            className="inline-block rounded-xl border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Ver más eventos
          </Link>
        </div>
      </div>
    </div>
  )
}
