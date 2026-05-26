import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BuyForm from './components/buy-form'
import type { Event, TicketType } from '@/types'
import type { Metadata } from 'next'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Next.js 16: params es una Promise
type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('name, description').eq('id', id).maybeSingle()
  if (!data) return { title: 'Evento no encontrado' }
  return {
    title: data.name,
    description: data.description ?? undefined,
  }
}

export default async function EventoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch evento
  const { data: rawEvent } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (!rawEvent) notFound()
  const event = rawEvent as Event

  // Fetch ticket types disponibles (con cupos y dentro de fecha de venta)
  const now = new Date().toISOString()
  const { data: rawTypes } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', id)
    .or(`sale_start.is.null,sale_start.lte.${now}`)
    .or(`sale_end.is.null,sale_end.gte.${now}`)
    .order('price', { ascending: true })

  const ticketTypes = (rawTypes ?? []) as TicketType[]
  const availableTypes = ticketTypes.filter((t) => t.total_qty - t.sold_qty > 0)

  const eventDate = new Date(event.date)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero del evento */}
      {event.image_url && (
        <div className="relative h-56 w-full bg-zinc-900 sm:h-72 md:h-96 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <p className="text-sm font-medium text-white/70 uppercase tracking-wider">
              {event.city}
            </p>
            <h1 className="text-3xl font-bold text-white mt-1 leading-tight">{event.name}</h1>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!event.image_url && (
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">{event.name}</h1>
        )}

        {/* Info del evento */}
        <div className="flex flex-col gap-2 text-zinc-600 mb-6 text-sm">
          <span>
            📅{' '}
            <strong className="text-zinc-900">
              {format(eventDate, "EEEE d 'de' MMMM 'de' yyyy, HH:mm 'hs'", { locale: es })}
            </strong>
          </span>
          <span>
            📍 {event.venue}, {event.city}
          </span>
        </div>

        {event.description && (
          <p className="text-zinc-600 text-sm leading-relaxed mb-8">{event.description}</p>
        )}

        <hr className="border-zinc-200 mb-8" />

        {/* Formulario de compra */}
        {availableTypes.length === 0 ? (
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-6 text-center">
            <p className="text-zinc-500 font-medium">
              {ticketTypes.length === 0
                ? 'No hay tickets disponibles para este evento.'
                : 'Las entradas están agotadas.'}
            </p>
          </div>
        ) : (
          <BuyForm event={event} ticketTypes={availableTypes} />
        )}
      </div>
    </div>
  )
}
