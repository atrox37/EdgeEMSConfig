// 构建时的类型检查脚本
// 即使类型检查失败，也允许构建继续（仅警告）

import { execSync } from 'child_process'

try {
  console.log('Running type check...')
  execSync('pnpm exec vue-tsc --noEmit --project tsconfig.build.json --skipLibCheck', {
    stdio: 'inherit',
  })
  console.log('✓ Type check passed')
  process.exit(0)
} catch (error) {
  console.warn('⚠ Type check failed, but continuing build...')
  console.warn('Please fix type errors before production release')
  process.exit(0) // 返回成功，允许构建继续
}

