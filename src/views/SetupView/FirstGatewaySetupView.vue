<template>
  <div class="voltage-class first-gateway-setup">
    <div class="first-gateway-setup__center">
      <div class="first-gateway-setup__container">
        <section class="first-gateway-setup__intro">
          <h1 class="first-gateway-setup__title">Set up your gateway</h1>
          <!-- <p class="first-gateway-setup__subtitle">Start monitoring your system in a few steps</p> -->
          <p class="first-gateway-setup__text">
            This quick setup will help you connect your gateway device and install the required software.
            Enter the device IP address and port, then select the setup file you received
            (ending in <span class="first-gateway-setup__mono">.run</span>).
          </p>
        
        </section>

        <div class="first-gateway-setup__card">
          <el-form ref="formRef" :model="form" :rules="formRules" label-width="112px" label-position="right"
            class="first-gateway-setup__form">
            <el-form-item label="IP Address:" prop="host">
              <el-input v-model="form.host" placeholder="Enter IP address" :disabled="isSubmitting" />
            </el-form-item>
            <el-form-item label="Port:" prop="port">
              <el-input-number v-model="form.port" :min="1" :max="65535" :controls="false" align="left"
                placeholder="Port" :disabled="isSubmitting" class="first-gateway-setup__field-full" />
            </el-form-item>

            <!-- 用户名 / 认证 / 密码 / 私钥已注释；form 默认 root + password + 空密码
          <el-form-item label="Username:" prop="username">
            <el-input v-model="form.username" placeholder="Enter username" :disabled="isSubmitting" />
          </el-form-item>
          <el-form-item label="Auth Mode:" prop="authMode">
            <el-radio-group v-model="form.authMode" :disabled="isSubmitting">
              <el-radio value="password">Password</el-radio>
              <el-radio value="key">Private Key</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.authMode === 'password'" label="Password:" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="Enter password" :disabled="isSubmitting" />
          </el-form-item>
          <el-form-item v-if="form.authMode === 'key'" label="Private Key:" prop="privateKey">
            <el-button type="primary" :disabled="isSubmitting" @click="handleSelectKeyFile">Select Key File (.pem/.key)</el-button>
            <div v-if="selectedKeyPath" class="file-info">
              Selected: <span class="file-name">{{ selectedKeyPath.split(/[/\\]/).pop() }}</span>
            </div>
          </el-form-item>
          -->

            <el-form-item label="Package:" prop="file">
              <el-button type="primary" :disabled="isSubmitting" @click="handleSelectFile">
                Select File (.run)
              </el-button>
              <div v-if="selectedFileName" class="file-info">
                <span class="file-name">{{ selectedFileName }}</span>
              </div>
            </el-form-item>

            <div v-if="progressMessage || progressPercentage > 0" class="progress-section">
              <div v-if="progressMessage" class="progress-message">{{ progressMessage }}</div>
              <el-progress v-if="progressPercentage > 0" :percentage="progressPercentage" :status="progressStatus"
                :stroke-width="8" :show-text="true" class="progress-bar" />
              <div v-if="progressDetail" class="progress-detail">{{ progressDetail }}</div>
            </div>

            <el-button type="primary" class="first-gateway-setup__submit" :loading="isSubmitting"
              :disabled="!isStartInitReady" @click="handleStartInit">
              Start
            </el-button>
          </el-form>
        </div>
        <div class="first-gateway-setup__hint-block">
            <AppIcon name="i-tabler-info-circle-filled" className="first-gateway-setup__hint-icon" />
            <p class="first-gateway-setup__hint-text">
              Already configured? Use <span class="first-gateway-setup__hint-em">Skip to login</span> at the bottom-right.
              You can open setup again from <span class="first-gateway-setup__hint-em">Initialize Project</span> on the login page.
            </p>
          </div>
      </div>
      
    </div>

    <button
      type="button"
      class="first-gateway-setup__skip first-gateway-setup__skip-fixed"
      :disabled="isSubmitting"
      @click="handleSkip"
    >
      <span>Skip to login</span>
      <AppIcon name="i-tabler-arrow-right" className="first-gateway-setup__skip-icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { open } from '@tauri-apps/plugin-dialog'
import type { InitProjectForm } from '@/types/ssh'
import { runGatewayInitInstall } from '@/utils/gatewayInitInstall'
import { markGatewayFirstSetupSeen } from '@/utils/firstGatewaySetup'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()

const form = reactive<InitProjectForm>({
  host: '',
  port: 22,
  username: 'root',
  password: '',
  authMode: 'password',
  privateKey: null,
  file: null,
})

const selectedFilePath = ref<string | null>(null)
const selectedKeyPath = ref<string | null>(null)
const selectedFileName = ref('')
const isSubmitting = ref(false)
const progressMessage = ref('')
const progressPercentage = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | ''>('')
const progressDetail = ref('')
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

const isStartInitReady = computed(() => {
  const host = form.host.trim()
  const isHostValid = IPV4_PATTERN.test(host)
  const isPortValid =
    typeof form.port === 'number' &&
    Number.isInteger(form.port) &&
    form.port >= 1 &&
    form.port <= 65535
  return isHostValid && isPortValid && !!selectedFilePath.value
})

const formRules = computed<FormRules<InitProjectForm>>(() => {
  const rules: FormRules<InitProjectForm> = {
    host: [
      { required: true, message: 'Please enter IP address', trigger: 'blur' },
      {
        pattern: IPV4_PATTERN,
        message: 'Please enter a valid IP address',
        trigger: 'blur',
      },
    ],
    port: [
      { required: true, message: 'Please enter port number', trigger: 'blur' },
      { type: 'number', min: 1, max: 65535, message: 'Port must be between 1 and 65535', trigger: 'blur' },
    ],
    file: [
      {
        required: true,
        message: 'Please select an installation package',
        trigger: 'change',
      },
    ],
  }
  return rules
})

const resetProgress = () => {
  progressMessage.value = ''
  progressPercentage.value = 0
  progressStatus.value = ''
  progressDetail.value = ''
}

const handleSelectFile = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Installation Package', extensions: ['run'] }],
    })
    if (selected && typeof selected === 'string') {
      const lowerSelected = selected.toLowerCase()
      if (!lowerSelected.endsWith('.run')) {
        ElMessage.error('Invalid file type.')
        return
      }
      selectedFilePath.value = selected
      selectedFileName.value = selected.split(/[/\\]/).pop() || ''
      form.file = { name: selectedFileName.value } as unknown as File
      await nextTick()
      formRef.value?.validateField('file')
    }
  } catch (error: unknown) {
    ElMessage.error(`Failed to select file: ${error}`)
  }
}

/*
const handleSelectKeyFile = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Private Key', extensions: ['pem', 'key'] }],
    })
    if (selected && typeof selected === 'string') {
      const lowerSelected = selected.toLowerCase()
      if (!lowerSelected.endsWith('.pem') && !lowerSelected.endsWith('.key')) {
        ElMessage.error('Invalid key file type.')
        return
      }
      selectedKeyPath.value = selected
      form.privateKey = { name: selected.split(/[/\\]/).pop() } as unknown as File
    }
  } catch (error: unknown) {
    ElMessage.error(`Failed to select key file: ${error}`)
  }
}
*/

const goLogin = () => {
  router.replace({ path: '/login' })
}

const handleSkip = async () => {
  if (isSubmitting.value) return
  markGatewayFirstSetupSeen()
  // Strategy A: always force re-login after setup flow.
  await userStore.clearUserData()
  goLogin()
}

const handleStartInit = async () => {
  if (!formRef.value) return
  try {
    const valid = await formRef.value.validate()
    if (!valid) {
      ElMessage.warning('Please fill in all required fields')
      return
    }
    if (!selectedFilePath.value) {
      ElMessage.warning('Please select an installation package file')
      return
    }
    isSubmitting.value = true
    progressStatus.value = ''
    resetProgress()

    const trimmedPassword = form.authMode === 'password' ? form.password.trim() : null
    const ok = await runGatewayInitInstall({
      host: form.host,
      port: form.port,
      username: form.username,
      password: trimmedPassword,
      authMode: form.authMode,
      privateKeyPath: form.authMode === 'key' ? selectedKeyPath.value : null,
      localPackagePath: selectedFilePath.value,
      packageFileName: selectedFileName.value,
      setProgress: (p) => {
        if (p.message != null) progressMessage.value = p.message
        if (p.percentage != null) progressPercentage.value = p.percentage
        if (p.detail != null) progressDetail.value = p.detail
        if (p.status != null) progressStatus.value = p.status
      },
    })

    if (ok) {
      markGatewayFirstSetupSeen()
      // Strategy A: after successful initialization, force user to log in again.
      await userStore.clearUserData()
      goLogin()
    }
  } catch (error: unknown) {
    console.error('Init failed:', error)
    progressStatus.value = 'exception'
    if (progressPercentage.value <= 0) {
      progressPercentage.value = 100
    }
    progressMessage.value = 'Initialization failed'
    progressDetail.value = String(error)
    ElMessage.error(`Operation failed: ${error}`)
  } finally {
    isSubmitting.value = false
    if (progressStatus.value !== 'success' && progressStatus.value !== 'exception') {
      resetProgress()
    }
  }
}
</script>

<style lang="scss" scoped>
.first-gateway-setup {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: $bg-gradient-page;
  position: relative;
  overflow: auto;
  border: $border-width-base solid;
  border-image-source: $border-gradient-base;
  display: flex;
  flex-direction: column;
}

.first-gateway-setup__hint-block {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  max-width: 38em;
  margin: 0 auto;
  text-align: left;
}

.first-gateway-setup__hint-block :deep(.first-gateway-setup__hint-icon) {
  flex-shrink: 0;
  margin-top: 2px;
  width: 16px;
  height: 16px;
  color: $secondary-color;
}

.first-gateway-setup__hint-text {
  font-size: $font-size-base;
  line-height: 20px;
  font-weight: inherit;
  margin: 0;
  color: $secondary-color;
}

.first-gateway-setup__hint-em {
  font-weight: $font-weight-semibold;
}

.first-gateway-setup__skip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: $font-family-base;
  font-size: $font-size-base;
  line-height: 1.55;
  font-weight: $font-weight-medium;
  color: $primary-color;
  cursor: pointer;
  transition: opacity $transition-fast;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover {
    opacity: 0.85;
  }
}

.first-gateway-setup__skip :deep(.first-gateway-setup__skip-icon) {
  width: 1em;
  height: 1em;
}

.first-gateway-setup__skip-fixed {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 20;
}

.first-gateway-setup__center {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  // padding: 56px $spacing-lg 40px;
}

.first-gateway-setup__container {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.first-gateway-setup__intro {
  text-align: center;
  width: 100%;
}

.first-gateway-setup__title {
  font-family: $font-family-montserrat;
  font-size: $font-size-extra-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  margin: 0 0 $spacing-xs;
  line-height: 1.25;
}

.first-gateway-setup__subtitle {
  font-family: $font-family-montserrat;
  font-size: $font-size-medium;
  font-weight: $font-weight-medium;
  color: $text-color-secondary;
  margin: 0 0 $spacing-md;
  line-height: 1.4;
}

.first-gateway-setup__text {
  font-size: $font-size-base;
  // line-height: 1.55;
  color: $text-color-regular;
  margin: 0;
  max-width: 38em;
  margin-left: auto;
  margin-right: auto;
  text-align: left;
}

.first-gateway-setup__mono {
  font-family: ui-monospace, monospace;
  font-size: 0.92em;
  padding: 0 $spacing-xs;
  border-radius: $border-radius-small;
  background: $bg-color-input;
  color: $text-color-primary;
}

.first-gateway-setup__tip {
  // margin-top: $spacing-md;
  // width: 100%;
  text-align: left;
  background-color: transparent;

  :deep(.el-alert__content) {
    font-size: $font-size-small;
    line-height: 1.5;
    color: $text-color-regular;
    background-color: transparent;
  }

  :deep(.el-icon) {
    color: $primary-color;
    font-size: $font-size-base;
  }
}

.first-gateway-setup__card {
  width: 100%;
  max-width: 500px;
  background: $bg-color-dark-10;
  border: $border-width-base solid $border-color-base;
  border-radius: $border-radius-medium;
  padding: $spacing-xl $spacing-lg;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  backdrop-filter: $backdrop-blur-base;
  box-shadow: $box-shadow-medium;
}

.first-gateway-setup__form {
  width: 100%;

  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      color: $text-color-primary;
      font-size: $font-size-base;
      font-weight: $font-weight-medium;
    }
  }

  :deep(.el-form-item.is-required:not(.is-no-asterisk) .el-form-item__label:before) {
    color: $danger-color;
  }

  :deep(.el-input__wrapper) {
    background: $bg-color-input;
    border: $border-width-base solid $border-color-base;
    border-radius: $border-radius-base;
    box-shadow: none;

    &:hover {
      border-color: $primary-color;
    }

    &.is-focus {
      border-color: $primary-color;
    }
  }

  :deep(.el-input-number .el-input__wrapper) {
    border-radius: $border-radius-base;
  }

  :deep(.first-gateway-setup__field-full) {
    width: 100%;
  }

  :deep(.first-gateway-setup__field-full .el-input__wrapper) {
    width: 100%;
  }

  .file-info {
    font-size: 12px;
    color: $text-color-secondary;
    margin-top: 8px;

    .file-name {
      color: $text-color-primary;
      font-weight: bold;
    }
  }

  .progress-section {
    margin-top: 8px;
    margin-bottom: 16px;
    padding: 12px;
    background: $bg-color-input;
    border-radius: $border-radius-base;
    color: $text-color-primary;
    font-size: $font-size-small;

    .progress-message {
      margin-bottom: 8px;
      font-weight: bold;
    }

    .progress-detail {
      margin-top: 8px;
      font-size: 11px;
      color: $text-color-secondary;
    }
  }
}

.first-gateway-setup__submit {
  width: 100%;
  height: $height-base;
  margin-top: $spacing-md;
}

:deep(.el-progress) {
  .el-progress-bar__inner {
    background-color: $primary-color;
  }

  &.is-success .el-progress-bar__inner {
    background-color: $success-color;
  }

  &.is-exception .el-progress-bar__inner {
    background-color: $danger-color;
  }
}
</style>
