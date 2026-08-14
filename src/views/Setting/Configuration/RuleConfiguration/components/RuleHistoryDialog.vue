<template>
  <FormDialog
    width="90%"
    ref="dialogRef"
    :title="dialogTitle"
    dialog-class="rule-history-dialog-wrapper"
    style="height: 80%;"
  >
    <template #dialog-body>
      <div class="rule-history-dialog">
        <div class="rule-history-dialog__toolbar">
          <el-form :inline="true" class="rule-history-dialog__toolbar-form">
            <el-form-item label="Start Time:">
              <el-date-picker
                v-model="startTimeDisplay"
                type="datetime"
                placeholder="Please select start time"
                format="YYYY-MM-DD HH:mm:ss"
                :disabled-date="disableStartDate"
                clearable
                @change="handleStartTimeChange"
              />
            </el-form-item>
            <el-form-item label="End Time:">
              <el-date-picker
                v-model="endTimeDisplay"
                type="datetime"
                placeholder="Please select end time"
                format="YYYY-MM-DD HH:mm:ss"
                :disabled-date="disableEndDate"
                clearable
                @change="handleEndTimeChange"
              />
            </el-form-item>
          </el-form>
          <div class="rule-history-dialog__toolbar-actions">
            <el-button @click="reloadHistoryFilters">Reload</el-button>
            <el-button type="primary" @click="searchHistory">Search</el-button>
          </div>
        </div>

        <div class="rule-history-dialog__body">
          <el-table
            v-loading="loading"
            :data="historyList"
            class="rule-history-dialog__table"
            table-layout="fixed"
            align="left"
          >
            <el-table-column type="expand" width="48">
              <template #default="{ row }">
                <div class="rule-history-dialog__detail">
                  <div
                    v-if="getHistoryErrors(row).length"
                    class="rule-history-dialog__error-banner"
                  >
                    <div
                      v-for="(err, errIdx) in getHistoryErrors(row)"
                      :key="`err-${errIdx}`"
                      class="rule-history-dialog__error-line"
                    >
                      {{ err }}
                    </div>
                  </div>

                  <div class="rule-history-dialog__trigger-reason">
                    <div class="rule-history-dialog__trigger-title">
                      <AppIcon name="i-tabler-bolt" className="rule-history-dialog__trigger-icon" />
                      <span>Trigger Reason</span>
                    </div>
                    <div class="rule-history-dialog__trigger-value">
                      <span>{{ getTriggerReason(row) }}</span>
                      <span
                        v-if="getTriggerReason(row) !== '-'"
                        class="rule-history-dialog__matched-tag"
                      >
                        <span class="rule-history-dialog__matched-dot" />
                        Matched
                      </span>
                    </div>
                  </div>

                  <div class="rule-history-dialog__detail-item">
                    <span class="rule-history-dialog__detail-label">Execution Steps </span>
                    <div v-if="getExecutionGraph(row)?.nodes.length" class="rule-history-dialog__flow">
                      <RuleHistoryExecutionFlow :graph="getExecutionGraph(row)!" />
                    </div>
                    <!-- <div
                      v-if="getFlattenedExecutionTree(row).length"
                      class="rule-history-dialog__steps"
                    >
                      <div
                        v-for="(item, index) in getFlattenedExecutionTree(row)"
                        :key="`${item.node.step.node_id}-${index}`"
                        class="rule-history-dialog__step-card"
                        :class="{
                          [`is-${getExecutionStepStatus(item.node.step)}`]: true,
                          'is-branch': item.siblingCount > 1,
                        }"
                        :style="{ marginLeft: `${item.depth * 16}px` }"
                      >
                        <div class="rule-history-dialog__step-title">
                          <span class="rule-history-dialog__step-name">
                            <span
                              v-if="getExecutionStepStatus(item.node.step) !== 'default'"
                              class="rule-history-dialog__step-status"
                            >
                              • {{ getExecutionStepStatus(item.node.step) === 'error' ? 'Error' : 'Interrupt' }}
                            </span>
                            <span
                              v-if="item.siblingCount > 1"
                              class="rule-history-dialog__branch-mark"
                            >
                              branch {{ item.branchIndex + 1 }}/{{ item.siblingCount }}
                            </span>
                            {{ formatExecutionStep(item.node.step) }}
                          </span>
                        </div>

                        <div
                          v-if="formatExecutionStepDescription(item.node.step)"
                          class="rule-history-dialog__step-description"
                        >
                          {{ formatExecutionStepDescription(item.node.step) }}
                        </div>

                      </div>
                    </div> -->
                    <span v-else class="rule-history-dialog__detail-value">-</span>
                  </div>

                  <div v-if="getDisplayActions(row).length" class="rule-history-dialog__detail-item">
                    <span class="rule-history-dialog__detail-label">Actions Excuted</span>
                    <div class="rule-history-dialog__actions-list">
                      <div
                        v-for="(action, index) in getDisplayActions(row)"
                        :key="`action-${index}`"
                        class="rule-history-dialog__action-card"
                      >
                        <span>{{ action.description }}</span>
                        <span
                          class="rule-history-dialog__action-status"
                          :class="
                            action.success === false
                              ? 'is-failed'
                              : action.success
                                ? 'is-success'
                                : ''
                          "
                        >
                          {{
                            action.success === false
                              ? 'Failed'
                              : action.success
                                ? 'Success'
                                : '-'
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="triggered_at" label="Trigger Time" width="180">
              <template #default="{ row }">
                <span>{{ formatDateTime(row.triggered_at) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="Result" width="120">
              <template #default="{ row }">
                <span
                  class="rule-history-dialog__status"
                  :class="isHistorySuccess(row) ? 'is-success' : 'is-failed'"
                >
                  {{ isHistorySuccess(row) ? 'Success' : 'Failed' }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="Summary" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ getHistorySummary(row) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="rule-history-dialog__pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, prev, pager, next, sizes"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </template>

  </FormDialog>
</template>

<script setup lang="ts">
import FormDialog from '@/components/dialog/FormDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import RuleHistoryExecutionFlow from './RuleHistoryExecutionFlow.vue'
import { listRuleHistoryRecords } from '@/api/rulesManagement'
import type { Rule } from '@/types/ruleConfiguration'
import type { RuleHistoryItem } from '@/types/controlRule'
import { formatDateTime } from '@/utils/date'
import {
  getDisplayActions,
  getExecutionGraph,
  getHistoryErrors,
  getHistorySummary,
  getTriggerReason,
  isHistorySuccess,
} from '@/utils/ruleHistoryDisplay'

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null)
const loading = ref(false)
const currentRule = ref<Pick<Rule, 'id' | 'name'> | null>(null)
const historyList = ref<RuleHistoryItem[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const historyFilters = reactive({
  start_time: null as number | null,
  end_time: null as number | null,
  startTime: null as Date | null,
  endTime: null as Date | null,
})

const startTimeDisplay = ref<Date | null>(null)
const endTimeDisplay = ref<Date | null>(null)

const dialogTitle = 'Trigger Records'

const resetHistoryFilters = () => {
  historyFilters.start_time = null
  historyFilters.end_time = null
  historyFilters.startTime = null
  historyFilters.endTime = null
  startTimeDisplay.value = null
  endTimeDisplay.value = null
}

const handleStartTimeChange = (value: Date | null) => {
  startTimeDisplay.value = value
  historyFilters.startTime = value || null
  if (value && historyFilters.endTime && value.getTime() >= historyFilters.endTime.getTime()) {
    historyFilters.endTime = null
    historyFilters.end_time = null
    endTimeDisplay.value = null
  }
  historyFilters.start_time = value ? value.getTime() : null
}

const handleEndTimeChange = (value: Date | null) => {
  const adjusted: Date | null = value ? new Date(value) : null
  if (
    adjusted &&
    adjusted.getHours() === 0 &&
    adjusted.getMinutes() === 0 &&
    adjusted.getSeconds() === 0
  ) {
    adjusted.setHours(23, 59, 59, 999)
  }
  endTimeDisplay.value = adjusted
  historyFilters.endTime = adjusted || null
  if (
    adjusted &&
    historyFilters.startTime &&
    adjusted.getTime() <= historyFilters.startTime.getTime()
  ) {
    historyFilters.startTime = null
    historyFilters.start_time = null
    startTimeDisplay.value = null
  }
  historyFilters.end_time = adjusted ? adjusted.getTime() : null
}

const disableStartDate = (time: Date) => {
  if (!historyFilters.endTime) return false
  return time.getTime() > historyFilters.endTime.getTime()
}

const disableEndDate = (time: Date) => {
  if (!historyFilters.startTime) return false
  return time.getTime() < historyFilters.startTime.getTime()
}

const fetchHistory = async () => {
  if (!currentRule.value) return
  loading.value = true
  try {
    const res = await listRuleHistoryRecords({
      rule_id: currentRule.value.id,
      page: pagination.page,
      page_size: pagination.pageSize,
      ...(historyFilters.start_time != null ? { start_time: historyFilters.start_time } : {}),
      ...(historyFilters.end_time != null ? { end_time: historyFilters.end_time } : {}),
    })
    if (res.success && res.data) {
      historyList.value = res.data.list || []
      pagination.total = res.data.total || 0
    } else {
      historyList.value = []
      pagination.total = 0
    }
  } catch {
    historyList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.page = 1
  void fetchHistory()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  void fetchHistory()
}

const searchHistory = () => {
  pagination.page = 1
  void fetchHistory()
}

const reloadHistoryFilters = () => {
  resetHistoryFilters()
  pagination.page = 1
  void fetchHistory()
}

const open = async (rule: Pick<Rule, 'id' | 'name'>) => {
  currentRule.value = rule
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
  historyList.value = []
  resetHistoryFilters()
  dialogRef.value!.dialogVisible = true
  await fetchHistory()
}

defineExpose({ open })
</script>

<style scoped lang="scss">
:global(.rule-history-dialog-wrapper.el-dialog) {
  height: 80%;
  max-height: 88%;
  max-width: 960px;
  box-sizing: border-box;
  overflow: hidden;
}

:global(.rule-history-dialog-wrapper .el-dialog__body) {
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.rule-history-dialog {
  height: 100%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;

  .rule-history-dialog__toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--vt-space-4);
    margin-bottom: var(--vt-space-4);
  }

  .rule-history-dialog__toolbar-form {
    flex: 1;
    min-width: 0;
  }

  :deep(.rule-history-dialog__toolbar-form.el-form--inline .el-form-item) {
    margin-bottom: 0;
  }

  .rule-history-dialog__toolbar-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .rule-history-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .rule-history-dialog__flow {
    display: flex;
    align-items: flex-start;
    gap: 0;
    max-width: 100%;
    width: 100%;
    height: auto;
    min-height: 120px;
    padding: 0;
    overflow-x: auto;
    overflow-y: auto;
    background: #f5f6fa;
  }

  .rule-history-dialog__steps {
    display: none;
  }

  .rule-history-dialog__table {
    width: 100%;
    height: calc(100% - 72px);
    flex: 0 0 calc(100% - 72px);
  }

  .rule-history-dialog__status {
    display: inline-flex;
    align-items: center;
    padding: 0 var(--vt-space-1);
    border-radius: var(--vt-radius-sm);
    font-size: var(--vt-font-size-sm);
    line-height: 22px;

    &.is-success {
      color: var(--vt-color-success);
      background: color-mix(in srgb, var(--vt-color-success) 12%, transparent);
    }

    &.is-failed {
      color: var(--vt-color-danger);
      background: color-mix(in srgb, var(--vt-color-danger) 12%, transparent);
    }
  }

  .rule-history-dialog__pagination {
    height: 72px;
    flex: 0 0 72px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .rule-history-dialog__error-banner {
    margin-bottom: var(--vt-space-2);
    padding: var(--vt-space-1) var(--vt-space-2);
    border-radius: var(--vt-radius-sm);
    color: var(--vt-color-danger);
    background: color-mix(in srgb, var(--vt-color-danger) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--vt-color-danger) 24%, transparent);
    line-height: 1.5;
    word-break: break-word;
  }

  .rule-history-dialog__error-line + .rule-history-dialog__error-line {
    margin-top: 4px;
  }

  .rule-history-dialog__detail-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rule-history-dialog__detail-label {
    margin-top: 20px;
    color: #333333;
    font-size: 14px;
    line-height: 22px;
  }

  .rule-history-dialog__trigger-reason {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--vt-border-color-soft);
  }

  .rule-history-dialog__trigger-title {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #333333;
    font-size: 14px;
    line-height: 22px;
  }

  .rule-history-dialog__trigger-icon {
    width: 14px;
    height: 14px;
    color: #3b82f6;
  }

  .rule-history-dialog__trigger-value {
    display: flex;
    align-items: flex-start;

    gap: 10px;
    margin-top: 16px;
    color: var(--vt-text-primary);
    font-size: 14px;
    line-height: 22px;
  }

  .rule-history-dialog__matched-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    border: 1px solid #fadc19;
    border-radius: 999px;
    background: #feffe8;
    color: #cfaf0f;
    font-size: 12px;
    line-height: 16px;
  }

  .rule-history-dialog__matched-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fadc19;
  }

  .rule-history-dialog__detail-value {
    color: var(--vt-text-primary);
    font-size: var(--vt-font-size-base);
    line-height: 1.5;
    word-break: break-word;
  }

  .rule-history-dialog__tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--vt-space-1);
  }

  .rule-history-dialog__tag {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--vt-space-1);
    border-radius: var(--vt-radius-sm);
    background: color-mix(in srgb, var(--vt-color-primary) 8%, transparent);
    color: var(--vt-text-primary);
    font-size: var(--vt-font-size-sm);
  }

  .rule-history-dialog__steps {
    display: flex;
    flex-direction: column;
    gap: var(--vt-space-2);
  }

  .rule-history-dialog__step-card {
    padding: var(--vt-space-2);
    border-radius: var(--vt-radius-sm);
    background: color-mix(in srgb, var(--vt-color-primary) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--vt-color-primary) 12%, transparent);
    border-left-width: 3px;

    &.is-default {
      border-color: color-mix(in srgb, var(--vt-color-primary) 28%, transparent);
      background: color-mix(in srgb, var(--vt-color-primary) 5%, transparent);
    }

    &.is-error {
      border-color: color-mix(in srgb, var(--vt-color-danger) 24%, transparent);
      background: color-mix(in srgb, var(--vt-color-danger) 10%, transparent);
    }

    &.is-interrupt {
      border-color: color-mix(in srgb, var(--vt-color-warning) 28%, transparent);
      background: color-mix(in srgb, var(--vt-color-warning) 10%, transparent);
    }

    &.is-branch {
      border-left-color: var(--vt-color-warning);
    }
  }

  .rule-history-dialog__step-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--vt-space-2);
    font-weight: var(--vt-font-weight-medium);
    margin-bottom: 6px;
  }

  .rule-history-dialog__step-name {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .rule-history-dialog__step-status {
    font-weight: var(--vt-font-weight-bold);

    .is-error & {
      color: var(--vt-color-danger);
    }

    .is-interrupt & {
      color: var(--vt-color-warning);
    }
  }

  .rule-history-dialog__branch-mark {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border-radius: var(--vt-radius-sm);
    background: color-mix(in srgb, var(--vt-color-warning) 12%, transparent);
    color: var(--vt-color-warning);
    font-size: var(--vt-font-size-sm);
    font-weight: var(--vt-font-weight-normal);
  }

  .rule-history-dialog__step-description {
    margin-top: 4px;
    color: var(--vt-text-secondary);
    font-size: var(--vt-font-size-sm);
    line-height: 1.4;
    word-break: break-word;
  }

  .rule-history-dialog__actions-list {
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    background: #F5F6FA;
    // gap: var(--vt-space-1);
  }

  .rule-history-dialog__action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--vt-space-2); 
    padding: 9px 20px;
    // border-radius: var(--vt-radius-sm);
    // background: color-mix(in srgb, var(--vt-color-primary) 4%, transparent);
    border-bottom: 1px solid #ECEDF6;
    line-height: 22px;
    color: #333333;
    &:last-child {
      border-bottom: 0;
    }
  }

  .rule-history-dialog__action-status {
    white-space: nowrap;
    font-size: var(--vt-font-size-xs);
    line-height: 1.3;
    padding: 2px 6px;
    border-radius: 10px; 


    &.is-success {
      color: var(--vt-color-success);
      background-color: #E8FFEA;
    }

    &.is-failed {
      color: var(--vt-color-danger);
      background-color: #FFEBEB;
    }
  }
}
</style>
