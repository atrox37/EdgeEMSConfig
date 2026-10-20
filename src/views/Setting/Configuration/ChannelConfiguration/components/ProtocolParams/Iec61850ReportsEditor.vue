<template>
  <div class="iec61850-reports">
    <div class="iec61850-reports__header">
      <div>
        <div class="iec61850-reports__heading">
          <span class="iec61850-reports__title">Report Subscriptions</span>
          <el-tooltip
            content="Subscribe to RCB reports for event-driven updates. With no subscription, points continue to be polled."
            placement="top"
            :show-after="300"
          >
            <AppIcon name="i-tabler-info-circle" class="iec61850-reports__info" />
          </el-tooltip>
          <span class="iec61850-reports__optional">Optional</span>
        </div>
      </div>
    </div>

    <p v-if="!reports.length" class="iec61850-reports__empty">
      {{ isEditing ? 'No report subscriptions configured.' : '-' }}
    </p>

    <div
      v-for="(report, index) in reports"
      :key="index"
      class="iec61850-reports__card"
    >
      <div class="iec61850-reports__card-header">
        <span class="iec61850-reports__card-title">Subscription {{ index + 1 }}</span>
        <el-button
          v-if="isEditing"
          class="iec61850-reports__remove"
          type="danger"
          circle
          plain
          title="Remove subscription"
          aria-label="Remove subscription"
          @click="removeReport(index)"
        >
          <AppIcon name="i-tabler-trash" />
        </el-button>
      </div>

      <div class="iec61850-reports__fields">
        <el-form-item
          label="RCB Reference:"
          class="iec61850-reports__item"
          :prop="`parameters.reports.${index}.rcb_ref`"
          :rules="rcbRefRules"
        >
          <span v-if="!isEditing" class="iec61850-reports__text">{{ report.rcb_ref || '-' }}</span>
          <el-input
            v-else
            v-model="report.rcb_ref"
            placeholder="Please enter RCB reference"
          />
        </el-form-item>

        <el-form-item
          label="Report ID:"
          class="iec61850-reports__item"
          :prop="`parameters.reports.${index}.rpt_id`"
          :rules="rptIdRules(index)"
        >
          <span v-if="!isEditing" class="iec61850-reports__text">{{ report.rpt_id || '-' }}</span>
          <el-input
            v-else
            v-model="report.rpt_id"
            placeholder="Please enter report ID"
          />
        </el-form-item>

        <el-form-item
          label="Dataset Members:"
          class="iec61850-reports__item iec61850-reports__item--full"
        >
          <span v-if="!isEditing" class="iec61850-reports__text">
            {{ displayMembers(report.dataset_members) }}
          </span>
          <el-input-tag
            v-else
            v-model="report.dataset_members"
            class="iec61850-reports__members"
            placeholder="Please enter dataset member"
          />
        </el-form-item>
      </div>
    </div>

    <el-button
      v-if="isEditing"
      class="iec61850-reports__add"
      type="primary"
      title="Add subscription"
      aria-label="Add subscription"
      @click="addReport"
    >
      <AppIcon name="i-tabler-plus" class="iec61850-reports__add-icon" />
    </el-button>

    <p v-if="reportsWarning" class="iec61850-reports__warning">{{ reportsWarning }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Iec61850ReportConfig } from '@/types/channelConfiguration'
import {
  isEmptyReportEntry,
  validateIec61850RcbRef,
  validateIec61850Reports,
} from '@/validators/iec61850'

interface Props {
  reports: Iec61850ReportConfig[]
  isEditing: boolean
  mappingAddresses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  mappingAddresses: () => [],
})

const reportsWarning = computed(() => {
  const { warnings } = validateIec61850Reports(props.reports, props.mappingAddresses)
  return warnings[0] || ''
})

const rcbRefRules = [
  {
    validator: (_: unknown, value: unknown, callback: (err?: Error) => void) => {
      const err = validateIec61850RcbRef(value)
      if (err && err !== 'required') callback(new Error(err))
      else callback()
    },
    trigger: 'blur',
  },
]

const rptIdRules = (index: number) => [
  {
    validator: (_: unknown, value: unknown, callback: (err?: Error) => void) => {
      const current = props.reports[index]
      if (!current || isEmptyReportEntry(current)) {
        callback()
        return
      }
      const configuredReports = props.reports.filter((report) => !isEmptyReportEntry(report))
      if (configuredReports.length < 2) {
        callback()
        return
      }
      const rptId = String(value ?? '').trim()
      if (!rptId) {
        callback(new Error('Report ID is required when multiple RCBs are configured'))
        return
      }
      const duplicate = props.reports.some(
        (report, reportIndex) =>
          reportIndex !== index &&
          String(report.rpt_id ?? '').trim() === rptId &&
          String(report.rpt_id ?? '').trim() !== '',
      )
      if (duplicate) {
        callback(new Error('Report ID must be unique'))
        return
      }
      callback()
    },
    trigger: 'blur',
  },
]

const displayMembers = (members: string[] | undefined) => {
  if (!members?.length) return '-'
  return members.join(', ')
}

const addReport = () => {
  props.reports.push({
    rcb_ref: '',
    rpt_id: '',
    dataset_members: [],
  })
}

const removeReport = (index: number) => {
  props.reports.splice(index, 1)
}

watch(
  () => props.isEditing,
  (isEditing) => {
    if (isEditing && props.reports.length === 0) addReport()
  },
  { immediate: true },
)

</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.iec61850-reports {
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid $border-color-gray-light;

  .iec61850-reports__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;
  }

  .iec61850-reports__heading {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  .iec61850-reports__title {
    font-weight: 600;
    color: $text-color-primary;
  }

  .iec61850-reports__optional {
    margin-left: $spacing-xs;
    padding: 1px $spacing-sm;
    border-radius: $border-radius-round;
    color: $text-color-secondary;
    background: $bg-color-overlay;
    font-size: $font-size-extra-small;
  }

  .iec61850-reports__info {
    width: 15px;
    height: 15px;
    color: $text-color-secondary;
    cursor: help;
  }

  .iec61850-reports__empty {
    color: $text-color-secondary;
    margin: 0 0 $spacing-sm;
    font-size: $font-size-small;
  }

  .iec61850-reports__card {
    margin-bottom: $spacing-md;
    border: 1px solid $border-color-gray-light;
    border-radius: $border-radius-medium;
    overflow: hidden;
    background: $bg-color-dark-1;
  }

  .iec61850-reports__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: $height-lg;
    padding: $spacing-xs $spacing-md;
    border-bottom: 1px solid $border-color-gray-light;
    background: $bg-color-page;
  }

  .iec61850-reports__card-title {
    font-weight: 600;
    color: $text-color-primary;
  }

  .iec61850-reports__remove {
    width: $height-sm;
    height: $height-sm;
    min-height: $height-sm;
    padding: 0;

    :deep(svg) {
      width: 14px;
      height: 14px;
    }
  }

  .iec61850-reports__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: $spacing-md;
    row-gap: $spacing-md;
    padding: $spacing-sm $spacing-md $spacing-md;
  }

  .iec61850-reports__item {
    width: 100% !important;
    margin: 0 !important;
    display: flex;
    flex-direction: row;
    align-items: flex-start;

    :deep(.el-form-item__label) {
      width: 143px !important;
    }

    :deep(.el-form-item__content) {
      flex: 1;
      min-width: 0;
      margin-left: 0 !important;
      display: block;
      line-height: normal;
    }

  }

  .iec61850-reports__item.iec61850-reports__item--full {
    grid-column: 1 / -1;
  }

  .iec61850-reports__members {
    width: 100%;
  }

  .iec61850-reports__text {
    color: $text-color-regular;
    word-break: break-all;
  }

  .iec61850-reports__warning {
    margin: $spacing-xs 0 0;
    color: $warning-color;
    font-size: $font-size-small;
  }

  .iec61850-reports__add {
    width: 32px !important;
    min-width: 32px !important;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;

    .iec61850-reports__add-icon {
      width: 16px;
      height: 16px;
    }
  }

  .iec61850-reports__add:hover,
  .iec61850-reports__add:focus {
    border-color: $primary-color-hover;
  }
}

</style>
