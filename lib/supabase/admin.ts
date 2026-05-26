import { createClient } from '@supabase/supabase-js'

// Cliente con service_role: bypasea RLS. NUNCA importar en componentes del cliente.
// Usar solo en Route Handlers críticos: webhooks, generación de QR, confirmación de pago.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
