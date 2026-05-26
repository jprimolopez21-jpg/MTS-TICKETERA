'use client'

import { utils, writeFile } from 'xlsx'

interface TicketRow {
  id: string
  status: string
  created_at: string
  orders: { buyer_name: string; buyer_email: string; buyer_dni: string } | null
  ticket_types: { name: string } | null
  events: { id: string; name: string } | null
}

export default function ExportButton({ tickets }: { tickets: TicketRow[] }) {
  function handleExport() {
    const rows = tickets.map((t) => ({
      Nombre: t.orders?.buyer_name ?? '',
      DNI: t.orders?.buyer_dni ?? '',
      Email: t.orders?.buyer_email ?? '',
      Evento: t.events?.name ?? '',
      'Tipo de entrada': t.ticket_types?.name ?? '',
      Estado: t.status === 'used' ? 'Usado' : 'Activo',
      Fecha: new Date(t.created_at).toLocaleDateString('es-AR'),
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Asistentes')
    writeFile(wb, `asistentes-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
    >
      Exportar Excel
    </button>
  )
}
