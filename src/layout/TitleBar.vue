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
          <el-dropdown
            @command="handleUserCommand"
            @visible-change="handleUserDropdownVisible"
            trigger="click"
            :teleported="false"
          >
            <div class="titlebar__user-info">
              <div class="titlebar__user-avatar">
                <div class="titlebar__user-avatar-initials">
                  {{ getAvatarName(userStore.userInfo?.username || 'Admin') }}
                </div>
              </div>
              <span class="titlebar__user-name">{{ userStore.userInfo?.username || '' }}</span>
              <img
                :src="arrowDownIcon"
                class="titlebar__user-arrow"
                :class="{ 'is-open': isUserDropdownOpen }"
              />
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" class="titlebar__user-item">
                  <img :src="logoutIcon" class="titlebar__user-logout-icon" />
                  Logout
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
      </div>
      <div class="titlebar__controls">
        <el-dropdown
          trigger="click"
          placement="bottom-start"
          :teleported="false"
          @command="handleSystemCommand"
          style="height: 100%;"
        >
          <div class="titlebar__button titlebar__button--settings">
            <img :src="titlebarSettingIcon" class="titlebar__setting-icon" />
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="setting">Setting</el-dropdown-item>
              <el-dropdown-item command="check-update">Updates</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="titlebar__button titlebar__button--minimize" @click="minimizeWindow">
          <svg width="12" height="2" viewBox="0 0 12 2">
            <rect width="12" height="2" fill="currentColor" />
          </svg>
        </div>
        <div class="titlebar__button titlebar__button--maximize" @click="toggleMaximize">
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="0" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
            <rect x="0" y="2" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        </div>
        <div class="titlebar__button titlebar__button--close" @click="closeWindow">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" />
          </svg>
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
import titlebarSettingIcon from '@/assets/icons/titlebar-setting.svg'
import TitlebarSettingDialog from '@/layout/components/TitlebarSettingDialog.vue'

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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  // background: $bg-color-dark-2;
  // border-bottom: $border-width-base solid $border-color-base;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  user-select: none;
  height: 32px;

  .titlebar__left {
    flex: 1;
    display: flex;
    align-items: center;
    padding-left: $spacing-md;
  }

  .titlebar__title {
    font-family: $font-family-montserrat;
    font-weight: $font-weight-semibold;
    font-size: $font-size-medium;
    line-height: $line-height-relaxed;
    // color: $orange-color-light;
    letter-spacing: 0.3px;
  }

  .titlebar__right {
    display: flex;
    height: 100%;
    align-items: center;
    gap: $spacing-md;
    padding-right: 0;
  }

  .titlebar__ip-section {
    display: flex;
    align-items: center;
    padding: 0 $spacing-sm;

    .titlebar__ip-address {
      font-family: $font-family-base;
      font-weight: $font-weight-medium;
      font-size: $font-size-small;
      color: $text-color-white-60;
      padding: $spacing-xs $spacing-sm;
      background: $bg-color-dark-11;
      border-radius: $border-radius-small;
    }
  }

  .titlebar__user {
    .titlebar__user-info {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-xs $spacing-sm;
      border-radius: $border-radius-small;
      cursor: pointer;
      transition: all $transition-base;

      .titlebar__user-info:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .titlebar__user-avatar {
      width: 24px;
      height: 24px;
      border-radius: $border-radius-circle;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: $primary-color-alpha-20;

      .titlebar__user-avatar-initials {
        color: $primary-color;
        font-weight: $font-weight-bold;
        font-size: $font-size-small;
        line-height: 1;
      }
    }

    .titlebar__user-name {
      font-family: $font-family-base;
      font-weight: $font-weight-medium;
      font-size: $font-size-small;
      line-height: $line-height-normal;
      color: $text-color-primary;
    }

    .titlebar__user-arrow {
      width: 12px;
      height: 12px;
      opacity: 0.6;
      transition: transform 0.2s ease;
      .titlebar__user-arrow.is-open {
        transform: rotate(180deg);
      }
    }

    .titlebar__user-item {
      display: flex;
      align-items: center;
      color: $text-color-primary;
      font-weight: $font-weight-medium;
      font-size: $font-size-base;
      line-height: $line-height-normal;
    }

    .titlebar__user-logout-icon {
      width: $spacing-md;
      height: $spacing-md;
      object-fit: contain;
      margin-right: $spacing-sm;
    }
  }


  .titlebar__controls {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    margin-left: $spacing-sm;
  }

  .titlebar__button {
    height: 100%;
    display: flex;
    padding: 0 15px;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: $text-color-primary;
    cursor: pointer;
    transition: all $transition-fast;
    svg {
      width: 12px;
      height: 12px;
    }

    .titlebar__button:hover {
      background: rgba(0, 0, 0, 0.05); // 浅色背景 hover 效果
    }

    .titlebar__button:active {
      background: rgba(0, 0, 0, 0.1); // 浅色背景 active 效果
    }

    .titlebar__button.titlebar__button--close {
      .titlebar__button.titlebar__button--close:hover {
        background: #e81123; // Windows 标准关闭按钮红色（悬停）
        color: #ffffff;
      }

      .titlebar__button.titlebar__button--close:active {
        background: #f1707a; // Windows 标准关闭按钮红色（按下）
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


