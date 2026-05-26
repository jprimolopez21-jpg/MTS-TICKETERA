import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyQRToken } from '@/lib/qr'
import type { ScanResult } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { token, device_id } = await request.json() as { token: string; device_id: string }

  if (!token) return Response.json({ valid: false, result: 'invalid', message: 'Token vacío' })

  const admin = createAdminClient()

  // Verificar JWT
  let payload
  try {
    payload = await verifyQRToken(token)
  } catch (err: unknown) {
    const isExpired = err instanceof Error && err.message.includes('exp')
    const result: ScanResult = isExpired ? 'expired' : 'invalid'
    await admin.from('scan_logs').insert({ ticket_id: null, device_id, result })
    return Response.json({ valid: false, result, message: isExpired ? 'QR expirado' : 'QR inválido' })
  }

  // Obtener ticket con datos del comprador y evento
  const { data: ticket } = await admin
    .from('tickets')
    .select('id, status, event_id, ticket_type_id, orders(buyer_name, buyer_dni), ticket_types(name), events(name, date, venue)')
    .eq('id', payload.ticket_id)
    .maybeSingle()

  if (!ticket) {
    await admin.from('scan_logs').insert({ ticket_id: payload.ticket_id, device_id, result: 'invalid' })
    return Response.json({ valid: false, result: 'invalid', message: 'Ticket no encontrado' })
  }

  type TicketRow = {
    id: string
    status: string
    orders: { buyer_name: string; buyer_dni: string } | null
    ticket_types: { name: string } | null
    events: { name: string; date: string; venue: string } | null
  }
  const t = ticket as unknown as TicketRow

  if (t.status === 'used') {
    await admin.from('scan_logs').insert({ ticket_id: t.id, device_id, result: 'already_used' })
    return Response.json({
      valid: false,
      result: 'already_used',
      message: 'Este ticket ya fue usado',
      buyer_name: t.orders?.buyer_name,
    })
  }

  if (t.status !== 'active') {
    await admin.from('scan_logs').insert({ ticket_id: t.id, device_id, result: 'invalid' })
    return Response.json({ valid: false, result: 'invalid', message: 'Ticket inválido' })
  }

  // Marcar como usado
  await admin.from('tickets').update({ status: 'used' }).eq('id', t.id)
  await admin.from('scan_logs').insert({ ticket_id: t.id, device_id, result: 'valid' })

  return Response.json({
    valid: true,
    result: 'valid',
    message: 'Acceso permitido',
    buyer_name: t.orders?.buyer_name,
    buyer_dni: t.orders?.buyer_dni,
    ticket_type: t.ticket_types?.name,
    event_name: t.events?.name,
  })
}
