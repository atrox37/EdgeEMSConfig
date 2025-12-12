<template>
  <div class="titlebar" data-tauri-drag-region>
    <!-- 左侧:应用标题(可拖动区域) -->
    <div class="titlebar__left" data-tauri-drag-region>
      <div class="titlebar__title" data-tauri-drag-region>Norton creek solar energy center</div>
    </div>

    <!-- 右侧:用户信息和窗口控制按钮 -->
    <div class="titlebar__right">
      <!-- 天气信息 -->
      <div class="titlebar__weather" data-tauri-drag-region>
        <img :src="sunIcon" alt="sunIcon" class="titlebar__weather-icon" />
        <div class="titlebar__weather-status">wind</div>
        <div class="titlebar__weather-value">67℉~79℉</div>
      </div>

      <!-- 用户头像/菜单（仅登录后显示） -->
      <div class="titlebar__user" v-if="userStore.isLoggedIn">
          <el-dropdown @command="handleUserCommand" trigger="click">
            <div class="titlebar__user-info">
              <div class="titlebar__user-avatar">
                <div class="titlebar__user-avatar-initials">
                  {{ getAvatarName(userStore.userInfo?.username || 'Admin') }}
                </div>
              </div>
              <span class="titlebar__user-name">{{ userStore.userInfo?.username || '' }}</span>
              <img :src="arrowDownIcon" class="titlebar__user-arrow" />
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="switch" class="titlebar__user-item">
                  <img :src="logoutIcon" class="titlebar__user-logout-icon" />
                  Switch account
                </el-dropdown-item>
                <el-dropdown-item command="logout" class="titlebar__user-item">
                  <img :src="logoutIcon" class="titlebar__user-logout-icon" />
                  Logout
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
      </div>

      <!-- 通知按钮(不可拖动) -->
      <div class="titlebar__notice">
        <el-button link class="titlebar__notice-btn" @click="toggleNotifications">
          <el-badge :value="globalStore.alarmNum" :hidden="globalStore.alarmNum === 0">
            <img :src="noticeIcon" class="titlebar__notice-icon" />
          </el-badge>
        </el-button>
      </div>

      <!-- 窗口控制按钮(不可拖动) -->
      <div class="titlebar__controls">
        <button class="titlebar__button titlebar__button--minimize" @click="minimizeWindow" title="最小化">
          <svg width="12" height="2" viewBox="0 0 12 2">
            <rect width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button class="titlebar__button titlebar__button--maximize" @click="toggleMaximize" :title="isMaximized ? '向下还原' : '最大化'">
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="0" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
            <rect x="0" y="2" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
        <button class="titlebar__button titlebar__button--close" @click="closeWindow" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'
// 移除登录子窗口逻辑，依赖路由跳转到 /login

// 导入图标
import logoutIcon from '@/assets/icons/user-logout.svg'
import noticeIcon from '@/assets/icons/notice.svg'
import arrowDownIcon from '@/assets/icons/arrowDownIcon.svg'
import sunIcon from '@/assets/icons/sunny.svg'

const router = useRouter()
const userStore = useUserStore()
const globalStore = useGlobalStore()

const isMaximized = ref(false)
const appWindow = getCurrentWindow()

// 窗口控制函数
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
  await appWindow.close()
}

// 监听窗口最大化状态
let unlistenResize: (() => void) | null = null

onMounted(async () => {
  // 获取初始状态
  isMaximized.value = await appWindow.isMaximized()
  
  // 监听窗口调整大小事件
  unlistenResize = await appWindow.onResized(async () => {
    isMaximized.value = await appWindow.isMaximized()
  })
})

onUnmounted(() => {
  if (unlistenResize) {
    unlistenResize()
  }
})

// 切换通知
const toggleNotifications = () => {
  router.push({ name: 'alarmCurrentRecords' })
}

// 用户操作
const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'switch':
      // 切换账号，直接跳转到登录页
      router.push('/login')
      break
    case 'logout':
      await userStore.logout()
      router.push('/login')
      break
  }
}

// 获取头像首字母
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
@use '@/assets/styles/element/theme-vars.scss' as *;

.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #233c63;
  border-bottom: 1px solid rgba(148, 166, 197, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  user-select: none;

  &__left {
    flex: 1;
    display: flex;
    align-items: center;
    padding-left: $spacing-md;
  }

  &__title {
    font-family: Montserrat;
    font-weight: $font-weight-semibold;
    font-size: $font-size-medium;
    line-height: 150%;
    color: $color-white;
  }

  &__right {
    display: flex;
    height: 100%;
    align-items: center;
    gap: $spacing-md;
    padding-right: 0;
  }

  // 天气信息
  &__weather {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: $font-size-base;

    &-icon {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }

    &-status {
      font-weight: 500;
      color: $color-white;
    }

    &-value {
      font-weight: $font-weight-bold;
      color: $color-white;
    }
  }

  // 用户信息
  &__user {
    &-info {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all $transition-base;

      &:hover {
        background: $color-white-alpha-10;
      }
    }

    &-avatar {
      width: 28px;
      height: 28px;
      border-radius: $border-radius-circle;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(29, 134, 255, 0.2);

      &-initials {
        color: rgba(29, 134, 255, 1);
        font-weight: $font-weight-bold;
        font-size: 13px;
        line-height: 100%;
      }
    }

    &-name {
      font-family: Arimo;
      font-weight: 500;
      font-size: $font-size-small;
      line-height: 140%;
      color: $color-white;
    }

    &-arrow {
      height: 6px;
      width: 8px;
      color: #909399;
    }

    &-item {
      width: 153px;
      display: flex;
      align-items: center;
      color: $color-white;
      font-weight: 500;
      font-size: $font-size-base;
      line-height: 100%;
    }

    &-logout-icon {
      width: $spacing-lg;
      height: $spacing-lg;
      object-fit: contain;
      margin-right: 10px;
    }

    &-login-btn {
      // width: 100%;
      border-radius: 4px !important;
    }
  }

  // 通知
  &__notice {
    &-btn {
      padding: 8px;
      transition: all $transition-base;

      :deep(.el-badge__content) {
        width: $spacing-md;
        height: $spacing-md;
        border: none;
        border-radius: $border-radius-circle;
        background-color: rgba(218, 45, 44, 1);
        font-family: Arimo;
        font-weight: $font-weight-normal;
        font-size: $font-size-extra-small;
      }
    }

    &-icon {
      width: $spacing-md;
      height: $spacing-md;
      object-fit: contain;
    }
  }

  // 窗口控制按钮
  &__controls {
    display: flex;
    height: 100%;
    align-items: stretch;
  }

  &__button {
    width: 48px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: $color-white;
    cursor: pointer;
    transition: all $transition-fast;
    padding: 0;

    svg {
      width: 12px;
      height: 12px;
    }

    &:hover {
      background: $color-white-alpha-10;
    }

    &:active {
      background: $color-white-alpha-20;
    }

    &--close {
      &:hover {
        background: #e81123;
        color: $color-white;
      }

      &:active {
        background: #f1707a;
      }
    }
  }
}

// Badge 位置调整
:deep(.el-badge__content.is-fixed) {
  right: 6px;
  top: 2px;
  padding: 0;
}
</style>

