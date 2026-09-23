import { NextRequest, NextResponse } from 'next/server'
import { DetectionResult } from '@/lib/types'
import { getGlobalTelegramConfig } from '@/lib/storage'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ tài khoản Admin mới được gửi báo cáo Telegram' }, { status: 403 })
    }
    const body = await req.json()
    const { token, chatId, detection, testMessage } = body

    const globalConfig = getGlobalTelegramConfig()
    const botToken = token || globalConfig.botToken || process.env.TELEGRAM_BOT_TOKEN
    const targetChatId = chatId || globalConfig.chatId || process.env.TELEGRAM_CHAT_ID

    // Case 1: Test message ping
    if (testMessage) {
      if (!botToken || !targetChatId) {
        return NextResponse.json({
          success: true,
          simulated: true,
          message:
            'Mô phỏng gửi tin nhắn thử nghiệm Telegram thành công! (Điền Bot Token & Chat ID để gửi tới nhóm thực tế)',
        })
      }

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
      const text = `🔔 *[CamerAI] KIỂM TRA KẾT NỐI TELEGRAM BOT*\n\n✅ Kết nối thành công tới hệ thống giám sát Camera IP & Nhận diện Biển số Xe!\n⏱️ Thời gian: ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Etc/GMT-8', dateStyle: 'short', timeStyle: 'medium' }).format(new Date())}`

      const res = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      })

      const tgResult = await res.json()
      if (!res.ok || !tgResult.ok) {
        return NextResponse.json(
          {
            success: false,
            error: tgResult.description || 'Lỗi từ Telegram API',
          },
          { status: 400 },
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Đã gửi tin nhắn thử nghiệm đến Telegram thành công!',
      })
    }

    // Case 2: Vehicle detection alert
    const det = detection as DetectionResult
    if (!det || !det.plateNumber) {
      return NextResponse.json({ error: 'Thiếu dữ liệu xe nhận diện' }, { status: 400 })
    }

    const timeStr = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Etc/GMT-8', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(det.timestamp || new Date()))
    const matchStatus = det.isMatch ? '✅ *XE ĐÃ ĐĂNG KÝ*' : '⚠️ *XE NGOÀI DANH MỤC*'

    const messageText = [
      `🚨 *[CamerAI] PHÁT HIỆN XE QUA CAMERA*`,
      ``,
      `🔢 *Biển số xe:* \`${det.plateNumber}\``,
      `👤 *Tài xế:* ${det.matchedVehicle?.driverName || 'Chưa có trong danh mục'}`,
      `🚛 *Loại xe:* ${det.matchedVehicle?.vehicleType || det.vehicleType || 'Xe tải/bồn'}`,
      `🏢 *Đơn vị:* ${det.matchedVehicle?.company || det.details?.brand || 'Khách vãng lai'}`,
      `📷 *Vị trí camera:* \`${det.locationTag || det.cameraName || 'Cổng cân'}\``,
      `⏱️ *Thời gian:* ${timeStr}`,
      `🎯 *Độ chính xác AI:* ${det.confidence}%`,
      `🔍 *Trạng thái:* ${matchStatus}`,
      ``,
      `_Hệ thống giám sát Camera IP ANPR - CamerAI_`,
    ].join('\n')

    // If botToken and chatId are present, send to real Telegram API
    if (botToken && targetChatId) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
        const res = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: messageText,
            parse_mode: 'Markdown',
          }),
        })

        const tgResult = await res.json()
        if (res.ok && tgResult.ok) {
          return NextResponse.json({
            success: true,
            realSent: true,
            message: `Đã gửi cảnh báo xe ${det.plateNumber} đến Telegram!`,
          })
        }
      } catch {
        console.error('Error contacting Telegram API')
      }
    }

    // Fallback simulated response
    return NextResponse.json({
      success: true,
      realSent: false,
      simulated: true,
      message: `Đã ghi nhận thông báo xe ${det.plateNumber} (Chế độ mô phỏng Telegram)`,
    })
  } catch {
    console.error('Error sending Telegram notification')
    return NextResponse.json({ error: 'Lỗi máy chủ khi gửi thông báo Telegram' }, { status: 500 })
  }
}
