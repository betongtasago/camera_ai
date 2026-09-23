import { Vehicle, CameraConfig, DetectionResult, SupabaseConfig, TelegramConfig } from './types'

export const INITIAL_VEHICLES: Vehicle[] = []

export const INITIAL_CAMERAS: CameraConfig[] = [
  {
    id: 'cam_01',
    name: 'CAM 01 - Cân xe / Khu sửa chữa',
    location: 'CAN - KHU SUA CHUA',
    streamType: 'rtsp',
    streamUrl: 'rtsp://admin:CamerAI@2026@192.168.1.108:554/ch1/main',
    ipAddress: '192.168.1.108',
    port: 554,
    username: 'admin',
    password: '••••••••',
    fps: 30,
    isOnline: false,
    aiDetectionEnabled: true,
    autoZoomPlate: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cam_02',
    name: 'CAM 02 - Trạm trộn Bê Tông Trung Tâm',
    location: 'Silo Xi Măng 1 & 2',
    streamType: 'rtsp',
    streamUrl: 'rtsp://admin:CamerAI@2026@192.168.1.109:554/ch1/main',
    ipAddress: '192.168.1.109',
    port: 554,
    username: 'admin',
    password: '••••••••',
    fps: 25,
    isOnline: false,
    aiDetectionEnabled: true,
    autoZoomPlate: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'cam_03',
    name: 'CAM 03 - Cổng Xuất Bê Tông Ra Công Trường',
    location: 'Cổng chính Quốc Lộ 1A',
    streamType: 'simulation',
    streamUrl: 'rtsp://admin:CamerAI@2026@192.168.1.110:554/ch1/main',
    ipAddress: '192.168.1.110',
    port: 554,
    username: 'admin',
    password: '••••••••',
    fps: 30,
    isOnline: true,
    aiDetectionEnabled: true,
    autoZoomPlate: true,
    createdAt: '2026-01-03T00:00:00Z',
  },
]

export const INITIAL_EVENTS: DetectionResult[] = [
  {
    id: 'evt_01',
    timestamp: '2026-09-23T16:36:08Z',
    cameraId: 'cam_01',
    cameraName: 'CAM 01 - Cân xe / Khu sửa chữa',
    locationTag: 'CAN - KHU SUA CHUA',
    plateNumber: '51N-043.57',
    vehicleType: 'Xe bồn bê tông Howo 12m³',
    confidence: 98.6,
    isMatch: true,
    matchedVehicle: INITIAL_VEHICLES[0],
    status: 'passed',
    details: {
      color: 'Trắng / Xanh lá',
      brand: 'BÊ TÔNG XANH SÀI GÒN / HOWO',
      speedEstimate: '18 km/h',
    },
  },
  {
    id: 'evt_02',
    timestamp: '2026-09-23T15:20:12Z',
    cameraId: 'cam_01',
    cameraName: 'CAM 01 - Cân xe / Khu sửa chữa',
    locationTag: 'CAN - KHU SUA CHUA',
    plateNumber: '50H-123.45',
    vehicleType: 'Xe bồn Hyundai HD270 10m³',
    confidence: 96.2,
    isMatch: true,
    matchedVehicle: INITIAL_VEHICLES[1],
    status: 'passed',
    details: {
      color: 'Trắng',
      brand: 'BÊ TÔNG XANH SÀI GÒN',
      speedEstimate: '14 km/h',
    },
  },
]

export const INITIAL_SUPABASE: SupabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  tableNameVehicles: 'registered_vehicles',
  tableNameCameras: 'camera_configs',
  tableNameLogs: 'detection_logs',
  isConnected: false,
}

export const INITIAL_TELEGRAM: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  enabled: false,
  notifyOnAllVehicles: true,
}

// In-memory singletons across API routes (Node process memory)
declare global {
  var __cameraiVehicles: Vehicle[] | undefined
  var __cameraiCameras: CameraConfig[] | undefined
  var __cameraiLogs: DetectionResult[] | undefined
  var __cameraiTelegram: TelegramConfig | undefined
}

// Global Vehicles Store
export function getGlobalVehicles(): Vehicle[] {
  if (!globalThis.__cameraiVehicles) {
    globalThis.__cameraiVehicles = [...INITIAL_VEHICLES]
  }
  return globalThis.__cameraiVehicles
}

export function setGlobalVehicles(vehicles: Vehicle[]): Vehicle[] {
  globalThis.__cameraiVehicles = [...vehicles]
  return globalThis.__cameraiVehicles
}

export function addGlobalVehicle(vehicle: Vehicle): Vehicle {
  const current = getGlobalVehicles()
  // Add to top
  globalThis.__cameraiVehicles = [vehicle, ...current.filter((v) => v.id !== vehicle.id)]
  return vehicle
}

export function updateGlobalVehicle(vehicle: Vehicle): Vehicle | null {
  const current = getGlobalVehicles()
  const idx = current.findIndex((v) => v.id === vehicle.id)
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...vehicle }
    globalThis.__cameraiVehicles = [...current]
    return current[idx]
  }
  // If not found by ID, also check by plate number
  const cleanPlate = vehicle.plateNumber.replace(/[^A-Z0-9]/g, '')
  const plateIdx = current.findIndex((v) => v.plateNumber.replace(/[^A-Z0-9]/g, '') === cleanPlate)
  if (plateIdx !== -1) {
    current[plateIdx] = { ...current[plateIdx], ...vehicle }
    globalThis.__cameraiVehicles = [...current]
    return current[plateIdx]
  }
  // Otherwise push as new
  globalThis.__cameraiVehicles = [vehicle, ...current]
  return vehicle
}

export function deleteGlobalVehicle(idOrPlate: string): boolean {
  const current = getGlobalVehicles()
  const initialLen = current.length
  const cleanTarget = idOrPlate ? idOrPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
  globalThis.__cameraiVehicles = current.filter((v) => {
    if (v.id === idOrPlate) return false
    if (v.plateNumber === idOrPlate) return false
    if (cleanTarget && v.plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanTarget) return false
    return true
  })
  return globalThis.__cameraiVehicles.length < initialLen
}

// Global Cameras Store
export function getGlobalCameras(): CameraConfig[] {
  if (!globalThis.__cameraiCameras) {
    globalThis.__cameraiCameras = [...INITIAL_CAMERAS]
  }
  return globalThis.__cameraiCameras
}

export function setGlobalCameras(cameras: CameraConfig[]): CameraConfig[] {
  globalThis.__cameraiCameras = [...cameras]
  return globalThis.__cameraiCameras
}

export function addGlobalCamera(camera: CameraConfig): CameraConfig {
  const current = getGlobalCameras()
  globalThis.__cameraiCameras = [...current, camera]
  return camera
}

export function updateGlobalCamera(camera: CameraConfig): CameraConfig | null {
  const current = getGlobalCameras()
  const idx = current.findIndex((c) => c.id === camera.id)
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...camera }
    globalThis.__cameraiCameras = [...current]
    return current[idx]
  }
  globalThis.__cameraiCameras = [...current, camera]
  return camera
}

export function deleteGlobalCamera(id: string): boolean {
  const current = getGlobalCameras()
  const initialLen = current.length
  globalThis.__cameraiCameras = current.filter((c) => c.id !== id)
  return globalThis.__cameraiCameras.length < initialLen
}

// Global Detection Logs Store
export function getGlobalLogs(): DetectionResult[] {
  if (!globalThis.__cameraiLogs) {
    globalThis.__cameraiLogs = [...INITIAL_EVENTS]
  }
  return globalThis.__cameraiLogs
}

export function addGlobalLog(log: DetectionResult): DetectionResult {
  const current = getGlobalLogs()
  globalThis.__cameraiLogs = [log, ...current.slice(0, 99)]
  return log
}

export function deleteGlobalLog(id: string): boolean {
  const current = getGlobalLogs()
  const initialLen = current.length
  globalThis.__cameraiLogs = current.filter((l) => l.id !== id)
  return globalThis.__cameraiLogs.length < initialLen
}

export function clearGlobalLogs(): void {
  globalThis.__cameraiLogs = []
}

// In-memory singleton for Telegram config across API routes
export function getGlobalTelegramConfig(): TelegramConfig {
  if (!globalThis.__cameraiTelegram) {
    globalThis.__cameraiTelegram = {
      ...INITIAL_TELEGRAM,
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    }
  }
  return globalThis.__cameraiTelegram
}

export function setGlobalTelegramConfig(newConfig: Partial<TelegramConfig>): TelegramConfig {
  const current = getGlobalTelegramConfig()
  globalThis.__cameraiTelegram = {
    ...current,
    ...newConfig,
  }
  return globalThis.__cameraiTelegram
}
