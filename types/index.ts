// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type TicketStatus = 'active' | 'used' | 'cancelled'
export type ScanResult = 'valid' | 'already_used' | 'invalid' | 'expired'

// ─── Entidades de base de datos ───────────────────────────────────────────────

export interface Event {
  id: string
  name: string
  description: string | null
  date: string
  venue: string
  city: string
  image_url: string | null
  status: EventStatus
  created_at: string
}

export interface TicketType {
  id: string
  event_id: string
  name: string
  price: number
  total_qty: number
  sold_qty: number
  sale_start: string | null
  sale_end: string | null
}

export interface Order {
  id: string
  event_id: string
  buyer_name: string
  buyer_email: string
  buyer_dni: string
  total_amount: number
  service_fee: number
  status: OrderStatus
  mp_payment_id: string | null
  mp_preference_id: string | null
  created_at: string
  paid_at: string | null
}

export interface Ticket {
  id: string
  order_id: string
  ticket_type_id: string
  event_id: string
  qr_token: string
  status: TicketStatus
  created_at: string
}

export interface ScanLog {
  id: string
  ticket_id: string
  scanned_at: string
  device_id: string
  result: ScanResult
}

// ─── Tipos con relaciones (para queries con joins) ────────────────────────────

export type EventWithTicketTypes = Event & {
  ticket_types: TicketType[]
}

export type TicketWithDetails = Ticket & {
  ticket_type: Pick<TicketType, 'name' | 'price'>
  order: Pick<Order, 'buyer_name' | 'buyer_email' | 'buyer_dni'>
  event: Pick<Event, 'name' | 'date' | 'venue' | 'city'>
}

export type OrderWithDetails = Order & {
  tickets: Array<Ticket & { ticket_type: Pick<TicketType, 'name'> }>
  event: Pick<Event, 'name' | 'date' | 'venue' | 'city'>
}

// ─── API: Crear orden ─────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  event_id: string
  ticket_type_id: string
  quantity: number
  buyer_name: string
  buyer_email: string
  buyer_dni: string
}

export interface CreateOrderResponse {
  order_id: string
  init_point: string
}

// ─── QR ───────────────────────────────────────────────────────────────────────

export interface QRTokenPayload {
  ticket_id: string
  event_id: string
  exp: number
}

export interface ScanValidationResult {
  valid: boolean
  result: ScanResult
  ticket?: TicketWithDetails
  message: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DailySalesData {
  date: string
  revenue: number
  tickets_sold: number
}

export interface TicketTypeStats {
  ticket_type_id: string
  name: string
  total_qty: number
  sold_qty: number
  revenue: number
}
