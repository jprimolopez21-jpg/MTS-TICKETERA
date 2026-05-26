import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'
import type { Event, TicketType } from '@/types'
import { setEventStatus, deleteEvent } from './actions'

export const metadata: Metadata = { title: 'Eventos' }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  cancelled: 'Cancelado',
  finished: 'Finalizado',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  finished: 'bg-zinc-100 text-zinc-500',
}

type EventRow = Event & {
  ticket_types: Pick<TicketType, 'total_qty' | 'sold_qty'>[]
}

export default async function AdminEventosPage() {
  const supabase = await createClient()
  const { data: raw } = await supabase
    .from('events')
    .select('*, ticket_types(total_qty, sold_qty)')
    .order('date', { ascending: false })

  const events = (raw ?? []) as EventRow[]

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Eventos</h1>
        <Link
          href="/admin/eventos/nuevo"
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          + Nuevo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">Todavía no hay eventos. Creá el primero.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500">Evento</th>
                <th className="px-5 py-3 font-medium text-zinc-500 hidden sm:table-cell">Fecha</th>
                <th className="px-5 py-3 font-medium text-zinc-500 hidden md:table-cell">Tickets</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Estado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {events.map((event) => {
                const totalQty = event.ticket_types.reduce((s, t) => s + t.total_qty, 0)
                const soldQty = event.ticket_types.reduce((s, t) => s + t.sold_qty, 0)

                return (
                  <tr key={event.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900">{event.name}</p>
                      <p className="text-xs text-zinc-400">{event.city}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-zinc-600">
                      {format(new Date(event.date), "d MMM yyyy · HH:mm", { locale: es })}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-zinc-600">
                      {soldQty} / {totalQty}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[event.status] ?? ''}`}>
                        {STATUS_LABEL[event.status] ?? event.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/eventos/${event.id}/editar`}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                        >
                          Editar
                        </Link>
                        {event.status === 'draft' && (
                          <form action={async () => {
                            'use server'
                            await setEventStatus(event.id, 'published')
                          }}>
                            <button className="text-xs font-medium text-green-700 hover:text-green-900">
                              Publicar
                            </button>
                          </form>
                        )}
                        {event.status === 'published' && (
                          <form action={async () => {
                            'use server'
                            await setEventStatus(event.id, 'draft')
                          }}>
                            <button className="text-xs font-medium text-zinc-500 hover:text-zinc-700">
                              Despublicar
                            </button>
                          </form>
                        )}
                        {event.status !== 'published' && (
                          <form action={async () => {
                            'use server'
                            await deleteEvent(event.id)
                          }}>
                            <button className="text-xs font-medium text-red-500 hover:text-red-700">
                              Eliminar
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
