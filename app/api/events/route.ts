import { NextRequest, NextResponse } from 'next/server'
import { getGlobalLogs, addGlobalLog, deleteGlobalLog, clearGlobalLogs } from '@/lib/storage'
import { DetectionResult } from '@/lib/types'
import { dbGetDetectionLogs, dbAddDetectionLog, dbDeleteDetectionLog, dbClearDetectionLogs } from '@/lib/supabase'
import { broadcastRealtime } from '@/lib/realtime'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.toLowerCase() || ''
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let list: DetectionResult[] = []
  try {
    const dbLogs = await dbGetDetectionLogs()
    if (dbLogs !== null) {
      list = dbLogs
    } else {
      list = getGlobalLogs()
    }
  } catch {
    console.error('Error fetching detection events from database')
    list = getGlobalLogs()
  }

  if (query) {
    list = list.filter(
      (e) =>
        e.plateNumber.toLowerCase().includes(query) ||
        e.cameraName.toLowerCase().includes(query) ||
        (e.matchedVehicle?.driverName && e.matchedVehicle.driverName.toLowerCase().includes(query)) ||
        (e.matchedVehicle?.company && e.matchedVehicle.company.toLowerCase().includes(query)),
    )
  }

  if (status && status !== 'all') {
    list = list.filter((e) => e.status === status)
  }
  if (from) list = list.filter((e) => new Date(e.timestamp).getTime() >= new Date(from + 'T00:00:00+08:00').getTime())
  if (to) list = list.filter((e) => new Date(e.timestamp).getTime() <= new Date(to + 'T23:59:59+08:00').getTime())

  return NextResponse.json({ events: list, total: list.length })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const newEvent: DetectionResult = {
      ...body,
      id: body.id || 'evt_' + Math.random().toString(36).substring(2, 9),
      timestamp: body.timestamp || new Date().toISOString(),
    }

    // Persist to Supabase if available
    try {
      await dbAddDetectionLog(newEvent)
    } catch {
      // Supabase optional
    }
    addGlobalLog(newEvent)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'log_added',
      log: newEvent,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 })
  } catch {
    console.error('Error recording event')
    return NextResponse.json({ error: 'Không thể lưu nhật ký' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      try {
        await dbDeleteDetectionLog(id)
      } catch {
        // Supabase optional
      }
      deleteGlobalLog(id)
      broadcastRealtime({
        type: 'logs_updated',
        logId: id,
        timestamp: Date.now(),
      })
      return NextResponse.json({ success: true, message: 'Đã xóa bản ghi nhật ký' })
    }

    try {
      await dbClearDetectionLogs()
    } catch {
      // Supabase optional
    }
    clearGlobalLogs()
    broadcastRealtime({
      type: 'logs_updated',
      timestamp: Date.now(),
    })
    return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ nhật ký' })
  } catch {
    console.error('Error deleting detection log')
    return NextResponse.json({ error: 'Lỗi khi xóa nhật ký' }, { status: 500 })
  }
}
