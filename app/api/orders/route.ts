import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMPPreference } from '@/lib/mercadopago'
import { generateQRToken } from '@/lib/qr'
import type { CreateOrderRequest, CreateOrderResponse, Event, TicketType } from '@/types'

export async function POST(request: Request) {
  try {
    let body: CreateOrderRequest
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Request inválido' }, { status: 400 })
    }

    const { event_id, ticket_type_id, quantity, buyer_name, buyer_email, buyer_dni } = body

    // ── Validación de entrada ────────────────────────────────────────────────
    if (!event_id || !ticket_type_id || !buyer_name?.trim() || !buyer_email?.trim() || !buyer_dni?.trim()) {
      return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      return Response.json({ error: 'Cantidad inválida (entre 1 y 10)' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer_email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (!/^\d{7,8}$/.test(buyer_dni.trim())) {
      return Response.json({ error: 'DNI inválido (7 u 8 dígitos sin puntos)' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── Obtener ticket type ──────────────────────────────────────────────────
    const { data: rawTT, error: ttError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', ticket_type_id)
      .eq('event_id', event_id)
      .maybeSingle()

    if (ttError || !rawTT) {
      return Response.json({ error: 'Tipo de ticket no encontrado' }, { status: 404 })
    }
    const ticketType = rawTT as TicketType

    // ── Obtener evento ───────────────────────────────────────────────────────
    const { data: rawEvent, error: eventError } = await supabase
      .from('events')
      .select('id, name, date, status')
      .eq('id', event_id)
      .maybeSingle()

    if (eventError || !rawEvent) {
      return Response.json({ error: 'Evento no encontrado' }, { status: 404 })
    }
    const event = rawEvent as Pick<Event, 'id' | 'name' | 'date' | 'status'>

    if (event.status !== 'published') {
      return Response.json({ error: 'El evento no está disponible para la venta' }, { status: 400 })
    }

    // ── Validar fechas de venta ──────────────────────────────────────────────
    const now = new Date()
    if (ticketType.sale_start && new Date(ticketType.sale_start) > now) {
      return Response.json({ error: 'La venta de este ticket aún no comenzó' }, { status: 400 })
    }
    if (ticketType.sale_end && new Date(ticketType.sale_end) < now) {
      return Response.json({ error: 'La venta de este ticket ha finalizado' }, { status: 400 })
    }

    // ── Reserva atómica de cupos ─────────────────────────────────────────────
    // La función PostgreSQL usa SELECT FOR UPDATE para evitar doble venta
    const { data: reservation, error: reserveError } = await supabase.rpc('reserve_ticket', {
      p_ticket_type_id: ticket_type_id,
      p_quantity: qty,
    })

    if (reserveError) {
      console.error('[reserve_ticket]', reserveError)
      return Response.json({ error: 'Error al reservar los tickets' }, { status: 500 })
    }

    const result = Array.isArray(reservation) ? reservation[0] : reservation
    if (!result?.success) {
      const rem = result?.remaining ?? 0
      const msg = rem === 0
        ? 'No quedan entradas disponibles'
        : `Solo quedan ${rem} entradas disponibles`
      return Response.json({ error: msg }, { status: 409 })
    }

    // ── Calcular precios ─────────────────────────────────────────────────────
    const baseAmount = Math.round(ticketType.price * qty * 100) / 100
    const serviceFee = Math.round(baseAmount * 0.1 * 100) / 100
    const totalAmount = Math.round((baseAmount + serviceFee) * 100) / 100

    // ── Crear orden ──────────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id,
        buyer_name: buyer_name.trim(),
        buyer_email: buyer_email.toLowerCase().trim(),
        buyer_dni: buyer_dni.trim(),
        total_amount: totalAmount,
        service_fee: serviceFee,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[create order]', orderError)
      await supabase.rpc('release_ticket_reservation', {
        p_ticket_type_id: ticket_type_id,
        p_quantity: qty,
      })
      return Response.json({ error: 'Error al crear la orden' }, { status: 500 })
    }

    // ── Crear tickets con QR pre-generados ───────────────────────────────────
    // Generamos los UUIDs acá para poder firmar los JWT antes del INSERT.
    // Status 'pending' hasta que el pago se confirme en el webhook.
    const ticketIds = Array.from({ length: qty }, () => randomUUID())
    const qrTokens = await Promise.all(
      ticketIds.map((id) => generateQRToken(id, event_id, event.date))
    )

    const { error: ticketsError } = await supabase.from('tickets').insert(
      ticketIds.map((id, i) => ({
        id,
        order_id: order.id,
        ticket_type_id,
        event_id,
        qr_token: qrTokens[i],
        status: 'pending',
      }))
    )

    if (ticketsError) {
      console.error('[create tickets]', ticketsError)
      await supabase.from('orders').delete().eq('id', order.id)
      await supabase.rpc('release_ticket_reservation', {
        p_ticket_type_id: ticket_type_id,
        p_quantity: qty,
      })
      return Response.json({ error: 'Error al crear los tickets' }, { status: 500 })
    }

    // ── Crear preferencia en Mercado Pago ────────────────────────────────────
    let preference
    try {
      preference = await createMPPreference({
        orderId: order.id,
        eventName: event.name,
        ticketTypeName: ticketType.name,
        quantity: qty,
        totalAmount,
        buyerEmail: buyer_email.toLowerCase().trim(),
        buyerName: buyer_name.trim(),
      })
    } catch (mpError) {
      console.error('[create mp preference]', mpError)
      await supabase.from('tickets').delete().eq('order_id', order.id)
      await supabase.from('orders').delete().eq('id', order.id)
      await supabase.rpc('release_ticket_reservation', {
        p_ticket_type_id: ticket_type_id,
        p_quantity: qty,
      })
      return Response.json({ error: 'Error al iniciar el pago. Intentá de nuevo.' }, { status: 500 })
    }

    // Guardar preference_id (no crítico si falla — la orden ya está creada)
    await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id })
      .eq('id', order.id)

    const response: CreateOrderResponse = {
      order_id: order.id,
      init_point: preference.init_point!,
    }
    return Response.json(response, { status: 201 })
  } catch (error) {
    console.error('[POST /api/orders]', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
