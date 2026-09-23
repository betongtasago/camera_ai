import { NextRequest, NextResponse } from 'next/server'
import {
  getGlobalVehicles,
  setGlobalVehicles,
  addGlobalVehicle,
  updateGlobalVehicle,
  deleteGlobalVehicle,
} from '@/lib/storage'
import { Vehicle } from '@/lib/types'
import { dbGetVehicles, dbAddVehicle, dbUpdateVehicle, dbDeleteVehicle } from '@/lib/supabase'
import { broadcastRealtime } from '@/lib/realtime'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.toLowerCase() || ''
  const status = searchParams.get('status')

  // Load from Supabase (or fallback to global memory)
  let results: Vehicle[] = []
  try {
    const dbList = await dbGetVehicles()
    if (dbList !== null) {
      setGlobalVehicles(dbList)
      results = dbList
    } else {
      results = getGlobalVehicles()
    }
  } catch {
    console.error('Error retrieving vehicles from database')
    results = getGlobalVehicles()
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

    // Support batch import (e.g. from CSV / Excel)
    if (Array.isArray(body.vehicles)) {
      const currentList = getGlobalVehicles()
      const imported: Vehicle[] = []

      for (const item of body.vehicles) {
        if (!item.plateNumber) continue
        const cleanPlate = item.plateNumber.trim().toUpperCase()

        const newV: Vehicle = {
          id: item.id || 'veh_' + Math.random().toString(36).substring(2, 9),
          plateNumber: cleanPlate,
          driverName: item.driverName?.trim() || 'Tài xế theo xe',
          vehicleType: item.vehicleType?.trim() || 'Xe bồn bê tông',
          company: item.company?.trim() || 'Bê Tông Xanh Sài Gòn',
          phoneNumber: item.phoneNumber?.trim() || '',
          status: item.status || 'approved',
          notes: item.notes?.trim() || 'Nhập từ file Excel',
          registeredAt: item.registeredAt || new Date().toISOString(),
        }

        addGlobalVehicle(newV)
        imported.push(newV)
        try {
          await dbAddVehicle(newV)
        } catch {
          // Ignore individual db error during batch
        }
      }

      broadcastRealtime({
        type: 'vehicles_updated',
        action: 'create',
        timestamp: Date.now(),
      })

      return NextResponse.json({
        success: true,
        count: imported.length,
        vehicles: getGlobalVehicles(),
      })
    }

    const { plateNumber, driverName, vehicleType, company, phoneNumber, status, notes } = body

    if (!plateNumber || !driverName || !vehicleType) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ: Biển số xe, Tên tài xế, và Loại xe' }, { status: 400 })
    }

    // Standardize plate number (e.g., 51N-043.57)
    const normalizedPlate = plateNumber.trim().toUpperCase()
    const cleanPlateNumber = normalizedPlate.replace(/[^A-Z0-9]/g, '')

    // Check duplicate in current memory
    const currentList = getGlobalVehicles()
    const existing = currentList.find(
      (v) => v.plateNumber.replace(/[^A-Z0-9]/g, '') === cleanPlateNumber,
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

    // Persist to Supabase and update global cache
    try {
      await dbAddVehicle(newVehicle)
    } catch {
      // Supabase optional
    }
    addGlobalVehicle(newVehicle)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'vehicles_updated',
      action: 'create',
      vehicle: newVehicle,
      timestamp: Date.now(),
    })

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

    if (!id && !plateNumber) {
      return NextResponse.json({ error: 'Thiếu mã định danh xe hoặc biển số' }, { status: 400 })
    }

    const currentList = getGlobalVehicles()
    const targetId = id || ''
    const cleanPlate = plateNumber ? plateNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : ''

    const existing = currentList.find(
      (v) => v.id === targetId || (cleanPlate && v.plateNumber.replace(/[^A-Z0-9]/g, '') === cleanPlate),
    )

    const updatedVehicle: Vehicle = {
      id: existing?.id || targetId || 'veh_' + Math.random().toString(36).substring(2, 9),
      plateNumber: plateNumber ? plateNumber.trim().toUpperCase() : existing?.plateNumber || '',
      driverName: driverName !== undefined ? driverName.trim() : existing?.driverName || '',
      vehicleType: vehicleType !== undefined ? vehicleType.trim() : existing?.vehicleType || '',
      company: company !== undefined ? company.trim() : existing?.company || '',
      phoneNumber: phoneNumber !== undefined ? phoneNumber.trim() : existing?.phoneNumber || '',
      status: status || existing?.status || 'approved',
      notes: notes !== undefined ? notes.trim() : existing?.notes || '',
      registeredAt: existing?.registeredAt || new Date().toISOString(),
    }

    // Update in Supabase and global cache
    try {
      await dbUpdateVehicle(updatedVehicle)
    } catch {
      // Supabase optional
    }
    updateGlobalVehicle(updatedVehicle)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'vehicles_updated',
      action: 'update',
      vehicle: updatedVehicle,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, vehicle: updatedVehicle })
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

    // Delete in Supabase and global cache
    try {
      await dbDeleteVehicle(id)
    } catch {
      // Supabase optional
    }
    deleteGlobalVehicle(id)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'vehicles_updated',
      action: 'delete',
      vehicleId: id,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, message: 'Đã xóa xe khỏi danh mục' })
  } catch {
    console.error('Error deleting vehicle')
    return NextResponse.json({ error: 'Không thể xóa xe' }, { status: 500 })
  }
}
