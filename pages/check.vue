<template>
  <div class="check-container">
    <v-dialog v-model="showOtpModal" persistent max-width="400">
      <v-card>
        <v-card-title>请输入验证码</v-card-title>
        <v-card-text>
          <v-otp-input v-model="otpInput" length="6" />
          <div class="error-msg" v-if="errorMsg">
            {{ errorMsg }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="verifyOtp" style="margin-right: 10px;">
            确认
          </v-btn>
          <v-btn @click="showOtpModal = false">
            取消
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showOtpModal = ref(true)
const otpInput = ref('')
const errorMsg = ref('')

// 从 runtimeConfig 获取公开的验证码有效期
const validTime = useRuntimeConfig().public.NUXT_VAILD_TIME

const verifyOtp = async () => {
  try {
    // 提交验证码到服务端验证
    const res = await $fetch('/api/verifyOtp', {
      method: 'POST',
      body: { otpInput: otpInput.value }
    })
    if (res.success) {
      // 设置 cookie（此处仅为演示，生产环境建议在服务端设置 cookie）
      document.cookie = `otpVerified=true; max-age=${validTime}; path=/`
      // 验证通过后重定向到首页
      window.location.href = '/'
    } else {
      errorMsg.value = res.error || '验证码错误，请重新输入'
    }
  } catch (err) {
    errorMsg.value = '验证过程中出错，请重试'
    console.error(err)
  }
}
</script>

<style scoped>
.check-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: url('./background.jpg') no-repeat center center / cover;
}
.error-msg {
  color: red;
  margin-top: 10px;
}
</style>
