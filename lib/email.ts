import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

// DEV: onboarding@resend.dev (solo envía al email de tu cuenta Resend)
// PROD: cambiar por tickets@tu-dominio.com una vez verificado en Resend
const FROM =
  process.env.NODE_ENV === 'production'
    ? 'MTS Ticketera <tickets@mts-ticketera.com>'
    : 'MTS Ticketera <onboarding@resend.dev>'

interface SendTicketsEmailParams {
  buyerEmail: string
  buyerName: string
  eventName: string
  eventDate: string   // ya formateado para mostrar
  eventVenue: string
  eventCity: string
  ticketCount: number
  orderId: string
  pdfBuffer: Buffer
}

function buildHtml(p: Omit<SendTicketsEmailParams, 'buyerEmail' | 'pdfBuffer' | 'orderId'> & { orderId: string }): string {
  const firstName = p.buyerName.split(' ')[0]
  const ticketWord = p.ticketCount === 1 ? 'tu entrada' : `tus ${p.ticketCount} entradas`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tus entradas - MTS Ticketera</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;">

        <!-- Header -->
        <tr><td style="background:#000;padding:24px 32px;border-radius:12px 12px 0 0;">
          <p style="margin:0;color:#fff;font-size:14px;font-weight:bold;letter-spacing:2px;">MTS TICKETERA</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:bold;color:#000;">¡Listo, ${firstName}!</p>
          <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.5;">
            Tu compra fue confirmada. Adjuntamos ${ticketWord} a este email.
          </p>

          <!-- Event card -->
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f8f8;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;">Evento</p>
              <p style="margin:0 0 14px;font-size:20px;font-weight:bold;color:#000;line-height:1.3;">${p.eventName}</p>
              <p style="margin:0 0 4px;font-size:13px;color:#555;">&#128197; ${p.eventDate}</p>
              <p style="margin:0;font-size:13px;color:#555;">&#128205; ${p.eventVenue}, ${p.eventCity}</p>
            </td></tr>
          </table>

          <p style="margin:0 0 6px;font-size:13px;color:#666;line-height:1.6;">
            Presenta el <strong>código QR</strong> que está en el PDF adjunto al ingresar al evento.
            El ticket es personal e intransferible: te van a pedir el DNI.
          </p>
          <p style="margin:16px 0 0;font-size:11px;color:#bbb;">N° de orden: ${p.orderId}</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fff;padding:16px 32px 24px;border:1px solid #e8e8e8;border-top:0;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#ccc;text-align:center;line-height:1.6;">
            MTS Ticketera &nbsp;·&nbsp; Si tenés algún problema escribinos a soporte@mts-ticketera.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendTicketsEmail(params: SendTicketsEmailParams): Promise<void> {
  const { buyerEmail, buyerName, eventName, eventDate, eventVenue, eventCity, ticketCount, orderId, pdfBuffer } = params

  await resend.emails.send({
    from: FROM,
    to: buyerEmail,
    subject: `Tus entradas para ${eventName} 🎉`,
    html: buildHtml({ buyerName, eventName, eventDate, eventVenue, eventCity, ticketCount, orderId }),
    attachments: [
      {
        filename: `entradas-${orderId.slice(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}
