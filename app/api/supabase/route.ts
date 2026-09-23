import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseCredentials,
  setCustomSupabaseCredentials,
  testSupabaseConnection,
  getSupabaseSqlSchema,
  dbGetVehicles,
  dbAddVehicle,
  dbGetCameras,
  dbAddCamera,
  dbAddDetectionLog,
  getSupabaseClient,
} from '@/lib/supabase'
import { INITIAL_VEHICLES, INITIAL_CAMERAS, INITIAL_EVENTS } from '@/lib/storage'

export async function GET() {
  try {
    const creds = getSupabaseCredentials()
    const testResult = await testSupabaseConnection(creds.url, creds.key)
    const sqlSchema = getSupabaseSqlSchema()

    // Mask key for UI security
    let maskedKey = ''
    if (creds.key) {
      if (creds.key.length > 12) {
        maskedKey = creds.key.substring(0, 6) + '••••••••' + creds.key.substring(creds.key.length - 4)
      } else {
        maskedKey = '••••••••'
      }
    }

    return NextResponse.json({
      configured: creds.isConfigured,
      url: creds.url,
      maskedKey,
      connection: testResult,
      sqlSchema,
    })
  } catch {
    console.error('Supabase status check error occurred')
    return NextResponse.json({ error: 'Lỗi kiểm tra trạng thái Supabase' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, url, key } = body

    if (action === 'test') {
      const result = await testSupabaseConnection(url, key)
      return NextResponse.json(result)
    }

    if (action === 'save') {
      if (url && key) {
        setCustomSupabaseCredentials(url, key)
      }
      const result = await testSupabaseConnection(url, key)
      return NextResponse.json({
        success: result.success,
        message: result.success
          ? 'Đã lưu và xác thực kết nối Supabase thành công!'
          : 'Đã lưu cấu hình nhưng chưa thể kết nối tới Supabase.',
        connection: result,
      })
    }

    if (action === 'seed') {
      const client = getSupabaseClient()
      if (!client) {
        return NextResponse.json(
          { error: 'Chưa kết nối Supabase, vui lòng cấu hình trước khi đồng bộ' },
          { status: 400 },
        )
      }

      // Seed vehicles
      let vehiclesAdded = 0
      for (const v of INITIAL_VEHICLES) {
        const ok = await dbAddVehicle(v)
        if (ok) vehiclesAdded++
      }

      // Seed cameras
      let camerasAdded = 0
      for (const c of INITIAL_CAMERAS) {
        const ok = await dbAddCamera(c)
        if (ok) camerasAdded++
      }

      // Seed sample logs
      let logsAdded = 0
      for (const l of INITIAL_EVENTS) {
        const ok = await dbAddDetectionLog(l)
        if (ok) logsAdded++
      }

      return NextResponse.json({
        success: true,
        message: `Đã đồng bộ thành công sang Supabase: ${vehiclesAdded} xe, ${camerasAdded} camera, ${logsAdded} nhật ký.`,
      })
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 })
  } catch {
    console.error('Supabase action processing error occurred')
    return NextResponse.json({ error: 'Lỗi xử lý yêu cầu Supabase' }, { status: 500 })
  }
}
