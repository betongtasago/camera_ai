import { Vehicle, CameraConfig, DetectionResult, SupabaseConfig, TelegramConfig } from './types'

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh_01',
    plateNumber: '51N-043.57',
    driverName: 'Lê Văn Hùng',
    vehicleType: 'Xe bồn bê tông Howo 12m³',
    company: 'Bê Tông Xanh Sài Gòn',
    phoneNumber: '0903.112.445',
    status: 'approved',
    notes: 'Xe trạm trộn trung tâm, gắn đèn LED viền cabin',
    registeredAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'veh_02',
    plateNumber: '50H-123.45',
    driverName: 'Trần Văn Mạnh',
    vehicleType: 'Xe bồn Hyundai HD270 10m³',
    company: 'Bê Tông Xanh Sài Gòn',
    phoneNumber: '0912.889.332',
    status: 'approved',
    notes: 'Phục vụ tuyến công trình Quận 9 & Thủ Đức',
    registeredAt: '2026-02-10T09:30:00Z',
  },
  {
    id: 'veh_03',
    plateNumber: '60C-892.11',
    driverName: 'Nguyễn Quốc Tuấn',
    vehicleType: 'Xe tải ben Howo 4 chân chở đá mi',
    company: 'Vận tải Đông Nam Bộ',
    phoneNumber: '0988.441.229',
    status: 'approved',
    notes: 'Nhà cung cấp cốt liệu đá dăm & cát vàng',
    registeredAt: '2026-02-18T14:15:00Z',
  },
  {
    id: 'veh_04',
    plateNumber: '51D-998.12',
    driverName: 'Phạm Hoàng Nam',
    vehicleType: 'Xe bán tải Ford Ranger kỹ thuật',
    company: 'Ban Quản Lý Kỹ Thuật',
    phoneNumber: '0937.221.990',
    status: 'approved',
    notes: 'Xe kiểm định mác bê tông & thí nghiệm nén mẫu',
    registeredAt: '2026-03-01T07:45:00Z',
  },
  {
    id: 'veh_05',
    plateNumber: '29C-556.78',
    driverName: 'Đặng Đình Khoa',
    vehicleType: 'Xe tải thùng 8 tấn',
    company: 'Vãng lai chưa đăng ký',
    phoneNumber: '0902.999.111',
    status: 'restricted',
    notes: 'Cần bảo vệ kiểm tra giấy tờ trước khi cho vào trạm',
    registeredAt: '2026-03-10T11:00:00Z',
  },
]

export const INITIAL_CAMERAS: CameraConfig[] = [
  {
    id: 'cam_01',
    name: 'CAM 01 - Cân xe / Khu sửa chữa',
    location: 'CAN - KHU SUA CHUA',
    streamType: 'simulation',
    streamUrl: 'rtsp://admin:CamerAI@2026@192.168.1.108:554/ch1/main',
    ipAddress: '192.168.1.108',
    port: 554,
    username: 'admin',
    password: '••••••••',
    fps: 30,
    isOnline: true,
    aiDetectionEnabled: true,
    autoZoomPlate: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cam_02',
    name: 'CAM 02 - Trạm trộn Bê Tông Trung Tâm',
    location: 'Silo Xi Măng 1 & 2',
    streamType: 'simulation',
    streamUrl: 'rtsp://admin:CamerAI@2026@192.168.1.109:554/ch1/main',
    ipAddress: '192.168.1.109',
    port: 554,
    username: 'admin',
    password: '••••••••',
    fps: 25,
    isOnline: true,
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
  enabled: true,
  notifyOnAllVehicles: true,
}

// In-memory singleton for Telegram config across API routes
let currentTelegramConfig: TelegramConfig = { ...INITIAL_TELEGRAM }

export function getGlobalTelegramConfig(): TelegramConfig {
  return {
    ...currentTelegramConfig,
    botToken: currentTelegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: currentTelegramConfig.chatId || process.env.TELEGRAM_CHAT_ID || '',
  }
}

export function setGlobalTelegramConfig(newConfig: Partial<TelegramConfig>): TelegramConfig {
  currentTelegramConfig = {
    ...currentTelegramConfig,
    ...newConfig,
  }
  return currentTelegramConfig
}


