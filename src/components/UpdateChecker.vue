<template>
  <!-- <div v-if="updateInfo && !dismissed" class="update-checker"> -->
    <!-- Update Alert Banner -->
    <!-- <el-alert
      v-if="!updateDialogVisible"
      :title="`New Version: v${updateInfo?.version}`"
      type="info"
      :closable="true"
      show-icon
      @close="dismissUpdate"
      class="update-alert"
    >
      <template #default>
        <div class="update-alert-content">
          <p>{{ updateInfo?.notes ? truncateNotes(updateInfo?.notes) : 'A new version is available' }}</p>
          <div class="update-actions">
            <el-button type="primary" size="small" @click="showUpdateDialog">
              View Details
            </el-button>
            <el-button size="small" @click="dismissUpdate">Remind Later</el-button>
          </div>
        </div>
      </template>
    </el-alert> -->

    <!-- Update Dialog -->
    <el-dialog
    v-if="updateInfo && !dismissed"
      v-model="updateDialogVisible"
      title="Application Update"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="true"
      @close="dismissUpdate"
    >
      <div v-if="updateInfo" class="update-dialog-content">
        <div class="update-header">
          <h3>New Version: v{{ updateInfo?.version }}</h3>
          <p v-if="updateInfo.date" class="update-date">
            Release Date: {{ formatDate(updateInfo?.date) }}
          </p>
        </div>

        <div class="update-notes">
          <h4>What's New:</h4>
          <div class="notes-content" v-html="formatNotes(updateInfo?.notes)"></div>
        </div>
      </div>

      <template #footer>
        <el-button type="warning" @click="dismissUpdate">Remind Later</el-button>
        <el-button type="primary" :loading="isInstalling" @click="handleInstall">
          Update Now
        </el-button>
      </template>
    </el-dialog>
  <!-- </div> -->
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useUpdater } from '@/composables/useUpdater'

const {
  updateInfo,
  checkUpdate,
  installUpdate: installUpdateFn,
} = useUpdater()

const updateDialogVisible = ref(false)
const isInstalling = ref(false)
const dismissed = ref(false) // Whether user has dismissed the update notification

/**
 * Format date
 */
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

/**
 * Format update notes (supports Markdown)
 */
const formatNotes = (notes?: string): string => {
  if (!notes) return '<p class="no-notes">No update notes available</p>'

  // Simple Markdown to HTML conversion
  return notes
    .replace(/### (.*?)\n/g, '<h4>$1</h4>')
    .replace(/- (.*?)(\n|$)/g, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>')
}

/**
 * Truncate update notes (for banner display)
 */
const truncateNotes = (notes?: string): string => {
  if (!notes) return 'A new version is available'
  const maxLength = 100
  if (notes.length <= maxLength) return notes
  return notes.substring(0, maxLength) + '...'
}

/**
 * Show update dialog
 */
const showUpdateDialog = () => {
  updateDialogVisible.value = true
}

/**
 * Dismiss update notification
 */
const dismissUpdate = () => {
  updateDialogVisible.value = false
  dismissed.value = true
}

/**
 * Handle install update
 */
const handleInstall = async () => {
  try {
    isInstalling.value = true
    await installUpdateFn()
    updateDialogVisible.value = false
  } catch (error) {
    console.error('Failed to install update:', error)
  } finally {
    isInstalling.value = false
  }
}

watch(
  () => updateInfo.value,
  (newInfo) => {
    if (newInfo && !dismissed.value) {
      // Automatically show dialog when update is available
      updateDialogVisible.value = true
    }
  },
  { immediate: true }
)

// Automatically check for updates when component is mounted
onMounted(() => {
  // Delay check to avoid affecting application startup speed
  setTimeout(() => {
    checkUpdate(true) // Silent check
  }, 3000)
})
</script>

<style scoped lang="scss">

// .update-checker {
//   position: absolute;
//   top: 50%;
//   left: 50%;
//   transform: translate(-50%, -50%);
//   z-index: 9999;
//   width: 500px;
//   height: 400px;
//   // height: 500px;
// }

// Alert banner styling
// :deep(.update-alert) {
//   background: $bg-color-dark-9 !important;
//   border: $border-width-base solid $border-color-base;
//   border-radius: $border-radius-base;
//   backdrop-filter: $backdrop-blur-base;
//   box-shadow: $box-shadow-medium;

//   .el-alert__content {
//     background: transparent !important;
//   }

//   .el-alert__title {
//     color: $text-color-primary;
//     font-size: $font-size-base;
//     font-weight: $font-weight-semibold;
//   }

//   .el-alert__icon {
//     color: $primary-color;
//   }

//   .el-alert__closebtn {
//     color: $text-color-white-60;

//     &:hover {
//       color: $text-color-primary;
//     }
//   }
// }

.update-alert-content {
  p {
    margin: $spacing-sm 0;
    color: $text-color-white-60;
    font-size: $font-size-base;
    line-height: $line-height-normal;
  }

  .update-actions {
    margin-top: $spacing-md;
    display: flex;
    gap: $spacing-sm;
  }
}

// Dialog styling
:deep(.update-dialog) {
  background: $bg-color-dark-9 !important;
  border: $border-width-base solid $border-color-base !important;

  .el-dialog__header {
    background: transparent !important;
    border-bottom: $border-width-base solid $border-color-white-10;
    // padding-bottom: $spacing-md;
  }

  .el-dialog__title {
    color: $text-color-primary;
    font-size: $font-size-large;
    font-weight: $font-weight-semibold;
  }

  .el-dialog__headerbtn {
    .el-dialog__close {
      color: $text-color-white-60;

      &:hover {
        color: $text-color-primary;
      }
    }
  }

  .el-dialog__body {
    background: transparent !important;
    color: $text-color-primary;
  }

  .el-dialog__footer {
    background: transparent !important;
    border-top: $border-width-base solid $border-color-white-10;
    padding-top: $spacing-md;
  }
}

.update-dialog-content {
  .update-header {
    margin-bottom: $spacing-lg;
    padding-bottom: $spacing-md;
    border-bottom: $border-width-base solid $border-color-white-10;

    h3 {
      margin: 0 0 $spacing-sm 0;
      color: $primary-color;
      font-size: $font-size-extra-large;
      font-weight: $font-weight-semibold;
    }

    .update-date {
      margin: 0;
      color: $text-color-white-60;
      font-size: $font-size-extra-small;
      max-width: 300px;
    }
  }

  .update-notes {
    h4 {
      margin: 0 0 $spacing-md 0;
      font-weight: $font-weight-semibold;
      color: $text-color-primary;
      font-size: $font-size-medium;
    }

    .notes-content {
      max-height: 300px;
      overflow-y: auto;
      padding: $spacing-md;
      background: $bg-color-dark-5;
      border: $border-width-base solid $border-color-base;
      border-radius: $border-radius-small;
      line-height: $line-height-loose;
      color: $text-color-white-60;

      // Custom scrollbar
      &::-webkit-scrollbar {
        width: $width-scrollbar;
      }

      &::-webkit-scrollbar-track {
        background: $scrollbar-track-bg;
        border-radius: $border-radius-small;
      }

      &::-webkit-scrollbar-thumb {
        background: $scrollbar-thumb-bg;
        border-radius: $border-radius-small;

        &:hover {
          background: $scrollbar-thumb-hover-bg;
        }
      }

      :deep(h4) {
        margin: $spacing-md 0 $spacing-sm 0;
        font-weight: $font-weight-semibold;
        color: $primary-color;
        font-size: $font-size-medium;
      }

      :deep(li) {
        margin: $spacing-xs 0;
        padding-left: $spacing-md;
        color: $text-color-white-60;
        list-style-type: disc;
      }

      :deep(p) {
        margin: $spacing-sm 0;
        color: $text-color-white-60;
      }

      :deep(.no-notes) {
        color: $text-color-white-40;
        font-style: italic;
      }
    }
  }
}
</style>

