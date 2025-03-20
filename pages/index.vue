<template>
  <div class="dashboard" :style="backgroundStyle">
    <!-- 看板整体容器 -->
    <div class="exam-board">
      <!-- 左上角组织名称 -->
      <div class="organization-name">
        {{ manifest?.organization_name }}
      </div>

      <!-- 考试名称（最上方） -->
      <div class="exam-title semi-transparent">
        {{ manifest?.exam_name }}
      </div>

      <!-- 全局公告 -->
      <div class="global-announcement semi-transparent">
        {{ manifest?.general_announcement }}
      </div>

      <!-- 当前考试公告（若存在） -->
      <div v-if="currentExam" class="exam-announcement semi-transparent">
        <strong>当前科目公告：</strong> {{ currentExam.announcement }}
      </div>

      <!-- 主体布局：左侧（包含时钟和科目信息） / 右侧考试科目列表 -->
      <div class="content-row">
        <!-- 左侧：包含时钟和科目信息 -->
        <div class="left-panel semi-transparent">
          <div class="clock-container">
            <div class="big-clock">
              {{ formattedCurrentTime }}
            </div>
          </div>
          <div class="subject-info">
            <h3 v-if="currentExam">
              当前科目：{{ currentExam.subject }}
            </h3>
            <h3 v-else>课间休息中</h3>
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
            <div>
              <strong>考试状态：</strong>
              <span :class="statusClass(currentExam)">
                {{ currentExam ? getExamStatus(currentExam) : "课间休息中" }}
              </span>
            </div>
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

      <!-- 上方提醒消息 -->
      <div v-if="flashMessage" class="flash-message">
        {{ flashMessage }}
      </div>

      <!-- 红色全屏高亮动画 -->
      <div v-if="flashActive" class="flash-overlay"></div>

      <!-- 底部版权信息 -->
      <div class="footer">
        &copy; {{ manifest?.organization_name }} 版权所有
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// 检查是否有验证的 cookie，否则重定向到 /check
const router = useRouter()
function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}
onBeforeMount(() => {
  if (!getCookie('otpVerified')) {
    router.push('/check')
  }
})

const backgroundStyle = {
  background: "url('./background.jpg') no-repeat center center / cover",
  minHeight: "100vh",
  position: "relative"
}

// 加载 manifest.json
const manifest = ref(null)
onBeforeMount(async () => {
  try {
    const res = await $fetch('/manifest.json')
    manifest.value = res
  } catch (err) {
    manifest.value = {
      exam_name: "示例考试",
      general_announcement: "示例公告",
      organization_name: "示例机构",
      exams: []
    }
  }
})

// 当前时间与定时器
const currentTime = ref(Math.floor(Date.now() / 1000))
let timerInterval = null
onMounted(() => {
  timerInterval = setInterval(() => {
    currentTime.value = Math.floor(Date.now() / 1000)
    checkReminders()
  }, 1000)
  if (typeof window !== 'undefined') {
    window.testReminder = () => {
      triggerFlash('测试提醒效果')
    }
  }
})
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
const formattedCurrentTime = computed(() => {
  const date = new Date(currentTime.value * 1000)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
})

// 计算当前考试和下一个考试
const currentExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time <= currentTime.value && exam.end_time > currentTime.value)
})
const nextExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time > currentTime.value)
})

// 考试状态判断及样式
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

const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
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
  // 红色全屏高亮动画显示 3 秒
  setTimeout(() => {
    flashActive.value = false
  }, 3000)
  // 提醒消息保持 30 秒
  setTimeout(() => {
    flashMessage.value = ''
  }, 30000)
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
.semi-transparent {
  background: rgba(18, 18, 15, 0.5);
  margin: 10px 0;
  padding: 15px;
  border-radius: 8px;
  box-sizing: border-box;
}
.exam-board {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}
.organization-name {
  color: #000;
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 16px;
  font-weight: bold;
}
.exam-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}
.global-announcement {
  font-size: 24px;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
}
.exam-announcement {
  font-size: 20px;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
}
.content-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
@media (max-width: 768px) {
  .content-row {
    flex-direction: column;
  }
}
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
.footer {
  font-size: 14px;
  text-align: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #666;
}
.status-notstarted {
  color: orange;
  background-color: #ffe4b5;
  padding: 2px 6px;
  border-radius: 4px;
}
.status-ongoing {
  color: green;
  background-color: #d0f0c0;
  padding: 2px 6px;
  border-radius: 4px;
}
.status-ended {
  color: red;
  background-color: #f8d7da;
  padding: 2px 6px;
  border-radius: 4px;
}
.status-rest {
  color: #fff;
  background-color: #333;
  padding: 2px 6px;
  border-radius: 4px;
}
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
