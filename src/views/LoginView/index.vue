<template>
  <div class="voltage-class initial-config-page">
    <div class="initial-config-page__init-button">
      <el-button type="primary" @click="goToSetup">Initialize Project</el-button>
    </div>

    <div class="initial-config-page__container">
      <div class="initial-config-page__card">
        <div class="initial-config-page__logo">
          <img src="@/assets/images/Monarch-logo.png" alt="Monarch Logo" />
        </div>

        <div class="initial-config-page__form">
          <el-form @keyup.enter="handleLogin(formRef)" :model="form" label-position="right" ref="formRef"
            :rules="formRules" label-width="100px">
            <el-form-item label="Username:" prop="username">
              <el-input v-model="form.username" placeholder="Enter username..." class="initial-config-page__input" />
            </el-form-item>

            <el-form-item label="Password:" prop="password">
              <el-input v-model="form.password" type="password" placeholder="Enter password..."
                class="initial-config-page__input" show-password />
            </el-form-item>

            <el-form-item label="IP Address:" prop="ipAddress">
              <el-input v-model="form.ipAddress" placeholder="Enter IP address..." class="initial-config-page__input" />
            </el-form-item>

            <el-button type="primary" @click="handleLogin(formRef)" :loading="isLoading"
              class="initial-config-page__login-btn">
              Login
            </el-button>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { createApiConfig, saveApiConfig, setAxiosBaseURL, getApiConfig } from '@/utils/apiConfig'
const router = useRouter()
const userStore = useUserStore()

interface LoginForm {
  username: string
  password: string
  ipAddress: string
}
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

const formRef = ref<FormInstance>()
const isLoading = ref(false)

const goToSetup = () => {
  router.push({ path: '/setup' })
}

const isAdminUser = () => {
  const role = userStore.userInfo?.role
  const roleName = String(role?.name_en || '')
    .trim()
    .toLowerCase()

  return roleName === 'admin'
}

// 加载保存的IP地址
const loadSavedIp = async () => {
  const apiConfig = await getApiConfig()
  if (apiConfig) {
    form.ipAddress = apiConfig.ipAddress
  }
}

const form = reactive<LoginForm>({
  username: '',
  password: '',
  ipAddress: '',
})

onMounted(() => {
  void loadSavedIp()
})

const formRules = reactive<FormRules<LoginForm>>({
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
  ],
  ipAddress: [
    { required: true, message: 'Please enter IP address', trigger: 'blur' },
    {
      pattern: IPV4_PATTERN,
      message: 'Please enter a valid IP address',
      trigger: 'blur',
    },
  ],
})

const handleLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return

  try {
    const valid = await formEl.validate()
    if (!valid) {
      ElMessage.warning('Please fill in all required fields')
      return
    }

    isLoading.value = true

    // 1. 根据IP地址创建API配置并设置baseURL
    const apiConfig = createApiConfig(form.ipAddress)
    await setAxiosBaseURL(apiConfig)
    await saveApiConfig(apiConfig)

    // 2. 执行登录
    const loginResult = await userStore.login({
      username: form.username,
      password: form.password,
    })

    if (!loginResult.success) {
      
      return
    }

    // 3. 获取用户信息
    const userInfoResult = await userStore.getUserInfo()
    if (!userInfoResult.success) {
      return
    } else {
      // 4. 管理员权限校验：非管理员禁止登录
      if (!isAdminUser()) {
        ElMessage.error('Insufficient permissions')
        await userStore.clearUserData()
        return
      } else {
        // 5. 登录成功，跳转到首页
        ElMessage.success('Login successful')
        await router.push({ name: 'channelConfiguration' })
      }
    }
  } catch (error: any) {
    const errorMessage = error?.message || ''
    const isNetworkError =
      errorMessage.includes('Network request failed')
    if (isNetworkError) {
      ElMessage.warning('Unable to connect to server, please initialize project first')
      goToSetup()
    } 
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.voltage-class.initial-config-page {
  width: 100%;
  height: 100%;
  background: $bg-gradient-page;
  position: relative;
  overflow: hidden;
  border: $border-width-base solid;
  border-image-source: $border-gradient-base;

  .initial-config-page__init-button {
    position: absolute;
    top: 50px;
    right: 30px;
    z-index: 10;
  }

  .initial-config-page__container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 40px 20px;
    gap: $spacing-xl;
  }

  // Logo 区域（在卡片内）
  .initial-config-page__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30px;
    width: 100%;

    img {
      max-width: 200px;
      height: auto;
      object-fit: contain;
    }
  }

  .initial-config-page__card {
    width: 100%;
    max-width: 500px;
    background: $bg-color-dark-10;
    border: $border-width-base solid $border-color-base;
    border-radius: $border-radius-medium;
    padding: $spacing-xl $spacing-lg;
    display: flex;
    flex-direction: column;
    align-items: center;
    backdrop-filter: $backdrop-blur-base;
    box-shadow: $box-shadow-medium;
  }

  // 标题
  .initial-config-page__title {
    font-family: $font-family-montserrat;
    font-size: $font-size-extra-large;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
    margin-bottom: $spacing-xl;
    text-align: center;
  }

  // 表单区域
  .initial-config-page__form {
    width: 100%;

    :deep(.el-form-item) {
      margin-bottom: $spacing-md;

      .el-form-item__label {
        color: $text-color-primary;
        font-size: $font-size-base;
        font-weight: $font-weight-medium;
        padding: 0;
        line-height: $height-base;

        &::before {
          display: none !important;
        }
      }

      .el-form-item__content {
        line-height: $height-base;
      }
    }


    .initial-config-page__input {
      width: 100%;

      :deep(.el-input__wrapper) {
        background: $bg-color-input;
        border: $border-width-base solid $border-color-base;
        border-radius: $border-radius-base;
        padding: 0 $spacing-md;
        box-shadow: none;

        &:hover {
          border-color: $primary-color;
        }

        &.is-focus {
          border-color: $primary-color;
        }

        .el-input__inner {
          color: $text-color-primary;
          font-size: $font-size-base;
          height: $height-base;

          &::placeholder {
            color: $text-color-placeholder;
          }
        }

        // Readonly input style
        &.is-disabled {
          .el-input__inner {
            color: $text-color-primary;
            cursor: default;
          }
        }
      }
    }

    // Login 按钮
    .initial-config-page__login-btn {
      width: 100%;
      height: $height-base;
      margin-top: $spacing-md;
      font-size: $font-size-base;
      font-weight: $font-weight-medium;
    }
  }
}

// // Element Plus 按钮样式覆盖
// :deep(.el-button.el-button--primary) {
//   background: $primary-color !important;
//   border: none !important;

//   &:hover {
//     background: $primary-color-hover !important;
//   }

//   &:active {
//     background: $primary-color-active !important;
//   }
// }

// :deep(.el-button.is-link) {
//   padding: 0;
//   height: auto;
//   background: transparent !important;
//   border: none !important;
//   &:hover {
//     color: #fff !important;
//   }
// }
:deep(.el-input) {
  width: 100% !important;
}
</style>
