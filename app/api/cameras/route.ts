import { NextRequest, NextResponse } from 'next/server'
import {
  getGlobalCameras,
  setGlobalCameras,
  addGlobalCamera,
  updateGlobalCamera,
  deleteGlobalCamera,
} from '@/lib/storage'
import { CameraConfig } from '@/lib/types'
import { dbGetCameras, dbAddCamera, dbUpdateCamera, dbDeleteCamera } from '@/lib/supabase'
import { broadcastRealtime } from '@/lib/realtime'

export async function GET() {
  try {
    const list = await dbGetCameras()
    if (list !== null) {
      setGlobalCameras(list)
      return NextResponse.json({ cameras: list })
    }
    return NextResponse.json({ cameras: getGlobalCameras() })
  } catch {
    console.error('Error fetching cameras from database')
    return NextResponse.json({ cameras: getGlobalCameras() })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, location, streamType, streamUrl, ipAddress, port, username, password, fps, autoZoomPlate } = body

    if (!name) {
      return NextResponse.json({ error: 'Tên camera là bắt buộc' }, { status: 400 })
    }

    const newCamera: CameraConfig = {
      id: body.id || 'cam_' + Math.random().toString(36).substring(2, 8),
      name: name.trim(),
      location: location?.trim() || 'CAN - KHU SUA CHUA',
      streamType: streamType || 'simulation',
      streamUrl: streamUrl?.trim() || '',
      ipAddress: ipAddress?.trim() || '',
      port: port ? Number(port) : 554,
      username: username?.trim() || '',
      password: password?.trim() || undefined,
      fps: fps ? Number(fps) : 30,
      isOnline: false,
      aiDetectionEnabled: true,
      autoZoomPlate: autoZoomPlate !== false,
      createdAt: new Date().toISOString(),
    }

    // Persist to Supabase and update global cache
    try {
      await dbAddCamera(newCamera)
    } catch {
      // Supabase optional
    }
    addGlobalCamera(newCamera)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'cameras_updated',
      camera: newCamera,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, camera: newCamera }, { status: 201 })
  } catch {
    console.error('Error adding camera')
    return NextResponse.json({ error: 'Lỗi khi lưu cấu hình camera' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      name,
      location,
      streamType,
      streamUrl,
      ipAddress,
      port,
      username,
      password,
      isOnline,
      aiDetectionEnabled,
      autoZoomPlate,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã camera (ID)' }, { status: 400 })
    }

    const currentList = getGlobalCameras()
    const existing = currentList.find((c) => c.id === id)

    const updatedCamera: CameraConfig = {
      id,
      name: name ? name.trim() : existing?.name || 'Camera IP',
      location: location ? location.trim() : existing?.location || 'CAN - KHU SUA CHUA',
      streamType: streamType || existing?.streamType || 'rtsp',
      streamUrl: streamUrl !== undefined ? streamUrl.trim() : existing?.streamUrl || '',
      ipAddress: ipAddress !== undefined ? ipAddress.trim() : existing?.ipAddress || '',
      port: port ? Number(port) : existing?.port || 554,
      username: username !== undefined ? username.trim() : existing?.username || '',
      password:
        password !== undefined && password.trim() && password !== '••••••••' ? password.trim() : existing?.password,
      isOnline: isOnline !== undefined ? isOnline : existing?.isOnline === true,
      aiDetectionEnabled:
        aiDetectionEnabled !== undefined ? aiDetectionEnabled : existing?.aiDetectionEnabled !== false,
      autoZoomPlate: autoZoomPlate !== undefined ? autoZoomPlate : existing?.autoZoomPlate !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
    }

    // Update in Supabase and global cache
    try {
      await dbUpdateCamera(updatedCamera)
    } catch {
      // Supabase optional
    }
    updateGlobalCamera(updatedCamera)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'cameras_updated',
      camera: updatedCamera,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, camera: updatedCamera })
  } catch {
    console.error('Error updating camera')
    return NextResponse.json({ error: 'Lỗi khi cập nhật camera' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID camera cần xóa' }, { status: 400 })
    }

    try {
      await dbDeleteCamera(id)
    } catch {
      // Supabase optional
    }
    deleteGlobalCamera(id)

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'cameras_updated',
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, message: 'Đã xóa camera thành công' })
  } catch {
    console.error('Error deleting camera')
    return NextResponse.json({ error: 'Lỗi khi xóa camera' }, { status: 500 })
  }
}
