<template>
  <el-button :type="type" class="icon-button" :class="customClass" :loading="loading" @click="handleClick">
    <AppIcon v-if="isIconifyName" :name="icon" className="icon-button__icon" :class="iconClass" />
    <img v-else :src="icon" class="icon-button__icon" :class="iconClass" />
    {{ text }}
  </el-button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

interface Props {
  icon: string
  text: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  customClass?: string
  iconClass?: string
  loading?: boolean
}

interface Emits {
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  customClass: '',
  iconClass: 'icon-button__icon',
  loading: false,
})

const emit = defineEmits<Emits>()

const isIconifyName = computed(() => String(props.icon || '').startsWith('i-'))

const handleClick = () => {
  emit('click')
}
</script>

<style scoped lang="scss">

.voltage-class {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .icon-button__icon {
    width: $font-size-base;
    height: $font-size-base;
    margin-right: $spacing-sm;
  }
}
</style>
