<template>
  <FormDialog width="960px" ref="dialogRef" :title="dialogTitle" append-to-body>
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

        <div class="rule-history-dialog__body" v-loading="loading">
          <el-table
            :data="historyList"
            class="rule-history-dialog__table"
            height="420"
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

                  <div class="rule-history-dialog__detail-item">
                    <span class="rule-history-dialog__detail-label">Trigger Reason:</span>
                    <span class="rule-history-dialog__detail-value">
                      {{ getTriggerReason(row) }}
                    </span>
                  </div>

                  <div class="rule-history-dialog__detail-item">
                    <span class="rule-history-dialog__detail-label">Variables:</span>
                    <div class="rule-history-dialog__tag-list">
                      <template v-if="getDisplayVariables(row).length">
                        <span
                          v-for="item in getDisplayVariables(row)"
                          :key="`${item.key}-${item.instance_id ?? ''}-${item.point_id ?? ''}`"
                          class="rule-history-dialog__tag"
                        >
                          {{ formatDisplayVariable(item) }}
                        </span>
                      </template>
                      <span v-else class="rule-history-dialog__detail-value">-</span>
                    </div>
                  </div>

                  <div class="rule-history-dialog__detail-item">
                    <span class="rule-history-dialog__detail-label">Execution Tree:</span>
                    <div
                      v-if="getFlattenedExecutionTree(row).length"
                      class="rule-history-dialog__steps"
                    >
                      <div
                        v-for="(item, index) in getFlattenedExecutionTree(row)"
                        :key="`${item.node.step.node_id}-${index}`"
                        class="rule-history-dialog__step-card"
                        :class="{
                          'is-terminal': item.node.step.terminal,
                          'is-branch': item.siblingCount > 1,
                        }"
                        :style="{ marginLeft: `${item.depth * 16}px` }"
                      >
                        <div class="rule-history-dialog__step-title">
                          <span class="rule-history-dialog__step-label">
                            <span
                              v-if="item.siblingCount > 1"
                              class="rule-history-dialog__branch-mark"
                            >
                              branch {{ item.branchIndex + 1 }}/{{ item.siblingCount }}
                            </span>
                            {{ formatExecutionStep(item.node.step) }}
                          </span>
                          <span class="rule-history-dialog__step-badges">
                            <span
                              v-if="item.node.step.node_kind"
                              class="rule-history-dialog__step-kind"
                            >
                              {{ item.node.step.node_kind }}
                            </span>
                            <span
                              v-if="item.node.step.terminal"
                              class="rule-history-dialog__terminal-badge"
                            >
                              terminal
                            </span>
                          </span>
                        </div>

                        <div
                          v-if="item.node.step.terminal && item.node.step.terminal_reason"
                          class="rule-history-dialog__terminal-reason"
                        >
                          {{ item.node.step.terminal_reason }}
                        </div>

                        <ul
                          v-if="
                            item.node.step.node_kind === 'switch' &&
                            item.node.step.conditions?.length
                          "
                          class="rule-history-dialog__step-list"
                        >
                          <li
                            v-for="(condition, cIdx) in item.node.step.conditions"
                            :key="`${item.node.step.node_id}-c-${cIdx}`"
                            :class="{ 'is-matched': condition.result }"
                          >
                            {{ formatConditionDetail(condition) }}
                          </li>
                        </ul>

                        <ul
                          v-else-if="
                            item.node.step.node_kind === 'change' &&
                            item.node.step.assignments?.length
                          "
                          class="rule-history-dialog__step-list"
                        >
                          <li
                            v-for="(assignment, aIdx) in item.node.step.assignments"
                            :key="`${item.node.step.node_id}-a-${aIdx}`"
                            :class="{ 'is-failed': assignment.success === false }"
                          >
                            {{ formatAssignmentDetail(assignment) }}
                          </li>
                        </ul>

                        <ul
                          v-else-if="
                            item.node.step.node_kind === 'calculation' &&
                            item.node.step.calculations?.length
                          "
                          class="rule-history-dialog__step-list"
                        >
                          <li
                            v-for="(calc, calcIdx) in item.node.step.calculations"
                            :key="`${item.node.step.node_id}-calc-${calcIdx}`"
                            :class="{ 'is-failed': calc.success === false }"
                          >
                            {{ formatCalculationDetail(calc) }}
                          </li>
                        </ul>

                        <div
                          v-else-if="item.node.step.node_kind === 'periodDelta'"
                          class="rule-history-dialog__step-text"
                          :class="{ 'is-failed': item.node.step.success === false }"
                        >
                          {{ formatPeriodDeltaDetail(item.node.step) }}
                        </div>
                      </div>
                    </div>
                    <span v-else class="rule-history-dialog__detail-value">-</span>
                  </div>

                  <div v-if="getDisplayActions(row).length" class="rule-history-dialog__detail-item">
                    <span class="rule-history-dialog__detail-label">Actions Executed:</span>
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

            <el-table-column label="Trigger Reason" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ getTriggerReason(row) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="Result" width="100">
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
              layout="total, sizes, prev, pager, next"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </template>

    <template #dialog-footer>
      <el-button @click="close">Close</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import FormDialog from '@/components/dialog/FormDialog.vue'
import { listRuleHistoryRecords } from '@/api/rulesManagement'
import type { Rule } from '@/types/ruleConfiguration'
import type { RuleHistoryItem } from '@/types/controlRule'
import { formatDateTime } from '@/utils/date'
import {
  formatAssignmentDetail,
  formatCalculationDetail,
  formatConditionDetail,
  formatDisplayVariable,
  formatExecutionStep,
  formatPeriodDeltaDetail,
  getDisplayActions,
  getDisplayVariables,
  getFlattenedExecutionTree,
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

const dialogTitle = computed(() => {
  const name = currentRule.value?.name || ''
  return name ? `Trigger Records: ${name}` : 'Trigger Records'
})

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

const close = () => {
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = false
  }
}

defineExpose({ open, close })
</script>

<style scoped lang="scss">
.rule-history-dialog {
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
    gap: var(--vt-space-2);
    flex-shrink: 0;
  }

  .rule-history-dialog__body {
    min-height: 480px;
  }

  .rule-history-dialog__table {
    width: 100%;
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
    padding-top: var(--vt-space-4);
    display: flex;
    justify-content: flex-end;
  }

  .rule-history-dialog__detail {
    padding: var(--vt-space-2) var(--vt-space-4) var(--vt-space-4) 48px;
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
    gap: 6px;
    margin-bottom: var(--vt-space-2);
  }

  .rule-history-dialog__detail-label {
    color: var(--vt-text-secondary);
    font-size: var(--vt-font-size-sm);
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

    &.is-branch {
      border-left-color: var(--vt-color-warning);
    }

    &.is-terminal {
      border-left-color: var(--vt-color-success);
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

  .rule-history-dialog__step-label {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
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

  .rule-history-dialog__step-badges {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .rule-history-dialog__step-kind {
    color: var(--vt-text-secondary);
    font-size: var(--vt-font-size-sm);
    font-weight: var(--vt-font-weight-normal);
  }

  .rule-history-dialog__terminal-badge {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border-radius: var(--vt-radius-sm);
    background: color-mix(in srgb, var(--vt-color-success) 12%, transparent);
    color: var(--vt-color-success);
    font-size: var(--vt-font-size-sm);
    font-weight: var(--vt-font-weight-normal);
  }

  .rule-history-dialog__terminal-reason {
    margin-bottom: 6px;
    color: var(--vt-text-secondary);
    font-size: var(--vt-font-size-sm);
    line-height: 1.4;
    word-break: break-word;
  }

  .rule-history-dialog__step-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    li.is-matched {
      color: var(--vt-color-success);
    }

    li.is-failed {
      color: var(--vt-color-danger);
    }
  }

  .rule-history-dialog__step-text {
    font-size: var(--vt-font-size-base);
    word-break: break-word;

    &.is-failed {
      color: var(--vt-color-danger);
    }
  }

  .rule-history-dialog__actions-list {
    display: flex;
    flex-direction: column;
    gap: var(--vt-space-1);
  }

  .rule-history-dialog__action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--vt-space-2);
    padding: var(--vt-space-1) var(--vt-space-2);
    border-radius: var(--vt-radius-sm);
    background: color-mix(in srgb, var(--vt-color-primary) 4%, transparent);
  }

  .rule-history-dialog__action-status {
    white-space: nowrap;
    font-size: var(--vt-font-size-sm);

    &.is-success {
      color: var(--vt-color-success);
    }

    &.is-failed {
      color: var(--vt-color-danger);
    }
  }
}
</style>
