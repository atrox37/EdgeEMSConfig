/**
 * Tauri update checker composable.
 */

import { ref, shallowRef } from 'vue'
import { check, Update, type DownloadEvent } from '@tauri-apps/plugin-updater'
import { ElMessage, ElMessageBox } from 'element-plus'

interface UpdateInfo {
  version: string
  notes?: string
  date?: string
}

type InstallPhase = 'idle' | 'downloading' | 'installing'

export function useUpdater() {
  const isChecking = ref(false)
  const isInstalling = ref(false)
  const installPhase = ref<InstallPhase>('idle')
  const downloadPercent = ref(0)
  const downloadedBytes = ref(0)
  const totalBytes = ref<number | null>(null)
  const progressMessage = ref('')
  const updateAvailable = shallowRef<Update | null>(null)
  const updateInfo = ref<UpdateInfo | null>(null)

  const resetInstallProgress = () => {
    isInstalling.value = false
    installPhase.value = 'idle'
    downloadPercent.value = 0
    downloadedBytes.value = 0
    totalBytes.value = null
    progressMessage.value = ''
  }

  const clearUpdateState = async () => {
    if (updateAvailable.value) {
      try {
        await updateAvailable.value.close()
      } catch (error) {
        console.warn('failed to close previous update resource:', error)
      }
    }

    updateAvailable.value = null
    updateInfo.value = null
  }

  const checkUpdate = async (silent = false): Promise<boolean> => {
    try {
      isChecking.value = true
      await clearUpdateState()
      resetInstallProgress()

      const update = await check()

      if (!update?.available) {
        if (!silent) {
          ElMessage.success('The current version is the latest')
        }
        return false
      }

      updateAvailable.value = update
      updateInfo.value = {
        version: update.version || '',
        notes: update.body || (update.rawJson?.notes as string | undefined) || '',
        date: update.date || (update.rawJson?.pub_date as string | undefined) || '',
      }

      if (!silent) {
        showUpdateDialog()
      }

      return true
    } catch (error) {
      await clearUpdateState()
      resetInstallProgress()
      console.error('check update failed:', error)
      if (!silent) {
        ElMessage.error(`check update failed: ${error instanceof Error ? error.message : String(error)}`)
      }
      return false
    } finally {
      isChecking.value = false
    }
  }

  const showUpdateDialog = () => {
    if (!updateInfo.value) return

    const { version, notes, date } = updateInfo.value

    const formatNotes = (value?: string): string => {
      if (!value) return 'No update notes'

      return value
        .replace(/### (.*?)\n/g, '<h4 style="margin: 10px 0 5px 0; font-weight: 600;">$1</h4>')
        .replace(/- (.*?)\n/g, '<li style="margin: 5px 0;">$1</li>')
        .replace(/\n/g, '<br>')
    }

    const notesHtml = formatNotes(notes)
    const dateStr = date ? new Date(date).toLocaleDateString('zh-CN') : ''

    ElMessageBox.confirm(
      `
        <div style="max-height: 400px; overflow-y: auto;">
          <div style="margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #409EFF;">发现新版本 v${version}</h3>
            ${dateStr ? `<p style="color: #909399; font-size: 12px; margin: 0;">发布日期: ${dateStr}</p>` : ''}
          </div>
          <div style="margin-top: 15px; padding: 10px; background: #f5f7fa; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; font-weight: 600;">更新内容</h4>
            <div style="line-height: 1.6; color: #606266;">
              ${notesHtml}
            </div>
          </div>
        </div>
      `,
      'Application Update',
      {
        confirmButtonText: 'Update Now',
        cancelButtonText: 'Remind Later',
        dangerouslyUseHTMLString: true,
        type: 'info',
        customClass: 'update-dialog',
        showClose: false,
      }
    )
      .then(async () => {
        await installUpdate()
      })
      .catch(() => {
        console.log('user chooses to remind later')
      })
  }

  const installUpdate = async (): Promise<boolean> => {
    if (!updateAvailable.value) {
      ElMessage.error('No available update')
      return false
    }

    try {
      resetInstallProgress()
      isInstalling.value = true
      installPhase.value = 'downloading'
      progressMessage.value = 'Downloading update package...'

      await updateAvailable.value.download((event: DownloadEvent) => {
        if (event.event === 'Started') {
          totalBytes.value = event.data.contentLength ?? null
          downloadedBytes.value = 0
          downloadPercent.value = 0
          progressMessage.value = totalBytes.value
            ? 'Downloading update package...'
            : 'Downloading update package...'
          return
        }

        if (event.event === 'Progress') {
          downloadedBytes.value += event.data.chunkLength
          if (totalBytes.value && totalBytes.value > 0) {
            downloadPercent.value = Math.min(100, Math.round((downloadedBytes.value / totalBytes.value) * 100))
          }
          return
        }

        downloadPercent.value = 100
      })

      installPhase.value = 'installing'
      progressMessage.value = 'Applying update package...'
      await updateAvailable.value.install()

      await ElMessageBox.confirm(
        'The update has been downloaded successfully. Please restart the application to apply the update.',
        'Update Completed',
        {
          confirmButtonText: 'OK',
          cancelButtonText: 'Later',
          type: 'success',
        }
      )
        .then(() => {
          ElMessage.info('Please restart the application to complete the update')
        })
        .catch(() => {
          ElMessage.info('The application will apply the update the next time it starts')
        })

      await clearUpdateState()
      resetInstallProgress()
      return true
    } catch (error) {
      console.error('install update failed:', error)
      ElMessage.error(`install update failed: ${error instanceof Error ? error.message : String(error)}`)
      isInstalling.value = false
      progressMessage.value = 'Update failed. Please try again.'
      return false
    }
  }

  const autoCheckUpdate = () => {
    setTimeout(() => {
      void checkUpdate(true)
    }, 3000)
  }

  return {
    isChecking,
    isInstalling,
    installPhase,
    downloadPercent,
    downloadedBytes,
    totalBytes,
    progressMessage,
    updateAvailable,
    updateInfo,
    checkUpdate,
    showUpdateDialog,
    installUpdate,
    autoCheckUpdate,
  }
}
