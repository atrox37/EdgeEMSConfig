export type AuthMode = 'password' | 'key'

export interface SshConnectionParams {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  authMode: AuthMode
}

export interface InitProjectForm {
  host: string
  port: number
  username: string
  password: string
  authMode: AuthMode
  privateKey: File | null
  file: File | null
}
