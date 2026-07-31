<template>
  <div class="voltage-class header">
    <div class="header__left">
      <div class="header__left-title">Monarch Edge Console</div>
      <div class="header__left-status">
        <div class="header__left-statusIcon">
          <div class="header__left-statusIconCircle"></div>
        </div>
        <div class="header__left-statusText">Online</div>
      </div>
    </div>

    <div class="header__right">
      <div class="header__right-weather">
        <img :src="sunIcon" alt="sunIcon" class="header__right-weatherIcon" />
        <div class="header__right-weatherStatus">wind</div>
        <div class="header__right-weatherValue">67°F~79°F</div>
      </div>

      <div class="header__right-avatar">
        <el-dropdown @command="handleUserCommand" trigger="click">
          <div class="header__user">
            <!-- 头像无法显示的常见原因：路径错误、未正确引入、静态资源失效等；建议用 import 引入图片 -->
            <!-- <el-avatar  :src="userStore.userInfo?.avatar" class="header__user-avatar" /> -->
            <!-- <el-avatar :src="headerAvatar" class="header__user-avatar" /> -->
            <div class="header__user-avatar">
              <div class="header__user-avatar-initials">
                {{ getAvatarName(userStore.userInfo?.username || 'Admin') }}
              </div>
            </div>
            <span class="header__user-name">{{ userStore.userInfo?.username || '' }}</span>
            <!-- <span class="header__user-name">Esthera Jackson</span> -->
            <img :src="arrowDownIcon" class="header__user-arrow" />
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout" class="header__user-Item">
                <img :src="logoutIcon" class="header__user-logoutIcon" />
                Logout
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="header__right-notice">
        <el-button link class="header__right-noticeBtn" @click="toggleNotifications">
          <el-badge :value="globalStore.alarmNum" :hidden="globalStore.alarmNum === 0">
            <img :src="noticeIcon" class="header__right-noticeIcon" />
          </el-badge>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'

import logoutIcon from '@/assets/icons/user-logout.svg'
import noticeIcon from '@/assets/icons/notice.svg'
import arrowDownIcon from '@/assets/icons/arrowDownIcon.svg'
import sunIcon from '@/assets/icons/sunny.svg'

const router = useRouter()
const userStore = useUserStore()

const globalStore = useGlobalStore()


// 切换通知
const toggleNotifications = () => {
  router.push({ name: 'alarmCurrentRecords' })
}

// 用户命令
const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'logout':
      await userStore.logout()
      router.push('/login')
      break
  }
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
.voltage-class.header {
  position: relative;
  background: var(--vt-color-secondary);
  border-bottom: var(--vt-border-width-base) solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 99;

  .header__left {
    display: flex;
    align-items: center;

    .header__left-title {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--vt-font-family-heading);
      font-weight: var(--vt-font-weight-bold);
      line-height: 1;
      letter-spacing: 0%;
      color: #ffffff;
      // margin: 0 0 10px 0;
      line-height: 100%;

    }

    .header__left-status {
      border: var(--vt-border-width-base) solid transparent;
      padding: 0;
      display: flex;
      align-items: center;
      background: rgba(84, 98, 140, 0.5);
      backdrop-filter: blur(10px);

      .header__left-statusIcon {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        background-color: rgba(106, 193, 97, 0.2);
        margin: 0 0 10px 0;

        .header__left-statusIconCircle {
          border-radius: 50%;
          background-color: rgba(106, 193, 97, 1);
        }
      }

      .header__left-statusText {
        font-family: var(--vt-font-family-base);
        font-weight: var(--vt-font-weight-bold);
        font-style: normal;
        font-size: var(--vt-font-size-md);
        line-height: 1;
        letter-spacing: 0%;
        vertical-align: middle;
        color: #ffffff;
      }
    }
  }

  .header__right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;

    .header__right-weather {
      display: flex;
      align-items: center;
      letter-spacing: 0%;
      margin: 0 0 10px 0;

      .header__right-weatherIcon {
        object-fit: contain;
      }

      .header__right-weatherStatus {
        font-weight: var(--vt-font-weight-medium);
        font-style: normal;
      }

      .header__right-weatherValue {
        font-weight: var(--vt-font-weight-bold);
        font-style: normal;
      }
    }

    .header__right-avatar {
      cursor: pointer;
      margin: 0 0 10px 0;
    }

    .header__right-notice {
      .header__right-noticeBtn {
        padding: 0;
        transition: all var(--vt-transition-base);

        :deep(.el-badge__content) {
          width: var(--vt-font-size-md);
          height: var(--vt-font-size-md);
          border: none;
          border-radius: 50%;
          background-color: rgba(218, 45, 44, 1);
          font-family: var(--vt-font-family-base);
          font-weight: var(--vt-font-weight-normal);
          font-size: var(--vt-font-size-base);
        }

        .header__right-noticeIcon {
          object-fit: contain;
        }
      }
    }
  }
}

.header__user {
  display: flex;
  align-items: center;
  gap: var(--vt-space-2);
  padding: var(--vt-space-1) var(--vt-space-2);
  border-radius: var(--vt-space-2);
  transition: all var(--vt-transition-base);
}

.header__user-avatar {
  width: var(--vt-control-height-lg);
  height: var(--vt-control-height-lg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(29, 134, 255, 0.2);

  .header__user-avatar-initials {
    color: #ffffff;
    font-weight: var(--vt-font-weight-bold);
    line-height: 1;
    letter-spacing: 0%;
  }
}

.header__user-name {
  font-family: var(--vt-font-family-base);
  font-weight: var(--vt-font-weight-medium);
  font-style: normal;
  font-size: var(--vt-font-size-lg);
  line-height: var(--vt-line-height-normal);
  letter-spacing: 0%;
  color: #ffffff;
}

.header__user-arrow {
  height: var(--vt-space-2);
  font-size: var(--vt-font-size-xs);
  color: #ffffff;
}

:deep(.el-badge__content.is-fixed) {
  top: var(--vt-space-1);
  padding: 0;
}

.header__user-Item {
  width: 100%;
  display: flex;
  align-items: center;
  color: var(--vt-text-primary);
  font-weight: var(--vt-font-weight-medium);
  font-size: var(--vt-font-size-base);
  line-height: 1;
  letter-spacing: 0%;

  .header__user-logoutIcon {
    object-fit: contain;
    margin: 0 0 10px 0;
  }
}
</style>
