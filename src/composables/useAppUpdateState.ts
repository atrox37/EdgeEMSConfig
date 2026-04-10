import { ref } from 'vue'

const isAppUpdating = ref(false)

export function useAppUpdateState() {
  return { isAppUpdating }
}
