export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
export type LeadType = 'PASSENGER' | 'DRIVER'
export type LeadChannel = 'MANUAL' | 'INSTAGRAM_DM' | 'INSTAGRAM_LEAD_AD' | 'WEBSITE'

export interface LeadRow {
  id: string
  name: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  leadType: LeadType
  channel: LeadChannel
  igUsername: string | null
  adName: string | null
  formName: string | null
  note: string | null
  followUpAt: string | null
  ownerId: string
  owner: { id: string; name: string | null; phone: string }
  // Sayt formasida berilgan rozilik va yuklangan hujjatlar (faqat tavsifi — fayl alohida olinadi).
  consentAt?: string | null
  consentVersion?: string | null
  documents?: LeadDocumentRow[]
  createdAt: string
  updatedAt: string
}

export interface LeadDocumentRow {
  id: string
  kind: 'PASSPORT' | 'LICENSE' | 'VEHICLE_DOCS' | 'VEHICLE_INFO'
  fileName: string
  mime: string
  size: number
  createdAt: string
}

export type LeadMessageDirection = 'IN' | 'OUT'

export interface LeadMessageRow {
  id: string
  leadId: string
  direction: LeadMessageDirection
  body: string
  createdAt: string
}

export interface InstagramStatus {
  configured: boolean
  connected: boolean
  igUsername?: string
  pageId?: string
  connectedAt?: string
  connectedByName?: string
}
