import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'
import type { Event, TicketType } from '@/types'

export const metadata: Metadata = { title: 'Eventos' }

// Precio mínimo de los tipos de ticket activos de un evento
type EventWithMinPrice = Event & { min_price: number | null }

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

function EventCard({ event }: { event: EventWithMinPrice }) {
  const eventDate = new Date(event.date)
  const isPast = eventDate < new Date()

  return (
    <Link
      href={`/eventos/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
    >
      {/* Imagen */}
      <div className="relative h-44 w-full overflow-hidden bg-zinc-100">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">🎫</span>
          </div>
        )}
        {isPast && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-700">
              Evento finalizado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
          {event.city}
        </p>
        <h2 className="mb-3 text-base font-bold leading-snug text-zinc-900 group-hover:text-zinc-700">
          {event.name}
        </h2>

        <div className="mt-auto flex flex-col gap-1 text-sm text-zinc-500">
          <span>
            📅{' '}
            {format(eventDate, "d 'de' MMMM 'de' yyyy · HH:mm 'hs'", { locale: es })}
          </span>
          <span>📍 {event.venue}</span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {event.min_price !== null ? (
            <span className="text-sm font-semibold text-zinc-900">
              Desde {formatARS(event.min_price)}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">Sin entradas disponibles</span>
          )}
          {!isPast && event.min_price !== null && (
            <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-zinc-700">
              Comprar
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function EventosPage() {
  const supabase = await createClient()

  // Traer eventos publicados con sus ticket_types para calcular precio mínimo
  const { data: rawEvents } = await supabase
    .from('events')
    .select('*, ticket_types(price, total_qty, sold_qty, sale_start, sale_end)')
    .eq('status', 'published')
    .order('date', { ascending: true })

  const now = new Date()

  const events: EventWithMinPrice[] = ((rawEvents ?? []) as Array<Event & { ticket_types: TicketType[] }>).map(
    ({ ticket_types, ...event }) => {
      const available = ticket_types.filter((t) => {
        const withinSale =
          (!t.sale_start || new Date(t.sale_start) <= now) &&
          (!t.sale_end || new Date(t.sale_end) >= now)
        return withinSale && t.total_qty - t.sold_qty > 0
      })
      const min_price = available.length > 0 ? Math.min(...available.map((t) => t.price)) : null
      return { ...event, min_price }
    }
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Eventos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {events.length === 0
            ? 'No hay eventos disponibles por el momento.'
            : `${events.length} evento${events.length > 1 ? 's' : ''} disponible${events.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {events.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-200 py-20 text-center">
          <p className="text-4xl mb-4">🎫</p>
          <p className="text-zinc-500">Pronto habrá nuevos eventos. ¡Volvé a checar!</p>
        </div>
      )}
    </div>
  )
}
