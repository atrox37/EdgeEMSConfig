import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import autoprefixer from 'autoprefixer'
// @ts-ignore
import pxtorem from 'postcss-pxtorem'

// https://vite.dev/config/
const host = process.env.TAURI_DEV_HOST

export default defineConfig(() => ({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: true,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: true,
    }),
    // Gzip压缩插件（不压缩图片文件）
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 10KB以上才压缩
      algorithm: 'gzip',
      ext: '.gz',
      // 只压缩非图片文件
      filter: (file) => {
        // 不压缩常见图片格式
        return !/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i.test(file)
      },
    }),
    // 打包分析插件
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      emitFile: false,
    }),
  ],

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
      '/api': {
        target: 'http://192.168.30.166:6005',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/alarmApi': {
        target: 'http://192.168.30.166:6002',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/netApi': {
        target: 'http://192.168.30.166:6006',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/comApi': {
        target: 'http://192.168.40.238:6001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/comApi/, ''),
      },
      '/ruleApi': {
        target: 'http://192.168.40.238:6003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ruleApi/, ''),
      },
      '/modApi': {
        target: 'http://192.168.40.238:6002',
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
        // 如果需要全局 SCSS 变量，可以在这里添加
        // additionalData: `@use "@/assets/styles/variables.scss" as *;`,
      },
    },
    postcss: {
      plugins: [
        // 自动添加浏览器前缀
        autoprefixer({
          overrideBrowserslist: [
            'last 2 versions',
            '> 1%',
            'iOS 7',
            'last 3 iOS versions',
            'Android >= 4.0',
          ],
          flexbox: 'no-2009',
        }),
        // // px 转 rem
        pxtorem({
          rootValue: 100, // 根元素字体大小，与HTML中的设置保持一致
          unitPrecision: 5, // 转换后的小数点位数
          propList: ['*'], // 需要转换的属性，*表示所有属性
          selectorBlackList: [
            /^\.no-rem/, // 不转换的类名
          ],
          replace: true, // 是否替换原来的值
          mediaQuery: false, // 是否转换媒体查询中的 px
          minPixelValue: 1, // 小于这个值的 px 不转换
          exclude: /EnergyBg\.vue/i, // 排除EnergyBg.vue 文件
        }),
      ],
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus', 'axios', 'echarts'],
  },

  // 构建配置（针对 Tauri WebView 目标与调试）
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: process.env.TAURI_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_DEBUG,
    cssCodeSplit: true,
  },
}))
