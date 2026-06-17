import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
// import autoprefixer from 'autoprefixer'
// import pxtorem from 'postcss-pxtorem'
// https://vite.dev/config/
var host = process.env.TAURI_DEV_HOST;
export default defineConfig(function () { return ({
    plugins: [
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
        // Gzip压缩插件（不压缩图片文件）
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240, // 10KB以上才压缩
            algorithm: 'gzip',
            ext: '.gz',
            // 只压缩非图片文件
            filter: function (file) {
                // 不压缩常见图片格式
                return !/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i.test(file);
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
                host: host,
                port: 1421,
            }
            : undefined,
        watch: {
            // 忽略 Rust 目录，避免无意义重载
            ignored: ['**/src-tauri/**'],
        },
        proxy: {
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
                rewrite: function (path) { return path.replace(/^\/comApi/, ''); },
            },
            '/ruleApi': {
                target: 'http://192.168.30.21:6002',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/ruleApi/, ''); },
            },
            '/modApi': {
                target: 'http://192.168.30.21:6002',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/modApi/, ''); },
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
    },
}); });
