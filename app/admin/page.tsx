import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'
import type { Order, Event } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { data: paidOrders },
    { data: ticketCount },
    { data: recentOrders },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'paid'),
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'used']),
    supabase
      .from('orders')
      .select('id, buyer_name, buyer_email, total_amount, status, created_at, events(name)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('events')
      .select('id, name, date, venue, city')
      .eq('status', 'published')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(5),
  ])

  const totalRevenue = (paidOrders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const totalOrders = (paidOrders ?? []).length
  const totalTickets = ticketCount ?? 0

  type RecentOrder = {
    id: string
    buyer_name: string
    total_amount: number
    status: string
    created_at: string
    events: { name: string } | null
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <h1 className="text-xl font-bold text-zinc-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Ingresos totales"
          value={formatARS(totalRevenue)}
          sub="órdenes pagadas"
        />
        <StatCard
          label="Órdenes pagadas"
          value={String(totalOrders)}
          sub="transacciones confirmadas"
        />
        <StatCard
          label="Tickets emitidos"
          value={String(totalTickets)}
          sub="activos + usados"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Órdenes recientes */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Órdenes recientes</h2>
          </div>
          {(recentOrders ?? []).length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-zinc-400">Sin órdenes todavía</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {((recentOrders ?? []) as unknown as RecentOrder[]).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{order.buyer_name}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      {order.events?.name ?? '—'} ·{' '}
                      {format(new Date(order.created_at), "d MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {order.status === 'paid' ? 'pagada' : order.status === 'failed' ? 'fallida' : order.status}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {formatARS(order.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos eventos */}
        <div className="rounded-2xl bg-white border border-zinc-200">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Próximos eventos</h2>
          </div>
          {(upcomingEvents ?? []).length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-zinc-400">Sin eventos publicados</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {(upcomingEvents as Event[]).map((event) => (
                <div key={event.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-zinc-900 truncate">{event.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {format(new Date(event.date), "d MMM yyyy · HH:mm 'hs'", { locale: es })}
                  </p>
                  <p className="text-xs text-zinc-400">{event.venue}, {event.city}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
