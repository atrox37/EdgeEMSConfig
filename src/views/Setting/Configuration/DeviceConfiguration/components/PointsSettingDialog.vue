<template>
  <FormDialog ref="dialogRef" title="Setting" width="6rem" @close="close">
    <template #dialog-body>
      <div class="voltage-class dc-points-dialog__setting">
        <el-form label-width="1.2rem">
          <el-form-item label="Channel Name">
            <el-select
              v-model="settingForm.channel_id"
              placeholder="Channel Name"
              @change="onChannelIdChange"
            >
              <el-option v-for="n in _channelNameOptions" :key="n" :label="n" :value="n" />
            </el-select>
          </el-form-item>
          <el-form-item label="Channel Type">
            <el-select
              v-model="settingForm.channel_type"
              placeholder="Channel Type"
              :disabled="!canChooseType"
              @change="onChannelTypeChange"
            >
              <el-option
                v-for="t in props.pointType === 'measurement'
                  ? MeasurementTypeOption
                  : ActionTypeOption"
                :key="t.value"
                :label="t.label"
                :value="t.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Point">
            <el-select
              v-model="settingForm.channel_point_id"
              placeholder="Point"
              :disabled="!canChoosePoint"
            >
              <el-option v-for="p in _pointOptions" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item label="Enabled">
            <el-switch v-model="settingForm.enabled" />
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <el-button @click="close">Cancel</el-button>
      <el-button type="primary" @click="submit">Submit</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { InstancePointRouting } from '@/types/deviceConfiguration'
const props = defineProps<{
  pointType: 'measurement' | 'action' | 'property'
}>()

const dialogRef = ref()
const point_index = ref(0)
const settingForm = ref<InstancePointRouting>({
  channel_id: 0,
  channel_point_id: 0,
  channel_type: 'T',
  enabled: false,
})
const MeasurementTypeOption = ref([
  {
    value: 'T',
    label: 'Telemetry',
  },
  {
    value: 'S',
    label: 'Signal',
  },
])
const ActionTypeOption = ref([
  {
    value: 'C',
    label: 'Control',
  },
  {
    value: 'A',
    label: 'Adjustment',
  },
])
// 选项占位（后续可由父级或接口注入）
const _channelNameOptions = ref<number[]>([])
const _pointOptions = ref<number[]>([])
function open(pointId: number, routing?: InstancePointRouting) {
  point_index.value = pointId
  settingForm.value = routing
    ? routing
    : {
        channel_id: 0,
        channel_point_id: 0,
        channel_type: 'T',
        enabled: false,
      }
  dialogRef.value.dialogVisible = true
}

function close() {
  dialogRef.value.dialogVisible = false
}

function submit() {
  console.log(settingForm.value)
}

defineExpose({ open, close })

// 顺序联动：channel_id -> channel_type -> channel_point_id
const canChooseType = computed(() => !!settingForm.value.channel_id)
const canChoosePoint = computed(
  () => !!settingForm.value.channel_id && !!settingForm.value.channel_type,
)

function onChannelIdChange() {
  // 上层改变，清空下层
  settingForm.value.channel_type = undefined as any
  settingForm.value.channel_point_id = 0
}

function onChannelTypeChange() {
  // 中层改变，清空下层
  settingForm.value.channel_point_id = 0
}
</script>

<style scoped lang="scss">
.voltage-class {
  .dc-points-dialog__setting {
    min-height: 0.01rem;
  }
}
</style>
