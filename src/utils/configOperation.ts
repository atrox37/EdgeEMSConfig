import type { ConfigRestartResult } from '@/types/systemConfig'

export type ConfigOperationKind = 'import' | 'restore' | 'restart'
export type ConfigOperationStatus = 'success' | 'recovered' | 'unavailable' | 'rejected' | 'unknown' | 'failed'

export interface ConfigOperationResult {
  status: ConfigOperationStatus
  title: string
  message: string
  services: ConfigRestartResult[]
  rollbackServices: ConfigRestartResult[]
  rollbackError?: string
  detail?: string
}

export const CONFIG_OPERATION_TITLES: Record<ConfigOperationKind, string> = {
  import: 'Applying configuration',
  restore: 'Restoring configuration',
  restart: 'Restarting services',
}

const successTitles: Record<ConfigOperationKind, string> = {
  import: 'Configuration applied successfully',
  restore: 'Configuration restored successfully',
  restart: 'Services restarted successfully',
}

const record = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? value as Record<string, any> : {}

function serviceResults(value: unknown): ConfigRestartResult[] {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item.service === 'string').map((item) => ({
        service: item.service,
        success: item.success === true,
        state: typeof item.state === 'string' ? item.state : undefined,
        error: typeof item.error === 'string' ? item.error : undefined,
      }))
    : []
}

export function configOperationSuccess(kind: ConfigOperationKind): ConfigOperationResult {
  return { status: 'success', title: successTitles[kind], message: '', services: [], rollbackServices: [] }
}

export function parseConfigOperationFailure(error: unknown, kind: ConfigOperationKind): ConfigOperationResult {
  const response = record(record(error).response)
  const body = record(response.data)
  const failure = record(body.error)
  const details = record(failure.details)
  const rollback = record(details.rollback)
  const result: ConfigOperationResult = {
    status: 'failed',
    title: 'Operation failed',
    message: failure.message || body.message || 'The operation could not be completed.',
    services: serviceResults(kind === 'restart' ? record(body.data).results : details.restart_results),
    rollbackServices: serviceResults(rollback.restart_results),
    rollbackError: typeof rollback.error === 'string' ? rollback.error : undefined,
    detail: failure.message || body.message,
  }

  if (!response.status || (response.status >= 200 && response.status < 300 && body.success !== false)) {
    result.status = 'unknown'
    result.title = 'Final result not confirmed'
    result.message = 'The final result was not received. Check the device status before trying again. The operation may still be running.'
  } else if (response.status === 503) {
    if (kind !== 'restart' && rollback.succeeded === true) {
      result.status = 'recovered'
      result.title = 'Operation failed · Previous configuration restored'
      result.message = 'The requested configuration was not applied successfully. The previous configuration has been restored and its services are running.'
    } else {
      result.status = 'unavailable'
      result.title = 'Services have not recovered'
      result.message = kind === 'restart'
        ? 'Some services could not be restarted. Check the failed services below before continuing.'
        : 'The configuration operation failed and service recovery was not confirmed. Check the failed services before continuing.'
    }
  } else if (response.status === 409 && failure.code === 'CONFIG_OPERATION_IN_PROGRESS') {
    result.status = 'rejected'
    result.title = 'Another configuration operation is running'
    result.message = 'This request was not executed. Wait for the existing operation to finish before trying again.'
  } else if (response.status >= 400 && response.status < 500) {
    result.status = 'rejected'
    result.title = 'Operation could not start'
  }
  return result
}

export class ConfigOperationError extends Error {
  readonly response: unknown
  readonly cause: unknown
  constructor(readonly result: ConfigOperationResult, cause: unknown) {
    super(result.message)
    this.name = 'ConfigOperationError'
    this.response = record(cause).response
    this.cause = cause
  }
}
