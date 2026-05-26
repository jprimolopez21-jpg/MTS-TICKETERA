import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Para Server Components y Route Handlers con acceso al usuario autenticado (RLS activo)
export async function createClient() {
  const cookieStore = await cookies() // async en Next.js 16

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorar en Server Components: el proxy.ts refresca la sesión
          }
        },
      },
    }
  )
}
