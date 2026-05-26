import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export const preferenceClient = new Preference(client)
export const paymentClient = new Payment(client)

interface CreatePreferenceParams {
  orderId: string
  eventName: string
  ticketTypeName: string
  quantity: number
  totalAmount: number
  buyerEmail: string
  buyerName: string
}

export async function createMPPreference({
  orderId,
  eventName,
  ticketTypeName,
  quantity,
  totalAmount,
  buyerEmail,
  buyerName,
}: CreatePreferenceParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  return preferenceClient.create({
    body: {
      items: [
        {
          id: orderId,
          title: `${quantity}x ${ticketTypeName} — ${eventName}`,
          quantity: 1,
          unit_price: totalAmount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: buyerEmail,
        name: buyerName,
      },
      external_reference: orderId,
      back_urls: {
        success: `${appUrl}/checkout/success?order_id=${orderId}`,
        failure: `${appUrl}/checkout/failure?order_id=${orderId}`,
        pending: `${appUrl}/checkout/success?order_id=${orderId}`,
      },
      auto_return: 'approved',
      // Excluir /api/webhooks del proxy.ts matcher para que MP pueda llamar sin auth
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'MTS TICKETERA',
    },
  })
}
