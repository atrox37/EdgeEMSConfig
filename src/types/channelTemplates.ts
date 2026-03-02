import type { PointInfoResponse } from '@/types/channelConfiguration'

export type ChannelTemplateProtocol = 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'

export interface ChannelTemplatePointCounts {
  telemetry: number
  signal: number
  control: number
  adjustment: number
}

export interface ChannelTemplateListItem {
  template_id: number
  name: string
  description: string
  protocol: ChannelTemplateProtocol
  point_counts: ChannelTemplatePointCounts
  created_at: string
}

export interface TemplateMappingSnapshotItem {
  point_id: number
  signal_name?: string
  protocol_data: Record<string, any>
}

export interface TemplateMappingsSnapshot {
  telemetry: TemplateMappingSnapshotItem[]
  signal: TemplateMappingSnapshotItem[]
  control: TemplateMappingSnapshotItem[]
  adjustment: TemplateMappingSnapshotItem[]
}

export interface ChannelTemplateDetail {
  template_id: number
  name: string
  description: string
  protocol: ChannelTemplateProtocol
  source_channel_id?: number
  points_snapshot: PointInfoResponse
  mappings_snapshot: TemplateMappingsSnapshot
  created_at: string
  updated_at: string
}

export interface CreateTemplateRequest {
  name: string
  description: string
  protocol: ChannelTemplateProtocol
  points_snapshot: Record<string, any>
  mappings_snapshot: Record<string, any>
}

export interface CreateTemplateFromChannelRequest {
  template_id?: number
  name?: string
  description?: string
}

export interface UpdateTemplateRequest {
  name: string
  description: string
}

export interface ApplyTemplateToChannelRequest {
  clear_existing: boolean
  slave_id_override: number | null
}

export interface ApplyTemplateToChannelResponse {
  channel_id: number
  cleared_existing: boolean
  message: string
  points_inserted: number
  slave_id_override: number | null
  template_id: number
}

