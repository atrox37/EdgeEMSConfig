<template>
  <div class="system-network">
    <div class="system-network__header">
      <h2 class="system-network__title">Network</h2>
      <p class="system-network__desc">
        Configure LAN1-LAN4 connection profiles, switch between DHCP and static addressing, and apply changes in one place.
      </p>
    </div>

    <div class="system-network__panel">
      <div class="system-network__body">
        <div class="system-network__left">
          <el-card class="system-network__card">
            <div class="system-network__left-panel">
            <el-form ref="formRef" :model="form" :rules="rules" label-width="170px" class="system-network__form">
              <div class="system-network__fixed-top">
                <el-tabs
                  v-model="lanTab"
                  class="system-network__lan-tabs"
                  :stretch="false"
                  @tab-change="handleLanTabChange"
                >
                  <el-tab-pane
                    v-for="item in lanTabOptions"
                    :key="item.name"
                    :label="item.label"
                    :name="item.name"
                    :disabled="loading || saving || applying"
                  />
                </el-tabs>

                <div class="system-network__mode-row">
                  <el-form-item label="IP Acquire Mode:" prop="dhcp" required label-width="186px">
                    <el-radio-group v-model="form.dhcp" :disabled="loading">
                      <el-radio :label="true">Auto(DHCP)</el-radio>
                      <el-radio :label="false">Static</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </div>
              </div>

              <div class="system-network__scroll-content">
                <LightCollapseCard
                  v-model="ipConfigurationOpen"
                  title="IP Configuration"
                  :collapsible="false"
                  class="system-network__section-card"
                >
                  <el-form-item :required="!form.dhcp" label="IP Address:" prop="ip">
                    <el-input v-model="form.ip" :disabled="loading || form.dhcp" placeholder="IP address" />
                  </el-form-item>

                  <el-form-item :required="!form.dhcp" label="Subnet Mask:" prop="subnet_mask">
                    <el-input
                      v-model="form.subnet_mask"
                      :disabled="loading || form.dhcp"
                      placeholder="Subnet mask"
                    />
                  </el-form-item>

                  <el-form-item label="Gateway:" prop="gateway">
                    <el-input v-model="form.gateway" :disabled="loading || form.dhcp" placeholder="Gateway" />
                  </el-form-item>
                </LightCollapseCard>

                <LightCollapseCard
                  v-model="dnsConfigurationOpen"
                  title="DNS Configuration"
                  :collapsible="false"
                  class="system-network__section-card"
                >
                  <el-form-item label="Primary DNS:" prop="dns1">
                    <el-input v-model="form.dns1" :disabled="loading || form.dhcp" placeholder="Primary DNS" />
                  </el-form-item>

                  <el-form-item label="Secondary DNS:" prop="dns2">
                    <el-input v-model="form.dns2" :disabled="loading || form.dhcp" placeholder="Secondary DNS" />
                  </el-form-item>
                </LightCollapseCard>
              </div>
            </el-form>

            <div class="system-network__actions">
              <el-button type="primary" :loading="saving" :disabled="loading || applying" @click="handleSave">
                Save
              </el-button>
              <el-button type="primary" :loading="applying" :disabled="loading || saving" @click="handleApply">
                Apply
              </el-button>
            </div>
            </div>
          </el-card>
        </div>

        <div class="system-network__right">
          <ConfigTipsCard
            title="Configuration Tips"
            :items="tipsItems"
            note-title="Note"
            note-text="Click Save to store your changes first, then click Apply to activate them."
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { LanValue } from '@/types/systemConfig'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
import ConfigTipsCard from '@/components/common/ConfigTipsCard.vue'
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
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const applying = ref(false)
const lanTab = ref('1')
const lanTabOptions = [
  { label: 'LAN1', name: '1' },
  { label: 'LAN2', name: '2' },
  { label: 'LAN3', name: '3' },
  { label: 'LAN4', name: '4' },
]
const ipConfigurationOpen = ref(true)
const dnsConfigurationOpen = ref(true)
const tipsItems = [
  { label: 'DHCP', text: 'Automatically obtains IP settings from your router.' },
  { label: 'Static', text: 'Manually configure IP for fixed network setups.' },
]

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
  return parts.every((part) => {
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
    if (!isValidIp(value)) return callback(new Error(`Please input valid ${fieldLabel}, e.g. ${example}`))
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
  subnet_mask: [
    { validator: createRequiredIpWhenStaticValidator('subnet mask', '255.255.255.0'), trigger: 'blur' },
  ],
  gateway: [{ validator: validateOptionalIp, trigger: 'blur' }],
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

onMounted(async () => {
  await loadLanConfig(form.value.lan)
})

onUnmounted(() => {
  cancelNetworkGetRequests()
  cancelNetworkUpdateRequests()
  cancelNetworkApplyRequests()
})
</script>

<style scoped lang="scss">
.system-network {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-network__header {
  margin-bottom: 24px;
}

.system-network__title {
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  margin: 0;
}

.system-network__desc {
  margin: 8px 0 0;
  font-size: $font-size-small;
  color: $text-color-secondary;
  line-height: 1.6;
}

.system-network__panel {
  flex: 1;
  min-height: 0;
  border: $border-width-base solid $border-color-base;
  border-radius: $border-radius-base;
  background: $bg-color-overlay;
  box-shadow: $box-shadow-base;
}

.system-network__body {
  height: 100%;
  display: flex;
  gap: 20px;
  padding: 20px;
}

.system-network__left {
  flex: 1;
  min-width: 0;
}

.system-network__card {
  height: 100%;
}

.system-network__card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
}

.system-network__left-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-network__form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-network__fixed-top {
  flex-shrink: 0;
  padding-right: 4px;
}

.system-network__mode-row {
  margin-bottom: 6px;
}

.system-network__scroll-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
}

.system-network__section-card {
  margin-bottom: 14px;
}

.system-network__actions {
  border-top: $border-width-base solid $border-color-base;
  padding-top: 12px;
  margin-top: 12px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.system-network__right {
  width: 320px;
  flex-shrink: 0;
}






::deep(.el-select) {
  width: 100%;
}
</style>
