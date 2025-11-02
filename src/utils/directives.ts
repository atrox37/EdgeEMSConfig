import { type DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'
/**
 * 自定义指令 v-permission
 * 用法：<button v-permission="['Admin', 'editor']">仅管理员和编辑可见</button>
 * 只有当前用户角色在传入的角色数组中时，元素才会显示，否则会被移除
 */
const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string[]>) {
    const allowedRoles = binding.value
    const userStore = useUserStore()
    const userRole = userStore.roles
    if (!userRole || !allowedRoles.includes(userRole[0])) {
      // 如果没有权限，移除元素
      el.parentNode && el.parentNode.removeChild(el)
    }
  },
}

export { permissionDirective }
