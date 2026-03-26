<template>
  <FormDialog ref="dialogRef" title="Network Config" width="720px" :before-close="handleDialogBeforeClose">
    <template #dialog-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="170px">
        <el-tabs v-model="lanTab" class="network-lan-tabs" @tab-change="handleLanTabChange">
          <el-tab-pane label="LAN1" name="1" :disabled="loading || saving || applying" />
          <el-tab-pane label="LAN2" name="2" :disabled="loading || saving || applying" />
          <el-tab-pane label="LAN3" name="3" :disabled="loading || saving || applying" />
          <el-tab-pane label="LAN4" name="4" :disabled="loading || saving || applying" />
        </el-tabs>

        <el-form-item label="IP Acquire Mode:" prop="dhcp" required>
          <el-radio-group v-model="form.dhcp" :disabled="loading">
            <el-radio :label="true">Auto(DHCP)</el-radio>
            <el-radio :label="false">Static</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="IP Address:" prop="ip">
          <el-input
            v-model="form.ip"
            :disabled="loading || form.dhcp"
            placeholder="Please input IP address, e.g. 192.168.1.100"
          />
        </el-form-item>

        <el-form-item label="Subnet Mask:" prop="subnet_mask">
          <el-input
            v-model="form.subnet_mask"
            :disabled="loading || form.dhcp"
            placeholder="Please input subnet mask, e.g. 255.255.255.0"
          />
        </el-form-item>

        <el-form-item label="Gateway:" prop="gateway">
          <el-input
            v-model="form.gateway"
            :disabled="loading || form.dhcp"
            placeholder="Please input gateway, e.g. 192.168.1.1"
          />
        </el-form-item>

        <el-form-item label="Primary DNS:" prop="dns1">
          <el-input
            v-model="form.dns1"
            :disabled="loading || form.dhcp"
            placeholder="Please input primary DNS, e.g. 8.8.8.8"
          />
        </el-form-item>

        <el-form-item label="Secondary DNS:" prop="dns2">
          <el-input
            v-model="form.dns2"
            :disabled="loading || form.dhcp"
            placeholder="Please input secondary DNS, e.g. 8.8.4.4"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #dialog-footer>
      <el-button :disabled="applying" @click="close">Cancel</el-button>
      <el-button type="primary" :loading="saving" :disabled="loading || applying" @click="handleSave">Save</el-button>
      <el-button type="warning" :loading="applying" :disabled="loading || saving" @click="handleApply">Apply</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { LanValue } from '@/types/systemConfig'
import FormDialog from '@/components/dialog/FormDialog.vue'
import {
  applyNetworkConfig,
  cancelNetworkApplyRequests,
  cancelNetworkGetRequests,
  cancelNetworkUpdateRequests,
  getNetworkConfig,
  updateNetworkConfig,
} from '@/api/systemConfig'

const router = useRouter()
const userStore = useUserStore()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const applying = ref(false)

const lanTab = ref('1')

const form = ref({
  lan: 1 as LanValue,
  dhcp: true,
  ip: '',
  subnet_mask: '',
  gateway: '',
  dns1: '',
  dns2: '',
})

const isValidIp = (value: string) => {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every(part => {
    if (part === '' || !/^\d+$/.test(part)) return false
    const num = Number(part)
    return num >= 0 && num <= 255
  })
}

const createRequiredIpWhenStaticValidator =
  (fieldLabel: string, example: string) =>
  (_rule: any, value: string, callback: (error?: Error) => void) => {
    if (form.value.dhcp) return callback()
    if (!value) return callback(new Error(`Please input ${fieldLabel}, e.g. ${example}`))
    if (!isValidIp(value))
      return callback(new Error(`Please input valid ${fieldLabel}, e.g. ${example}`))
    callback()
  }

const validateOptionalIp = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (form.value.dhcp) return callback()
  if (!value) return callback()
  if (!isValidIp(value)) return callback(new Error('Please input valid IPv4 address, e.g. 8.8.8.8'))
  callback()
}

const rules: FormRules = {
  dhcp: [{ required: true, message: 'IP mode is required', trigger: 'change' }],
  ip: [{ validator: createRequiredIpWhenStaticValidator('IP address', '192.168.1.100'), trigger: 'blur' }],
  subnet_mask: [{ validator: createRequiredIpWhenStaticValidator('subnet mask', '255.255.255.0'), trigger: 'blur' }],
  gateway: [{ validator: createRequiredIpWhenStaticValidator('gateway', '192.168.1.1'), trigger: 'blur' }],
  dns1: [{ validator: validateOptionalIp, trigger: 'blur' }],
  dns2: [{ validator: validateOptionalIp, trigger: 'blur' }],
}

const loadLanConfig = async (lan: LanValue) => {
  cancelNetworkGetRequests()
  loading.value = true
  try {
    const res = await getNetworkConfig(lan)
    if (res.success) {
      form.value = {
        lan,
        dhcp: !!res.data?.dhcp,
        ip: String(res.data?.ip || ''),
        subnet_mask: String(res.data?.subnet_mask || ''),
        gateway: String(res.data?.gateway || ''),
        dns1: String(res.data?.dns1 || ''),
        dns2: String(res.data?.dns2 || ''),
      }
      lanTab.value = String(lan)
      formRef.value?.clearValidate()
    }
  } finally {
    loading.value = false
  }
}

const open = async () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = true
  await loadLanConfig(form.value.lan)
}

const close = () => {
  cancelNetworkGetRequests()
  cancelNetworkUpdateRequests()
  cancelNetworkApplyRequests()
  if (loading.value) loading.value = false
  if (dialogRef.value) dialogRef.value.dialogVisible = false
}

const handleDialogBeforeClose = (done: () => void) => {
  if (applying.value) return
  cancelNetworkGetRequests()
  cancelNetworkUpdateRequests()
  cancelNetworkApplyRequests()
  if (loading.value) loading.value = false
  done()
}

const handleLanTabChange = async (name: string | number) => {
  cancelNetworkGetRequests()
  const lan = Number(name) as LanValue
  form.value.lan = lan
  await loadLanConfig(lan)
}

const saveConfigOnly = async () => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return false

  saving.value = true
  try {
    cancelNetworkUpdateRequests()
    const res = await updateNetworkConfig({
      lan: form.value.lan,
      dhcp: form.value.dhcp,
      ip: form.value.ip,
      subnet_mask: form.value.subnet_mask,
      gateway: form.value.gateway,
      dns1: form.value.dns1,
      dns2: form.value.dns2,
    })
    if (!res.success) return false
    ElMessage.success('Network configuration saved')
    return true
  } finally {
    saving.value = false
  }
}

const applyAndGotoLogin = async () => {
  applying.value = true
  try {
    cancelNetworkApplyRequests()
    const res = await applyNetworkConfig()
    if (!res.success) return
    ElMessage.success('Network configuration applied')
    await userStore.clearUserData()
    close()
    await router.push('/login')
  } finally {
    applying.value = false
  }
}

const handleSave = async () => {
  const saved = await saveConfigOnly()
  if (!saved) return
  try {
    await ElMessageBox.confirm('Save successful. Apply now?', 'Confirm', {
      type: 'warning',
      confirmButtonText: 'Apply',
      cancelButtonText: 'Later',
    })
  } catch {
    return
  }
  await applyAndGotoLogin()
}

const handleApply = async () => {
  const saved = await saveConfigOnly()
  if (!saved) return
  await applyAndGotoLogin()
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
:deep(.el-select) {
  width: 100%;
}

.network-lan-tabs {
  margin-bottom: 12px;
}
</style>
