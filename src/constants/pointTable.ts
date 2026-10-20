/** point-table BEM popper class names（供 schema 与 el-select popper-class 共用） */
export const POINT_TABLE_POPPER = {
  filter: 'point-table__popper--filter',
  mapping: 'point-table__popper--mapping',
  reverse: 'point-table__popper--reverse',
  publish: 'point-table__popper--publish',
} as const

/** el-table-column class-name（BEM modifier on point-table block） */
export const POINT_TABLE_COL = {
  pointId: 'point-table-col--point-id',
  signalName: 'point-table-col--signal-name',
  value: 'point-table-col--value',
  updateTime: 'point-table-col--update-time',
  scale: 'point-table-col--scale',
  offset: 'point-table-col--offset',
  unit: 'point-table-col--unit',
  description: 'point-table-col--description',
  reverse: 'point-table-col--reverse',
  canId: 'point-table-col--can-id',
  canOffset: 'point-table-col--can-offset',
  canBitPosition: 'point-table-col--can-bit-position',
  canBitLength: 'point-table-col--can-bit-length',
  canDataType: 'point-table-col--can-data-type',
  gpioNumber: 'point-table-col--gpio-number',
  slaveId: 'point-table-col--slave-id',
  functionCode: 'point-table-col--function-code',
  registerAddress: 'point-table-col--register-address',
  dataType: 'point-table-col--data-type',
  byteOrder: 'point-table-col--byte-order',
  bitPosition: 'point-table-col--bit-position',
  iec61850Address: 'point-table-col--iec61850-address',
  ctrlModel: 'point-table-col--ctrl-model',
  channel: 'point-table-col--channel',
  channelType: 'point-table-col--channel-type',
  channelPoint: 'point-table-col--channel-point',
  enabled: 'point-table-col--enabled',
  operation: 'point-table-col--operation',
  publishValue: 'point-table-col--publish-value',
} as const

export const POINT_TABLE_CELL = {
  value: 'point-table__cell-text--value',
} as const

export type PointTableOpVariant = 'add' | 'delete' | 'restore' | 'publish' | 'execute'

export type PointTableVariant = 'device' | 'routing'

export type PointTablePaginationVariant = 'compact' | 'bordered'

/** PointTableShell provide/inject key for el-table body height */
export const POINT_TABLE_BODY_HEIGHT_KEY = Symbol('pointTableBodyHeight')
