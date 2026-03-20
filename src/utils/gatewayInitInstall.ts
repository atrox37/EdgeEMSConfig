import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'
import type { AuthMode } from '@/types/ssh'

export interface GatewayInitProgress {
  message?: string
  percentage?: number
  detail?: string
  status?: 'success' | 'exception' | 'warning' | ''
}

export interface RunGatewayInitInstallParams {
  host: string
  port: number
  username: string
  password: string | null
  authMode: AuthMode
  privateKeyPath: string | null
  localPackagePath: string
  packageFileName: string
  setProgress: (p: GatewayInitProgress) => void
}

function escapeShellArg(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * SSH test → SCP upload → chmod → run installer (.run -- --auto).
 * Used by the /setup wizard (and matches the former init dialog flow).
 */
export async function runGatewayInitInstall(
  params: RunGatewayInitInstallParams
): Promise<boolean> {
  const {
    host,
    port,
    username,
    password,
    authMode,
    privateKeyPath,
    localPackagePath,
    packageFileName,
    setProgress,
  } = params

  const hostTrim = host.trim()
  const userTrim = username.trim()
  const pwd = authMode === 'password' && password != null ? password.trim() : null
  const keyPath = authMode === 'key' ? privateKeyPath : null

  try {
    setProgress({
      message: 'Testing SSH connection...',
      percentage: 10,
      detail: 'Connecting to server...',
      status: '',
    })

    const connected = await invoke<boolean>('test_ssh_connection', {
      host: hostTrim,
      port,
      username: userTrim,
      password: pwd,
      privateKeyPath: keyPath,
      authMode,
    })

    if (!connected) {
      setProgress({
        status: 'exception',
        message: 'SSH connection failed',
        detail: 'Authentication failed. Please verify default SSH username/password in setup code.',
      })
      ElMessage.error('SSH connection failed')
      return false
    }
    setProgress({ percentage: 15, detail: 'SSH connection established' })
  } catch (error: unknown) {
    const detail = normalizeErrorMessage(error)
    setProgress({
      status: 'exception',
      message: 'SSH connection failed',
      detail,
    })
    ElMessage.error(`SSH connection failed: ${detail}`)
    return false
  }

  try {
    setProgress({
      message: 'Uploading file via SCP...',
      percentage: 20,
      detail: 'Establishing SCP connection...',
    })
    const remotePath = `~/${packageFileName}`
    await invoke<string>('upload_file_via_scp', {
      localPath: localPackagePath,
      host: hostTrim,
      port,
      username: userTrim,
      password: pwd,
      privateKeyPath: keyPath,
      authMode,
      remotePath,
    })
    setProgress({ percentage: 70, detail: 'File uploaded successfully via SCP' })
  } catch (error: unknown) {
    const detail = normalizeErrorMessage(error)
    setProgress({
      status: 'exception',
      message: 'File upload failed',
      detail,
    })
    ElMessage.error(`File upload failed: ${detail}`)
    return false
  }

  const remoteFilename = escapeShellArg(packageFileName)

  try {
    setProgress({
      message: 'Setting file execution permissions...',
      percentage: 75,
      detail: 'Running chmod command...',
    })
    await invoke<string>('execute_ssh_command', {
      host: hostTrim,
      port,
      username: userTrim,
      password: pwd,
      privateKeyPath: keyPath,
      authMode,
      command: `chmod a+x ~/${remoteFilename}`,
    })
    setProgress({ percentage: 85, detail: 'Permissions set successfully' })
  } catch (error: unknown) {
    const detail = normalizeErrorMessage(error)
    setProgress({
      status: 'exception',
      message: 'Failed to set execution permissions',
      detail,
    })
    ElMessage.error(`Failed to set execution permissions: ${detail}`)
    return false
  }

  try {
    setProgress({
      message: 'Executing installation command...',
      percentage: 90,
      detail: 'Running installation...',
    })
    const result = await invoke<string>('execute_ssh_command', {
      host: hostTrim,
      port,
      username: userTrim,
      password: pwd,
      privateKeyPath: keyPath,
      authMode,
      command: `cd ~ && ./${remoteFilename} -- --auto`,
    })
    setProgress({
      percentage: 100,
      status: 'success',
      detail: 'Installation completed',
    })
    ElMessage.success('Installation successful!')
    if (result) {
      console.log('Installation output:', result)
    }
    return true
  } catch (error: unknown) {
    const detail = normalizeErrorMessage(error)
    setProgress({
      status: 'exception',
      message: 'Installation failed',
      detail,
    })
    ElMessage.error(`Installation failed: ${detail}`)
    return false
  }
}
