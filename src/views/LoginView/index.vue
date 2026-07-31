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
import { assertValidUserRole } from '@/utils/roleGuard'
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
    }

    if (!assertValidUserRole(userStore.userInfo, { configTool: true })) {
      await userStore.clearUserData()
      return
    }

    ElMessage.success('Login successful')
    await router.push({ name: 'channelConfiguration' })
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
  background: var(--vt-bg-page);
  position: relative;
  overflow: hidden;
  border: var(--vt-border-width-base) solid;
  border-image-source: var(--vt-border-gradient);

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
    gap: var(--vt-space-6);
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
    background: var(--vt-bg-input);
    border: var(--vt-border-width-base) solid var(--vt-border-color);
    border-radius: var(--vt-radius-md);
    padding: var(--vt-space-6) var(--vt-space-6);
    display: flex;
    flex-direction: column;
    align-items: center;
    backdrop-filter: var(--vt-backdrop-blur-strong);
    box-shadow: var(--vt-shadow-dialog);
  }

  // 标题
  .initial-config-page__title {
    font-family: var(--vt-font-family-heading);
    font-size: var(--vt-font-size-xl);
    font-weight: var(--vt-font-weight-semibold);
    color: var(--vt-text-primary);
    margin-bottom: var(--vt-space-6);
    text-align: center;
  }

  // 表单区域
  .initial-config-page__form {
    width: 100%;

    :deep(.el-form-item) {
      margin-bottom: var(--vt-space-4);

      .el-form-item__label {
        color: var(--vt-text-primary);
        font-size: var(--vt-font-size-base);
        font-weight: var(--vt-font-weight-medium);
        padding: 0;
        line-height: var(--vt-control-height);

        .el-form-item__label::before {
          display: none !important;
        }
      }

      .el-form-item__content {
        line-height: var(--vt-control-height);
      }
    }


    .initial-config-page__input {
      width: 100%;

      :deep(.el-input__wrapper) {
        background: var(--vt-bg-input);
        border: var(--vt-border-width-base) solid var(--vt-border-color);
        border-radius: var(--vt-radius-md);
        padding: 0 var(--vt-space-4);
        box-shadow: none;

        :deep(.el-input__wrapper):hover {
          border-color: var(--vt-color-primary);
        }

        :deep(.el-input__wrapper).is-focus {
          border-color: var(--vt-color-primary);
        }

        .el-input__inner {
          color: var(--vt-text-primary);
          font-size: var(--vt-font-size-base);
          height: var(--vt-control-height);

          .el-input__inner::placeholder {
            color: var(--vt-text-placeholder);
          }
        }

        // Readonly input style
        :deep(.el-input__wrapper).is-disabled {
          .el-input__inner {
            color: var(--vt-text-primary);
            cursor: default;
          }
        }
      }
    }

    // Login 按钮
    .initial-config-page__login-btn {
      width: 100%;
      height: var(--vt-control-height);
      margin-top: var(--vt-space-4);
      font-size: var(--vt-font-size-base);
      font-weight: var(--vt-font-weight-medium);
    }
  }
}

// // Element Plus 按钮样式覆盖
// :deep(.el-button.el-button--primary) {
//   background: var(--vt-color-primary) !important;
//   border: none !important;

//   &:hover {
//     background: var(--vt-color-primary-hover) !important;
//   }

//   &:active {
//     background: var(--vt-color-primary-active) !important;
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
