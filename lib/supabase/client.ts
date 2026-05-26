'use client'

import { createBrowserClient } from '@supabase/ssr'

// Solo para componentes del cliente ("use client")
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
