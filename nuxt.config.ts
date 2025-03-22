import { defineNuxtConfig } from 'nuxt/config'
import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  // 启用开发者工具
  devtools: { enabled: true },

  modules: ['@nuxt/devtools'],

  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css' // 确保 MDI 图标可用
  ],

  build: {
    transpile: ['vuetify']
  },

  vite: {
    plugins: [
      vuetify({
        autoImport: true  // 自动导入 Vuetify 组件（可选配置）
      })
    ],
    // 避免 SSR 时将 vuetify 当作外部依赖处理
    ssr: {
      noExternal: ['vuetify']
    }
  },

  runtimeConfig: {
    // 服务器端环境变量
    NUXT_OTP_SECRET: process.env.NUXT_OTP_SECRET || "GM5K4A36OEOG7IVPD6BXEDCCE5G4NAU4",
    public: {
      // 客户端公开变量（单位：秒）
      NUXT_VALID_TIME: Number(process.env.NUXT_VALID_TIME) || 86400
    }
  },

  compatibilityDate: '2025-03-22'
})