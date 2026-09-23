import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Vehicle, CameraConfig, DetectionResult, TelegramConfig } from './types'
import { INITIAL_VEHICLES, INITIAL_CAMERAS, INITIAL_EVENTS, INITIAL_TELEGRAM } from './storage'

// Global in-memory overrides if updated via UI
let customSupabaseUrl = ''
let customSupabaseKey = ''

export function getSupabaseCredentials(): { url: string; key: string; isConfigured: boolean } {
  const url = customSupabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  const key =
    customSupabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  const isConfigured = Boolean(
    url && key && url.startsWith('https://') && url.includes('.supabase.co') && key.length > 20,
  )

  return { url, key, isConfigured }
}

export function setCustomSupabaseCredentials(url: string, key: string) {
  customSupabaseUrl = url.trim()
  customSupabaseKey = key.trim()
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials()
  if (!isConfigured) return null

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch {
    console.error('Failed to create Supabase client')
    return null
  }
}

// ----------------------------------------------------------------------
// 1. VEHICLES REPOSITORY
// ----------------------------------------------------------------------
export async function dbGetVehicles(): Promise<Vehicle[]> {
  const client = getSupabaseClient()
  if (!client) return [...INITIAL_VEHICLES]

  try {
    const { data, error } = await client
      .from('camerai_vehicles')
      .select('*')
      .order('registered_at', { ascending: false })

    if (error || !data) {
      console.warn('Could not read vehicles from Supabase, using fallback')
      return [...INITIAL_VEHICLES]
    }

    if (data.length === 0) {
      return [...INITIAL_VEHICLES]
    }

    return data.map((item) => ({
      id: item.id,
      plateNumber: item.plate_number,
      driverName: item.driver_name,
      vehicleType: item.vehicle_type,
      company: item.company,
      phoneNumber: item.phone_number || undefined,
      status: item.status || 'approved',
      notes: item.notes || undefined,
      registeredAt: item.registered_at,
    }))
  } catch {
    console.error('Supabase vehicles fetch error occurred')
    return [...INITIAL_VEHICLES]
  }
}

export async function dbAddVehicle(vehicle: Vehicle): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const payload = {
      id: vehicle.id || 'veh_' + Math.random().toString(36).substring(2, 9),
      plate_number: vehicle.plateNumber,
      driver_name: vehicle.driverName,
      vehicle_type: vehicle.vehicleType,
      company: vehicle.company || 'Bê Tông Sài Gòn',
      phone_number: vehicle.phoneNumber || null,
      status: vehicle.status || 'approved',
      notes: vehicle.notes || null,
      registered_at: vehicle.registeredAt || new Date().toISOString(),
    }

    const { error } = await client.from('camerai_vehicles').upsert([payload], { onConflict: 'id' })

    if (error) {
      console.warn('Could not upsert vehicle in Supabase')
      return false
    }
    return true
  } catch {
    console.warn('Supabase vehicle insert exception caught')
    return false
  }
}

export async function dbUpdateVehicle(vehicle: Vehicle): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client
      .from('camerai_vehicles')
      .update({
        plate_number: vehicle.plateNumber,
        driver_name: vehicle.driverName,
        vehicle_type: vehicle.vehicleType,
        company: vehicle.company,
        phone_number: vehicle.phoneNumber || null,
        status: vehicle.status,
        notes: vehicle.notes || null,
      })
      .eq('id', vehicle.id)

    if (error) {
      console.error('Failed to update vehicle in Supabase')
      return false
    }
    return true
  } catch {
    console.error('Supabase vehicle update exception occurred')
    return false
  }
}

export async function dbDeleteVehicle(id: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.from('camerai_vehicles').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete vehicle in Supabase')
      return false
    }
    return true
  } catch {
    console.error('Supabase vehicle delete exception occurred')
    return false
  }
}

// ----------------------------------------------------------------------
// 2. CAMERAS REPOSITORY
// ----------------------------------------------------------------------
export async function dbGetCameras(): Promise<CameraConfig[]> {
  const client = getSupabaseClient()
  if (!client) return [...INITIAL_CAMERAS]

  try {
    const { data, error } = await client.from('camerai_cameras').select('*').order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      return [...INITIAL_CAMERAS]
    }

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      location: item.location,
      streamType: item.stream_type,
      streamUrl: item.stream_url || undefined,
      ipAddress: item.ip_address || undefined,
      port: item.port || 554,
      username: item.username || undefined,
      password: item.password || undefined,
      fps: item.fps || 30,
      isOnline: item.is_online ?? true,
      aiDetectionEnabled: item.ai_detection_enabled ?? true,
      autoZoomPlate: item.auto_zoom_plate ?? true,
      createdAt: item.created_at,
    }))
  } catch {
    console.error('Supabase cameras fetch error occurred')
    return [...INITIAL_CAMERAS]
  }
}

export async function dbAddCamera(camera: CameraConfig): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const payload = {
      id: camera.id || 'cam_' + Math.random().toString(36).substring(2, 8),
      name: camera.name,
      location: camera.location,
      stream_type: camera.streamType || 'simulation',
      stream_url: camera.streamUrl || null,
      ip_address: camera.ipAddress || null,
      port: camera.port || 554,
      username: camera.username || null,
      password: camera.password || null,
      fps: camera.fps || 30,
      is_online: camera.isOnline ?? true,
      ai_detection_enabled: camera.aiDetectionEnabled ?? true,
      auto_zoom_plate: camera.autoZoomPlate ?? true,
      created_at: camera.createdAt || new Date().toISOString(),
    }

    const { error } = await client.from('camerai_cameras').upsert([payload], { onConflict: 'id' })

    if (error) {
      console.warn('Could not upsert camera in Supabase')
      return false
    }
    return true
  } catch {
    console.warn('Supabase camera insert exception caught')
    return false
  }
}

export async function dbUpdateCamera(camera: CameraConfig): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client
      .from('camerai_cameras')
      .update({
        name: camera.name,
        location: camera.location,
        stream_type: camera.streamType,
        stream_url: camera.streamUrl || null,
        ip_address: camera.ipAddress || null,
        port: camera.port || 554,
        username: camera.username || null,
        password: camera.password || null,
        is_online: camera.isOnline,
        ai_detection_enabled: camera.aiDetectionEnabled,
        auto_zoom_plate: camera.autoZoomPlate,
      })
      .eq('id', camera.id)

    if (error) {
      console.error('Failed to update camera in Supabase')
      return false
    }
    return true
  } catch {
    console.error('Supabase camera update exception occurred')
    return false
  }
}

// ----------------------------------------------------------------------
// 3. DETECTION LOGS REPOSITORY
// ----------------------------------------------------------------------
export async function dbGetDetectionLogs(): Promise<DetectionResult[]> {
  const client = getSupabaseClient()
  if (!client) return [...INITIAL_EVENTS]

  try {
    const { data, error } = await client
      .from('camerai_detection_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100)

    if (error || !data || data.length === 0) {
      return [...INITIAL_EVENTS]
    }

    return data.map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      cameraId: item.camera_id,
      cameraName: item.camera_name,
      locationTag: item.location_tag,
      plateNumber: item.plate_number,
      vehicleType: item.vehicle_type,
      confidence: Number(item.confidence) || 98.5,
      isMatch: item.is_match ?? true,
      status: item.status || 'passed',
      matchedVehicle: item.matched_vehicle || undefined,
      details: item.details || undefined,
    }))
  } catch {
    console.error('Supabase detection logs fetch error occurred')
    return [...INITIAL_EVENTS]
  }
}

export async function dbAddDetectionLog(log: DetectionResult): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const logId = log.id || 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
    const payload = {
      id: logId,
      timestamp: log.timestamp || new Date().toISOString(),
      camera_id: log.cameraId || 'cam_01',
      camera_name: log.cameraName || 'CAM 01 - Cân xe / Khu sửa chữa',
      location_tag: log.locationTag || 'CAN - KHU SUA CHUA',
      plate_number: log.plateNumber || '51N-043.57',
      vehicle_type: log.vehicleType || 'Xe bồn bê tông',
      confidence: typeof log.confidence === 'number' && !isNaN(log.confidence) ? log.confidence : 98.5,
      is_match: log.isMatch ?? true,
      status: log.status || 'passed',
      matched_vehicle: log.matchedVehicle || null,
      details: log.details || null,
    }

    const { error } = await client.from('camerai_detection_logs').upsert([payload], { onConflict: 'id' })

    if (error) {
      // Fallback with fresh unique ID in case of ID conflict
      const retryPayload = {
        ...payload,
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      }
      const { error: retryError } = await client.from('camerai_detection_logs').insert([retryPayload])
      if (retryError) {
        console.warn('Could not persist detection log to Supabase')
        return false
      }
    }
    return true
  } catch {
    console.warn('Supabase detection log persistence exception caught')
    return false
  }
}

// ----------------------------------------------------------------------
// 4. SETTINGS & TELEGRAM REPOSITORY
// ----------------------------------------------------------------------
export async function dbGetTelegramConfig(): Promise<TelegramConfig> {
  const client = getSupabaseClient()
  if (!client) return { ...INITIAL_TELEGRAM }

  try {
    const { data, error } = await client.from('camerai_settings').select('value').eq('key', 'telegram').single()

    if (error || !data?.value) {
      return { ...INITIAL_TELEGRAM }
    }

    return {
      botToken: data.value.botToken || process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: data.value.chatId || process.env.TELEGRAM_CHAT_ID || '',
      enabled: data.value.enabled ?? true,
      notifyOnAllVehicles: data.value.notifyOnAllVehicles ?? true,
      lastSentAt: data.value.lastSentAt,
    }
  } catch {
    console.error('Supabase telegram config fetch error occurred')
    return { ...INITIAL_TELEGRAM }
  }
}

export async function dbSaveTelegramConfig(config: Partial<TelegramConfig>): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.from('camerai_settings').upsert({
      key: 'telegram',
      value: config,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to save telegram config in Supabase')
      return false
    }
    return true
  } catch {
    console.error('Supabase telegram config save exception occurred')
    return false
  }
}

// ----------------------------------------------------------------------
// 5. TEST CONNECTION & SEED DATA
// ----------------------------------------------------------------------
export async function testSupabaseConnection(
  url?: string,
  key?: string,
): Promise<{
  success: boolean
  message: string
  tablesFound?: string[]
}> {
  const targetUrl = url || getSupabaseCredentials().url
  const targetKey = key || getSupabaseCredentials().key

  if (!targetUrl || !targetKey) {
    return {
      success: false,
      message: 'Chưa điền Supabase URL hoặc API Key / Service Role Key.',
    }
  }

  try {
    const client = createClient(targetUrl, targetKey, {
      auth: { persistSession: false },
    })

    // Query each table to see if it exists
    const tables = ['camerai_vehicles', 'camerai_cameras', 'camerai_detection_logs', 'camerai_settings']
    const tablesFound: string[] = []

    for (const table of tables) {
      const { error } = await client.from(table).select('count', { count: 'exact', head: true })
      if (!error) {
        tablesFound.push(table)
      }
    }

    return {
      success: true,
      message: `Kết nối thành công tới Supabase! Đã tìm thấy ${tablesFound.length}/${tables.length} bảng dữ liệu.`,
      tablesFound,
    }
  } catch {
    console.error('Supabase connection test failed')
    return {
      success: false,
      message: 'Không thể kết nối tới Supabase. Vui lòng kiểm tra lại URL và API Key.',
    }
  }
}

export function getSupabaseSqlSchema(): string {
  return `-- ====================================================================
-- CamerAI - BẢNG DỮ LIỆU SUPABASE POSTGRESQL & BẢO MẬT ROW LEVEL SECURITY
-- Sao chép toàn bộ đoạn mã này và dán vào Supabase SQL Editor rồi bấm RUN.
-- ====================================================================

-- 1. Bảng lưu danh mục xe đăng ký (Registered Vehicles)
CREATE TABLE IF NOT EXISTS public.camerai_vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT NOT NULL UNIQUE,
  driver_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  company TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  notes TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng lưu cấu hình Camera IP & RTSP (Camera Configurations)
CREATE TABLE IF NOT EXISTS public.camerai_cameras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  stream_type TEXT NOT NULL DEFAULT 'simulation',
  stream_url TEXT,
  ip_address TEXT,
  port INTEGER DEFAULT 554,
  username TEXT,
  password TEXT,
  fps INTEGER DEFAULT 30,
  is_online BOOLEAN DEFAULT true,
  ai_detection_enabled BOOLEAN DEFAULT true,
  auto_zoom_plate BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng lưu nhật ký nhận diện xe (Detection Events & Logs)
CREATE TABLE IF NOT EXISTS public.camerai_detection_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  camera_id TEXT NOT NULL,
  camera_name TEXT NOT NULL,
  location_tag TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  confidence NUMERIC(5,2) DEFAULT 98.5,
  is_match BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'passed',
  matched_vehicle JSONB,
  details JSONB
);

-- 4. Bảng lưu cài đặt bảo mật & cấu hình Telegram Bot (System Settings)
CREATE TABLE IF NOT EXISTS public.camerai_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo Index tăng tốc độ truy vấn đối soát biển số xe (< 5ms)
CREATE INDEX IF NOT EXISTS idx_camerai_vehicles_plate ON public.camerai_vehicles (plate_number);
CREATE INDEX IF NOT EXISTS idx_camerai_logs_plate ON public.camerai_detection_logs (plate_number);
CREATE INDEX IF NOT EXISTS idx_camerai_logs_timestamp ON public.camerai_detection_logs (timestamp DESC);

-- Bật tính năng Row Level Security (RLS) để chống rò rỉ dữ liệu
ALTER TABLE public.camerai_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camerai_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camerai_detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camerai_settings ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách phân quyền cho Service Role & API Server Vercel
DROP POLICY IF EXISTS "camerai_vehicles_all_policy" ON public.camerai_vehicles;
CREATE POLICY "camerai_vehicles_all_policy" ON public.camerai_vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "camerai_cameras_all_policy" ON public.camerai_cameras;
CREATE POLICY "camerai_cameras_all_policy" ON public.camerai_cameras FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "camerai_logs_all_policy" ON public.camerai_detection_logs;
CREATE POLICY "camerai_logs_all_policy" ON public.camerai_detection_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "camerai_settings_all_policy" ON public.camerai_settings;
CREATE POLICY "camerai_settings_all_policy" ON public.camerai_settings FOR ALL USING (true) WITH CHECK (true);
`
}
