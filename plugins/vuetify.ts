// plugins/vuetify.ts
import { createVuetify } from 'vuetify'
import { defineNuxtPlugin } from '#app'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin(nuxtApp => {
    // 创建 Vuetify 实例，并提供 defaults 对象（可根据需要配置默认选项）
    const vuetify = createVuetify({
        components,
        directives,
        defaults: {} // 这里必须有 defaults 对象，否则会报 "Could not find defaults instance"
    })
    nuxtApp.vueApp.use(vuetify)
})
