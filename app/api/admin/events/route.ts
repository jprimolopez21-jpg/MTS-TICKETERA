import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { ticket_types, ...eventData } = body

  const admin = createAdminClient()

  const { data: event, error: eventError } = await admin
    .from('events')
    .insert(eventData)
    .select('id')
    .single()

  if (eventError) {
    return Response.json({ error: eventError.message }, { status: 400 })
  }

  if (ticket_types?.length) {
    const types = ticket_types.map((t: Record<string, unknown>) => ({ ...t, event_id: event.id }))
    const { error: typesError } = await admin.from('ticket_types').insert(types)
    if (typesError) {
      await admin.from('events').delete().eq('id', event.id)
      return Response.json({ error: typesError.message }, { status: 400 })
    }
  }

  return Response.json({ id: event.id }, { status: 201 })
}
