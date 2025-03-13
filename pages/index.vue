<template>
  <!-- 背景层 -->
  <div class="dashboard" :style="backgroundStyle">
    <!-- 若未通过 TOTP 验证，仅显示验证码弹窗 -->
    <div v-if="!otpVerified">
      <v-dialog v-model="showOtpModal" persistent max-width="400">
        <v-card>
          <v-card-title>请输入验证码</v-card-title>
          <v-card-text>
            <!-- 你需要自行实现或引入 v-otp-input 组件 -->
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

    <!-- 验证通过后显示看板 -->
    <div v-else class="exam-board">
      <!-- 左上角组织名称 -->
      <div class="organization-name">
        {{ manifest?.organization_name }}
      </div>

      <!-- 考试名称（最上方） -->
      <div class="exam-title semi-transparent">
        {{ manifest?.exam_name }}
      </div>

      <!-- 全局公告（调整样式：字体更大、颜色对比鲜明） -->
      <div class="global-announcement semi-transparent">
        {{ manifest?.general_announcement }}
      </div>

      <!-- 当前考试公告（放在全局公告下方，仅在有当前考试时显示） -->
      <div v-if="currentExam" class="exam-announcement semi-transparent">
        <strong>当前科目公告：</strong> {{ currentExam.announcement }}
      </div>

      <!-- 主体布局：左侧（包含时钟和科目信息） / 右侧考试科目列表 -->
      <div class="content-row">
        <!-- 左侧：包含时钟和当前科目信息 -->
        <div class="left-panel semi-transparent">
          <!-- 时钟部分，位于科目信息上方 -->
          <div class="clock-container">
            <div class="big-clock">
              {{ formattedCurrentTime }}
            </div>
          </div>
          <!-- 科目信息（已去掉公告部分） -->
          <div class="subject-info">
            <h3 v-if="currentExam">
              当前科目：{{ currentExam.subject }}
            </h3>
            <h3 v-else>课间休息中</h3>
            <!-- 考试时间 -->
            <div>
              <strong>考试时间：</strong>
              <span v-if="currentExam">
                {{ formatTime(currentExam.start_time) }} - {{ formatTime(currentExam.end_time) }}
              </span>
              <span v-else-if="nextExam">
                {{ formatTime(nextExam.start_time) }} - {{ formatTime(nextExam.end_time) }}
              </span>
              <span v-else>--</span>
            </div>
            <!-- 考试状态 -->
            <div>
              <strong>考试状态：</strong>
              <span :class="statusClass(currentExam)">
                {{ currentExam ? getExamStatus(currentExam) : "课间休息中" }}
              </span>
            </div>
            <!-- 剩余时间 -->
            <div>
              <strong>剩余时间：</strong>
              <span v-if="currentExam">
                {{ formatDuration(currentExam.end_time - currentTime) }}
              </span>
              <span v-else-if="nextExam">
                {{ formatDuration(nextExam.start_time - currentTime) }}
              </span>
              <span v-else>--</span>
            </div>
          </div>
        </div>

        <!-- 右侧：考试科目列表 -->
        <div class="right-panel semi-transparent">
          <h3>考试科目列表</h3>
          <div class="exam-list">
            <table>
              <thead>
              <tr>
                <th>科目</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>状态</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(exam, index) in manifest?.exams" :key="index">
                <td>{{ exam.subject }}</td>
                <td>{{ formatTime(exam.start_time) }}</td>
                <td>{{ formatTime(exam.end_time) }}</td>
                <td>
                    <span :class="statusClass(exam)">
                      {{ getExamStatus(exam) }}
                    </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 上方提醒消息（显示30秒） -->
      <div v-if="flashMessage" class="flash-message">
        {{ flashMessage }}
      </div>

      <!-- 红色全屏高亮动画（3秒） -->
      <div v-if="flashActive" class="flash-overlay"></div>

      <!-- 底部版权信息 -->
      <div class="footer">
        &copy; {{ manifest?.organization_name }} 版权所有
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onBeforeMount, onMounted, onUnmounted} from 'vue'
import {generateTOTP} from '~/utils/totp'

// 格式化当前时间，精确到秒
const formattedCurrentTime = computed(() => {
  const date = new Date(currentTime.value * 1000)
  return date.toLocaleTimeString('zh-CN', {hour12: false})
})

/** 判断是否在客户端（避免 SSR 时操作 window） */
const isClient = typeof window !== 'undefined'

// ========== Cookie 工具函数 ==========
function setCookie(name, value, seconds) {
  if (!isClient) return
  document.cookie = `${name}=${value}; max-age=${seconds}; path=/`
}

function getCookie(name) {
  if (!isClient) return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

// ========== TOTP 验证 ==========
const otpVerified = ref(false)
const showOtpModal = ref(true)
const otpInput = ref('')
const errorMsg = ref('')

const verifyOtp = () => {
  const expected = generateTOTP("GM5K4A36OEOG7IVPD6BXEDCCE5G4NAU4")
  if (otpInput.value === expected) {
    otpVerified.value = true
    showOtpModal.value = false
    errorMsg.value = ''
    setCookie('otpVerified', 'true', 86400) // 1天内无需再次验证
  } else {
    errorMsg.value = '验证码错误，请重新输入'
  }
}

// 若已存在 cookie 则跳过弹窗
if (isClient && getCookie('otpVerified') === 'true') {
  otpVerified.value = true
  showOtpModal.value = false
}

// ========== 加载 manifest.json ==========
const manifest = ref(null)
onBeforeMount(async () => {
  try {
    const res = await $fetch('/manifest.json')
    manifest.value = res
  } catch (err) {
    // 读取失败时，设置一个默认示例
    manifest.value = {
      exam_name: "示例考试",
      general_announcement: "示例公告",
      organization_name: "示例机构",
      exams: []
    }
  }
})

// ========== 时间与提醒功能 ==========
const currentTime = ref(Math.floor(Date.now() / 1000))
let timerInterval = null

onMounted(() => {
  timerInterval = setInterval(() => {
    currentTime.value = Math.floor(Date.now() / 1000)
    checkReminders()
  }, 1000)

  // 提供控制台命令测试提醒
  if (isClient) {
    window.testReminder = () => {
      triggerFlash('测试提醒效果')
    }
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

// 找到当前考试 / 下一个考试
const currentExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => {
    return exam.start_time <= currentTime.value && exam.end_time > currentTime.value
  })
})
const nextExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time > currentTime.value)
})

// 状态判断
const getExamStatus = (exam) => {
  if (!exam) return '休息中'
  if (currentTime.value < exam.start_time) return '未开始'
  if (currentTime.value >= exam.start_time && currentTime.value < exam.end_time) return '进行中'
  return '已结束'
}
const statusClass = (exam) => {
  const st = getExamStatus(exam)
  switch (st) {
    case '未开始':
      return 'status-notstarted'
    case '进行中':
      return 'status-ongoing'
    case '已结束':
      return 'status-ended'
    default:
      return 'status-rest'
  }
}

// 时间格式化
const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', {hour12: false})
}
const formatDuration = (seconds) => {
  if (seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${s}秒`
}

// 提醒功能
const flashActive = ref(false)
const flashMessage = ref('')
const triggeredReminders = ref(new Set())

const checkReminders = () => {
  if (!currentExam.value || !currentExam.value.reminders) return
  const remaining = currentExam.value.end_time - currentTime.value
  currentExam.value.reminders.forEach(reminder => {
    // JSON 中的 time_left 单位为分钟，转换为秒后比较
    const key = currentExam.value.subject + '_' + reminder.time_left
    if (remaining <= reminder.time_left * 60 && !triggeredReminders.value.has(key)) {
      triggeredReminders.value.add(key)
      triggerFlash(reminder.message)
    }
  })
}

const triggerFlash = (message) => {
  flashMessage.value = message
  flashActive.value = true
  // 红色全屏高亮动画显示3秒
  setTimeout(() => {
    flashActive.value = false
  }, 3000)
  // 提醒消息保持30秒
  setTimeout(() => {
    flashMessage.value = ''
  }, 30000)
}

// 背景样式
const backgroundStyle = {
  background: "url('./background.jpg') no-repeat center center / cover",
  minHeight: "100vh",
  position: "relative"
}
</script>

<style scoped>
.dashboard {
  width: 100%;
  min-height: 100vh;
  color: #fff;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

/* 半透明背景板 */
.semi-transparent {
  background: rgba(18, 18, 15, 0.5);
  margin: 10px 0;
  padding: 15px;
  border-radius: 8px;
  box-sizing: border-box;
}

/* 看板整体容器 */
.exam-board {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

/* 左上角组织名称 */
.organization-name {
  color: #000;
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 16px;
  font-weight: bold;
}

/* 最上方考试名称 */
.exam-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}

/* 全局公告 - 样式调整：字体变大、颜色鲜明 */
.global-announcement {
  font-size: 24px;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
}

/* 当前考试公告 */
.exam-announcement {
  font-size: 20px;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
}

/* 主内容：左右两个面板 */
.content-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

/* 响应式：窄屏时堆叠显示 */
@media (max-width: 768px) {
  .content-row {
    flex-direction: column;
  }
}

/* 左侧块：包含时钟和科目信息 */
.left-panel {
  flex: 0 0 40%;
  font-size: 24px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
}

.clock-container {
  text-align: center;
  margin-bottom: 10px;
}

.big-clock {
  font-size: 96px;
  font-weight: bold;
}

/* 右侧块：考试科目列表，可滚动 */
.right-panel {
  flex: 1;
  font-size: 16px;
  overflow-y: auto;
}

.right-panel .exam-list table {
  width: 100%;
  border-collapse: collapse;
}

.right-panel .exam-list th,
.right-panel .exam-list td {
  padding: 8px 12px;
  border: 1px solid #444;
}

/* 底部版权信息 */
.footer {
  font-size: 14px;
  text-align: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #666;
}

/* 状态样式：带底色 */
.status-notstarted {
  color: orange;
  background-color: #ffe4b5; /* 浅橙色 */
  padding: 2px 6px;
  border-radius: 4px;
}

.status-ongoing {
  color: green;
  background-color: #d0f0c0; /* 浅绿色 */
  padding: 2px 6px;
  border-radius: 4px;
}

.status-ended {
  color: red;
  background-color: #f8d7da; /* 浅红色 */
  padding: 2px 6px;
  border-radius: 4px;
}

.status-rest {
  color: #fff;
  background-color: #333;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 上方提醒消息（显示30秒） */
.flash-message {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.8);
  padding: 10px 20px;
  font-size: 18px;
  color: #fff;
  border-radius: 5px;
  z-index: 2000;
}

/* 红色全屏高亮动画（3秒） */
.flash-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 0, 0, 0.3);
  border-radius: 50%;
  animation: flashExpand 3s forwards;
  pointer-events: none;
  z-index: 1000;
}

@keyframes flashExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    width: 200vw;
    height: 200vw;
    opacity: 0;
    transform: translate(-50%, -50%);
  }
}
</style>
