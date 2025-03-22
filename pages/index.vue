<template>
  <div class="dashboard" :style="backgroundStyle">
    <!-- 在 cookie 校验前，只显示背景 -->
    <template v-if="cookieChecked">
      <div class="exam-board">

        <!-- 考试名称（最上方） -->
        <div class="exam-title semi-transparent">
          {{ manifest?.organization_name }} - {{ manifest?.exam_name }}
        </div>

        <!-- 全局公告（包含大公告和科目公告，均增大字体） -->
        <div class="global-announcement semi-transparent">
          {{ manifest?.general_announcement }}
          <div v-if="displayedAnnouncement" class="exam-announcement">
            <strong>{{ announcementLabel }}</strong> {{ displayedAnnouncement }}
          </div>
        </div>

        <!-- 当所有考试都结束时，隐藏左右两侧内容，显示统一提示 -->
        <div v-if="allExamsEnded" class="all-ended-message">
          所有考试已结束
        </div>
        <template v-else>
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
                <!-- 当天没有其他考试时，隐藏详细信息，显示提示 -->
                <h3 v-if="currentExam">
                  当前科目：{{ currentExam.subject }}
                </h3>
                <h3 v-else-if="isTodayEnded">
                  当天考试已结束
                </h3>
                <h3 v-else>
                  课间休息中
                </h3>
                <!-- 仅当天考试未结束时显示考试时间、状态和剩余时间 -->
                <template v-if="!isTodayEnded">
                  <!-- 考试时间：仅显示时间，不显示日期 -->
                  <div v-if="currentExam || nextExam">
                    <strong>考试时间：</strong>
                    <span v-if="currentExam">
                      {{ formatTimeOnly(currentExam.start_time) }} - {{ formatTimeOnly(currentExam.end_time) }}
                    </span>
                    <span v-else-if="nextExam">
                      {{ formatTimeOnly(nextExam.start_time) }} - {{ formatTimeOnly(nextExam.end_time) }}
                    </span>
                    <span v-else>--</span>
                  </div>
                  <!-- 新增显示携带日期的开始时间和结束时间 -->
                  <div v-if="currentExam || nextExam">
                    <strong>开始日期时间：</strong>
                    <span v-if="currentExam">
                      {{ formatTime(currentExam.start_time) }}
                    </span>
                    <span v-else-if="nextExam">
                      {{ formatTime(nextExam.start_time) }}
                    </span>
                  </div>
                  <div v-if="currentExam || nextExam">
                    <strong>结束日期时间：</strong>
                    <span v-if="currentExam">
                      {{ formatTime(currentExam.end_time) }}
                    </span>
                    <span v-else-if="nextExam">
                      {{ formatTime(nextExam.end_time) }}
                    </span>
                  </div>
                  <div>
                    <strong>考试状态：</strong>
                    <span :class="statusClass(currentExam || nextExam)">
                      {{ displayExamStatus }}
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
                </template>
              </div>
            </div>

            <!-- 右侧：考试科目列表（所有内容居中显示） -->
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
                    <!-- 为科目名称增加专门的 class 来调整字体及样式 -->
                    <td class="subject-cell">{{ exam.subject }}</td>
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
        </template>

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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const cookieChecked = ref(false)
// 检查 cookie（仅显示背景，其他内容待校验完毕后显示）
function getCookie(name) {
  const value = document.cookie
  const parts = value.split(name + '=')
  if (parts.length === 2) return parts.pop().split(';').shift()
}
onBeforeMount(() => {
  // 执行 cookie 校验
  if (!getCookie('otpVerified')) {
    router.push('/check')
  } else {
    cookieChecked.value = true
  }
})

// 背景样式：始终铺满整个视窗
const backgroundStyle = {
  background: "url('./background.png') no-repeat center center / cover",
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

// 修改格式化时间函数，显示日期和星期
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

// 新增格式化函数，仅显示时间
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

// 计算当前考试和下一个考试
const currentExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time <= currentTime.value && exam.end_time > currentTime.value)
})
const nextExam = computed(() => {
  if (!manifest.value || !manifest.value.exams) return null
  return manifest.value.exams.find(exam => exam.start_time > currentTime.value)
})

// 判断当天是否全部结束
const isTodayEnded = computed(() => {
  if (!manifest.value || !manifest.value.exams) return false
  const today = new Date(currentTime.value * 1000).toDateString()
  const todayExams = manifest.value.exams.filter(exam => new Date(exam.start_time * 1000).toDateString() === today)
  return todayExams.length > 0 && todayExams.every(exam => exam.end_time <= currentTime.value)
})
// 判断所有考试是否全部结束
const allExamsEnded = computed(() => {
  return manifest.value &&
      manifest.value.exams.length > 0 &&
      manifest.value.exams.every(exam => exam.end_time <= currentTime.value)
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

// 新增 computed：考试状态显示逻辑
const displayExamStatus = computed(() => {
  if (currentExam.value) {
    return getExamStatus(currentExam.value)
  } else {
    if (isTodayEnded.value) {
      return "当天考试已结束"
    } else {
      return "已结束"
    }
  }
})

// 新增 computed：公告逻辑
const announcementLabel = computed(() => {
  if (currentExam.value) {
    return "当前科目公告："
  } else if (nextExam.value) {
    return "下一个科目公告："
  } else {
    return ""
  }
})
const displayedAnnouncement = computed(() => {
  if (currentExam.value) {
    return currentExam.value.announcement || ''
  } else if (nextExam.value) {
    return nextExam.value.announcement || ''
  } else {
    return ''
  }
})

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
/* 整体铺满屏幕 */
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
}
.semi-transparent {
  background: rgba(255, 255, 255, 0.15);
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
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}
.global-announcement {
  font-size: 28px;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
}
.exam-announcement {
  font-size: 24px;
  color: #fff;
  text-align: center;
  margin-top: 10px;
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
.right-panel {
  flex: 1;
  font-size: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.right-panel h3 {
  text-align: center;
}
/* 表格占满整个 right-panel */
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
/* 修改科目名称样式：使用华文新魏字体，调大且撑满单元格 */
.subject-cell {
  font-family: "华文新魏", "STXinwei", sans-serif;
  font-size: 40px;
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
.status-rest {
  color: #fff;
  background-color: #444;
  padding: 4px 8px;
  border-radius: 4px;
}
/* 提示所有考试结束的样式：居中、较大 */
.all-ended-message {
  text-align: center;
  font-size: 48px;
  font-weight: bold;
  margin: 100px 0;
}

/* 提醒消息 */
.flash-message {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.8);
  padding: 10px 20px;
  font-size: 24px;
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

/* 响应式：小屏幕下堆叠显示 */
@media (max-width: 768px) {
  .content-row {
    flex-direction: column;
  }
}
</style>
