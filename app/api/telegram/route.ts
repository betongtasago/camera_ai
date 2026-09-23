import { NextRequest, NextResponse } from 'next/server'
import { getGlobalTelegramConfig, setGlobalTelegramConfig } from '@/lib/storage'
import { dbGetTelegramConfig, dbSaveTelegramConfig } from '@/lib/supabase'
import { broadcastRealtime } from '@/lib/realtime'

// GET: Retrieve telegram settings
export async function GET() {
  try {
    const dbConfig = await dbGetTelegramConfig()
    if (dbConfig.botToken || dbConfig.chatId) {
      setGlobalTelegramConfig(dbConfig)
    }
  } catch {
    console.error('Error reading telegram config from database')
  }

  const telegramConfig = getGlobalTelegramConfig()
  return NextResponse.json({
    config: {
      ...telegramConfig,
      // Mask token slightly for privacy if set
      botToken: telegramConfig.botToken
        ? telegramConfig.botToken.substring(0, 8) + '••••••••' + telegramConfig.botToken.slice(-4)
        : '',
      hasToken: Boolean(telegramConfig.botToken),
      rawToken: telegramConfig.botToken,
    },
  })
}

// PUT: Update telegram settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const updated = setGlobalTelegramConfig({
      ...(body.botToken !== undefined && { botToken: body.botToken }),
      ...(body.chatId !== undefined && { chatId: body.chatId }),
      ...(body.enabled !== undefined && { enabled: Boolean(body.enabled) }),
      ...(body.notifyOnAllVehicles !== undefined && {
        notifyOnAllVehicles: Boolean(body.notifyOnAllVehicles),
      }),
    })

    // Persist to Supabase
    await dbSaveTelegramConfig(updated)
    broadcastRealtime({ type: 'settings_updated', section: 'telegram', timestamp: Date.now() })

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình Telegram thành công',
      config: updated,
    })
  } catch {
    console.error('Error updating telegram config')
    return NextResponse.json({ error: 'Không thể cập nhật cấu hình Telegram' }, { status: 500 })
  }
}
