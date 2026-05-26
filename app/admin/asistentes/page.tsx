import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'
import type { Event } from '@/types'
import ExportButton from './components/export-button'

export const metadata: Metadata = { title: 'Asistentes' }

type TicketRow = {
  id: string
  status: string
  created_at: string
  orders: {
    buyer_name: string
    buyer_email: string
    buyer_dni: string
  } | null
  ticket_types: { name: string } | null
  events: { id: string; name: string } | null
}

type Props = { searchParams: Promise<{ evento?: string; q?: string }> }

export default async function AsistentesPage({ searchParams }: Props) {
  const { evento, q } = await searchParams
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .order('date', { ascending: false })

  let query = supabase
    .from('tickets')
    .select('id, status, created_at, orders(buyer_name, buyer_email, buyer_dni), ticket_types(name), events(id, name)')
    .in('status', ['active', 'used'])
    .order('created_at', { ascending: false })

  if (evento) query = query.eq('event_id', evento)

  const { data: rawTickets } = await query
  let tickets = (rawTickets ?? []) as unknown as TicketRow[]

  if (q) {
    const term = q.toLowerCase()
    tickets = tickets.filter((t) => {
      const buyer = t.orders
      return (
        buyer?.buyer_name.toLowerCase().includes(term) ||
        buyer?.buyer_dni.includes(term) ||
        buyer?.buyer_email.toLowerCase().includes(term)
      )
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Asistentes</h1>
        {tickets.length > 0 && <ExportButton tickets={tickets} />}
      </div>

      {/* Filtros */}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          name="evento"
          defaultValue={evento ?? ''}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-900 focus:outline-none"
        >
          <option value="">Todos los eventos</option>
          {(events ?? []).map((e: Pick<Event, 'id' | 'name'>) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre, DNI o email..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Tabla */}
      <div className="text-xs text-zinc-500 -mb-3">
        {tickets.length} resultado{tickets.length !== 1 ? 's' : ''}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center">
          <p className="text-sm text-zinc-400">No hay asistentes para los filtros aplicados.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-5 py-3 font-medium text-zinc-500">Nombre</th>
                <th className="px-5 py-3 font-medium text-zinc-500">DNI</th>
                <th className="px-5 py-3 font-medium text-zinc-500 hidden md:table-cell">Email</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Evento</th>
                <th className="px-5 py-3 font-medium text-zinc-500 hidden sm:table-cell">Tipo</th>
                <th className="px-5 py-3 font-medium text-zinc-500">Estado</th>
                <th className="px-5 py-3 font-medium text-zinc-500 hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3.5 font-medium text-zinc-900">
                    {ticket.orders?.buyer_name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 font-mono text-xs">
                    {ticket.orders?.buyer_dni ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 hidden md:table-cell">
                    {ticket.orders?.buyer_email ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {ticket.events?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 hidden sm:table-cell">
                    {ticket.ticket_types?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      ticket.status === 'used'
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {ticket.status === 'used' ? 'Usado' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 text-xs hidden lg:table-cell">
                    {format(new Date(ticket.created_at), "d MMM yyyy", { locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
