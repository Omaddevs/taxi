export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
export type LeadType = 'PASSENGER' | 'DRIVER'
export type LeadChannel = 'MANUAL' | 'INSTAGRAM_DM' | 'INSTAGRAM_LEAD_AD'

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
  createdAt: string
  updatedAt: string
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
