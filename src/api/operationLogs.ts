import { Request, type ApiResponse } from '@/utils/request'
import type {
  OperationLogMetadata,
  OperationLogQuery,
  OperationLogRecord,
} from '@/types/operationLogs'

export interface OperationLogsResponse extends ApiResponse<OperationLogRecord[]> {
  metadata: OperationLogMetadata
}

export const getOperationLogs = (params: OperationLogQuery) => {
  return Request.get<OperationLogRecord[]>('/api/v1/operation-logs', params) as Promise<OperationLogsResponse>
}
