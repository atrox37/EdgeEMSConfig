<script setup lang="ts">

import { computed } from 'vue'

import { POINT_TABLE_POPPER } from '@/constants/pointTable'



export type PointTablePublishCellKind =

  | 'channel-binary'

  | 'channel-numeric'

  | 'device-action'

  | 'empty'



const props = defineProps<{

  kind: PointTablePublishCellKind

  modelValue?: number | null

}>()



const emit = defineEmits<{

  'update:modelValue': [value: number | null | undefined]

  change: []

}>()



const publishValue = computed({

  get: () => props.modelValue,

  set: (value: number | null | undefined) => {

    emit('update:modelValue', value)

    emit('change')

  },

})

</script>



<template>

  <el-select

    v-if="kind === 'channel-binary'"

    v-model="publishValue"

    filterable

    placeholder="Select"

    :fit-input-width="true"

    :popper-class="POINT_TABLE_POPPER.publish"

    clearable

  >

    <el-option label="1" :value="1" />

    <el-option label="0" :value="0" />

  </el-select>

  <el-input-number

    v-else-if="kind === 'channel-numeric' || kind === 'device-action'"

    v-model="publishValue"

    :controls="false"

    align="left"

  />

  <span v-else>-</span>

</template>


