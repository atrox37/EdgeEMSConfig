<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="540px"
    :close-on-click-modal="false"
    destroy-on-close
    append-to-body
    class="topology-issues-dialog"
    @closed="onClosed"
  >
    <p v-if="summary" class="topology-issues-dialog__summary">{{ summary }}</p>

    <div v-if="appliedFixes.length" class="topology-issues-dialog__fixes">
      <div class="topology-issues-dialog__fixes-title">Applied fixes</div>
      <ul class="topology-issues-dialog__fixes-list">
        <li v-for="(fix, idx) in appliedFixes" :key="idx">{{ fix }}</li>
      </ul>
    </div>

    <div v-if="errors.length" class="topology-issues-dialog__section">
      <div class="topology-issues-dialog__section-title topology-issues-dialog__section-title--error">
        Errors ({{ errors.length }})
      </div>
      <ul class="topology-issues-dialog__list">
        <li v-for="(issue, idx) in errors" :key="`e-${idx}`" class="topology-issues-dialog__item topology-issues-dialog__item--error">
          <AppIcon name="i-tabler-alert-circle" />
          <span>{{ issue.message }}</span>
        </li>
      </ul>
    </div>

    <div v-if="warnings.length" class="topology-issues-dialog__section">
      <div class="topology-issues-dialog__section-title topology-issues-dialog__section-title--warning">
        Warnings ({{ warnings.length }})
      </div>
      <ul class="topology-issues-dialog__list">
        <li v-for="(issue, idx) in warnings" :key="`w-${idx}`" class="topology-issues-dialog__item topology-issues-dialog__item--warning">
          <AppIcon name="i-tabler-alert-triangle" />
          <span>{{ issue.message }}</span>
        </li>
      </ul>
    </div>

    <template #footer>
      <el-button @click="handleCancel">{{ cancelLabel }}</el-button>
      <el-button v-if="showConfirm" type="primary" @click="handleConfirm">
        {{ confirmLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { TopologyIssue } from '@/utils/topologyNormalize'

export type TopologyIssuesMode = 'save-blocked' | 'save-confirm' | 'import'

const visible = ref(false)
const mode = ref<TopologyIssuesMode>('save-blocked')
const issues = ref<TopologyIssue[]>([])
const appliedFixes = ref<string[]>([])

let resolvePromise: ((value: boolean) => void) | null = null

const errors = computed(() => issues.value.filter((i) => i.level === 'error'))
const warnings = computed(() => issues.value.filter((i) => i.level === 'warning'))

const title = computed(() => {
  if (mode.value === 'import') return 'Import Validation'
  if (mode.value === 'save-confirm') return 'Save With Warnings'
  return 'Cannot Save Topology'
})

const summary = computed(() => {
  if (mode.value === 'save-blocked') {
    return 'Fix the errors below before saving.'
  }
  if (mode.value === 'save-confirm') {
    return 'The topology can be saved, but review these warnings first.'
  }
  if (!errors.value.length && appliedFixes.value.length) {
    return 'Import data was cleaned up automatically. Review the result before saving.'
  }
  if (errors.value.length) {
    return 'Import blocked due to validation errors.'
  }
  return 'Review import validation results.'
})

const showConfirm = computed(() => {
  if (mode.value === 'save-blocked') return false
  if (mode.value === 'import' && errors.value.length > 0) return false
  return mode.value === 'save-confirm' || mode.value === 'import'
})

const confirmLabel = computed(() => {
  if (mode.value === 'import') return errors.value.length ? 'Close' : 'Import Anyway'
  return 'Save Anyway'
})

const cancelLabel = computed(() => {
  if (mode.value === 'save-blocked') return 'Close'
  return 'Cancel'
})

function open(options: {
  mode: TopologyIssuesMode
  issues: TopologyIssue[]
  appliedFixes?: string[]
}): Promise<boolean> {
  mode.value = options.mode
  issues.value = options.issues
  appliedFixes.value = options.appliedFixes ?? []
  visible.value = true
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

function finish(result: boolean) {
  visible.value = false
  resolvePromise?.(result)
  resolvePromise = null
}

function handleConfirm() {
  if (mode.value === 'save-blocked') {
    finish(false)
    return
  }
  finish(true)
}

function handleCancel() {
  finish(false)
}

function onClosed() {
  if (resolvePromise) finish(false)
}

defineExpose({ open })
</script>

<style lang="scss" scoped>
.topology-issues-dialog__summary {
  margin: 0 0 12px;
  font-size: 13px;
  color: #5a6a7e;
  line-height: 1.5;
}

.topology-issues-dialog__fixes {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(74, 144, 217, 0.08);
  border: 1px solid rgba(74, 144, 217, 0.2);
}

.topology-issues-dialog__fixes-title {
  font-size: 12px;
  font-weight: 700;
  color: #4a90d9;
  margin-bottom: 6px;
}

.topology-issues-dialog__fixes-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #3d5a80;
  line-height: 1.5;
}

.topology-issues-dialog__section {
  margin-bottom: 12px;
}

.topology-issues-dialog__section-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}

.topology-issues-dialog__section-title.topology-issues-dialog__section-title--error {
  color: #e53935;
}

.topology-issues-dialog__section-title.topology-issues-dialog__section-title--warning {
  color: #ef6c00;
}

.topology-issues-dialog__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.topology-issues-dialog__item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.45;
  padding: 6px 8px;
  border-radius: 6px;
}

.topology-issues-dialog__item :deep(svg) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.topology-issues-dialog__item.topology-issues-dialog__item--error {
  color: #c62828;
  background: rgba(229, 57, 53, 0.06);
}

.topology-issues-dialog__item.topology-issues-dialog__item--error :deep(svg) {
  color: #e53935 !important;
}

.topology-issues-dialog__item.topology-issues-dialog__item--warning {
  color: #e65100;
  background: rgba(239, 108, 0, 0.06);
}

.topology-issues-dialog__item.topology-issues-dialog__item--warning :deep(svg) {
  color: #ef6c00 !important;
}
</style>
