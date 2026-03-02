import { Request } from '@/utils/request'
import type {
  ChannelTemplateDetail,
  ChannelTemplateListItem,
  ChannelTemplateProtocol,
  ApplyTemplateToChannelRequest,
  ApplyTemplateToChannelResponse,
  CreateTemplateFromChannelRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types/channelTemplates'

export const getTemplates = (protocol?: ChannelTemplateProtocol) => {
  const params = protocol ? { protocol } : undefined
  return Request.get<ChannelTemplateListItem[]>('/comApi/api/templates', params)
}

export const getTemplateDetail = (id: number) => {
  return Request.get<ChannelTemplateDetail>(`/comApi/api/templates/${id}`)
}

export const createTemplate = (data: CreateTemplateRequest) => {
  return Request.post('/comApi/api/templates', data)
}

export const createTemplateFromChannel = (
  channelId: number,
  data?: CreateTemplateFromChannelRequest,
) => {
  return Request.post(`/comApi/api/templates/from-channel/${channelId}`, data || {})
}

export const updateTemplate = (id: number, data: UpdateTemplateRequest) => {
  return Request.put(`/comApi/api/templates/${id}`, data)
}

export const deleteTemplate = (id: number) => {
  return Request.delete(`/comApi/api/templates/${id}`)
}

export const applyTemplateToChannel = (
  templateId: number,
  channelId: number,
  data: ApplyTemplateToChannelRequest,
) => {
  return Request.post<ApplyTemplateToChannelResponse>(
    `/comApi/api/templates/${templateId}/apply/${channelId}`,
    data,
  )
}

