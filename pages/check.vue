<template>
  <!-- 整个页面始终显示背景 -->
  <div class="check-container">
    <!-- loading 为 false 且需要输入验证码时显示弹窗 -->
    <v-dialog v-if="!loading && showOtpModal" v-model="showOtpModal" persistent max-width="400">
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
import { ref, onMounted } from 'vue'

// loading 为 true 时，页面仅显示背景
const loading = ref(true)
const showOtpModal = ref(false)
const otpInput = ref('')
const errorMsg = ref('')

// 从 runtimeConfig 获取公开的验证码有效期
const validTime = useRuntimeConfig().public.NUXT_VAILD_TIME

// 检查 cookie 中 otpVerified 状态
const checkOtpVerified = () => {
  const cookies = document.cookie.split(';').map(item => item.trim())
  const otpCookie = cookies.find(cookie => cookie.startsWith('otpVerified='))
  if (otpCookie && otpCookie.split('=')[1] === 'true') {
    return true
  }
  return false
}

onMounted(() => {
  if (checkOtpVerified()) {
    // 如果已验证，直接跳转到根路径
    window.location.href = '/'
  } else {
    // 否则显示验证码弹窗，并取消 loading 状态
    showOtpModal.value = true
    loading.value = false
  }
})

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
  background: url('./background.png') no-repeat center center / cover;
}

.error-msg {
  color: red;
  margin-top: 10px;
}
</style>
