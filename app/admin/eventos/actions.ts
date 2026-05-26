'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EventStatus } from '@/types'

export async function setEventStatus(id: string, status: EventStatus) {
  const admin = createAdminClient()
  await admin.from('events').update({ status }).eq('id', id)
  revalidatePath('/admin/eventos')
}

export async function deleteEvent(id: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('events').select('status').eq('id', id).single()
  if (data?.status === 'published') throw new Error('No se puede eliminar un evento publicado')
  await admin.from('events').delete().eq('id', id)
  revalidatePath('/admin/eventos')
}
