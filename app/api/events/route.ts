import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_EVENTS } from '@/lib/storage'
import { DetectionResult } from '@/lib/types'

let eventsStorage: DetectionResult[] = [...INITIAL_EVENTS]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.toLowerCase() || ''
  const status = searchParams.get('status')

  let list = [...eventsStorage]

  if (query) {
    list = list.filter(
      (e) =>
        e.plateNumber.toLowerCase().includes(query) ||
        e.cameraName.toLowerCase().includes(query) ||
        (e.matchedVehicle?.driverName && e.matchedVehicle.driverName.toLowerCase().includes(query)) ||
        (e.matchedVehicle?.company && e.matchedVehicle.company.toLowerCase().includes(query))
    )
  }

  if (status && status !== 'all') {
    list = list.filter((e) => e.status === status)
  }

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
    eventsStorage.unshift(newEvent)
    if (eventsStorage.length > 100) {
      eventsStorage = eventsStorage.slice(0, 100)
    }
    return NextResponse.json({ success: true, event: newEvent }, { status: 201 })
  } catch {
    console.error('Error recording event')
    return NextResponse.json({ error: 'Không thể lưu nhật ký' }, { status: 500 })
  }
}

export async function DELETE() {
  eventsStorage = []
  return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ nhật ký' })
}
