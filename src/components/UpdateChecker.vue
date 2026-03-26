<template>
  <FormDialog
    ref="dialogRef"
    :title="dialogMode === 'manual' ? 'Check for Updates' : 'Update Available'"
    width="620px"
    :append-to-body="true"
    dialog-class="update-checker-dialog"
    :close-on-press-escape="false"
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
                  ? `You’re running version ${currentVersion || '-'}. A newer version is available.`
                  : `You’re running version ${currentVersion || '-'}. This is the latest version.`
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
      <el-button @click="closeDialog">{{ dialogMode === 'manual' ? 'Close' : 'Remind Later' }}</el-button>
      <el-button type="primary" :loading="isInstalling" :disabled="!updateInfo" @click="handleInstall">
        Update Now
      </el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { useUpdater } from '@/composables/useUpdater'
import FormDialog from '@/components/dialog/FormDialog.vue'

type DialogMode = 'auto' | 'manual'

const { updateInfo, checkUpdate, installUpdate: installUpdateFn } = useUpdater()

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null)
const isInstalling = ref(false)
const isCheckingUpdate = ref(false)
const dismissed = ref(false)
const currentVersion = ref('')
const dialogMode = ref<DialogMode>('auto')

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

    const cleaned = line
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .trim()

    if (!cleaned) return
    ensureDefaultSection()
    currentSection!.items.push(cleaned)
  })

  return sections.length > 0 ? sections : [{ title: 'Updates', items: ['No update details provided'] }]
}

const openDialog = () => {
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = true
  }
}

const closeDialog = () => {
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = false
  }
  if (dialogMode.value === 'auto') {
    dismissed.value = true
  }
}

const handleInstall = async () => {
  try {
    isInstalling.value = true
    await installUpdateFn()
    closeDialog()
  } catch (error) {
    console.error('Failed to install update:', error)
  } finally {
    isInstalling.value = false
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
})
</script>

<style scoped lang="scss">
.update-dialog-content {
  .update-header {
    margin-bottom: $spacing-md;
    padding-bottom: $spacing-md;
    border-bottom: $border-width-base solid $border-color-white-10;

    h3 {
      margin: 0 0 $spacing-sm 0;
      color: $primary-color;
      font-size: $font-size-extra-large;
      font-weight: $font-weight-semibold;
    }

    .update-description {
      margin: 0 0 $spacing-md 0;
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
  margin-bottom: $spacing-xs;
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

.update-notes {
  // padding-top: $spacing-md;
  // border-top: $border-width-base solid $border-color-white-10;

  h4 {
    margin: 0 0 $spacing-md 0;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
    font-size: $font-size-medium;
  }

  .notes-content {
    max-height: 260px;
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
