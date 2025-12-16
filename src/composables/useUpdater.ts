/**
 * Tauri 更新检查 Composable
 * 用于检查应用更新并显示更新日志
 */

import { ref } from 'vue'
import { check, Update } from '@tauri-apps/plugin-updater'
import { ElMessage, ElMessageBox } from 'element-plus'

interface UpdateInfo {
  version: string
  notes?: string
  date?: string
}

export function useUpdater() {
  const isChecking = ref(false)
  const updateAvailable = ref<Update | null>(null)
  const updateInfo = ref<UpdateInfo | null>(null)

  /**
   * 检查更新
   * @param silent 是否静默检查（不显示错误提示）
   * @returns Promise<boolean> 是否有可用更新
   */
  const checkUpdate = async (silent = false): Promise<boolean> => {
    try {
      isChecking.value = true
      const update = await check()

      if (update?.available) {
        updateAvailable.value = update

        // 解析更新信息
        // Tauri 2.0 updater API: Update 对象直接包含版本信息
        const version = update.version || ''
        const notes = (update as any).body || (update as any).notes || ''
        const date = (update as any).pub_date || ''
        
        updateInfo.value = {
          version,
          notes,
          date,
        }

        if (!silent) {
          showUpdateDialog()
        }

        return true
      } else {
        if (!silent) {
          ElMessage.success('当前已是最新版本')
        }
        return false
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      if (!silent) {
        ElMessage.error(`检查更新失败: ${error instanceof Error ? error.message : String(error)}`)
      }
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 显示更新对话框
   */
  const showUpdateDialog = () => {
    if (!updateInfo.value) return

    const { version, notes, date } = updateInfo.value

    // 格式化更新日志（支持 Markdown 格式）
    const formatNotes = (notes?: string): string => {
      if (!notes) return '暂无更新说明'
      
      // 将 Markdown 格式转换为 HTML（简单处理）
      return notes
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
            <h4 style="margin: 0 0 10px 0; font-weight: 600;">更新内容：</h4>
            <div style="line-height: 1.6; color: #606266;">
              ${notesHtml}
            </div>
          </div>
        </div>
      `,
      '应用更新',
      {
        confirmButtonText: '立即更新',
        cancelButtonText: '稍后提醒',
        dangerouslyUseHTMLString: true,
        type: 'info',
        customClass: 'update-dialog',
        showClose: false,
      }
    )
      .then(async () => {
        // 用户选择立即更新
        await installUpdate()
      })
      .catch(() => {
        // 用户选择稍后提醒
        console.log('用户选择稍后更新')
      })
  }

  /**
   * 安装更新
   */
  const installUpdate = async () => {
    if (!updateAvailable.value) {
      ElMessage.error('没有可用的更新')
      return
    }

    try {
      ElMessage.info('正在下载更新，请稍候...')
      
      await updateAvailable.value.downloadAndInstall()

      ElMessageBox.confirm(
        '更新已下载完成，需要重启应用以应用更新。是否立即重启？',
        '更新完成',
        {
          confirmButtonText: '立即重启',
          cancelButtonText: '稍后重启',
          type: 'success',
        }
      )
        .then(async () => {
          // Tauri 2.0: 使用 updater 插件的 restart 方法
          // 如果 Update 对象有 restart 方法，使用它；否则提示用户手动重启
          try {
            if (updateAvailable.value && typeof (updateAvailable.value as any).restart === 'function') {
              await (updateAvailable.value as any).restart()
            } else {
              ElMessage.info('请手动重启应用以完成更新')
            }
          } catch (error) {
            console.error('重启应用失败:', error)
            ElMessage.info('请手动重启应用以完成更新')
          }
        })
        .catch(() => {
          ElMessage.info('应用将在下次启动时应用更新')
        })
    } catch (error) {
      console.error('安装更新失败:', error)
      ElMessage.error(`安装更新失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 自动检查更新（应用启动时调用）
   */
  const autoCheckUpdate = () => {
    // 延迟检查，避免影响应用启动速度
    setTimeout(() => {
      checkUpdate(true) // 静默检查
    }, 3000)
  }

  return {
    isChecking,
    updateAvailable,
    updateInfo,
    checkUpdate,
    showUpdateDialog,
    installUpdate,
    autoCheckUpdate,
  }
}

