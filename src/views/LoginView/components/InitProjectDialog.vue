<template>
  <FormDialog
    ref="formDialogRef"
    title="Initialize Project"
    width="600px"
    :close-on-press-escape="false"
    :show-close="!isSubmitting"
    :before-close="handleBeforeClose"
    @close="handleClose"
  >
    <template #dialog-body>
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
        label-position="right"
        class="init-project-dialog"
      >
        <!-- IP Address and Port in one row -->
        <div class="form-row">
          <el-form-item label="IP Address:" prop="host" class="ip-field">
            <el-input
              v-model="form.host"
              placeholder="Enter IP address"
              :disabled="isSubmitting"
            />
          </el-form-item>

          <el-form-item label="Port:" prop="port" class="port-field" label-width="60px">
            <el-input-number
              v-model="form.port"
              :min="1"
              :max="65535"
              :controls="false"
              align="left"
              placeholder="Port"
              :disabled="isSubmitting"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <el-form-item label="Username:" prop="username">
          <el-input
            v-model="form.username"
            placeholder="Enter username"
            :disabled="isSubmitting"
          />
        </el-form-item>

        <!-- Authentication Mode -->
        <el-form-item label="Auth Mode:" prop="authMode">
          <el-radio-group v-model="form.authMode" :disabled="isSubmitting">
            <el-radio value="password">Password</el-radio>
            <el-radio value="key">Private Key</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- Password field (shown when authMode is password) -->
        <el-form-item
          v-if="form.authMode === 'password'"
          label="Password:"
          prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="Enter password"
            :disabled="isSubmitting"
          />
        </el-form-item>

        <!-- Private Key upload (shown when authMode is key) -->
        <el-form-item
          v-if="form.authMode === 'key'"
          label="Private Key:"
          prop="privateKey"
        >
          <el-button 
            type="primary" 
            @click="handleSelectKeyFile"
            :disabled="isSubmitting"
          >
            Select Key File (.pem/.key)
          </el-button>
          <div v-if="selectedKeyPath" class="file-info">
            Selected: {{ selectedKeyPath.split(/[/\\]/).pop() }}
          </div>
        </el-form-item>

        <!-- Installation Package -->
        <el-form-item label="Package:" prop="file">
          <el-button 
            type="primary" 
            @click="handleSelectFile"
            :disabled="isSubmitting"
          >
            Select File (.run)
          </el-button>
          <div v-if="selectedFileName" class="file-info">
            Selected: {{ selectedFileName }}
          </div>
        </el-form-item>

        <!-- Progress Section -->
        <div v-if="progressMessage || progressPercentage > 0" class="progress-section">
          <div v-if="progressMessage" class="progress-message">
            {{ progressMessage }}
          </div>
          <el-progress
            v-if="progressPercentage > 0"
            :percentage="progressPercentage"
            :status="progressStatus"
            :stroke-width="8"
            :show-text="true"
            class="progress-bar"
          />
          <div v-if="progressDetail" class="progress-detail">
            {{ progressDetail }}
          </div>
        </div>
      </el-form>
    </template>

    <template #dialog-footer>
      <el-button @click="handleClose" :disabled="isSubmitting">Cancel</el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
        :loading="isSubmitting"
        :disabled="!selectedFilePath || (form.authMode === 'key' && !selectedKeyPath) || (form.authMode === 'password' && !form.password)"
      >
        Submit
      </el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { InitProjectForm } from '@/types/ssh'
import FormDialog from '@/components/dialog/FormDialog.vue'

const formDialogRef = ref<InstanceType<typeof FormDialog>>()
const formRef = ref<FormInstance>()

const form = reactive<InitProjectForm>({
  host: '',
  port: 22,
  username: '',
  password: '',
  authMode: 'password',
  privateKey: null,
  file: null,
})

const selectedFilePath = ref<string | null>(null)
const selectedKeyPath = ref<string | null>(null)
const selectedFileName = ref<string>('')
const isSubmitting = ref(false)
const progressMessage = ref('')
const progressPercentage = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | ''>('')
const progressDetail = ref('')

const formRules = computed<FormRules<InitProjectForm>>(() => {
  const rules: FormRules<InitProjectForm> = {
    host: [
      { required: true, message: 'Please enter IP address', trigger: 'blur' },
      {
        pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
        message: 'Please enter a valid IP address',
        trigger: 'blur',
      },
    ],
    port: [
      { required: true, message: 'Please enter port number', trigger: 'blur' },
      { type: 'number', min: 1, max: 65535, message: 'Port must be between 1 and 65535', trigger: 'blur' },
    ],
    username: [{ required: true, message: 'Please enter username', trigger: 'blur' }],
    password: form.authMode === 'password' 
      ? [{ required: true, message: 'Please enter password', trigger: 'blur' }]
      : [],
  }

  if (form.authMode === 'password') {
    rules.password = [{ required: true, message: 'Please enter password', trigger: 'blur' }]
  }
  return rules
})

const handleSelectFile = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Installation Package',
        extensions: ['run']
      }]
    })
    
    if (selected && typeof selected === 'string') {
      const lowerSelected = selected.toLowerCase()
      if (!lowerSelected.endsWith('.run')) {
        ElMessage.error('Invalid file type.')
        return
      }
      selectedFilePath.value = selected
      selectedFileName.value = selected.split(/[/\\]/).pop() || ''
      form.file = { name: selectedFileName.value } as any // For validation
    }
  } catch (error: any) {
    ElMessage.error(`Failed to select file: ${error}`)
  }
}

const handleSelectKeyFile = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Private Key',
        extensions: ['pem', 'key']
      }]
    })
    
    if (selected && typeof selected === 'string') {
      const lowerSelected = selected.toLowerCase()
      if (!lowerSelected.endsWith('.pem') && !lowerSelected.endsWith('.key')) {
        ElMessage.error('Invalid key file type.')
        return
      }
      selectedKeyPath.value = selected
      form.privateKey = { name: selected.split(/[/\\]/).pop() } as any // For validation
    }
  } catch (error: any) {
    ElMessage.error(`Failed to select key file: ${error}`)
  }
}

const resetProgress = () => {
  progressMessage.value = ''
  progressPercentage.value = 0
  progressStatus.value = ''
  progressDetail.value = ''
}

const escapeShellArg = (value: string) => {
  // Safe single-quote escaping for POSIX shells.
  return `'${value.replace(/'/g, `'\\''`)}'`
}

const handleClose = () => {
  if (isSubmitting.value) return
  if (formDialogRef.value) {
    formDialogRef.value.dialogVisible = false
  }
  // Reset form
  if (formRef.value) {
    formRef.value.resetFields()
  }
  selectedFilePath.value = null
  selectedKeyPath.value = null
  selectedFileName.value = ''
  form.file = null
  form.privateKey = null
  form.authMode = 'password'
  resetProgress()
}

const handleBeforeClose = (done: () => void) => {
  if (isSubmitting.value) {
    ElMessage.warning('Process is running. Please do not close the dialog.')
    return
  }
  done()
}

const handleSubmit = async () => {
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

    if (form.authMode === 'key' && !selectedKeyPath.value) {
      ElMessage.warning('Please select a private key file')
      return
    }
    if (form.authMode === 'password' && !form.password) {
      ElMessage.warning('Please enter password')
      return
    }

    isSubmitting.value = true
    progressStatus.value = '' // Reset status
    resetProgress()

    // 1. Test SSH connection
    try {
      progressMessage.value = 'Testing SSH connection...'
      progressPercentage.value = form.authMode === 'key' ? 10 : 10
      progressDetail.value = 'Connecting to server...'
      
      // Trim whitespace from username and password
      const trimmedUsername = form.username.trim()
      const trimmedPassword = form.authMode === 'password' ? form.password.trim() : null
      
      const connected = await invoke<boolean>('test_ssh_connection', {
        host: form.host.trim(),
        port: form.port,
        username: trimmedUsername,
        password: trimmedPassword,
        privateKeyPath: form.authMode === 'key' ? selectedKeyPath.value : null,
        authMode: form.authMode,
      })

      if (!connected) {
        progressStatus.value = 'exception'
        ElMessage.error('SSH connection failed')
        return
      }
      progressPercentage.value = form.authMode === 'key' ? 15 : 15
      progressDetail.value = 'SSH connection established'
    } catch (error: any) {
      progressStatus.value = 'exception'
      ElMessage.error(`SSH connection failed: ${error}`)
      return
    }

    // 2. Upload file via SCP (directly from file path, no content transfer needed)
    try {
      progressMessage.value = 'Uploading file via SCP...'
      progressPercentage.value = form.authMode === 'key' ? 20 : 20
      progressDetail.value = 'Establishing SCP connection...'
      
      const remotePath = `~/${selectedFileName.value}`
      
      await invoke<string>('upload_file_via_scp', {
        localPath: selectedFilePath.value!,
        host: form.host.trim(),
        port: form.port,
        username: form.username.trim(),
        password: form.authMode === 'password' ? form.password.trim() : null,
        privateKeyPath: form.authMode === 'key' ? selectedKeyPath.value : null,
        authMode: form.authMode,
        remotePath,
      })
      
      progressPercentage.value = form.authMode === 'key' ? 70 : 70
      progressDetail.value = 'File uploaded successfully via SCP'
    } catch (error: any) {
      progressStatus.value = 'exception'
      ElMessage.error(`File upload failed: ${error}`)
      return
    }

    const remoteFilename = escapeShellArg(selectedFileName.value)

    // 3. Execute chmod command
    try {
      progressMessage.value = 'Setting file execution permissions...'
      progressPercentage.value = form.authMode === 'key' ? 75 : 75
      progressDetail.value = 'Running chmod command...'
      
      await invoke<string>('execute_ssh_command', {
        host: form.host.trim(),
        port: form.port,
        username: form.username.trim(),
        password: form.authMode === 'password' ? form.password.trim() : null,
        privateKeyPath: form.authMode === 'key' ? selectedKeyPath.value : null,
        authMode: form.authMode,
        command: `chmod a+x ~/${remoteFilename}`,
      })
      
      progressPercentage.value = form.authMode === 'key' ? 85 : 85
      progressDetail.value = 'Permissions set successfully'
    } catch (error: any) {
      progressStatus.value = 'exception'
      ElMessage.error(`Failed to set execution permissions: ${error}`)
      return
    }

    // 4. Execute installation command
    try {
      progressMessage.value = 'Executing installation command...'
      progressPercentage.value = form.authMode === 'key' ? 90 : 90
      progressDetail.value = 'Running installation...'
      
      const result = await invoke<string>('execute_ssh_command', {
        host: form.host.trim(),
        port: form.port,
        username: form.username.trim(),
        password: form.authMode === 'password' ? form.password.trim() : null,
        privateKeyPath: form.authMode === 'key' ? selectedKeyPath.value : null,
        authMode: form.authMode,
        command: `cd ~ && ./${remoteFilename} -- --auto`,
      })
      
      progressPercentage.value = 100
      progressStatus.value = 'success'
      progressDetail.value = 'Installation completed'
      ElMessage.success('Installation successful!')
      if (result) {
        console.log('Installation output:', result)
      }
    } catch (error: any) {
      progressStatus.value = 'exception'
      ElMessage.error(`Installation failed: ${error}`)
      return
    }

    // Success, close dialog
    handleClose()
  } catch (error: any) {
    console.error('Submit failed:', error)
    ElMessage.error(`Operation failed: ${error}`)
  } finally {
    isSubmitting.value = false
    if (progressStatus.value !== 'success' && progressStatus.value !== 'exception') {
      resetProgress()
    }
  }
}

// Expose methods for parent component to call
defineExpose({
  open: () => {
    if (formDialogRef.value) {
      formDialogRef.value.dialogVisible = true
    }
  },
  close: handleClose,
})
</script>

<style lang="scss" scoped>
.init-project-dialog {
  .form-row {
    display: flex;
    gap: 20px;
    .ip-field {
      flex: 3;
    }
    .port-field {
      flex: 2;
      margin-bottom: 20px;
    }
  }
  .file-info {
    margin-top: 8px;
    font-size: 12px;
    color: $text-color-secondary;
  }

  .progress-section {
    margin-top: 16px;
    padding: 12px;
    background: $bg-color-input;
    border-radius: $border-radius-small;
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

:deep(.el-form-item) {
  margin-bottom: 20px;
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
