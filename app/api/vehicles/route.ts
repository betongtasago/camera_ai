import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_VEHICLES } from '@/lib/storage'
import { Vehicle } from '@/lib/types'
import { dbGetVehicles, dbAddVehicle, dbUpdateVehicle, dbDeleteVehicle } from '@/lib/supabase'

// In-memory cache for fallback
let fleetStorage: Vehicle[] = [...INITIAL_VEHICLES]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.toLowerCase() || ''
  const status = searchParams.get('status')

  // Load from Supabase (or fallback)
  let results: Vehicle[] = []
  try {
    results = await dbGetVehicles()
    if (results.length > 0) {
      fleetStorage = results
    } else {
      results = [...fleetStorage]
    }
  } catch {
    console.error('Error retrieving vehicles from database')
    results = [...fleetStorage]
  }

  if (query) {
    results = results.filter(
      (v) =>
        v.plateNumber.toLowerCase().includes(query) ||
        v.driverName.toLowerCase().includes(query) ||
        v.vehicleType.toLowerCase().includes(query) ||
        v.company.toLowerCase().includes(query),
    )
  }

  if (status && status !== 'all') {
    results = results.filter((v) => v.status === status)
  }

  return NextResponse.json({ vehicles: results, total: results.length })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plateNumber, driverName, vehicleType, company, phoneNumber, status, notes } = body

    if (!plateNumber || !driverName || !vehicleType) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ: Biển số xe, Tên tài xế, và Loại xe' }, { status: 400 })
    }

    // Standardize plate number (e.g., 51N-043.57)
    const normalizedPlate = plateNumber.trim().toUpperCase()

    // Check duplicate
    const existing = fleetStorage.find(
      (v) => v.plateNumber.replace(/[^A-Z0-9]/g, '') === normalizedPlate.replace(/[^A-Z0-9]/g, ''),
    )
    if (existing) {
      return NextResponse.json({ error: `Biển số xe ${normalizedPlate} đã tồn tại trong danh mục!` }, { status: 409 })
    }

    const newVehicle: Vehicle = {
      id: 'veh_' + Math.random().toString(36).substring(2, 9),
      plateNumber: normalizedPlate,
      driverName: driverName.trim(),
      vehicleType: vehicleType.trim(),
      company: company?.trim() || 'Bê Tông Xanh Sài Gòn',
      phoneNumber: phoneNumber?.trim() || '',
      status: status || 'approved',
      notes: notes?.trim() || '',
      registeredAt: new Date().toISOString(),
    }

    // Persist to Supabase and update local cache
    await dbAddVehicle(newVehicle)
    fleetStorage.unshift(newVehicle)

    return NextResponse.json({ success: true, vehicle: newVehicle }, { status: 201 })
  } catch {
    console.error('Error adding vehicle')
    return NextResponse.json({ error: 'Không thể thêm xe vào hệ thống' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, plateNumber, driverName, vehicleType, company, phoneNumber, status, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã định danh xe (ID)' }, { status: 400 })
    }

    const index = fleetStorage.findIndex((v) => v.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Không tìm thấy xe trong danh mục' }, { status: 404 })
    }

    const updatedVehicle: Vehicle = {
      ...fleetStorage[index],
      plateNumber: plateNumber ? plateNumber.trim().toUpperCase() : fleetStorage[index].plateNumber,
      driverName: driverName ? driverName.trim() : fleetStorage[index].driverName,
      vehicleType: vehicleType ? vehicleType.trim() : fleetStorage[index].vehicleType,
      company: company ? company.trim() : fleetStorage[index].company,
      phoneNumber: phoneNumber !== undefined ? phoneNumber.trim() : fleetStorage[index].phoneNumber,
      status: status || fleetStorage[index].status,
      notes: notes !== undefined ? notes.trim() : fleetStorage[index].notes,
    }

    // Update in Supabase and cache
    await dbUpdateVehicle(updatedVehicle)
    fleetStorage[index] = updatedVehicle

    return NextResponse.json({ success: true, vehicle: fleetStorage[index] })
  } catch {
    console.error('Error updating vehicle')
    return NextResponse.json({ error: 'Không thể cập nhật thông tin xe' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID xe cần xóa' }, { status: 400 })
    }

    // Delete in Supabase and cache
    await dbDeleteVehicle(id)
    fleetStorage = fleetStorage.filter((v) => v.id !== id)

    return NextResponse.json({ success: true, message: 'Đã xóa xe khỏi danh mục' })
  } catch {
    console.error('Error deleting vehicle')
    return NextResponse.json({ error: 'Không thể xóa xe' }, { status: 500 })
  }
}
