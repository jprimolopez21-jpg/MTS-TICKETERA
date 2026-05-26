import type { Metadata } from 'next'
import EventForm from '../components/event-form'

export const metadata: Metadata = { title: 'Nuevo evento' }

export default function NuevoEventoPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-zinc-900">Nuevo evento</h1>
      <EventForm />
    </div>
  )
}
