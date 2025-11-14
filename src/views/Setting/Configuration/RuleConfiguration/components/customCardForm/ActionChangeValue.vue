<template>
  <div class="voltage-class action-change-value-form">
    <el-form ref="formRef" label-width="120px" :model="cardData">
      <!-- 基础设置 -->
      <div class="section">
        <div class="section__header">
          <span class="section__title">Basic Settings</span>
        </div>
        <div class="section__body" style="flex-direction: row">
          <el-form-item label="label" prop="label" style="margin-bottom: 0">
            <el-input v-model="cardData.label" />
          </el-form-item>
          <el-form-item label="description" prop="description" style="margin-bottom: 0">
            <el-input v-model="cardData.description" style="width: 348px !important" />
          </el-form-item>
        </div>
      </div>

      <!-- 数据设置（config.rule） -->
      <div class="section">
        <div class="section__header">
          <span class="section__title">Data Settings</span>
          <el-button class="section__add-btn" type="primary" link @click="addRule">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <div class="section__body data">
          <div v-for="(row, idx) in cardData.config.rule" :key="`row-${idx}`" class="data-row">
            <el-select
              v-model="row.protocol"
              class="data-row__select"
              placeholder="protocol"
              filterable
            >
              <el-option v-for="opt in protocolOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
            <el-select
              v-model="row.instance"
              class="data-row__select"
              placeholder="instance"
              filterable
            >
              <el-option v-for="opt in instanceOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
            <el-select v-model="row.point" class="data-row__select" placeholder="point" filterable>
              <el-option v-for="opt in pointOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
            <el-input v-model="row.value" class="data-row__value" placeholder="value" />
            <el-button
              class="data-row__delete"
              style="width: 38px !important"
              type="warning"
              @click="removeRule(idx)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'

const formRef = ref()

const props = defineProps<{ cardData: any }>()
const cardData = ref<any>({})
watch(
  () => props.cardData,
  (v) => {
    if (!v) return
    cardData.value = v
    cardData.value.config = cardData.value.config || {}
    if (!Array.isArray(cardData.value.config.rule)) {
      cardData.value.config.rule = []
    }
  },
  { immediate: true },
)

// 选项占位
const protocolOptions = ref<string[]>(['modsrv', 'opcua', 'mqtt'])
const instanceOptions = ref<string[]>(['pv1', 'ess1', 'dg1'])
const pointOptions = ref<string[]>(['p1', 'p2', 'p3'])

function addRule() {
  cardData.value.config.rule.push({ protocol: '', instance: '', point: '', value: '' })
}

function removeRule(idx: number) {
  cardData.value.config.rule.splice(idx, 1)
}

function validateForm(): Promise<{ valid: boolean; data: any }> {
  return new Promise((resolve) => {
    const form = formRef.value as any
    if (form && typeof form.validate === 'function') {
      form.validate((valid: boolean) => {
        resolve({ valid: !!valid, data: cardData.value })
      })
    } else {
      resolve({ valid: true, data: cardData.value })
    }
  })
}

defineExpose({ validateForm })
</script>

<style lang="scss" scoped>
.voltage-class {
  .action-change-value-form {
    .section {
      margin-bottom: 24px;

      .section__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        .section__title {
          font-weight: 700;
          color: #fff;
          font-size: 18px;
        }

        .section__add-btn {
          padding: 0 4px;
        }
      }

      .section__body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        &.data {
          max-height: 250px;
          overflow-y: auto;
        }
      }
    }

    .data-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .data-row__select {
      width: 200px;
    }
    .data-row__value {
      width: 200px;
    }
    .data-row__delete {
      padding: 0 4px;
    }
  }
}
</style>
