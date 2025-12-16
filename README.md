# PC管理桌面应用

这是一个基于 **Tauri + Vue 3 + TypeScript** 开发的桌面应用程序，用于PC管理功能。

## 🚀 技术栈

- **前端框架**: Vue 3 (Composition API + `<script setup>`)
- **桌面框架**: Tauri 2.0
- **开发语言**: TypeScript
- **构建工具**: Vite
- **包管理器**: pnpm

## 📋 功能特性

- 🖥️ 原生桌面应用体验
- ⚡ 快速启动和响应
- 🔒 系统级权限访问
- 📱 现代化UI界面
- 🛠️ 完整的开发工具链
- 🛡️ **安全隔离层 (Isolation)** - 企业级安全防护
- 🔄 **自动更新系统** - 支持版本检查和更新日志显示

## 🛠️ 开发环境要求

### 必需软件
- **Node.js**: 版本 18.0 或更高
- **pnpm**: 包管理器 (推荐版本 8.0+)
- **Rust**: 用于Tauri后端开发
- **Visual Studio Code**: 推荐的IDE

### 推荐VS Code插件
- [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) - Vue 3支持
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) - Tauri开发支持
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) - Rust语言支持

## 🚀 快速开始

### 1. 安装依赖
```bash
# 使用pnpm安装项目依赖
pnpm install
```

### 2. 启动开发模式
```bash
# 启动桌面应用开发模式
pnpm tauri dev
```

### 3. 构建生产版本
```bash
# 构建桌面应用
pnpm tauri build
```

## 📁 项目结构

```
PCManagement/
├── src/                    # Vue前端源码
│   ├── App.vue            # 主应用组件
│   ├── main.ts            # 应用入口文件
│   └── assets/            # 静态资源
├── src-tauri/             # Tauri后端源码
│   ├── src/               # Rust源码
│   ├── Cargo.toml         # Rust项目配置
│   └── tauri.conf.json    # Tauri应用配置
├── public/                # 公共静态文件
├── package.json           # Node.js项目配置
└── vite.config.ts         # Vite构建配置
```

## 🎯 开发指南

### Vue 3 开发
- 使用 `<script setup>` 语法糖
- 采用 Composition API 进行状态管理
- 支持 TypeScript 类型检查

### Tauri 集成
- 前端通过 `@tauri-apps/api` 与后端通信
- 后端使用 Rust 提供系统级功能
- 支持原生系统API调用

### 🛡️ 安全隔离 (Isolation)
- **双重安全层**: 主应用 + 隔离层双重保护
- **CSP策略**: 内容安全策略防止XSS攻击
- **沙箱环境**: 隔离层运行在独立沙箱中
- **权限控制**: 最小权限原则，精确控制API访问

## 🔧 常用命令

```bash
# 开发模式 (热重载)
pnpm tauri dev

# 仅启动前端开发服务器
pnpm dev

# 构建生产版本
pnpm tauri build

# 预览构建结果
pnpm preview
```

## 📝 开发注意事项

1. **首次运行**: 首次启动可能需要下载Rust依赖，请耐心等待
2. **热重载**: 开发模式下支持前端代码热重载
3. **系统权限**: 某些功能可能需要系统权限，请根据提示授权
4. **调试**: 可以使用浏览器开发者工具调试前端代码

## 🛡️ 安全隔离 (Isolation) 详解

### 什么是Isolation？
Isolation是Tauri 2.0引入的企业级安全功能，通过创建一个独立的隔离层来保护您的应用免受恶意代码攻击。

### 🔒 安全优势

#### 1. **双重防护机制**
```
用户界面 → 隔离层 → 主应用 → 系统API
    ↓         ↓        ↓        ↓
  用户交互   安全验证   业务逻辑   系统调用
```

#### 2. **防止XSS攻击**
- **CSP策略**: 严格的内容安全策略
- **脚本隔离**: 恶意脚本无法执行
- **DOM保护**: 防止DOM操作攻击

#### 3. **数据安全**
- **敏感数据隔离**: 用户数据在隔离层中处理
- **API访问控制**: 精确控制哪些API可以被调用
- **权限最小化**: 只授予必要的系统权限

#### 4. **性能优化**
- **预编译隔离层**: 隔离层代码预编译，启动更快
- **资源缓存**: 隔离层资源独立缓存
- **内存隔离**: 主应用和隔离层内存独立

### 🏗️ 架构设计

```
┌─────────────────────────────────────┐
│           用户界面 (UI)              │
├─────────────────────────────────────┤
│        隔离层 (Isolation)           │  ← 安全验证层
│  - CSP策略执行                      │
│  - 权限检查                         │
│  - 数据验证                         │
├─────────────────────────────────────┤
│         主应用 (Main App)           │  ← 业务逻辑层
│  - Vue组件                          │
│  - 状态管理                         │
│  - 用户交互                         │
├─────────────────────────────────────┤
│         Tauri后端 (Rust)            │  ← 系统接口层
│  - 系统API调用                      │
│  - 文件操作                         │
│  - 网络请求                         │
└─────────────────────────────────────┘
```

### 📁 文件结构
```
PCManagement/
├── dist/                    # 主应用构建文件
├── dist-isolation/          # 隔离层构建文件
│   └── index.html          # 隔离层入口
└── src-tauri/
    └── tauri.conf.json     # 隔离配置
```

### ⚙️ 配置说明

#### tauri.conf.json 配置
```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
      "pattern": {
        "use": "isolation",
        "options": {
          "dir": "../dist-isolation"
        }
      }
    }
  }
}
```

#### Cargo.toml 配置
```toml
[build-dependencies]
tauri-build = { version = "2", features = ["isolation"] }

[dependencies]
tauri = { version = "2", features = ["isolation"] }
```

### 🚀 开发建议

1. **隔离层设计**: 保持隔离层代码简洁，只包含必要的安全验证
2. **API设计**: 通过Tauri命令暴露安全的API接口
3. **错误处理**: 在隔离层中处理所有用户输入验证
4. **性能监控**: 监控隔离层对应用性能的影响

### 🔧 调试技巧

```bash
# 开发模式下查看隔离层
pnpm tauri dev

# 构建时包含隔离层
pnpm tauri build

# 检查隔离层文件
ls -la dist-isolation/
```

## 🔄 更新日志功能

### 功能说明

应用内置了自动更新检查功能，支持：
- ✅ 自动检查新版本
- ✅ 显示更新日志（从 CHANGELOG.md 读取）
- ✅ 一键更新安装
- ✅ 更新内容格式化显示（支持 Markdown）

### 使用方法

#### 1. 编写更新日志

在项目根目录的 `CHANGELOG.md` 文件中添加更新日志：

```markdown
## [0.1.7] - 2025-01-XX

### 新增
- 添加更新日志功能
- 支持自动更新时显示更新内容

### 修复
- 修复版本号在安装包文件名中不正确的问题

### 优化
- 优化构建流程，自动从 tag 提取版本号
```

#### 2. 发布新版本

当您推送新的 tag（如 `v0.1.7`）时：

1. **构建流程会自动**：
   - 从 tag 提取版本号
   - 更新 `package.json`、`tauri.conf.json`、`Cargo.toml` 中的版本号
   - 从 `CHANGELOG.md` 提取对应版本的更新日志
   - 生成包含更新日志的 `latest.json`

2. **应用会自动**：
   - 启动后 3 秒自动检查更新
   - 发现新版本时显示更新对话框
   - 展示更新日志内容
   - 支持一键更新安装

### 更新日志格式

更新日志支持 Markdown 格式，建议使用以下结构：

```markdown
## [版本号] - YYYY-MM-DD

### 新增
- 功能描述1
- 功能描述2

### 修复
- 问题描述1
- 问题描述2

### 优化
- 改进描述1
- 改进描述2
```

### 文件位置

- **更新日志文件**: `CHANGELOG.md`（项目根目录）
- **生成脚本**: `script/generate-latest.js`
- **更新检查组件**: `src/components/UpdateChecker.vue`
- **更新逻辑**: `src/composables/useUpdater.ts`

### 注意事项

1. **版本号格式**: 必须使用语义化版本号（如 `0.1.7`）
2. **CHANGELOG 格式**: 版本标题必须使用 `## [版本号]` 格式
3. **自动检查**: 应用启动后会自动检查更新，无需手动操作
4. **静默检查**: 默认使用静默检查，不会打扰用户

## 🐛 问题排查

### 常见问题
1. **Rust未安装**: 请访问 [rustup.rs](https://rustup.rs/) 安装Rust
2. **依赖安装失败**: 尝试删除 `node_modules` 和 `pnpm-lock.yaml` 后重新安装
3. **构建失败**: 检查Rust版本是否兼容，建议使用最新稳定版
4. **隔离层错误**: 检查 `dist-isolation` 目录是否存在且包含正确文件

### 获取帮助
- [Vue 3 官方文档](https://vuejs.org/guide/)
- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Tauri Isolation 文档](https://tauri.app/v1/guides/features/isolation/)
- [Vite 官方文档](https://vitejs.dev/guide/)

---

**开始您的桌面应用开发之旅吧！** 🎉
