<template>
  <el-dialog
    :model-value="operation.visible"
    :title="operation.busy ? operation.title : 'Operation result'"
    width="560px"
    class="config-operation-dialog"
    modal-class="config-operation-overlay"
    :z-index="10000"
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="beforeClose"
  >
    <div class="config-operation" :class="{ 'is-pending': operation.busy }" :aria-busy="operation.busy">
      <div class="config-operation__summary" role="status" aria-live="polite">
        <el-icon v-if="operation.busy" class="config-operation__icon is-loading"><Loading /></el-icon>
        <el-icon v-else class="config-operation__icon" :class="resultTone"><Warning /></el-icon>
        <div class="config-operation__text">
          <h3>{{ operation.busy ? 'Please wait while services restart' : operation.result?.title }}</h3>
          <p>{{ operation.busy
            ? 'Keep the application open. Other operations will be available after the final result is received.'
            : operation.result?.message }}</p>
        </div>
      </div>

      <div v-if="operation.busy" class="config-operation__wait">
        <span>Waiting for the final result</span>
        <span>{{ elapsedLabel }}</span>
      </div>
      <template v-else-if="operation.result">
        <p v-if="operation.result.detail && operation.result.detail !== operation.result.message" class="config-operation__detail">
          {{ operation.result.detail }}
        </p>
        <details v-if="sections.length" class="config-operation__details" open>
          <summary>Service details</summary>
          <section v-for="section in sections" :key="section.title" class="config-operation__section">
            <h4>{{ section.title }}</h4>
            <ul>
              <li v-for="service in section.services" :key="service.service">
                <div class="config-operation__service">
                  <span>{{ service.service.replace(/^voltageems-/, '') }}</span>
                  <span :class="service.success ? 'is-success' : 'is-error'">{{ service.state || (service.success ? 'Running' : 'Failed') }}</span>
                </div>
                <p v-if="service.error">{{ service.error }}</p>
              </li>
            </ul>
          </section>
        </details>
        <p v-if="operation.result.rollbackError" class="config-operation__detail is-error">
          Automatic recovery: {{ operation.result.rollbackError }}
        </p>
      </template>
    </div>
    <template v-if="!operation.busy" #footer>
      <el-button type="primary" @click="operation.dismiss">Close</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElButton, ElDialog, ElIcon } from 'element-plus'
import { Loading, Warning } from '@element-plus/icons-vue'
import { useConfigOperationStore } from '@/stores/configOperation'

const operation = useConfigOperationStore()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
const elapsedLabel = computed(() => {
  const seconds = Math.max(0, Math.floor((now.value - operation.startedAt) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
const resultTone = computed(() => operation.result?.status === 'unavailable' || operation.result?.status === 'failed' ? 'is-error' : 'is-warning')
const sections = computed(() => [
  { title: 'Requested operation', services: operation.result?.services ?? [] },
  { title: 'Automatic recovery', services: operation.result?.rollbackServices ?? [] },
].filter((section) => section.services.length))

function beforeClose(done: () => void) {
  if (!operation.busy) { operation.dismiss(); done() }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (!operation.busy) return
  event.preventDefault()
  event.returnValue = ''
}
watch(() => operation.busy, (busy) => {
  if (timer) clearInterval(timer)
  if (busy) {
    now.value = Date.now()
    timer = setInterval(() => { now.value = Date.now() }, 1000)
  }
}, { immediate: true })
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<style scoped lang="scss">
.config-operation {
  color: var(--vt-text-primary);
  font-size: var(--vt-font-size-base);

  &__summary { display: flex; align-items: flex-start; gap: 16px; }
  &__icon { flex-shrink: 0; margin-top: 2px; font-size: 26px; color: var(--vt-color-primary); }
  &__text { min-width: 0; }
  h3 { margin: 0 0 8px; font-size: var(--vt-font-size-md, 16px); font-weight: 600; line-height: 1.5; }
  p { margin: 0; color: var(--vt-text-regular); line-height: 1.65; overflow-wrap: anywhere; }
  &__wait { display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--vt-border-color-soft); color: var(--vt-text-regular); font-variant-numeric: tabular-nums; }
  &__detail { margin-top: 16px !important; }
  &__details { margin-top: 20px; border-top: 1px solid var(--vt-border-color-soft); padding-top: 16px; }
  summary { cursor: pointer; font-weight: 500; }
  &__section h4 { margin: 16px 0 8px; color: var(--vt-text-regular); font-size: inherit; font-weight: 500; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { padding: 10px 0; border-bottom: 1px solid var(--vt-border-color-soft); }
  li p { margin-top: 4px; font-size: var(--vt-font-size-sm); }
  &__service { display: flex; justify-content: space-between; gap: 16px; }
  .is-success { color: var(--vt-color-success); }
  .is-error { color: var(--vt-color-danger); }
  .is-warning { color: var(--vt-color-level-warning); }
}

:global(.el-overlay.config-operation-overlay) { position: fixed; inset: 0; }
:global(.el-overlay.config-operation-overlay .el-dialog.config-operation-dialog) { max-width: calc(100vw - 32px); max-height: calc(100dvh - 48px); }
:global(.el-overlay.config-operation-overlay .config-operation-dialog .el-dialog__body) { flex: 0 1 auto; overflow-y: auto; padding-bottom: 2px; }
:global(.el-overlay.config-operation-overlay .config-operation-dialog .el-dialog__footer) { margin: 20px 0 0; padding: 16px 0 0; }
@media (prefers-reduced-motion: reduce) {
  .is-loading { animation-duration: 3s; }
}
</style>
