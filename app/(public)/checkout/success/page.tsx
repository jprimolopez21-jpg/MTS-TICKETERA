import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compra exitosa' }

// Next.js 16: searchParams es una Promise
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const { order_id } = await searchParams

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">¡Compra exitosa!</h1>
        <p className="text-zinc-600 mb-2">
          Tu pago fue aprobado. En breve vas a recibir un email con tus entradas.
        </p>
        {order_id && (
          <p className="text-xs text-zinc-400 mb-8">
            Número de orden: <span className="font-mono">{order_id}</span>
          </p>
        )}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            Revisá tu bandeja de entrada (y la carpeta de spam por las dudas).
          </p>
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
