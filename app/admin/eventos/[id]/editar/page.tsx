import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { Event, TicketType } from '@/types'
import EventForm from '../../components/event-form'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('name').eq('id', id).maybeSingle()
  return { title: data ? `Editar: ${data.name}` : 'Editar evento' }
}

export default async function EditarEventoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('id', id)
    .maybeSingle()

  if (!raw) notFound()

  const { ticket_types, ...event } = raw as Event & { ticket_types: TicketType[] }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-zinc-900">Editar evento</h1>
      <EventForm initialData={{ ...event, ticket_types }} />
    </div>
  )
}
