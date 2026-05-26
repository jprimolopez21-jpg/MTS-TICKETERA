'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Event, TicketType, CreateOrderRequest, CreateOrderResponse } from '@/types'

interface BuyFormProps {
  event: Event
  ticketTypes: TicketType[]
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

export default function BuyForm({ event, ticketTypes }: BuyFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState(ticketTypes[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerDni, setBuyerDni] = useState('')

  const selectedType = ticketTypes.find((t) => t.id === selectedTypeId)
  const available = selectedType ? selectedType.total_qty - selectedType.sold_qty : 0
  const maxQty = Math.min(available, 10)

  const baseAmount = selectedType ? selectedType.price * quantity : 0
  const serviceFee = Math.round(baseAmount * 0.1 * 100) / 100
  const totalAmount = Math.round((baseAmount + serviceFee) * 100) / 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType || available === 0 || loading) return

    setLoading(true)
    try {
      const body: CreateOrderRequest = {
        event_id: event.id,
        ticket_type_id: selectedTypeId,
        quantity,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_dni: buyerDni,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as CreateOrderResponse & { error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Error al procesar la compra')
        return
      }

      // Redirigir al checkout de Mercado Pago
      window.location.href = data.init_point
    } catch {
      toast.error('Error de conexión. Verificá tu internet e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-zinc-900">Comprar entradas</h2>

      {/* Selector de tipo de ticket */}
      {ticketTypes.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-700">Tipo de entrada</label>
          <div className="flex flex-col gap-2">
            {ticketTypes.map((type) => {
              const avail = type.total_qty - type.sold_qty
              return (
                <label
                  key={type.id}
                  className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${
                    selectedTypeId === type.id
                      ? 'border-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="ticket_type"
                      value={type.id}
                      checked={selectedTypeId === type.id}
                      onChange={() => {
                        setSelectedTypeId(type.id)
                        setQuantity(1)
                      }}
                      className="accent-zinc-900"
                    />
                    <div>
                      <p className="font-medium text-zinc-900">{type.name}</p>
                      <p className="text-xs text-zinc-500">{avail} disponibles</p>
                    </div>
                  </div>
                  <span className="font-semibold text-zinc-900">{formatARS(type.price)}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Si hay un solo tipo, mostrarlo como card informativo */}
      {ticketTypes.length === 1 && selectedType && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div>
            <p className="font-medium text-zinc-900">{selectedType.name}</p>
            <p className="text-xs text-zinc-500">{available} disponibles</p>
          </div>
          <span className="font-semibold text-zinc-900">{formatARS(selectedType.price)}</span>
        </div>
      )}

      {/* Cantidad */}
      <div className="flex flex-col gap-2">
        <label htmlFor="quantity" className="text-sm font-medium text-zinc-700">
          Cantidad
        </label>
        <select
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          disabled={loading}
        >
          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'entrada' : 'entradas'}
            </option>
          ))}
        </select>
      </div>

      {/* Datos del comprador */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Tus datos
        </h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="buyer_name" className="text-sm font-medium text-zinc-700">
            Nombre completo
          </label>
          <input
            id="buyer_name"
            type="text"
            required
            autoComplete="name"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Juan Pérez"
            className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="buyer_email" className="text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="buyer_email"
            type="email"
            required
            autoComplete="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="juan@ejemplo.com"
            className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            disabled={loading}
          />
          <p className="text-xs text-zinc-500">Acá te enviamos tus entradas</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="buyer_dni" className="text-sm font-medium text-zinc-700">
            DNI
          </label>
          <input
            id="buyer_dni"
            type="text"
            required
            inputMode="numeric"
            pattern="\d{7,8}"
            value={buyerDni}
            onChange={(e) => setBuyerDni(e.target.value.replace(/\D/g, ''))}
            placeholder="12345678"
            maxLength={8}
            className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            disabled={loading}
          />
        </div>
      </div>

      {/* Resumen de precio */}
      <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm text-zinc-600">
          <span>
            {quantity} x {selectedType?.name}
          </span>
          <span>{formatARS(baseAmount)}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>Cargo por servicio (10%)</span>
          <span>{formatARS(serviceFee)}</span>
        </div>
        <hr className="border-zinc-200 my-1" />
        <div className="flex justify-between font-semibold text-zinc-900">
          <span>Total</span>
          <span>{formatARS(totalAmount)}</span>
        </div>
      </div>

      {/* Botón de compra */}
      <button
        type="submit"
        disabled={loading || !selectedType || available === 0}
        className="w-full rounded-xl bg-zinc-900 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-zinc-700 active:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : `Pagar ${formatARS(totalAmount)} con Mercado Pago`}
      </button>

      <p className="text-center text-xs text-zinc-400">
        Al continuar aceptás los términos y condiciones de MTS Ticketera.
      </p>
    </form>
  )
}
