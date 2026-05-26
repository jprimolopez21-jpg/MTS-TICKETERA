import { createHmac, timingSafeEqual } from 'node:crypto'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentClient } from '@/lib/mercadopago'
import { generateTicketsPDF, type TicketPDFData } from '@/lib/pdf'
import { sendTicketsEmail } from '@/lib/email'
import type { Event } from '@/types'

// Valida la firma HMAC-SHA256 que MP incluye en cada notificación.
// Template: id:{payment_id};request-id:{x-request-id};ts:{timestamp};
function validateMPSignature(
  paymentId: string,
  xSignature: string,
  xRequestId: string,
): boolean {
  try {
    const parts = Object.fromEntries(
      xSignature.split(',').map((p) => p.split('=') as [string, string])
    )
    const ts = parts['ts']
    const v1 = parts['v1']
    if (!ts || !v1) return false

    const template = `id:${paymentId};request-id:${xRequestId};ts:${ts};`
    const hmac = createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
    hmac.update(template)
    const calculated = hmac.digest('hex')

    // timingSafeEqual previene ataques de timing
    return timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(v1, 'hex'))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)

    // MP envía el body con la info principal; los query params son para IPN (formato antiguo)
    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      // Algunos pings de MP no tienen body
    }

    const topic = url.searchParams.get('topic') ?? url.searchParams.get('type') ?? body['type']
    const paymentIdRaw =
      url.searchParams.get('id') ??
      (body['data'] as Record<string, unknown> | undefined)?.['id']

    // Solo procesamos notificaciones de pago
    if (topic !== 'payment' || !paymentIdRaw) {
      return Response.json({ ok: true })
    }

    const paymentId = String(paymentIdRaw)

    // ── Validar firma ────────────────────────────────────────────────────────
    const xSignature = request.headers.get('x-signature')
    const xRequestId = request.headers.get('x-request-id')

    // En desarrollo podemos saltar la validación si el secret no está configurado
    const skipSignature =
      process.env.NODE_ENV === 'development' &&
      process.env.MP_WEBHOOK_SECRET === 'pendiente'

    if (!skipSignature) {
      if (!xSignature || !xRequestId) {
        return Response.json({ error: 'Firma requerida' }, { status: 401 })
      }
      if (!validateMPSignature(paymentId, xSignature, xRequestId)) {
        return Response.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    // ── Obtener detalle del pago desde la API de MP ──────────────────────────
    let payment
    try {
      payment = await paymentClient.get({ id: Number(paymentId) })
    } catch (err) {
      console.error('[webhook] Error al obtener pago MP:', err)
      // Devolver 200 para que MP no reintente (logueamos el error internamente)
      return Response.json({ ok: true })
    }

    const orderId = payment.external_reference
    if (!orderId) {
      console.error('[webhook] Pago sin external_reference:', paymentId)
      return Response.json({ ok: true })
    }

    const supabase = createAdminClient()

    // ── Obtener la orden ─────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, event_id')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      console.error('[webhook] Orden no encontrada:', orderId)
      return Response.json({ ok: true })
    }

    // Idempotencia: si ya fue procesada, ignorar
    if (order.status === 'paid' || order.status === 'failed') {
      return Response.json({ ok: true })
    }

    // ── Pago aprobado ────────────────────────────────────────────────────────
    if (payment.status === 'approved') {
      // Activar todos los tickets pendientes de esta orden
      const { error: ticketsError } = await supabase
        .from('tickets')
        .update({ status: 'active' })
        .eq('order_id', orderId)
        .eq('status', 'pending')

      if (ticketsError) {
        console.error('[webhook] Error al activar tickets:', ticketsError)
        return Response.json({ ok: true })
      }

      // Confirmar la orden
      const { data: confirmedOrder } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          mp_payment_id: String(payment.id),
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select('id, buyer_name, buyer_email, buyer_dni, event_id')
        .single()

      // Enviar email con PDF — si falla, las entradas ya están confirmadas
      if (confirmedOrder) {
        try {
          await sendEmailWithTickets(orderId, confirmedOrder as {
            id: string
            buyer_name: string
            buyer_email: string
            buyer_dni: string
            event_id: string
          }, supabase)
        } catch (emailError) {
          console.error('[webhook] Error al enviar email:', emailError)
        }
      }

      return Response.json({ ok: true })
    }

    // ── Pago fallido o cancelado ─────────────────────────────────────────────
    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      // Obtener tickets para liberar la reserva
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, ticket_type_id')
        .eq('order_id', orderId)
        .eq('status', 'pending')

      if (tickets && tickets.length > 0) {
        const typedTickets = tickets as Array<{ id: string; ticket_type_id: string }>
        const ticket_type_id = typedTickets[0].ticket_type_id
        const quantity = typedTickets.length

        // Liberar cupos
        await supabase.rpc('release_ticket_reservation', {
          p_ticket_type_id: ticket_type_id,
          p_quantity: quantity,
        })

        // Cancelar los tickets
        await supabase
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('order_id', orderId)
      }

      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', orderId)
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/webhooks/mercadopago]', error)
    // Siempre 200: MP reintenta en cualquier error no-2xx, lo que puede duplicar operaciones
    return Response.json({ ok: true })
  }
}

// ── Helper: construye y envía el email con el PDF adjunto ────────────────────

type OrderForEmail = {
  id: string
  buyer_name: string
  buyer_email: string
  buyer_dni: string
  event_id: string
}

async function sendEmailWithTickets(
  orderId: string,
  order: OrderForEmail,
  supabase: ReturnType<typeof createAdminClient>
) {
  // Obtener evento
  const { data: rawEvent } = await supabase
    .from('events')
    .select('name, date, venue, city')
    .eq('id', order.event_id)
    .single()

  if (!rawEvent) throw new Error(`Evento no encontrado: ${order.event_id}`)
  const event = rawEvent as Pick<Event, 'name' | 'date' | 'venue' | 'city'>

  // Obtener tickets activos
  const { data: rawTickets } = await supabase
    .from('tickets')
    .select('id, qr_token, ticket_type_id')
    .eq('order_id', orderId)
    .eq('status', 'active')

  if (!rawTickets?.length) throw new Error(`Sin tickets activos para orden: ${orderId}`)
  const tickets = rawTickets as Array<{ id: string; qr_token: string; ticket_type_id: string }>

  // Obtener nombre del tipo de ticket
  const { data: rawType } = await supabase
    .from('ticket_types')
    .select('name')
    .eq('id', tickets[0].ticket_type_id)
    .single()

  const ticketTypeName = (rawType as { name: string } | null)?.name ?? 'Entrada General'

  // Armar datos para el PDF
  const pdfTickets: TicketPDFData[] = tickets.map((t) => ({
    ticketId: t.id,
    qrToken: t.qr_token,
    ticketTypeName,
    buyerName: order.buyer_name,
    buyerDni: order.buyer_dni,
    eventName: event.name,
    eventDate: event.date,
    eventVenue: event.venue,
    eventCity: event.city,
    orderId,
  }))

  const pdfBuffer = await generateTicketsPDF(pdfTickets)

  // Formatear fecha para el email
  const eventDateDisplay = (() => {
    const str = format(new Date(event.date), "EEEE d 'de' MMMM 'de' yyyy 'a las' HH:mm 'hs'", {
      locale: es,
    })
    return str.charAt(0).toUpperCase() + str.slice(1)
  })()

  await sendTicketsEmail({
    buyerEmail: order.buyer_email,
    buyerName: order.buyer_name,
    eventName: event.name,
    eventDate: eventDateDisplay,
    eventVenue: event.venue,
    eventCity: event.city,
    ticketCount: tickets.length,
    orderId,
    pdfBuffer,
  })
}
