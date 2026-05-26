import React from 'react'
import { Document, Page, View, Text, Image, renderToBuffer, StyleSheet } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface TicketPDFData {
  ticketId: string
  qrToken: string
  ticketTypeName: string
  buyerName: string
  buyerDni: string
  eventName: string
  eventDate: string  // ISO string
  eventVenue: string
  eventCity: string
  orderId: string
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 36,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
  },
  brand: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#000000',
    fontFamily: 'Helvetica-Bold',
  },
  eventName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginTop: 6,
    lineHeight: 1.2,
  },
  body: {
    flexDirection: 'row',
    flex: 1,
    marginTop: 16,
  },
  leftCol: {
    flex: 1,
    paddingRight: 28,
  },
  rightCol: {
    width: 136,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  badge: {
    backgroundColor: '#000000',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  badgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  label: {
    fontSize: 7,
    color: '#999999',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 14,
    lineHeight: 1.4,
  },
  qrImage: {
    width: 128,
    height: 128,
  },
  qrHint: {
    fontSize: 8,
    color: '#999999',
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    borderTopStyle: 'solid',
  },
  footerText: {
    fontSize: 8,
    color: '#bbbbbb',
  },
})

async function toQRDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  })
}

function formatDate(iso: string): string {
  const str = format(new Date(iso), "EEEE d 'de' MMMM yyyy 'a las' HH:mm 'hs'", { locale: es })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function TicketPage({ data, qrSrc }: { data: TicketPDFData; qrSrc: string }) {
  return (
    <Page size="A5" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.brand}>MTS TICKETERA</Text>
        <Text style={styles.eventName}>{data.eventName}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.leftCol}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{data.ticketTypeName.toUpperCase()}</Text>
          </View>

          <Text style={styles.label}>Titular</Text>
          <Text style={styles.value}>{data.buyerName}</Text>

          <Text style={styles.label}>DNI</Text>
          <Text style={styles.value}>{data.buyerDni}</Text>

          <Text style={styles.label}>Fecha y hora</Text>
          <Text style={styles.value}>{formatDate(data.eventDate)}</Text>

          <Text style={styles.label}>Lugar</Text>
          <Text style={styles.value}>{data.eventVenue}, {data.eventCity}</Text>
        </View>

        <View style={styles.rightCol}>
          <Image src={qrSrc} style={styles.qrImage} />
          <Text style={styles.qrHint}>Presentar al ingreso</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Orden #{data.orderId.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.footerText}>#{data.ticketId.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.footerText}>Personal e intransferible — se pedirá DNI</Text>
      </View>
    </Page>
  )
}

export async function generateTicketsPDF(tickets: TicketPDFData[]): Promise<Buffer> {
  const qrSrcs = await Promise.all(tickets.map((t) => toQRDataUrl(t.qrToken)))

  const doc = (
    <Document
      title={`Entradas — ${tickets[0]?.eventName ?? 'Evento'}`}
      author="MTS Ticketera"
      creator="MTS Ticketera"
    >
      {tickets.map((ticket, i) => (
        <TicketPage key={ticket.ticketId} data={ticket} qrSrc={qrSrcs[i]} />
      ))}
    </Document>
  )

  return renderToBuffer(doc)
}
