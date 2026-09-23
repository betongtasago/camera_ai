export type UserRole = 'admin' | 'operator'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
}

export interface Vehicle {
  id: string
  plateNumber: string // e.g. "51N-043.57"
  driverName: string // e.g. "Lê Văn Hùng"
  vehicleType: string // e.g. "Xe bồn bê tông Howo 12m³"
  company: string // e.g. "Bê Tông Xanh Sài Gòn"
  phoneNumber?: string
  status: 'approved' | 'restricted' | 'blacklisted'
  notes?: string
  registeredAt: string
}

export interface CameraConfig {
  id: string
  name: string // e.g. "CAM 01 - Cân xe / Khu sửa chữa"
  location: string // e.g. "Cổng vào trạm cân"
  streamType: 'simulation' | 'rtsp' | 'mjpeg' | 'hls' | 'webcam'
  streamUrl?: string
  ipAddress?: string
  port?: number
  username?: string
  password?: string // encrypted/masked in UI
  fps?: number
  isOnline: boolean
  aiDetectionEnabled: boolean
  autoZoomPlate: boolean
  createdAt: string
}

export interface DetectionResult {
  id: string
  timestamp: string
  cameraId: string
  cameraName: string
  locationTag: string // e.g. "CAN - KHU SUA CHUA"
  plateNumber: string
  vehicleType: string
  confidence: number // 0-100%
  isMatch: boolean
  matchedVehicle?: Vehicle
  zoomPlateSnippet?: string // Base64 or canvas data
  status: 'passed' | 'warning' | 'rejected' | 'restricted'
  details?: {
    color?: string
    brand?: string
    speedEstimate?: string
  }
}

export interface SupabaseConfig {
  url: string
  anonKey: string
  tableNameVehicles: string
  tableNameCameras: string
  tableNameLogs: string
  isConnected: boolean
  lastSyncAt?: string
}

export interface TelegramConfig {
  botToken: string
  chatId: string
  enabled: boolean
  notifyOnAllVehicles: boolean
  lastSentAt?: string
}
