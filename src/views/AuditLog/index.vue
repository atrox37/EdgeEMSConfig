<template>
  <div class="voltage-class audit-log">
    <header class="audit-log__header">
      <PageTitle title="Audit Log" />
    </header>

    <main class="audit-log__content">
      <section class="audit-log__search-form">
        <el-form :model="filters" :inline="true" class="test-form audit-log__filters-desktop">
          <el-form-item label="Time:">
            <el-date-picker
              v-model="filters.timeRange"
              type="datetimerange"
              range-separator="-"
              start-placeholder="Start time"
              end-placeholder="End time"
              format="YYYY-MM-DD HH:mm:ss"
              :teleported="false"
              unlink-panels
              class="audit-log__time-picker"
              @change="handleSearch"
            />
          </el-form-item>
          <el-form-item label="Username:">
            <el-input
              v-model="filters.username"
              clearable
              placeholder="Please enter username"
              @input="handleUsernameInput"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
        </el-form>

        <div class="audit-log__reload-icon" title="Reset filters" @click="resetFilters">
          <AppIcon name="i-tabler-refresh" className="audit-log__inline-icon" />
        </div>
      </section>

      <section class="audit-log__table-panel">
        <el-table
          v-loading="loading"
          :data="tableData"
          row-key="event_id"
          stripe
          table-layout="fixed"
          class="audit-log__table"
        >
          <el-table-column type="expand" width="48">
            <template #default="{ row }">
              <div class="audit-log__bodies">
                <section class="audit-log__body-section">
                  <div class="audit-log__body-title">Request Body</div>
                  <pre class="audit-log__body-content">{{
                    row.request_body || 'No request body'
                  }}</pre>
                </section>
                <section class="audit-log__body-section">
                  <div class="audit-log__body-title">Response Body</div>
                  <pre class="audit-log__body-content">{{
                    row.response_body || 'No response body'
                  }}</pre>
                </section>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Time" width="170">
            <template #default="{ row }">
              {{ formatOccurredAt(row.occurred_at_ms) }}
            </template>
          </el-table-column>

          <el-table-column label="Actor" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ actorName(operationLogRow(row)) }}</template>
          </el-table-column>

          <el-table-column label="Request Type" width="130">
            <template #default="{ row }">
              <span class="audit-log__method">{{ row.method || '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Request Path" show-overflow-tooltip>
            <template #default="{ row }">{{ row.path || row.route || '-' }}</template>
          </el-table-column>

          <el-table-column label="Response Status" width="150">
            <template #default="{ row }">
              <span :class="statusClass(row.status)">{{ row.status ?? '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Duration" width="110" align="right">
            <template #default="{ row }">{{ row.duration_ms }} ms</template>
          </el-table-column>
        </el-table>

        <div class="audit-log__pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[50, 100, 200]"
            :total="pagination.total"
            layout="total, prev, pager, next, sizes"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import PageTitle from '@/components/common/PageTitle.vue'
import { getOperationLogs } from '@/api/operationLogs'
import type { OperationLogRecord } from '@/types/operationLogs'
import { asTableRow } from '@/utils/tableRow'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_MS = 31 * DAY_MS
const operationLogRow = (row: unknown) => asTableRow<OperationLogRecord>(row)

const createDefaultTimeRange = (): [Date, Date] => {
  const end = new Date()
  return [new Date(end.getTime() - DAY_MS), end]
}

const filters = reactive({
  timeRange: createDefaultTimeRange() as [Date, Date] | null,
  username: '',
})

const loading = ref(false)
const tableData = ref<OperationLogRecord[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0,
})

const normalizeText = (value: string) => value.trim() || undefined

const validateFilters = () => {
  if (!filters.timeRange || filters.timeRange.length !== 2) {
    ElMessage.warning('Please select a time range')
    return false
  }

  const [start, end] = filters.timeRange
  if (start.getTime() >= end.getTime()) {
    ElMessage.warning('The end time must be later than the start time')
    return false
  }
  if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
    ElMessage.warning('The time range cannot exceed 31 days')
    return false
  }

  return true
}

const fetchOperationLogs = async () => {
  const timeRange = filters.timeRange
  if (!validateFilters() || !timeRange) return

  const [start, end] = timeRange
  loading.value = true
  try {
    const response = await getOperationLogs({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      username: normalizeText(filters.username),
      page: pagination.page,
      page_size: pagination.pageSize,
    })

    tableData.value = response.data ?? []
    pagination.total = response.metadata?.total ?? 0
    pagination.page = response.metadata?.page ?? pagination.page
    pagination.pageSize = response.metadata?.page_size ?? pagination.pageSize
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  if (usernameSearchTimer) {
    clearTimeout(usernameSearchTimer)
    usernameSearchTimer = null
  }
  pagination.page = 1
  void fetchOperationLogs()
}

let usernameSearchTimer: ReturnType<typeof setTimeout> | null = null
const handleUsernameInput = () => {
  if (usernameSearchTimer) clearTimeout(usernameSearchTimer)
  usernameSearchTimer = setTimeout(handleSearch, 400)
}

const resetFilters = () => {
  filters.timeRange = createDefaultTimeRange()
  filters.username = ''
  pagination.page = 1
  void fetchOperationLogs()
}

const handlePageSizeChange = () => {
  pagination.page = 1
  void fetchOperationLogs()
}

const handlePageChange = () => {
  void fetchOperationLogs()
}

const formatOccurredAt = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) return '-'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '-'

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const actorName = (row: OperationLogRecord) =>
  row.actor_type === 'service'
    ? row.source_service || row.username || 'Unknown service'
    : row.username || 'Unknown'

const statusClass = (status: number) => {
  if (status >= 500) return 'audit-log__http-status is-error'
  if (status >= 400) return 'audit-log__http-status is-warning'
  if (status >= 200 && status < 300) return 'audit-log__http-status is-success'
  return 'audit-log__http-status'
}

onMounted(() => {
  void fetchOperationLogs()
})

onBeforeUnmount(() => {
  if (usernameSearchTimer) clearTimeout(usernameSearchTimer)
})
</script>

<style scoped lang="scss">
.audit-log {
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.audit-log__header {
  height: 64px;
  flex: 0 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
}

.audit-log__content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.audit-log__search-form {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 20px 12px;
  border-bottom: 1px solid #dcdfe6;
}

.audit-log__filters-desktop {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 0;
  }

  :deep(.audit-log__time-picker) {
    width: 340px;
  }
}

.audit-log__reload-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.audit-log__reload-icon:hover {
  opacity: 0.7;
}

.audit-log__reload-icon {

  .audit-log__inline-icon {
    width: 32px;
    height: 32px;
    color: var(--vt-color-primary);
  }
}

.audit-log__table-panel {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20px 22px;
}

.audit-log__table {
  width: 100%;
  height: calc(100% - 72px);
  flex: 0 0 calc(100% - 72px);
}

.audit-log__method {
  min-width: 48px;
  color: var(--vt-color-primary);
  font-size: var(--vt-font-size-sm);
  font-weight: var(--vt-font-weight-semibold);
}

.audit-log__bodies {
  width: 0;
  min-width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.audit-log__body-section {
  width: 0;
  min-width: 100%;
  max-width: 100%;
}

.audit-log__body-title {
  margin-bottom: 6px;
  color: var(--vt-text-secondary);
  font-size: var(--vt-font-size-sm);
  font-weight: var(--vt-font-weight-semibold);
}

.audit-log__body-content {
  box-sizing: border-box;
  max-height: 240px;
  margin: 0;
  padding: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  background: var(--vt-bg-elevated);
  color: var(--vt-text-primary);
  font-size: var(--vt-font-size-sm);
  line-height: 1.5;
  border: 1px solid var(--vt-border-color);
  border-radius: 4px;
}

.audit-log__http-status {
  font-weight: var(--vt-font-weight-semibold);
}

.audit-log__http-status.is-success {
  color: var(--vt-color-success);
}

.audit-log__http-status.is-warning {
  color: var(--vt-color-warning);
}

.audit-log__http-status.is-error {
  color: var(--vt-color-danger);
}

.audit-log__pagination {
  height: 72px;
  flex: 0 0 72px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
