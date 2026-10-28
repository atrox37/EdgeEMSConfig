import { fileURLToPath, URL } from 'node:url'

import { createLogger, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
// import autoprefixer from 'autoprefixer'
// import pxtorem from 'postcss-pxtorem'

// https://vite.dev/config/
const host = process.env.TAURI_DEV_HOST

const viteLogger = createLogger()
const viteLoggerWarn = viteLogger.warn.bind(viteLogger)
const viteLoggerInfo = viteLogger.info.bind(viteLogger)
const shouldSuppressBuildNoise = (msg: string) =>
  msg.includes('#__PURE__')
  || msg.includes('PURE__')
  || msg.includes('contains an annotation')
viteLogger.warn = (msg, options) => {
  if (shouldSuppressBuildNoise(msg)) return
  viteLoggerWarn(msg, options)
}
viteLogger.info = (msg, options) => {
  if (shouldSuppressBuildNoise(msg)) return
  viteLoggerInfo(msg, options)
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  const isAnalyze = process.env.ANALYZE === 'true'
  const plugins = [
    vue(),
    // 已禁用 Vue DevTools（避免开发模式暴露调试入口）
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: true,
    }),
    Components({
      resolvers: [
        ElementPlusResolver(),
        IconsResolver({
          prefix: 'i',
          enabledCollections: ['tabler'],
        }),
      ],
      dts: true,
    }),
    Icons({
      compiler: 'vue3',
      autoInstall: true,
    }),
  ]

  if (isBuild) {
    plugins.push(
      // Gzip 压缩插件仅在生产构建开启
      viteCompression({
        verbose: false,
        disable: false,
        threshold: 10240,
        algorithm: 'gzip',
        ext: '.gz',
        filter: (file) => !/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i.test(file),
      }),
    )
  }

  if (isAnalyze) {
    plugins.push(
      // 仅在需要分析包体时开启
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        emitFile: false,
      }),
    )
  }

  return {
    plugins,
    customLogger: viteLogger,

    // Tauri 开发推荐配置
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 忽略 Rust 目录，避免无意义重载
        ignored: ['**/src-tauri/**'],
      },
      proxy: {
        '/api/v1/config': {
          target: 'http://192.168.30.21:6005',
          changeOrigin: true,
          timeout: 210_000,
          proxyTimeout: 210_000,
        },
        '/api': {
          target: 'http://192.168.30.21:6005',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // '/alarmApi': {
        //   target: 'http://192.168.30.166:6002',
        //   changeOrigin: true,
        //   // rewrite: (path) => path.replace(/^\/api/, ''),
        // },
        // '/netApi': {
        //   target: 'http://192.168.30.166:6006',
        //   changeOrigin: true,
        //   // rewrite: (path) => path.replace(/^\/api/, ''),
        // },
        '/comApi': {
          target: 'http://192.168.30.21:6001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/comApi/, ''),
        },
        '/ruleApi': {
          target: 'http://192.168.30.21:6002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ruleApi/, ''),
        },
        '/modApi': {
          target: 'http://192.168.30.21:6002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/modApi/, ''),
        },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/styles/_variables.scss" as *;',
          // 如果需要全局 SCSS 变量，可以在这里添加
          // additionalData: `@use "@/assets/styles/variables.scss" as *;`,
        },
      },
      // 已按需求禁用 postcss rem 配置与自动前缀
      // postcss: {
      //   plugins: [
      //     autoprefixer(),
      //     pxtorem({ rootValue: 100, propList: ['*'] })
      //   ]
      // },
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'element-plus', 'echarts'],
    },

    // 构建配置（针对 Tauri WebView 目标与调试）
    build: {
      target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: process.env.TAURI_DEBUG ? false : 'esbuild',
      sourcemap: !!process.env.TAURI_DEBUG,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 850,
      rollupOptions: {
        onLog(level, log, handler) {
          const message = log.message ?? ''
          if (shouldSuppressBuildNoise(message)) return
          handler(level, log)
        },
        onwarn(warning, warn) {
          if (
            warning.code === 'INVALID_ANNOTATION'
            || warning.message?.includes('PURE__')
            || warning.message?.includes('#__PURE__')
          ) {
            return
          }
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
          warn(warning)
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('@vue-flow')) return 'vue-flow'
            if (id.includes('@vueuse')) return 'vueuse'
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('xlsx')) return 'xlsx'
            if (id.includes('crypto-js')) return 'crypto-js'
            if (id.includes('@tauri-apps')) return 'tauri'
            if (id.includes('html-to-image')) return 'html-to-image'
            if (id.includes('vue-router') || id.includes('pinia') || id.includes('/vue/')) {
              return 'vue-vendor'
            }
            return 'vendor'
          },
        },
      },
    },
  }
})
