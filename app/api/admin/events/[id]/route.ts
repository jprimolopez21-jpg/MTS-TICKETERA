import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { ticket_types, ...eventData } = body

  const admin = createAdminClient()

  if (Object.keys(eventData).length) {
    const { error } = await admin.from('events').update(eventData).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
  }

  // Sincronizar ticket types: upsert los que vienen, no tocar el sold_qty
  if (ticket_types) {
    const incoming = ticket_types as Array<{ id?: string; [k: string]: unknown }>

    const toUpsert = incoming.map(({ id: typeId, ...rest }) => ({
      ...(typeId ? { id: typeId } : {}),
      ...rest,
      event_id: id,
    }))

    if (toUpsert.length) {
      const { error } = await admin.from('ticket_types').upsert(toUpsert, { onConflict: 'id' })
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }
  }

  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Solo permitir borrar eventos en draft o cancelled
  const { data: event } = await admin.from('events').select('status').eq('id', id).single()
  if (event?.status === 'published') {
    return Response.json({ error: 'No se puede eliminar un evento publicado' }, { status: 400 })
  }

  const { error } = await admin.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true })
}
