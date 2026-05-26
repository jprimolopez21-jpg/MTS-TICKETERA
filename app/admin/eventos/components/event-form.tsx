'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { EventStatus, TicketType } from '@/types'

interface TicketTypeInput {
  id?: string
  name: string
  price: string
  total_qty: string
  sale_start: string
  sale_end: string
}

interface EventFormProps {
  initialData?: {
    id: string
    name: string
    description: string | null
    date: string
    venue: string
    city: string
    image_url: string | null
    status: EventStatus
    ticket_types: Pick<TicketType, 'id' | 'name' | 'price' | 'total_qty' | 'sale_start' | 'sale_end'>[]
  }
}

function toLocalDatetime(iso: string | null) {
  if (!iso) return ''
  // "2026-06-15T20:00:00" → "2026-06-15T20:00"
  return iso.slice(0, 16)
}

function emptyTicketType(): TicketTypeInput {
  return { name: '', price: '', total_qty: '', sale_start: '', sale_end: '' }
}

export default function EventForm({ initialData }: EventFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [date, setDate] = useState(toLocalDatetime(initialData?.date ?? null))
  const [venue, setVenue] = useState(initialData?.venue ?? '')
  const [city, setCity] = useState(initialData?.city ?? '')
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? '')
  const [status, setStatus] = useState<EventStatus>(initialData?.status ?? 'draft')
  const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>(
    initialData?.ticket_types.length
      ? initialData.ticket_types.map((t) => ({
          id: t.id,
          name: t.name,
          price: String(t.price),
          total_qty: String(t.total_qty),
          sale_start: toLocalDatetime(t.sale_start),
          sale_end: toLocalDatetime(t.sale_end),
        }))
      : [emptyTicketType()]
  )
  const [loading, setLoading] = useState(false)

  function addTicketType() {
    setTicketTypes((prev) => [...prev, emptyTicketType()])
  }

  function removeTicketType(i: number) {
    setTicketTypes((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateTicketType(i: number, field: keyof TicketTypeInput, value: string) {
    setTicketTypes((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      name,
      description: description || null,
      date: new Date(date).toISOString(),
      venue,
      city,
      image_url: imageUrl || null,
      status,
      ticket_types: ticketTypes.map((t) => ({
        ...(t.id ? { id: t.id } : {}),
        name: t.name,
        price: Number(t.price),
        total_qty: Number(t.total_qty),
        sale_start: t.sale_start ? new Date(t.sale_start).toISOString() : null,
        sale_end: t.sale_end ? new Date(t.sale_end).toISOString() : null,
      })),
    }

    try {
      const url = isEdit ? `/api/admin/events/${initialData.id}` : '/api/admin/events'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Error al guardar el evento')
        return
      }

      toast.success(isEdit ? 'Evento actualizado' : 'Evento creado')
      router.push('/admin/eventos')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white'
  const labelClass = 'text-sm font-medium text-zinc-700'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-2xl">

      {/* Datos del evento */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Evento</h2>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nombre *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del evento" className={inputClass} disabled={loading} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Descripción</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional"
            className={`${inputClass} resize-none`} disabled={loading} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fecha y hora *</label>
            <input required type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              className={inputClass} disabled={loading} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}
              className={inputClass} disabled={loading}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="cancelled">Cancelado</option>
              <option value="finished">Finalizado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Venue / lugar *</label>
            <input required value={venue} onChange={(e) => setVenue(e.target.value)}
              placeholder="Teatro Gran Rex" className={inputClass} disabled={loading} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Ciudad *</label>
            <input required value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="Buenos Aires" className={inputClass} disabled={loading} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>URL de imagen</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..." type="url" className={inputClass} disabled={loading} />
        </div>
      </section>

      {/* Tipos de ticket */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Tipos de entrada
          </h2>
          <button type="button" onClick={addTicketType}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
            + Agregar tipo
          </button>
        </div>

        {ticketTypes.map((tt, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Tipo {i + 1}
              </span>
              {ticketTypes.length > 1 && (
                <button type="button" onClick={() => removeTicketType(i)}
                  className="text-xs text-red-500 hover:text-red-700">
                  Eliminar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Nombre *</label>
                <input required value={tt.name}
                  onChange={(e) => updateTicketType(i, 'name', e.target.value)}
                  placeholder="General" className={inputClass} disabled={loading} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Precio (ARS) *</label>
                <input required type="number" min="0" step="0.01" value={tt.price}
                  onChange={(e) => updateTicketType(i, 'price', e.target.value)}
                  placeholder="5000" className={inputClass} disabled={loading} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Cupos *</label>
                <input required type="number" min="1" step="1" value={tt.total_qty}
                  onChange={(e) => updateTicketType(i, 'total_qty', e.target.value)}
                  placeholder="200" className={inputClass} disabled={loading} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Inicio venta</label>
                <input type="datetime-local" value={tt.sale_start}
                  onChange={(e) => updateTicketType(i, 'sale_start', e.target.value)}
                  className={inputClass} disabled={loading} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Fin venta</label>
                <input type="datetime-local" value={tt.sale_end}
                  onChange={(e) => updateTicketType(i, 'sale_end', e.target.value)}
                  className={inputClass} disabled={loading} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Acciones */}
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear evento'}
        </button>
        <button type="button" onClick={() => router.back()} disabled={loading}
          className="rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
