<template>
  <div class="dashboard" :style="backgroundStyle">
    <!-- Cookie 校验前仅显示背景 -->
    <template v-if="cookieChecked">
      <div class="exam-board">
        <!-- 顶部考试名称 -->
        <div class="exam-title semi-transparent">
          {{ manifest?.organization_name }} - {{ manifest?.exam_name }}
        </div>

        <!-- 全局公告 -->
        <div class="global-announcement semi-transparent">
          {{ manifest?.general_announcement }}
          <div v-if="displayedAnnouncement" class="exam-announcement">
            <strong>{{ announcementLabel }}</strong> {{ displayedAnnouncement }}
          </div>
        </div>

        <!-- 所有考试结束提示 -->
        <div v-if="allExamsEnded" class="all-ended-message">
          所有考试已结束
        </div>
        <template v-else>
          <!-- 主体布局：左侧（时钟与详情） / 右侧（考试科目列表） -->
          <div class="content-row">
            <!-- 左侧面板 -->
            <div class="left-panel semi-transparent">
              <div class="clock-container">
                <div class="big-clock">
                  {{ formattedCurrentTime }}
                </div>
              </div>
              <div class="subject-info">
                <h3 v-if="currentExam">当前科目：{{ currentExam.subject }}</h3>
                <h3 v-else-if="waitingForExam">所有考试尚未开始</h3>
                <h3 v-else-if="isTodayEnded">当天考试已结束</h3>
                <h3 v-else>课间休息</h3>
                <!-- 正在考试时显示详情 -->
                <template v-if="currentExam">
                  <div>
                    <strong>考试时间：</strong>
                    <span>
                      {{ formatTimeOnly(currentExam.start_time) }} - {{ formatTimeOnly(currentExam.end_time) }}
                    </span>
                  </div>
                  <div>
                    <strong>开始日期时间：</strong>
                    <span>{{ formatTime(currentExam.start_time) }}</span>
                  </div>
                  <div>
                    <strong>结束日期时间：</strong>
                    <span>{{ formatTime(currentExam.end_time) }}</span>
                  </div>
                  <div>
                    <strong>考试状态：</strong>
                    <span :class="statusClass(currentExam)">
                      {{ getExamStatus(currentExam) }}
                    </span>
                  </div>
                  <div>
                    <strong>剩余时间：</strong>
                    <span>{{ formatDuration(currentExam.end_time - currentTime) }}</span>
                  </div>
                </template>
                <!-- 无考试时显示详情 -->
                <template v-else>
                  <div class="left-details">
                    <div><strong>考试时间：</strong><span>-</span></div>
                    <div><strong>开始日期时间：</strong><span>-</span></div>
                    <div><strong>结束日期时间：</strong><span>-</span></div>
                    <div>
                      <strong>考试状态：</strong>
                      <span :class="waitingForExam ? statusClassForWaiting : 'status-break'">
                        {{ waitingForExam ? "等待开始" : "课间休息" }}
                      </span>
                    </div>
                    <div>
                      <strong>剩余时间：</strong>
                      <span>{{ waitingForExam ? '-' : breakRemainingTime }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- 右侧面板：考试科目列表 -->
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
                      <td class="subject-cell" :style="{ fontSize: subjectFontSize }">
                        {{ exam.subject }}
                      </td>
                      <td>{{ formatTime(exam.start_time) }}</td>
                      <td>{{ formatTime(exam.end_time) }}</td>
                      <td>
                        <span :class="statusClassForList(exam)">
                          {{ getExamStatusForList(exam) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- 通知提示区域 -->
        <div v-if="flashActive">
          <div v-if="flashPhase === 'full'" class="flash-overlay">
            <div class="flash-text">{{ flashMessage }}</div>
          </div>
          <div v-else-if="flashPhase === 'top'" class="flash-top">
            {{ flashMessage }}
          </div>
        </div>

        <!-- 底部版权信息 -->
        <div class="footer">
          &copy; {{ manifest?.organization_name }} 版权所有
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const cookieChecked = ref(false)
function getCookie(name) {
  const value = document.cookie
  const parts = value.split(name + '=')
  if (parts.length === 2) return parts.pop().split(';').shift()
}
onBeforeMount(() => {
  if (!getCookie('otpVerified')) {
    router.push('/check')
  } else {
    cookieChecked.value = true
  }
})

// 背景样式（自适应）
const backgroundStyle = {
  background: "url('./background.png') no-repeat center center / cover",
  minHeight: "100vh",
  width: "100vw",
  overflow: "hidden",
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

// 封装 sessionStorage 访问函数，确保只在客户端使用
function loadTriggeredReminders() {
  if (typeof window === 'undefined') return new Set();
  const stored = sessionStorage.getItem('triggeredReminders');
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

function saveTriggeredReminders() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('triggeredReminders', JSON.stringify(Array.from(triggeredReminders.value)));
  }
}

const triggeredReminders = ref(loadTriggeredReminders());

// 在 onMounted 钩子中（客户端环境）你可以安全地使用 sessionStorage
onMounted(() => {
  // 例如：更新 currentTime、检查提醒等...
  console.log("当前已触发的提醒：", triggeredReminders.value);
});

// 当前时间与定时器
const currentTime = ref(Math.floor(Date.now() / 1000))
const manualTime = ref(false)
let timerInterval = null
let previousExam = null
const pageLoaded = ref(false)

onMounted(() => {
  pageLoaded.value = true
  timerInterval = setInterval(() => {
    if (!manualTime.value) {
      currentTime.value = Math.floor(Date.now() / 1000)
    }
    checkReminders()
    if (currentExam.value) {
      if (!triggeredReminders.value.has(currentExam.value.subject + '_start')) {
        triggeredReminders.value.add(currentExam.value.subject + '_start')
        saveTriggeredReminders()
        // 考试开始提示，展示 5 秒
        triggerFlash("考试开始，请考生开始作答", 5)
      }
    } else if (previousExam && !triggeredReminders.value.has(previousExam.subject + '_end')) {
      triggeredReminders.value.add(previousExam.subject + '_end')
      saveTriggeredReminders()
      // 考试结束提示，展示 5 秒
      triggerFlash("考试结束，请监考员收卷", 5)
    }
    previousExam = currentExam.value
  }, 1000)

  if (getCookie("AdminDebug") === "debuging") {
    console.log("已开启调试模式，可使用调试指令。输入 help() 查看指令列表。")
    window.startNow = () => {
      if (waitingForExam.value && manifest.value && manifest.value.exams.length > 0) {
        manifest.value.exams[0].start_time = currentTime.value
        console.log("startNow：第一场考试已强制开始。")
      } else {
        console.log("startNow：当前已有考试进行中，无法强制开始。")
      }
    }
    window.endNow = () => {
      if (currentExam.value) {
        currentExam.value.end_time = currentTime.value
        console.log("endNow：当前考试已强制结束，系统将切换到下一场考试。")
      } else {
        console.log("endNow：当前没有正在进行的考试。")
      }
    }
    window.testAlart = () => {
      triggerFlash("测试提示", 5)
      console.log("testAlart：已触发测试提示。")
    }
    window.SetTime = (timestamp) => {
      manualTime.value = true
      currentTime.value = timestamp
      console.log("SetTime：当前时间已设置为 " + new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false }))
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    }
    window.help = () => {
      console.log("调试指令列表：")
      console.log(" startNow  —— 立即开始考试（若考试尚未开始）")
      console.log(" endNow    —— 立即结束当前考试，并切换到下一场考试")
      console.log(" testAlart —— 触发一次测试提示")
      console.log(" SetTime   —— 设置当前时间戳，例如：SetTime(秒级时间戳)")
      console.log(" help      —— 列出所有调试指令")
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

// 时间格式化函数
const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}
const formatTimeOnly = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}
const formatDuration = (seconds) => {
  if (seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${s}秒`
}

// 当前考试与下一场考试计算
const currentExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time <= currentTime.value && exam.end_time > currentTime.value)
})
const nextExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time > currentTime.value)
})

// 判断当天考试是否全部结束
const isTodayEnded = computed(() => {
  if (!manifest.value || !manifest.value.exams) return false
  const today = new Date(currentTime.value * 1000).toDateString()
  const todayExams = manifest.value.exams.filter(exam => new Date(exam.start_time * 1000).toDateString() === today)
  return todayExams.length > 0 && todayExams.every(exam => exam.end_time <= currentTime.value)
})
const allExamsEnded = computed(() => {
  return manifest.value &&
         manifest.value.exams.length > 0 &&
         manifest.value.exams.every(exam => exam.end_time <= currentTime.value)
})
const waitingForExam = computed(() => {
  if (!manifest.value || !manifest.value.exams || manifest.value.exams.length === 0) return false
  const firstExamStart = manifest.value.exams[0].start_time
  return currentTime.value < firstExamStart
})
const isBreak = computed(() => {
  return !currentExam.value && !waitingForExam.value && manifest.value && manifest.value.exams.length > 0 && !allExamsEnded.value
})

// 考试状态与样式函数
const getExamStatus = (exam) => {
  if (!exam) return waitingForExam.value ? '等待开始' : '课间休息'
  if (currentTime.value < exam.start_time) return waitingForExam.value ? '等待开始' : '未开始'
  if (currentTime.value >= exam.start_time && currentTime.value < exam.end_time) return '进行中'
  return '已结束'
}
const statusClass = (exam) => {
  const st = getExamStatus(exam)
  switch (st) {
    case '等待开始':
      return 'status-waiting'
    case '进行中':
      return 'status-ongoing'
    case '已结束':
      return 'status-ended'
    default:
      return 'status-notstarted'
  }
}
const statusClassForWaiting = computed(() => {
  return waitingForExam.value ? 'status-waiting' : 'status-notstarted'
})
const breakRemainingTime = computed(() => {
  if (nextExam.value) {
    return formatDuration(nextExam.value.start_time - currentTime.value)
  } else {
    return '-'
  }
})
const isExamToday = (exam) => {
  return new Date(exam.start_time * 1000).toDateString() === new Date(currentTime.value * 1000).toDateString()
}
const getExamStatusForList = (exam) => {
  if (currentTime.value >= exam.start_time && currentTime.value < exam.end_time) return '进行中'
  if (currentTime.value >= exam.end_time) return '已结束'
  if (!isExamToday(exam)) return '未开始'
  const remaining = exam.start_time - currentTime.value
  return remaining > 1200 ? '准备开始' : '即将开始'
}
const statusClassForList = (exam) => {
  const status = getExamStatusForList(exam)
  if (status === '进行中') return 'status-ongoing'
  else if (status === '已结束') return 'status-ended'
  else if (status === '等待开始') return 'status-waiting'
  else if (status === '未开始') return 'status-notstarted'
  else if (status === '准备开始') return 'status-notstarted'
  else if (status === '即将开始') return 'status-imminent'
  else return 'status-waiting'
}

// 公告逻辑
const announcementLabel = computed(() => {
  if (currentExam.value || waitingForExam.value) {
    return "当前科目公告："
  } else if (nextExam.value) {
    return "下一科目公告："
  } else {
    return ""
  }
})
const displayedAnnouncement = computed(() => {
  if (currentExam.value) {
    return currentExam.value.announcement || ''
  } else if (waitingForExam.value && manifest.value && manifest.value.exams.length > 0) {
    return manifest.value.exams[0].pre_announcement || ''
  } else if (nextExam.value) {
    return nextExam.value.pre_announcement || ''
  } else {
    return ''
  }
})

// 提醒逻辑：在“考试结束时间减去预设剩余时间”到该时刻后10秒内，只要处于该区间就触发提醒（且同一提醒只触发一次）
const checkReminders = () => {
  if (!currentExam.value || !currentExam.value.reminders) return
  currentExam.value.reminders.forEach(reminder => {
    const key = currentExam.value.subject + '_' + reminder.time_left
    const triggerMoment = currentExam.value.end_time - reminder.time_left * 60
    if (currentTime.value >= triggerMoment && currentTime.value <= triggerMoment + 10) {
      if (!triggeredReminders.value.has(key)) {
        triggeredReminders.value.add(key)
        saveTriggeredReminders()
        triggerFlash(reminder.message, 30)
      }
    }
  })
}

// 通知提示函数：先全屏闪动3次（每次2秒，共6秒），再缩小至顶部显示
let flashFullTimeout = null
let flashTopTimeout = null
const clearFlashTimeouts = () => {
  if (flashFullTimeout) {
    clearTimeout(flashFullTimeout)
    flashFullTimeout = null
  }
  if (flashTopTimeout) {
    clearTimeout(flashTopTimeout)
    flashTopTimeout = null
  }
}
const flashActive = ref(false)
const flashMessage = ref('')
const flashPhase = ref('')  // 'full'：全屏闪动；'top'：顶部提示
const triggerFlash = (message, displayTime) => {
  clearFlashTimeouts()
  flashActive.value = false
  flashMessage.value = ''
  flashPhase.value = ''
  flashMessage.value = message
  flashActive.value = true
  flashPhase.value = 'full'
  flashFullTimeout = setTimeout(() => {
    flashPhase.value = 'top'
  }, 6000)
  flashTopTimeout = setTimeout(() => {
    flashActive.value = false
    flashMessage.value = ''
    flashPhase.value = ''
  }, 6000 + displayTime * 1000)
}

// 根据考试数量调整科目名称字号
const subjectFontSize = computed(() => {
  const count = manifest.value && manifest.value.exams ? manifest.value.exams.length : 0
  if (count > 5) {
    let size = 40 - (count - 5) * 2
    size = size < 20 ? 20 : size
    return size + 'px'
  } else {
    return '40px'
  }
})
</script>

<style scoped>
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
.dashboard {
  width: 100%;
  min-height: 100vh;
  color: #fff;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  overflow-x: hidden;
}
.semi-transparent {
  background: rgba(255, 255, 255, 0.15);
  margin: 10px 0;
  padding: 15px;
  border-radius: 8px;
  box-sizing: border-box;
}
.exam-board {
  max-width: 100vw;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}
.exam-title {
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  word-break: break-word;
}
.global-announcement {
  font-size: 28px;
  text-align: center;
  margin-bottom: 20px;
  word-break: break-word;
}
.exam-announcement {
  font-size: 24px;
  text-align: center;
  margin-top: 10px;
  word-break: break-word;
}
.content-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.left-panel {
  flex: 0 0 40%;
  font-size: 28px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
}
.clock-container {
  text-align: center;
  margin-bottom: 10px;
}
.big-clock {
  font-size: 120px;
  font-weight: bold;
}
.subject-info {
  text-align: center;
}
.left-details {
  text-align: left;
}
.right-panel {
  flex: 1;
  font-size: 20px;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.right-panel h3 {
  text-align: center;
}
.right-panel .exam-list table {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  border-collapse: collapse;
  text-align: center;
}
.right-panel .exam-list th,
.right-panel .exam-list td {
  padding: 8px 12px;
  border: 1px solid #444;
  text-align: center;
}
.subject-cell {
  font-family: "华文新魏", "STXinwei", sans-serif;
  font-weight: bold;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}
.footer {
  font-size: 16px;
  text-align: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #666;
  user-select: none;
}
/* 状态样式 */
.status-notstarted {
  color: #000;
  background-color: #ffe4b5;
  padding: 4px 8px;
  border-radius: 4px;
}
.status-waiting {
  color: #fff;
  background-color: #1e90ff;
  padding: 4px 8px;
  border-radius: 4px;
}
.status-ongoing {
  color: #000;
  background-color: #d0f0c0;
  padding: 4px 8px;
  border-radius: 4px;
}
.status-ended {
  color: #fff;
  background-color: #b22222;
  padding: 4px 8px;
  border-radius: 4px;
}
.status-imminent {
  color: #000;
  background-color: #f0e68c;
  padding: 4px 8px;
  border-radius: 4px;
}
.status-break {
  color: #fff;
  background-color: #8A2BE2;
  padding: 4px 8px;
  border-radius: 4px;
}
.all-ended-message {
  text-align: center;
  font-size: 48px;
  font-weight: bold;
  margin: 100px 0;
}

/* 通知提示样式 */
.flash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:red;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: flashFull 2s linear 0s 3;
  z-index: 3000;
}
.flash-overlay .flash-text {
  color: white;
  font-size: 48px;
  animation: flashText 2s linear 0s 3;
}
.flash-top {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translate(-50%, 0);
  background: red;
  color: white;
  font-size: 24px;
  display: inline-block;
  padding: 10px 20px;
  border-radius: 10px;
  z-index: 3000;
  animation: moveUpShrink 0.8s ease-out forwards;
}

/* 动画关键帧 */
@keyframes flashFull {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes flashText {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes moveUpShrink {
  from { top: 50%; transform: translate(-50%, -50%) scale(1); }
  to { top: 0; transform: translate(-50%, 0) scale(0.7); }
}

/* 响应式设计增强 */
@media (max-width: 768px) {
  .content-row { flex-direction: column; }
  .big-clock { font-size: 80px; }
  .exam-title { font-size: 24px; }
  .global-announcement { font-size: 20px; }
  .subject-info, .left-panel { font-size: 18px; }
  .right-panel { font-size: 16px; }
  .flash-text { font-size: 32px; }
}
@media (max-width: 480px) {
  .big-clock { font-size: 60px; }
  .exam-title { font-size: 20px; }
  .global-announcement { font-size: 18px; }
  .subject-info, .left-panel { font-size: 16px; }
  .right-panel { font-size: 14px; }
  .flash-text { font-size: 28px; }
}
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-y: hidden;
}
</style>
