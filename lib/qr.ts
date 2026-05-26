import { SignJWT, jwtVerify } from 'jose'
import type { QRTokenPayload } from '@/types'

function getSecret() {
  return new TextEncoder().encode(process.env.QR_JWT_SECRET!)
}

// Genera un JWT firmado para un ticket.
// Expira al final del día siguiente al evento para que el staff pueda escanear
// incluso si el evento se extiende pasada la medianoche.
export async function generateQRToken(
  ticketId: string,
  eventId: string,
  eventDate: string,
): Promise<string> {
  const expDay = new Date(eventDate)
  expDay.setUTCDate(expDay.getUTCDate() + 1)
  expDay.setUTCHours(23, 59, 59, 999)

  return new SignJWT({ ticket_id: ticketId, event_id: eventId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expDay)
    .sign(getSecret())
}

// Verifica y decodifica un QR token. Lanza error si es inválido o expirado.
export async function verifyQRToken(token: string): Promise<QRTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return {
    ticket_id: payload.ticket_id as string,
    event_id: payload.event_id as string,
    exp: payload.exp as number,
  }
}
