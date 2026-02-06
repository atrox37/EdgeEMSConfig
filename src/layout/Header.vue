<template>
  <div class="voltage-class header">
    <div class="header__left">
      <div class="header__left-title">Norton creek solar energy center</div>
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
        <div class="header__right-weatherValue">67�H~79�H</div>
      </div>

      <div class="header__right-avatar">
        <el-dropdown @command="handleUserCommand" trigger="click">
          <div class="header__user">
            <!-- ͷ��ͼƬ�޷���ʾ�ĳ���ԭ���У�·��д�����ԡ�ͼƬδ����ȷ���롢�����·����ʧ�ȡ��Ƽ���import��ʽ����ͼƬ��Դ�� -->
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


// �л�֪ͨ
const toggleNotifications = () => {
  router.push({ name: 'alarmCurrentRecords' })
}

// �û�����
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
  background: $bg-color-input;
  border-bottom: $border-width-base solid $border-color-base;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 99;

  .header__left {
    display: flex;
    align-items: center;

    .header__left-title {
      font-family: $font-family-montserrat;
      font-weight: $font-weight-semibold;
      font-style: normal;
      line-height: $line-height-relaxed;
      letter-spacing: 0%;
      color: $text-color-primary;
      margin: 0 0 10px 0;
    }

    .header__left-status {
      border: $border-width-base solid transparent;
      padding: 0;
      display: flex;
      align-items: center;
      background: rgba(84, 98, 140, 0.5);
      backdrop-filter: blur(10px);

      .header__left-statusIcon {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: $border-radius-circle;
        background-color: rgba(106, 193, 97, 0.2);
        margin: 0 0 10px 0;

        .header__left-statusIconCircle {
          border-radius: $border-radius-circle;
          background-color: rgba(106, 193, 97, 1);
        }
      }

      .header__left-statusText {
        font-family: $font-family-base;
        font-weight: $font-weight-bold;
        font-style: normal;
        font-size: $font-size-medium;
        line-height: $line-height-100;
        letter-spacing: 0%;
        vertical-align: middle;
        color: $text-color-primary;
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
        font-weight: $font-weight-medium;
        font-style: normal;
      }

      .header__right-weatherValue {
        font-weight: $font-weight-bold;
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
        transition: all $transition-base;

        :deep(.el-badge__content) {
          width: $font-size-medium;
          height: $font-size-medium;
          border: none;
          border-radius: $border-radius-circle;
          background-color: rgba(218, 45, 44, 1);
          font-family: $font-family-base;
          font-weight: $font-weight-normal;
          font-size: $font-size-base;
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
  gap: $spacing-sm;
  padding: $size-xs $spacing-sm;
  border-radius: $spacing-sm;
  transition: all $transition-base;
}

.header__user-avatar {
  width: $height-lg;
  height: $height-lg;
  border-radius: $border-radius-circle;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(29, 134, 255, 0.2);

  .header__user-avatar-initials {
    color: rgba(29, 134, 255, 1);
    font-weight: $font-weight-bold;
    line-height: $line-height-100;
    letter-spacing: 0%;
  }
}

.header__user-name {
  font-family: $font-family-base;
  font-weight: $font-weight-medium;
  font-style: normal;
  font-size: $font-size-large;
  line-height: $line-height-normal;
  letter-spacing: 0%;
  color: $text-color-primary;
}

.header__user-arrow {
  height: $spacing-sm;
  font-size: $font-size-extra-small;
  color: $text-color-secondary;
}

:deep(.el-badge__content.is-fixed) {
  top: $size-xs;
  padding: 0;
}

.header__user-Item {
  width: 100%;
  display: flex;
  align-items: center;
  color: $text-color-primary;
  font-weight: $font-weight-medium;
  font-size: $font-size-base;
  line-height: $line-height-100;
  letter-spacing: 0%;

  .header__user-logoutIcon {
    object-fit: contain;
    margin: 0 0 10px 0;
  }
}
</style>
