import { NextRequest, NextResponse } from 'next/server'
import {
  setGlobalVehicles,
  addGlobalVehicle,
  updateGlobalVehicle,
  deleteGlobalVehicle,
} from '@/lib/storage'
import { Vehicle } from '@/lib/types'
import {
  dbAddVehicle,
  dbGetVehicles,
  dbUpdateVehicle,
  dbDeleteVehicle,
  dbDeleteAllVehicles,
  getSupabaseCredentials,
} from '@/lib/supabase'
import { broadcastRealtime } from '@/lib/realtime'

function supabaseUnavailable() {
  return NextResponse.json(
    { error: 'Danh sách xe yêu cầu kết nối Supabase. Vui lòng cấu hình Supabase trước.' },
    { status: 503 },
  )
}

function normalizePlate(value: string): string {
  return value.trim().toUpperCase()
}

function plateKey(value: string): string {
  return normalizePlate(value).replace(/[^A-Z0-9]/g, '')
}

function toVehicle(item: Partial<Vehicle> & { plateNumber?: string }): Vehicle {
  return {
    id: item.id || 'veh_' + Math.random().toString(36).substring(2, 9),
    plateNumber: normalizePlate(item.plateNumber || ''),
    driverName: item.driverName?.trim() || 'Tài xế theo xe',
    vehicleType: item.vehicleType?.trim() || 'Xe bồn bê tông',
    company: item.company?.trim() || 'Bê Tông Xanh Sài Gòn',
    notes: item.notes?.trim() || '',
    registeredAt: item.registeredAt || new Date().toISOString(),
  }
}

async function readSupabaseVehicles(): Promise<Vehicle[] | null> {
  return dbGetVehicles()
}

export async function GET(req: NextRequest) {
  const { isConfigured } = getSupabaseCredentials()
  if (!isConfigured) return supabaseUnavailable()

  const sourceVehicles = await readSupabaseVehicles()
  if (!sourceVehicles) {
    return NextResponse.json({ error: 'Không thể đọc danh sách xe từ Supabase' }, { status: 502 })
  }

  setGlobalVehicles(sourceVehicles)
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.toLowerCase().trim() || ''
  const results = query
    ? sourceVehicles.filter(
        (v) =>
          v.plateNumber.toLowerCase().includes(query) ||
          v.driverName.toLowerCase().includes(query) ||
          v.vehicleType.toLowerCase().includes(query) ||
          v.company.toLowerCase().includes(query),
      )
    : sourceVehicles

  return NextResponse.json({ vehicles: results, total: results.length, source: 'supabase' })
}

export async function POST(req: NextRequest) {
  try {
    if (!getSupabaseCredentials().isConfigured) return supabaseUnavailable()
    const body = await req.json()

    if (Array.isArray(body.vehicles)) {
      const current = (await readSupabaseVehicles()) || []
      const seen = new Set(current.map((v) => plateKey(v.plateNumber)))
      const imported: Vehicle[] = []

      for (const item of body.vehicles) {
        if (!item.plateNumber) continue
        const vehicle = toVehicle(item)
        const key = plateKey(vehicle.plateNumber)
        if (seen.has(key)) continue
        if (!(await dbAddVehicle(vehicle))) {
          return NextResponse.json({ error: `Không thể lưu xe ${vehicle.plateNumber} vào Supabase` }, { status: 502 })
        }
        seen.add(key)
        imported.push(vehicle)
      }

      const latest = (await readSupabaseVehicles()) || []
      setGlobalVehicles(latest)
      broadcastRealtime({ type: 'vehicles_updated', action: 'create', timestamp: Date.now() })
      return NextResponse.json({ success: true, count: imported.length, vehicles: latest, source: 'supabase' })
    }

    const { plateNumber, driverName, vehicleType, company, notes } = body
    if (!plateNumber || !driverName || !vehicleType) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ: Biển số xe, Tên tài xế, và Loại xe' }, { status: 400 })
    }

    const normalizedPlate = normalizePlate(plateNumber)
    const currentList = (await readSupabaseVehicles()) || []
    if (currentList.some((v) => plateKey(v.plateNumber) === plateKey(normalizedPlate))) {
      return NextResponse.json({ error: `Biển số xe ${normalizedPlate} đã tồn tại trong danh mục!` }, { status: 409 })
    }

    const newVehicle = toVehicle({ plateNumber: normalizedPlate, driverName, vehicleType, company, notes })
    if (!(await dbAddVehicle(newVehicle))) {
      return NextResponse.json({ error: 'Không thể lưu xe vào Supabase' }, { status: 502 })
    }

    addGlobalVehicle(newVehicle)
    broadcastRealtime({ type: 'vehicles_updated', action: 'create', vehicle: newVehicle, timestamp: Date.now() })
    return NextResponse.json({ success: true, vehicle: newVehicle, source: 'supabase' }, { status: 201 })
  } catch {
    console.error('Error adding vehicle')
    return NextResponse.json({ error: 'Không thể thêm xe vào hệ thống' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!getSupabaseCredentials().isConfigured) return supabaseUnavailable()
    const body = await req.json()
    const { id, plateNumber, driverName, vehicleType, company, notes } = body
    if (!id && !plateNumber) {
      return NextResponse.json({ error: 'Thiếu mã định danh xe hoặc biển số' }, { status: 400 })
    }

    const currentList = (await readSupabaseVehicles()) || []
    const existing = currentList.find(
      (v) => v.id === id || (plateNumber && plateKey(v.plateNumber) === plateKey(plateNumber)),
    )
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy xe trong Supabase' }, { status: 404 })

    const nextPlate = plateNumber ? normalizePlate(plateNumber) : existing.plateNumber
    const duplicate = currentList.find((v) => v.id !== existing.id && plateKey(v.plateNumber) === plateKey(nextPlate))
    if (duplicate) return NextResponse.json({ error: `Biển số xe ${nextPlate} đã tồn tại trong danh mục!` }, { status: 409 })

    const updatedVehicle: Vehicle = {
      ...existing,
      plateNumber: nextPlate,
      driverName: driverName !== undefined ? driverName.trim() : existing.driverName,
      vehicleType: vehicleType !== undefined ? vehicleType.trim() : existing.vehicleType,
      company: company !== undefined ? company.trim() : existing.company,
      notes: notes !== undefined ? notes.trim() : existing.notes,
    }

    if (!(await dbUpdateVehicle(updatedVehicle))) {
      return NextResponse.json({ error: 'Không thể cập nhật xe trong Supabase' }, { status: 502 })
    }

    updateGlobalVehicle(updatedVehicle)
    broadcastRealtime({ type: 'vehicles_updated', action: 'update', vehicle: updatedVehicle, timestamp: Date.now() })
    return NextResponse.json({ success: true, vehicle: updatedVehicle, source: 'supabase' })
  } catch {
    console.error('Error updating vehicle')
    return NextResponse.json({ error: 'Không thể cập nhật thông tin xe' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!getSupabaseCredentials().isConfigured) return supabaseUnavailable()
    const { searchParams } = new URL(req.url)

    if (searchParams.get('all') === 'true') {
      if (!(await dbDeleteAllVehicles())) {
        return NextResponse.json({ error: 'Không thể xóa danh sách xe trong Supabase' }, { status: 502 })
      }
      setGlobalVehicles([])
      broadcastRealtime({ type: 'vehicles_updated', action: 'clear', timestamp: Date.now() })
      return NextResponse.json({ success: true, source: 'supabase', message: 'Đã xóa toàn bộ danh mục xe khỏi Supabase' })
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Thiếu ID xe cần xóa' }, { status: 400 })
    if (!(await dbDeleteVehicle(id))) {
      return NextResponse.json({ error: 'Không thể xóa xe trong Supabase' }, { status: 502 })
    }

    deleteGlobalVehicle(id)
    broadcastRealtime({ type: 'vehicles_updated', action: 'delete', vehicleId: id, timestamp: Date.now() })
    return NextResponse.json({ success: true, source: 'supabase', message: 'Đã xóa xe khỏi Supabase' })
  } catch {
    console.error('Error deleting vehicle')
    return NextResponse.json({ error: 'Không thể xóa xe' }, { status: 500 })
  }
}
