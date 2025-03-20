// nuxt.config.ts
import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/devtools'],
  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.css'], // 确保 MDI 图标可用
  build: {
    transpile: ['vuetify']
  },
  vite: {
    plugins: [vuetify()]
  },
  runtimeConfig: {
    NUXT_OTP_SECRET: process.env.NUXT_OTP_SECRET || "GM5K4A36OEOG7IVPD6BXEDCCE5G4NAU4",
    public: {
      // 客户端公开变量
      NUXT_VAILD_TIME: process.env.NUXT_VAILD_TIME || 86400  // 单位：秒
    }
  }
})
