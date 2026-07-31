<template>
  <FormDialog
    ref="dialogRef"
    :title="dialogMode === 'manual' ? 'Check for Updates' : 'Update Available'"
    width="620px"
    :append-to-body="true"
    dialog-class="update-checker-dialog"
    :close-on-press-escape="false"
    :before-close="handleBeforeClose"
  >
    <template #dialog-body>
      <div class="update-dialog-content">
        <div class="update-header">
          <h3 v-if="updateInfo">v{{ updateInfo.version }} Available</h3>
          <h3 v-else-if="dialogMode === 'manual'">No New Version Found</h3>
          <h3 v-else>Update Available</h3>
          <p class="update-description">
            {{
              dialogMode === 'manual'
                ? updateInfo
                  ? `You're running version ${currentVersion || '-'}. A newer version is available.`
                  : `You're running version ${currentVersion || '-'}. This is the latest version.`
                : 'A new version is available. Update now or remind later.'
            }}
          </p>
          <div class="update-row">
            <span class="update-label">Current Version:</span>
            <span>{{ currentVersion || '-' }}</span>
          </div>
          <div class="update-row">
            <span class="update-label">Latest Version:</span>
            <span v-if="isCheckingUpdate">Checking...</span>
            <span v-else-if="updateInfo" class="update-latest">
              <span>{{ `v${updateInfo.version}` }}</span>
              <span class="update-tag-new">NEW</span>
            </span>
            <span v-else>Already up to date</span>
          </div>
          <div v-if="updateInfo?.date" class="update-row">
            <span class="update-label">Release Date:</span>
            <span>{{ formatDate(updateInfo.date) }}</span>
          </div>
        </div>

        <div v-if="isInstalling || progressBarStatus !== ''" class="update-progress" :class="{ 'is-success-state': progressBarStatus === 'success', 'is-exception-state': progressBarStatus === 'exception' }">
          <div class="update-progress__header">
            <div class="update-progress__title">
              {{ installPhase === 'installing' ? 'Installing Update' : 'Downloading Update' }}
            </div>
            <div class="update-progress__percent" :class="{ 'is-exception': progressBarStatus === 'exception', 'is-success': progressBarStatus === 'success' }">{{ `${progressPercentDisplay}%` }}</div>
          </div>
          <el-progress :percentage="progressPercentDisplay" :stroke-width="10" :status="progressBarStatus || undefined" :show-text="false" />
          <div class="update-progress__message">{{ progressMessageDisplay }}</div>
          <div v-if="progressBytesDisplay" class="update-progress__bytes">{{ progressBytesDisplay }}</div>
        </div>

        <div class="update-notes">
          <h4>Update Notes:</h4>
          <div v-if="updateInfo?.notes" class="notes-content">
            <div
              v-for="(section, sectionIndex) in parseChangelogSections(updateInfo.notes)"
              :key="`section-${sectionIndex}-${section.title}`"
              class="notes-section"
            >
              <div class="notes-section__title">{{ section.title }}</div>
              <ul class="notes-list">
                <li
                  v-for="(item, itemIndex) in section.items"
                  :key="`item-${sectionIndex}-${itemIndex}-${item}`"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
          <div v-else class="notes-content notes-content--empty">No update notes available</div>
        </div>
      </div>
    </template>

    <template #dialog-footer>
      <el-button :disabled="isInstalling" @click="closeDialog">
        {{ dialogMode === 'manual' ? 'Close' : 'Remind Later' }}
      </el-button>
      <el-button type="primary" :loading="isInstalling" :disabled="!updateInfo || isInstalling" @click="handleInstall">
        {{ !isInstalling ? 'Update Now' : installPhase === 'installing' ? 'Installing...' : 'Downloading...' }}
      </el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { useUpdater } from '@/composables/useUpdater'
import { useAppUpdateState } from '@/composables/useAppUpdateState'
import FormDialog from '@/components/dialog/FormDialog.vue'

type DialogMode = 'auto' | 'manual'

const {
  updateInfo,
  checkUpdate,
  installUpdate: installUpdateFn,
  isInstalling,
  installPhase,
  downloadPercent,
  downloadedBytes,
  totalBytes,
  progressMessage,
} = useUpdater()

const { isAppUpdating } = useAppUpdateState()

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null)
const isCheckingUpdate = ref(false)
const dismissed = ref(false)
const currentVersion = ref('')
const dialogMode = ref<DialogMode>('auto')
const progressBarStatus = ref<'success' | 'exception' | ''>('')
let autoCheckTimer: ReturnType<typeof setTimeout> | null = null

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const progressPercentDisplay = computed(() => {
  if (installPhase.value === 'installing') return 100
  return Math.max(0, Math.min(100, downloadPercent.value))
})

const progressMessageDisplay = computed(() => {
  if (progressMessage.value) return progressMessage.value
  if (installPhase.value === 'installing') return 'Applying update package...'
  return 'Downloading update package...'
})

const progressBytesDisplay = computed(() => {
  if (!isInstalling.value || installPhase.value !== 'downloading') return ''
  if (totalBytes.value && totalBytes.value > 0) {
    return `${formatBytes(downloadedBytes.value)} / ${formatBytes(totalBytes.value)}`
  }
  if (downloadedBytes.value > 0) {
    return `${formatBytes(downloadedBytes.value)} downloaded`
  }
  return ''
})

interface ChangelogSection {
  title: string
  items: string[]
}

const parseChangelogSections = (notes?: string): ChangelogSection[] => {
  if (!notes) return []

  const lines = notes.split('\n')
  const sections: ChangelogSection[] = []
  let currentSection: ChangelogSection | null = null

  const ensureDefaultSection = () => {
    if (!currentSection) {
      currentSection = { title: 'Updates', items: [] }
      sections.push(currentSection)
    }
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) return

    if (/^###\s+/.test(line)) {
      const title = line.replace(/^###\s+/, '').trim()
      currentSection = { title: title || 'Updates', items: [] }
      sections.push(currentSection)
      return
    }

    const cleaned = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()

    if (!cleaned) return
    ensureDefaultSection()
    currentSection!.items.push(cleaned)
  })

  return sections.length > 0 ? sections : [{ title: 'Updates', items: ['No update details provided'] }]
}

const openDialog = () => {
  progressBarStatus.value = ''
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = true
  }
}

const closeDialog = () => {
  if (isInstalling.value) return

  if (dialogRef.value) {
    dialogRef.value.dialogVisible = false
  }
  if (dialogMode.value === 'auto') {
    dismissed.value = true
  }
}

// Intercept the × button: block closing while installing
const handleBeforeClose = (done: () => void) => {
  if (isInstalling.value) return
  done()
  if (dialogMode.value === 'auto') {
    dismissed.value = true
  }
}

const handleInstall = async () => {
  progressBarStatus.value = ''
  try {
    const installed = await installUpdateFn()
    if (installed) {
      progressBarStatus.value = 'success'
      setTimeout(() => {
        progressBarStatus.value = ''
        closeDialog()
      }, 800)
    } else {
      progressBarStatus.value = 'exception'
    }
  } catch (error) {
    console.error('Failed to install update:', error)
    progressBarStatus.value = 'exception'
  }
}

const openManualCheckDialog = async () => {
  dialogMode.value = 'manual'
  dismissed.value = false
  openDialog()
  isCheckingUpdate.value = true
  try {
    await checkUpdate(true)
  } finally {
    isCheckingUpdate.value = false
  }
}

const handleTitlebarOpenUpdatesDialog = async () => {
  await openManualCheckDialog()
}

watch(
  () => updateInfo.value,
  (newInfo) => {
    if (newInfo && !dismissed.value && dialogMode.value === 'auto') {
      openDialog()
    }
  },
  { immediate: true }
)

watch(isInstalling, (val) => {
  isAppUpdating.value = val
})

onMounted(async () => {
  currentVersion.value = await getVersion()
  window.addEventListener('titlebar-open-updates-dialog', handleTitlebarOpenUpdatesDialog)
  autoCheckTimer = setTimeout(() => {
    dialogMode.value = 'auto'
    void checkUpdate(true)
  }, 3000)
})

onUnmounted(() => {
  if (autoCheckTimer) {
    clearTimeout(autoCheckTimer)
    autoCheckTimer = null
  }
  window.removeEventListener('titlebar-open-updates-dialog', handleTitlebarOpenUpdatesDialog)
  isAppUpdating.value = false
})
</script>

<style scoped lang="scss">
.update-dialog-content {
  .update-header {
    margin-bottom: var(--vt-space-2);
    padding-bottom: var(--vt-space-2);
    border-bottom: var(--vt-border-width-base) solid var(--vt-color-black-12);

    h3 {
      margin: 0 0 var(--vt-space-1) 0;
      color: var(--vt-color-primary);
      font-size: var(--vt-font-size-xl);
      font-weight: var(--vt-font-weight-semibold);
    }

    .update-description {
      margin: 0 0 var(--vt-space-2) 0;
      color: var(--vt-color-black-50);
      font-size: var(--vt-font-size-base);
      line-height: var(--vt-line-height-normal);
    }
  }
}

.update-row {
  display: flex;
  justify-content: space-between;
  gap: var(--vt-space-4);
  margin-bottom: 2px;
}

.update-label {
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.update-latest {
  display: inline-flex;
  align-items: center;
  gap: var(--vt-space-1);
}

.update-tag-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: var(--vt-font-weight-semibold);
  line-height: 1.6;
  border-radius: var(--vt-radius-sm);
  background: rgba(255, 138, 0, 0.16);
  color: var(--vt-color-primary);
}

.update-progress {
  margin-bottom: var(--vt-space-2);
  padding: var(--vt-space-2) var(--vt-space-4);
  border: var(--vt-border-width-base) solid rgba(255, 138, 0, 0.18);
  border-radius: var(--vt-radius-sm);
  background: linear-gradient(180deg, rgba(255, 138, 0, 0.08) 0%, rgba(255, 138, 0, 0.03) 100%);
  transition: border-color var(--vt-transition-base), background var(--vt-transition-base);

  .update-progress.is-success-state {
    border-color: rgba(103, 194, 58, 0.3);
    background: linear-gradient(180deg, rgba(103, 194, 58, 0.08) 0%, rgba(103, 194, 58, 0.03) 100%);
  }

  .update-progress.is-exception-state {
    border-color: rgba(245, 108, 108, 0.3);
    background: linear-gradient(180deg, rgba(245, 108, 108, 0.08) 0%, rgba(245, 108, 108, 0.03) 100%);
  }

  .update-progress__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--vt-space-4);
    margin-bottom: var(--vt-space-1);
  }

  .update-progress__title {
    font-size: var(--vt-font-size-base);
    font-weight: var(--vt-font-weight-semibold);
    color: var(--vt-text-primary);
  }

  .update-progress__percent {
    font-size: var(--vt-font-size-base);
    font-weight: var(--vt-font-weight-semibold);
    color: var(--vt-color-primary);
    transition: color var(--vt-transition-base);

    .update-progress__percent.is-success {
      color: var(--vt-color-success);
    }

    .update-progress__percent.is-exception {
      color: var(--vt-color-danger);
    }
  }

  .update-progress__message {
    margin-top: var(--vt-space-1);
    color: var(--vt-text-primary);
    font-size: var(--vt-font-size-sm);
  }

  .update-progress__bytes {
    margin-top: 2px;
    color: var(--vt-color-black-50);
    font-size: var(--vt-font-size-sm);
  }
}

:deep(.el-progress) {
  .el-progress-bar__inner {
    background-color: var(--vt-color-primary);
    transition: background-color var(--vt-transition-base);
  }

  :deep(.el-progress).is-success .el-progress-bar__inner {
    background-color: var(--vt-color-success);
  }

  :deep(.el-progress).is-exception .el-progress-bar__inner {
    background-color: var(--vt-color-danger);
  }
}

.update-notes {
  h4 {
    margin: 0 0 var(--vt-space-1) 0;
    font-weight: var(--vt-font-weight-semibold);
    color: var(--vt-text-primary);
    font-size: var(--vt-font-size-md);
  }

  .notes-content {
    max-height: 130px;
    overflow-y: auto;
    padding: var(--vt-space-4);
    background: #f5f6f7;
    border-radius: var(--vt-radius-sm);
    line-height: var(--vt-line-height-loose);
    color: #3f444d;

    .notes-content--empty {
      color: #6b7280;
      font-style: italic;
    }

    .notes-list {
      margin: 0;
      padding-left: var(--vt-space-4);
      list-style: disc;

      li {
        margin: var(--vt-space-1) 0;
      }
    }

    .notes-section + .notes-section {
      margin-top: var(--vt-space-4);
      padding-top: var(--vt-space-2);
      border-top: var(--vt-border-width-base) solid rgba(63, 68, 77, 0.14);
    }

    .notes-section__title {
      font-weight: var(--vt-font-weight-semibold);
      margin-bottom: var(--vt-space-1);
      color: #2f3440;
    }
  }
}
</style>
