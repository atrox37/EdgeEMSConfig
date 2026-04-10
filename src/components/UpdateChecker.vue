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
  setTimeout(() => {
    dialogMode.value = 'auto'
    void checkUpdate(true)
  }, 3000)
})

onUnmounted(() => {
  window.removeEventListener('titlebar-open-updates-dialog', handleTitlebarOpenUpdatesDialog)
  isAppUpdating.value = false
})
</script>

<style scoped lang="scss">
.update-dialog-content {
  .update-header {
    margin-bottom: $spacing-sm;
    padding-bottom: $spacing-sm;
    border-bottom: $border-width-base solid $border-color-white-10;

    h3 {
      margin: 0 0 $spacing-xs 0;
      color: $primary-color;
      font-size: $font-size-extra-large;
      font-weight: $font-weight-semibold;
    }

    .update-description {
      margin: 0 0 $spacing-sm 0;
      color: $text-color-white-60;
      font-size: $font-size-base;
      line-height: $line-height-normal;
    }
  }
}

.update-row {
  display: flex;
  justify-content: space-between;
  gap: $spacing-md;
  margin-bottom: 2px;
}

.update-label {
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.update-latest {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
}

.update-tag-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: $font-weight-semibold;
  line-height: 1.6;
  border-radius: $border-radius-small;
  background: rgba(255, 138, 0, 0.16);
  color: $primary-color;
}

.update-progress {
  margin-bottom: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border: $border-width-base solid rgba(255, 138, 0, 0.18);
  border-radius: $border-radius-small;
  background: linear-gradient(180deg, rgba(255, 138, 0, 0.08) 0%, rgba(255, 138, 0, 0.03) 100%);
  transition: border-color $transition-base, background $transition-base;

  &.is-success-state {
    border-color: rgba(103, 194, 58, 0.3);
    background: linear-gradient(180deg, rgba(103, 194, 58, 0.08) 0%, rgba(103, 194, 58, 0.03) 100%);
  }

  &.is-exception-state {
    border-color: rgba(245, 108, 108, 0.3);
    background: linear-gradient(180deg, rgba(245, 108, 108, 0.08) 0%, rgba(245, 108, 108, 0.03) 100%);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    margin-bottom: $spacing-xs;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
  }

  &__percent {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: $primary-color;
    transition: color $transition-base;

    &.is-success {
      color: $success-color;
    }

    &.is-exception {
      color: $danger-color;
    }
  }

  &__message {
    margin-top: $spacing-xs;
    color: $text-color-primary;
    font-size: $font-size-small;
  }

  &__bytes {
    margin-top: 2px;
    color: $text-color-white-60;
    font-size: $font-size-small;
  }
}

:deep(.el-progress) {
  .el-progress-bar__inner {
    background-color: $primary-color;
    transition: background-color $transition-base;
  }

  &.is-success .el-progress-bar__inner {
    background-color: $success-color;
  }

  &.is-exception .el-progress-bar__inner {
    background-color: $danger-color;
  }
}

.update-notes {
  h4 {
    margin: 0 0 $spacing-xs 0;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
    font-size: $font-size-medium;
  }

  .notes-content {
    max-height: 130px;
    overflow-y: auto;
    padding: $spacing-md;
    background: #f5f6f7;
    border-radius: $border-radius-small;
    line-height: $line-height-loose;
    color: #3f444d;

    &--empty {
      color: #6b7280;
      font-style: italic;
    }

    .notes-list {
      margin: 0;
      padding-left: $spacing-md;
      list-style: disc;

      li {
        margin: $spacing-xs 0;
      }
    }

    .notes-section + .notes-section {
      margin-top: $spacing-md;
      padding-top: $spacing-sm;
      border-top: $border-width-base solid rgba(63, 68, 77, 0.14);
    }

    .notes-section__title {
      font-weight: $font-weight-semibold;
      margin-bottom: $spacing-xs;
      color: #2f3440;
    }
  }
}
</style>
