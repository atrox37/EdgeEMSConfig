<template>
  <div class="titlebar" data-tauri-drag-region>
    <div class="titlebar__left" data-tauri-drag-region>
      <div class="titlebar__title" data-tauri-drag-region>Monarch Edge Console</div>
    </div>
    <div class="titlebar__right">
      <div class="titlebar__ip-section" v-if="shouldShowUserInfo">
        <span class="titlebar__ip-address">{{ currentIpAddress }}</span>
      </div>
      <div class="titlebar__user" v-if="shouldShowUserInfo">
        <el-dropdown @command="handleUserCommand" @visible-change="handleUserDropdownVisible" trigger="click"
          :teleported="false" :show-arrow="false">
          <div class="titlebar__user-info">
            <div class="titlebar__user-avatar">
              <div class="titlebar__user-avatar-initials">
                {{ getAvatarName(userStore.userInfo?.username || 'Admin') }}
              </div>
            </div>
            <span class="titlebar__user-name">{{ userStore.userInfo?.username || '' }}</span>
            <img :src="arrowDownIcon" class="titlebar__user-arrow" :class="{ 'is-open': isUserDropdownOpen }" />
          </div>
          <template #dropdown>
            <el-dropdown-menu :show-arrow="false">
              <el-dropdown-item command="logout" class="titlebar__user-item">
                <img :src="logoutIcon" class="titlebar__user-logout-icon" />
                Logout
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="titlebar__controls">
        <el-dropdown trigger="click" placement="bottom-start" :teleported="false" @command="handleSystemCommand"
          :show-arrow="false" style="height: 100%;">
          <div class="titlebar__button titlebar__button--settings">
            <img :src="buttonSettingIcon" class="titlebar__setting-icon" />
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="setting">Setting</el-dropdown-item>
              <el-dropdown-item command="check-update">Updates</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="titlebar__button titlebar__button--minimize" @click="minimizeWindow">
          <img :src="buttonMinimizeIcon" class="titlebar__button-icon" />
        </div>
        <div class="titlebar__button titlebar__button--maximize" @click="toggleMaximize">
          <img :src="isMaximized ? buttonRestoreIcon : buttonMaximizeIcon" class="titlebar__button-icon" />
        </div>
        <div class="titlebar__button titlebar__button--close" @click="closeWindow">
          <img :src="buttonCloseIcon" class="titlebar__button-icon" />
        </div>
      </div>
    </div>
  </div>
  <TitlebarSettingDialog ref="settingDialogRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getApiConfig } from '@/utils/apiConfig'
import { ensureDefaultDownloadPath } from '@/utils/downloadPath'
import { useAppUpdateState } from '@/composables/useAppUpdateState'

import logoutIcon from '@/assets/icons/user-logout.svg'
import arrowDownIcon from '@/assets/icons/arrowDownIcon.svg'
// import titlebarSettingIcon from '@/assets/icons/titlebar-setting.svg'
import TitlebarSettingDialog from '@/layout/components/TitlebarSettingDialog.vue'
import buttonMinimizeIcon from '@/assets/icons/button-minimize.svg'
import buttonMaximizeIcon from '@/assets/icons/button-maximize.svg'
import buttonRestoreIcon from '@/assets/icons/button-restore.svg'
import buttonCloseIcon from '@/assets/icons/button-close.svg'
import buttonSettingIcon from '@/assets/icons/button-setting.svg'
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isMaximized = ref(false)
const appWindow = getCurrentWindow()
const currentIpAddress = ref<string>('')
const isUserDropdownOpen = ref(false)
const settingDialogRef = ref<InstanceType<typeof TitlebarSettingDialog> | null>(null)
const { isAppUpdating } = useAppUpdateState()

const isPublicShellPage = computed(() => route.path === '/login' || route.path === '/setup')

const shouldShowUserInfo = computed(() => userStore.isLoggedIn && !isPublicShellPage.value)

const loadCurrentIp = async () => {
  const apiConfig = await getApiConfig()
  if (apiConfig) {
    currentIpAddress.value = apiConfig.ipAddress
  }
}

watch(
  () => userStore.isLoggedIn,
  async (isLoggedIn) => {
    if (isLoggedIn) {
      await loadCurrentIp()
    }
  },
  { immediate: true }
)

const minimizeWindow = async () => {
  await appWindow.minimize()
}

const toggleMaximize = async () => {
  if (isMaximized.value) {
    await appWindow.unmaximize()
  } else {
    await appWindow.maximize()
  }
}

const closeWindow = async () => {
  if (isAppUpdating.value) {
    try {
      await ElMessageBox.confirm(
        'An update is currently in progress. Closing the application now may corrupt the update. Are you sure you want to exit?',
        'Update In Progress',
        {
          confirmButtonText: 'Exit Anyway',
          cancelButtonText: 'Stay',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }
  await appWindow.close()
}

const handleSystemCommand = async (command: string) => {
  if (command === 'setting') {
    settingDialogRef.value?.openDialog()
    return
  }
  if (command === 'check-update') {
    window.dispatchEvent(new CustomEvent('titlebar-open-updates-dialog'))
  }
}

let unlistenResize: (() => void) | null = null

onMounted(async () => {
  isMaximized.value = await appWindow.isMaximized()
  await ensureDefaultDownloadPath()

  unlistenResize = await appWindow.onResized(async () => {
    isMaximized.value = await appWindow.isMaximized()
  })
})

onUnmounted(() => {
  if (unlistenResize) {
    unlistenResize()
  }
})

const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'logout':
      await userStore.logout()
      router.push('/login')
      break
  }
}

const handleUserDropdownVisible = (visible: boolean) => {
  isUserDropdownOpen.value = visible
}

const getAvatarName = (name: string): string => {
  const nameStr = name.split(' ')
  if (nameStr.length === 1) {
    return name.charAt(0).toUpperCase()
  } else {
    return nameStr[0].charAt(0).toUpperCase() + nameStr[1].charAt(0).toUpperCase()
  }
}
</script>

<style lang="scss" scoped>
.titlebar {
  background: var(--vt-color-secondary);
  color: #ffffff;
  // position: fixed;
  // top: 0;
  // left: 0;
  // right: 0;
  // background: var(--vt-bg-muted);
  // border-bottom: var(--vt-border-width-base) solid var(--vt-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  user-select: none;
  padding-left:16px;
  height: 36px;

  .titlebar__left {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .titlebar__title {
    font-family: var(--vt-font-family-heading);
    font-weight: var(--vt-font-weight-semibold);
    font-size: var(--vt-font-size-md);
    line-height: var(--vt-line-height-relaxed);
    color: #ffffff;
    letter-spacing: 0.3px;
  }

  .titlebar__right {
    display: flex;
    height: 100%;
    align-items: center;
    gap: 40px;
    padding-right: 0;
  }

  .titlebar__ip-section {
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 0 9px;
    background:
      linear-gradient(#445783, #445783) padding-box,
      linear-gradient(117.64deg,
        #94A6C5 2.73%,
        rgba(148, 166, 197, 0) 31.73%,
        rgba(148, 166, 197, 0.344221) 71.62%,
        #94A6C5 97.67%) border-box;

    .titlebar__ip-address {
      font-family: Arimo;
      font-weight: 400;
      font-size: 13px;
      line-height: 100%;
      letter-spacing: 0%;

    }
  }

  .titlebar__user {
    .titlebar__user-info {
      display: flex;
      align-items: center;
      gap: var(--vt-space-1);
      padding: var(--vt-space-1) var(--vt-space-2);
      border-radius: var(--vt-radius-sm);
      cursor: pointer;
      transition: all var(--vt-transition-base);

      .titlebar__user-info:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .titlebar__user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #E0C9BA;

      .titlebar__user-avatar-initials {
        color: var(--vt-color-primary);
        font-weight: var(--vt-font-weight-bold);
        font-size: var(--vt-font-size-sm);
        letter-spacing: 0%;

      }
    }

    .titlebar__user-name {
      font-family: var(--vt-font-family-base);
      font-weight: var(--vt-font-weight-bold);
      font-size: var(--vt-font-size-xs);
      // line-height: var(--vt-line-height-normal);
      color: #ffffff;
    }

    .titlebar__user-arrow {
      width: 12px;
      height: 12px;
      opacity: 0.6;
      transition: transform 0.2s ease;

      &.is-open {
        transform: rotate(180deg);
      }
    }

    .titlebar__user-item {
      display: flex;
      align-items: center;
      color: var(--vt-text-primary);
      font-weight: var(--vt-font-weight-medium);
      font-size: var(--vt-font-size-base);
      line-height: var(--vt-line-height-normal);
    }

    .titlebar__user-logout-icon {
      width: var(--vt-space-4);
      height: var(--vt-space-4);
      object-fit: contain;
      margin-right: var(--vt-space-2);
    }
  }


  .titlebar__controls {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    margin-left: var(--vt-space-2);
  }

  .titlebar__button {
    height: 100%;
    display: flex;
    padding: 0 10px;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: #ffffff;
    cursor: pointer;
    transition: all var(--vt-transition-fast);
    img{
      width: 24px;
      height: 24px;
      object-fit: contain;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    &:active {
      background: rgba(255, 255, 255, 0.2);
    }

    &.titlebar__button--close {
      &:hover {
        background: var(--el-color-error, #f56c6c);
        color: #ffffff;
      }

      &:active {
        background: var(--el-color-error-dark-2, #d9534f);
        color: #ffffff;
      }
    }
  }
}

.titlebar__setting-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
</style>
