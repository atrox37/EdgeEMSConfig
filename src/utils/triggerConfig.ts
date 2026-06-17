import type {
  OnChangeTriggerConfig,
  TriggerConfig,
  TriggerConfigFormState,
  TriggerPointRef,
  ValueDeadband,
} from '@/types/ruleConfiguration'

export const DEFAULT_INTERVAL_MS = 1000

export function createDefaultTriggerFormState(): TriggerConfigFormState {
  return {
    type: 'interval',
    interval_ms: DEFAULT_INTERVAL_MS,
    point_refs: [createEmptyPointRefRow()],
    time_deadband_ms: null,
    value_deadband_mode: 'none',
    value_deadband_threshold: null,
  }
}

export function createEmptyPointRefRow(): TriggerConfigFormState['point_refs'][number] {
  return {
    instance: undefined,
    point_type: '',
    point: undefined,
  }
}

export function triggerFormFromConfig(config?: TriggerConfig | null): TriggerConfigFormState {
  if (!config || config.type === 'interval') {
    return {
      type: 'interval',
      interval_ms:
        config?.type === 'interval' && Number.isFinite(config.interval_ms)
          ? Number(config.interval_ms)
          : DEFAULT_INTERVAL_MS,
      point_refs: [createEmptyPointRefRow()],
      time_deadband_ms: null,
      value_deadband_mode: 'none',
      value_deadband_threshold: null,
    }
  }

  const onChange = config as OnChangeTriggerConfig
  const valueDeadband = onChange.value_deadband
  let value_deadband_mode: TriggerConfigFormState['value_deadband_mode'] = 'none'
  let value_deadband_threshold: number | null = null
  if (valueDeadband?.type === 'absolute' || valueDeadband?.type === 'percent') {
    value_deadband_mode = valueDeadband.type
    value_deadband_threshold = Number.isFinite(Number(valueDeadband.threshold))
      ? Number(valueDeadband.threshold)
      : null
  }

  const point_refs =
    Array.isArray(onChange.point_refs) && onChange.point_refs.length > 0
      ? onChange.point_refs.map((ref) => ({
          instance: Number.isFinite(Number(ref.instance)) ? Number(ref.instance) : undefined,
          point_type:
            ref.point_type === 'measurement' || ref.point_type === 'action'
              ? ref.point_type
              : ('' as const),
          point: Number.isFinite(Number(ref.point)) ? Number(ref.point) : undefined,
        }))
      : [createEmptyPointRefRow()]

  return {
    type: 'on_change',
    interval_ms: DEFAULT_INTERVAL_MS,
    point_refs,
    time_deadband_ms:
      onChange.time_deadband_ms == null
        ? null
        : Number.isFinite(Number(onChange.time_deadband_ms))
          ? Number(onChange.time_deadband_ms)
          : null,
    value_deadband_mode,
    value_deadband_threshold,
  }
}

function buildValueDeadband(form: TriggerConfigFormState): ValueDeadband | null | undefined {
  if (form.value_deadband_mode === 'none') return null
  const threshold = Number(form.value_deadband_threshold)
  if (!Number.isFinite(threshold)) return null
  return { type: form.value_deadband_mode, threshold }
}

export function buildTriggerConfigFromForm(form: TriggerConfigFormState): TriggerConfig {
  if (form.type === 'interval') {
    return {
      type: 'interval',
      interval_ms: Number(form.interval_ms) || DEFAULT_INTERVAL_MS,
    }
  }

  const point_refs: TriggerPointRef[] = form.point_refs
    .filter(
      (ref) =>
        Number.isFinite(Number(ref.instance)) &&
        (ref.point_type === 'measurement' || ref.point_type === 'action') &&
        Number.isFinite(Number(ref.point)),
    )
    .map((ref) => ({
      instance: Number(ref.instance),
      point_type: ref.point_type as 'measurement' | 'action',
      point: Number(ref.point),
    }))

  const payload: OnChangeTriggerConfig = {
    type: 'on_change',
    point_refs,
  }

  if (form.time_deadband_ms != null && Number.isFinite(Number(form.time_deadband_ms))) {
    payload.time_deadband_ms = Number(form.time_deadband_ms)
  }

  const valueDeadband = buildValueDeadband(form)
  if (valueDeadband) {
    payload.value_deadband = valueDeadband
  }

  return payload
}

export function validateTriggerForm(form: TriggerConfigFormState): string | null {
  if (form.type === 'interval') {
    const ms = Number(form.interval_ms)
    if (!Number.isFinite(ms) || ms <= 0) return 'Interval (ms) must be greater than 0'
    return null
  }

  const validRefs = form.point_refs.filter(
    (ref) =>
      Number.isFinite(Number(ref.instance)) &&
      (ref.point_type === 'measurement' || ref.point_type === 'action') &&
      Number.isFinite(Number(ref.point)),
  )
  if (validRefs.length === 0) {
    return 'OnChange trigger requires at least one complete point reference'
  }

  if (form.value_deadband_mode !== 'none') {
    const threshold = Number(form.value_deadband_threshold)
    if (!Number.isFinite(threshold) || threshold < 0) {
      return 'Value deadband threshold must be a non-negative number'
    }
  }

  if (form.time_deadband_ms != null) {
    const timeDeadband = Number(form.time_deadband_ms)
    if (!Number.isFinite(timeDeadband) || timeDeadband < 0) {
      return 'Time deadband (ms) must be a non-negative number'
    }
  }

  return null
}
