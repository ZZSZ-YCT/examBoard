import { defineNuxtConfig } from 'nuxt/config'
import { md3 } from 'vuetify/blueprints'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    'vuetify-nuxt-module'
  ],
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: {
      blueprint: md3,
      theme: {
        defaultTheme: 'insLight',
        themes: {
          insLight: {
            dark: false,
            colors: {
              primary: '#F5F5F5', // 奶油白
              secondary: '#E0E0E0', // 浅灰色
              accent: '#FFCDD2', // 浅粉色
              error: '#FF5252', // 错误颜色
              info: '#2196F3', // 信息颜色
              success: '#4CAF50', // 成功颜色
              warning: '#FFC107' // 警告颜色
            }
          }
        }
      }
    }
  }
})
