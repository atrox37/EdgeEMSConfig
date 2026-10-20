export type OperationLogActorType = 'user' | 'service' | 'unverified' | 'unknown'

export interface OperationLogRecord {
  event_id: string
  occurred_at_ms: number
  service: string
  user_id: number | null
  username: string | null
  actor_type: OperationLogActorType
  source_service: string | null
  method: string
  route: string
  path: string
  status: number
  business_success: boolean | null
  duration_ms: number
  request_id: string | null
  request_body?: string | null
  response_body?: string | null
}

export interface OperationLogQuery {
  start_time: string
  end_time: string
  username?: string
  interface?: string
  service?: string
  method?: string
  status?: number
  page: number
  page_size: number
}

export interface OperationLogMetadata {
  total: number
  page: number
  page_size: number
}
