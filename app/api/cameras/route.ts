import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_CAMERAS } from '@/lib/storage'
import { CameraConfig } from '@/lib/types'
import { dbGetCameras, dbAddCamera, dbUpdateCamera } from '@/lib/supabase'
import { broadcastRealtime } from '@/lib/realtime'

let camerasStorage: CameraConfig[] = [...INITIAL_CAMERAS]

export async function GET() {
  try {
    const list = await dbGetCameras()
    if (list.length > 0) {
      camerasStorage = list
    }
    return NextResponse.json({ cameras: camerasStorage })
  } catch {
    console.error('Error fetching cameras from database')
    return NextResponse.json({ cameras: camerasStorage })
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
      id: 'cam_' + Math.random().toString(36).substring(2, 8),
      name: name.trim(),
      location: location?.trim() || 'Khu vực giám sát',
      streamType: streamType || 'simulation',
      streamUrl: streamUrl?.trim(),
      ipAddress: ipAddress?.trim() || '192.168.1.100',
      port: port ? Number(port) : 554,
      username: username?.trim() || 'admin',
      password: password ? '••••••••' : undefined,
      fps: fps ? Number(fps) : 30,
      isOnline: true,
      aiDetectionEnabled: true,
      autoZoomPlate: autoZoomPlate !== false,
      createdAt: new Date().toISOString(),
    }

    // Persist to Supabase
    await dbAddCamera(newCamera)
    camerasStorage.push(newCamera)

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
      isOnline,
      aiDetectionEnabled,
      autoZoomPlate,
    } = body

    const index = camerasStorage.findIndex((c) => c.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Không tìm thấy camera' }, { status: 404 })
    }

    const updatedCamera: CameraConfig = {
      ...camerasStorage[index],
      name: name ? name.trim() : camerasStorage[index].name,
      location: location ? location.trim() : camerasStorage[index].location,
      streamType: streamType || camerasStorage[index].streamType,
      streamUrl: streamUrl !== undefined ? streamUrl.trim() : camerasStorage[index].streamUrl,
      ipAddress: ipAddress !== undefined ? ipAddress.trim() : camerasStorage[index].ipAddress,
      port: port ? Number(port) : camerasStorage[index].port,
      username: username !== undefined ? username.trim() : camerasStorage[index].username,
      isOnline: isOnline !== undefined ? isOnline : camerasStorage[index].isOnline,
      aiDetectionEnabled:
        aiDetectionEnabled !== undefined ? aiDetectionEnabled : camerasStorage[index].aiDetectionEnabled,
      autoZoomPlate: autoZoomPlate !== undefined ? autoZoomPlate : camerasStorage[index].autoZoomPlate,
    }

    // Update in Supabase
    await dbUpdateCamera(updatedCamera)
    camerasStorage[index] = updatedCamera

    // Broadcast instant sync event to all connected browsers
    broadcastRealtime({
      type: 'cameras_updated',
      camera: updatedCamera,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, camera: camerasStorage[index] })
  } catch {
    console.error('Error updating camera')
    return NextResponse.json({ error: 'Lỗi khi cập nhật camera' }, { status: 500 })
  }
}
