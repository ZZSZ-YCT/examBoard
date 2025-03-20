// server/api/verifyOtp.ts
import { readBody } from 'h3'
import { generateTOTP } from '~/utils/totp'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { otpInput } = body

    const config = useRuntimeConfig()
    const otpSecret = config.NUXT_OTP_SECRET

    const expected = generateTOTP(otpSecret)

    if (otpInput === expected) {
        return { success: true }
    } else {
        return { success: false, error: '验证码错误，请重新输入' }
    }
})
