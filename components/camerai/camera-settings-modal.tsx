'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Camera,
  Database,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Server,
  Cloud,
  RefreshCw,
  Save,
  Network,
  Send,
  Bell,
  MessageSquare,
  HelpCircle,
  Copy,
  Check,
  Code,
  UploadCloud,
  Terminal,
  Radio,
  Activity,
  Wifi,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { CameraConfig } from '@/lib/types'
import { toast } from 'sonner'

interface CameraSettingsModalProps {
  currentCamera: CameraConfig
  cameras?: CameraConfig[]
  onCameraUpdated?: (cam: CameraConfig) => void
  onSelectCamera?: (cam: CameraConfig) => void
  onCameraAdded?: (cam: CameraConfig) => void
  onCameraDeleted?: (id: string) => void
}

export function CameraSettingsModal({
  currentCamera,
  cameras = [],
  onCameraUpdated,
  onSelectCamera,
  onCameraAdded,
  onCameraDeleted,
}: CameraSettingsModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'camera' | 'supabase' | 'telegram'>('supabase')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [cameraToDelete, setCameraToDelete] = useState<CameraConfig | null>(null)
  const [isDeletingCam, setIsDeletingCam] = useState(false)

  // Camera fields
  const [camName, setCamName] = useState(currentCamera.name)
  const [camLocation, setCamLocation] = useState(currentCamera.location)
  const [streamType, setStreamType] = useState(currentCamera.streamType)
  const [ipAddress, setIpAddress] = useState(currentCamera.ipAddress || '192.168.1.108')
  const [port, setPort] = useState(String(currentCamera.port || 554))
  const [username, setUsername] = useState(currentCamera.username || 'admin')
  const [password, setPassword] = useState('CamerAI@2026')
  const [showPassword, setShowPassword] = useState(false)
  const [streamUrl, setStreamUrl] = useState(
    currentCamera.streamUrl || 'rtsp://admin:••••••••@192.168.1.108:554/Streaming/Channels/101',
  )
  const [autoZoom, setAutoZoom] = useState(currentCamera.autoZoomPlate)
  const [aiDetection, setAiDetection] = useState(currentCamera.aiDetectionEnabled)

  // Camera connection test states
  const [isTestingCamera, setIsTestingCamera] = useState(false)
  const [cameraTestResult, setCameraTestResult] = useState<{
    success: boolean
    message: string
    latencyMs?: number
    resolution?: string
    fps?: number
    bitrate?: string
  } | null>(null)

  // Sync state whenever currentCamera prop changes
  useEffect(() => {
    if (!isCreatingNew) {
      setCamName(currentCamera.name)
      setCamLocation(currentCamera.location)
      setStreamType(currentCamera.streamType)
      setIpAddress(currentCamera.ipAddress || '192.168.1.108')
      setPort(String(currentCamera.port || 554))
      setUsername(currentCamera.username || 'admin')
      setStreamUrl(
        currentCamera.streamUrl ||
          `rtsp://${currentCamera.username || 'admin'}:••••••••@${currentCamera.ipAddress || '192.168.1.108'}:${currentCamera.port || 554}/Streaming/Channels/101`,
      )
      setAutoZoom(currentCamera.autoZoomPlate)
      setAiDetection(currentCamera.aiDetectionEnabled)
      setCameraTestResult(null)
    }
  }, [currentCamera, isCreatingNew])

  // Supabase fields
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isTestingSupabase, setIsTestingSupabase] = useState(false)
  const [isSavingSupabase, setIsSavingSupabase] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'connected' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [tablesFound, setTablesFound] = useState<string[]>([])
  const [sqlSchema, setSqlSchema] = useState('')
  const [showSqlSchema, setShowSqlSchema] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Telegram fields
  const [tgToken, setTgToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [showTgToken, setShowTgToken] = useState(false)
  const [tgEnabled, setTgEnabled] = useState(true)
  const [tgNotifyAll, setTgNotifyAll] = useState(true)
  const [isTestingTg, setIsTestingTg] = useState(false)
  const [isSavingTg, setIsSavingTg] = useState(false)

  // Load Supabase status from backend
  useEffect(() => {
    fetch('/api/supabase')
      .then((r) => r.json())
      .then((data) => {
        if (data.url) setSupabaseUrl(data.url)
        if (data.maskedKey) setSupabaseKey(data.maskedKey)
        if (data.sqlSchema) setSqlSchema(data.sqlSchema)

        if (data.connection?.success) {
          setSupabaseStatus('connected')
          setStatusMessage(data.connection.message)
          setTablesFound(data.connection.tablesFound || [])
        } else if (data.configured) {
          setSupabaseStatus('error')
          setStatusMessage(data.connection?.message || 'Chưa thể kết nối tới cơ sở dữ liệu Supabase')
        } else {
          setSupabaseStatus('idle')
          setStatusMessage('Chưa cấu hình Supabase Cloud (Đang chạy chế độ bộ nhớ đệm nội bộ)')
        }
      })
      .catch(() => {
        setSupabaseStatus('idle')
      })
  }, [])

  // Load Telegram config
  useEffect(() => {
    fetch('/api/telegram')
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setTgToken(data.config.rawToken || '')
          setTgChatId(data.config.chatId || '')
          setTgEnabled(data.config.enabled ?? true)
          setTgNotifyAll(data.config.notifyOnAllVehicles ?? true)
        }
      })
      .catch(() => {})
  }, [])

  // Save Telegram config
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingTg(true)
    try {
      const res = await fetch('/api/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tgToken,
          chatId: tgChatId,
          enabled: tgEnabled,
          notifyOnAllVehicles: tgNotifyAll,
        }),
      })

      if (res.ok) {
        toast.success('Đã lưu cấu hình thông báo Telegram!')
      } else {
        toast.error('Không thể lưu cấu hình Telegram')
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ')
    } finally {
      setIsSavingTg(false)
    }
  }

  // Send Test Message to Telegram
  const handleTestTelegram = async () => {
    setIsTestingTg(true)
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tgToken,
          chatId: tgChatId,
          testMessage: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Không thể gửi tin nhắn đến Telegram')
      }
    } catch {
      toast.error('Lỗi khi kiểm tra kết nối Telegram')
    } finally {
      setIsTestingTg(false)
    }
  }

  // Save or Create camera settings
  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isCreatingNew) {
        const newCam = {
          name: camName,
          location: camLocation,
          streamType,
          ipAddress,
          port: Number(port),
          username,
          streamUrl,
          autoZoomPlate: autoZoom,
          aiDetectionEnabled: aiDetection,
        }

        const res = await fetch('/api/cameras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCam),
        })

        const data = await res.json()
        if (res.ok && data.camera) {
          onCameraAdded?.(data.camera)
          setIsCreatingNew(false)
          toast.success(`Đã thêm kênh Camera mới [${camName}] thành công!`)
        } else {
          toast.error(data.error || 'Không thể tạo camera mới')
        }
      } else {
        const updated: CameraConfig = {
          ...currentCamera,
          name: camName,
          location: camLocation,
          streamType,
          ipAddress,
          port: Number(port),
          username,
          streamUrl,
          autoZoomPlate: autoZoom,
          aiDetectionEnabled: aiDetection,
        }

        const res = await fetch('/api/cameras', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })

        if (res.ok) {
          onCameraUpdated?.(updated)
          toast.success(`Đã lưu cấu hình Camera IP [${camName}] thành công!`)
        } else {
          toast.error('Không thể lưu cấu hình camera')
        }
      }
    } catch {
      toast.error('Lỗi khi kết nối với máy chủ')
    }
  }

  // Delete camera channel execution
  const handleExecuteDeleteCamera = async () => {
    if (!cameraToDelete) return
    setIsDeletingCam(true)
    try {
      const res = await fetch(`/api/cameras?id=${cameraToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Đã xóa kênh Camera [${cameraToDelete.name}] thành công!`)
        onCameraDeleted?.(cameraToDelete.id)
        setCameraToDelete(null)
      } else {
        toast.error('Không thể xóa camera')
      }
    } catch {
      toast.error('Lỗi khi xóa camera')
    } finally {
      setIsDeletingCam(false)
    }
  }

  // Test Camera IP Connection
  const handleTestCameraConnection = async () => {
    setIsTestingCamera(true)
    setCameraTestResult(null)
    try {
      const res = await fetch('/api/cameras/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCamera.id,
          name: camName,
          ipAddress,
          port: Number(port),
          streamType,
          streamUrl,
          username,
          password,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setCameraTestResult({
          success: true,
          message: data.message,
          latencyMs: data.latencyMs,
          resolution: data.resolution,
          fps: data.fps,
          bitrate: data.bitrate,
        })
        toast.success(data.message)
      } else {
        setCameraTestResult({
          success: false,
          message: data.error || 'Không thể kết nối đến camera IP',
        })
        toast.error(data.error || 'Lỗi kết nối camera IP')
      }
    } catch {
      setCameraTestResult({
        success: false,
        message: 'Lỗi kiểm tra kết nối mạng với Camera IP',
      })
      toast.error('Lỗi khi kiểm tra kết nối camera')
    } finally {
      setIsTestingCamera(false)
    }
  }

  // Test Supabase connection
  const handleTestSupabase = async () => {
    setIsTestingSupabase(true)
    try {
      if (!supabaseUrl.trim() || !supabaseUrl.startsWith('https://')) {
        toast.error('URL Supabase không hợp lệ (cần bắt đầu bằng https://...)')
        setSupabaseStatus('error')
        setIsTestingSupabase(false)
        return
      }

      const res = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          url: supabaseUrl.trim(),
          key: supabaseKey.trim(),
        }),
      })

      const result = await res.json()
      if (result.success) {
        setSupabaseStatus('connected')
        setStatusMessage(result.message)
        setTablesFound(result.tablesFound || [])
        toast.success(result.message)
      } else {
        setSupabaseStatus('error')
        setStatusMessage(result.message || 'Lỗi kết nối Supabase')
        toast.error(result.message || 'Không thể kết nối tới Supabase')
      }
    } catch {
      setSupabaseStatus('error')
      toast.error('Lỗi khi gửi yêu cầu kiểm tra kết nối Supabase')
    } finally {
      setIsTestingSupabase(false)
    }
  }

  // Save Supabase credentials
  const handleSaveSupabase = async () => {
    setIsSavingSupabase(true)
    try {
      const res = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          url: supabaseUrl.trim(),
          key: supabaseKey.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSupabaseStatus('connected')
        setStatusMessage(data.message)
        toast.success('Đã lưu cấu hình kết nối Supabase thành công!')
      } else {
        toast.warning(data.message || 'Đã lưu nhưng chưa thể xác thực cơ sở dữ liệu')
      }
    } catch {
      toast.error('Lỗi khi lưu thông tin Supabase')
    } finally {
      setIsSavingSupabase(false)
    }
  }

  // Seed sample data to Supabase
  const handleSeedData = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        handleTestSupabase()
      } else {
        toast.error(data.error || 'Chưa thể đồng bộ dữ liệu')
      }
    } catch {
      toast.error('Lỗi khi đồng bộ dữ liệu sang Supabase')
    } finally {
      setIsSeeding(false)
    }
  }

  // Copy SQL Schema
  const handleCopySql = () => {
    if (!sqlSchema) return
    navigator.clipboard.writeText(sqlSchema)
    setCopiedSql(true)
    toast.success('Đã sao chép mã SQL vào bộ nhớ đệm!')
    setTimeout(() => setCopiedSql(false), 2500)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Cấu Hình Hệ Thống & Bảo Mật Dữ Liệu
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lưu trữ cơ sở dữ liệu qua Vercel + Supabase PostgreSQL, quản lý Camera IP và Bot Telegram
          </p>
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
          <Button
            size="sm"
            variant={activeSubTab === 'supabase' ? 'default' : 'ghost'}
            onClick={() => setActiveSubTab('supabase')}
            className="text-xs h-8"
          >
            <Database className="w-3.5 h-3.5 mr-1.5" />
            Vercel + Supabase Cloud
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === 'camera' ? 'default' : 'ghost'}
            onClick={() => setActiveSubTab('camera')}
            className="text-xs h-8"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Camera IP (RTSP)
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === 'telegram' ? 'default' : 'ghost'}
            onClick={() => setActiveSubTab('telegram')}
            className="text-xs h-8"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Thông Báo Telegram
          </Button>
        </div>
      </div>

      {/* Sub Tab 1: Supabase & Vercel Integration */}
      {activeSubTab === 'supabase' && (
        <div className="space-y-5">
          {/* Security Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-foreground">
              <span className="font-semibold text-emerald-400">Kiến Trúc Bảo Mật Vercel + Supabase:</span> Toàn bộ danh
              mục xe, thông tin camera IP, nhật ký nhận diện và khóa bí mật được lưu trữ tập trung trên{' '}
              <strong>Supabase PostgreSQL</strong>. Mọi truy vấn đều thông qua API Serverless an toàn trên Vercel, kích
              hoạt <strong>Row Level Security (RLS)</strong> để không lưu thẳng vào bộ nhớ máy khách hay lộ ra trình
              duyệt.
            </div>
          </div>

          {/* Connection Status Banner */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Trạng thái Cơ sở dữ liệu Cloud:</span>
                {supabaseStatus === 'connected' ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ĐÃ KẾT NỐI SUPABASE ({tablesFound.length}/4 Bảng)
                  </Badge>
                ) : supabaseStatus === 'error' ? (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    LỖI KẾT NỐI
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                    CHẾ ĐỘ NỘI BỘ (Chưa kết nối Supabase)
                  </Badge>
                )}
              </div>
              {statusMessage && <p className="text-[11px] text-muted-foreground font-mono">{statusMessage}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={isTestingSupabase}
                onClick={handleTestSupabase}
                className="text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                {isTestingSupabase ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </Button>

              <Button size="sm" disabled={isSavingSupabase} onClick={handleSaveSupabase} className="text-xs h-8">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSavingSupabase ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supabase Project URL *</Label>
              <Input
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Lấy từ Supabase Dashboard &gt; Project Settings &gt; API
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supabase Service Role Key / Secret Key *</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Khóa bí mật dùng cho backend serverless để bảo mật quyền ghi
              </p>
            </div>
          </div>

          {/* Quick Actions & SQL Schema */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="text-xs h-8"
              >
                <Code className="w-3.5 h-3.5 mr-1.5" />
                {showSqlSchema ? 'Ẩn mã SQL' : 'Xem mã SQL tạo 4 bảng Supabase'}
              </Button>

              <Button type="button" variant="outline" size="sm" onClick={handleCopySql} className="text-xs h-8">
                {copiedSql ? (
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                )}
                {copiedSql ? 'Đã sao chép SQL!' : 'Sao chép SQL'}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSeeding}
              onClick={handleSeedData}
              className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
            >
              <UploadCloud className={`w-3.5 h-3.5 mr-1.5 ${isSeeding ? 'animate-bounce' : ''}`} />
              {isSeeding ? 'Đang đồng bộ...' : 'Đồng bộ danh mục xe & camera sang Supabase'}
            </Button>
          </div>

          {/* Collapsible SQL Schema Viewer */}
          {showSqlSchema && (
            <div className="rounded-xl border border-border bg-slate-950 p-4 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Mã SQL tạo bảng Supabase (Paste vào Supabase SQL Editor rồi bấm RUN)
                </span>
                <Button size="sm" variant="ghost" onClick={handleCopySql} className="h-6 text-xs px-2">
                  {copiedSql ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
              <pre className="max-h-64 overflow-y-auto text-emerald-400 whitespace-pre-wrap leading-relaxed text-[11px]">
                {sqlSchema}
              </pre>
            </div>
          )}

          {/* Vercel Environment Variables Guide */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Server className="w-4 h-4 text-primary" />
              Cấu hình biến môi trường trên Vercel Dashboard (Production Deployment):
            </div>
            <p className="text-muted-foreground">
              Khi deploy lên Vercel, vào mục <strong>Settings &gt; Environment Variables</strong> của project trên
              Vercel và thêm:
            </p>
            <div className="bg-card p-3 rounded-lg border border-border space-y-1 font-mono text-[11px]">
              <div>
                <span className="text-primary font-bold">SUPABASE_URL</span> ={' '}
                <code>https://your-project.supabase.co</code>
              </div>
              <div>
                <span className="text-primary font-bold">SUPABASE_SERVICE_ROLE_KEY</span> ={' '}
                <code>eyJhbGciOi... (Khóa bí mật Supabase)</code>
              </div>
              <div>
                <span className="text-primary font-bold">JWT_SECRET</span> ={' '}
                <code>camerai_super_secret_jwt_key_2026_production</code>
              </div>
              <div>
                <span className="text-primary font-bold">TELEGRAM_BOT_TOKEN</span> ={' '}
                <code>7123456789:AAFlmK8...XyZ123456789</code>
              </div>
              <div>
                <span className="text-primary font-bold">TELEGRAM_CHAT_ID</span> = <code>987654321</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Camera IP Config */}
      {activeSubTab === 'camera' && (
        <div className="space-y-4">
          {/* Camera Channels Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground px-1">Kênh Camera:</span>
              {cameras.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false)
                    onSelectCamera?.(c)
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    !isCreatingNew && currentCamera.id === c.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-card hover:bg-muted text-foreground border border-border'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {!isCreatingNew ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreatingNew(true)
                    setCamName(`CAM 0${cameras.length + 1} - Lối Vào Cổng Phụ`)
                    setCamLocation('CAN - CONG PHU')
                    setIpAddress('192.168.1.109')
                    setPort('554')
                    setUsername('admin')
                    setStreamUrl('rtsp://admin:••••••••@192.168.1.109:554/Streaming/Channels/101')
                    setCameraTestResult(null)
                  }}
                  className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10"
                >
                  + Thêm Camera Mới
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreatingNew(false)
                    onSelectCamera?.(currentCamera)
                  }}
                  className="text-xs h-8 text-muted-foreground"
                >
                  Hủy tạo mới
                </Button>
              )}

              {!isCreatingNew && cameras.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCameraToDelete(currentCamera)}
                  className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                  title="Xóa kênh camera này"
                >
                  Xóa kênh
                </Button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveCamera} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tên Camera *</Label>
                <Input
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  placeholder="CAM 01 - Cân xe / Khu sửa chữa"
                  className="text-sm"
                  required
                />
              </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vị trí hiển thị trên OSD *</Label>
              <Input
                value={camLocation}
                onChange={(e) => setCamLocation(e.target.value)}
                placeholder="CAN - KHU SUA CHUA"
                className="font-mono text-sm uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Giao thức truyền luồng</Label>
              <select
                value={streamType}
                onChange={(e) => setStreamType(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="simulation">Mô phỏng Bãi cân AI (Khuyến nghị)</option>
                <option value="rtsp">RTSP IP Camera Trực Tiếp</option>
                <option value="mjpeg">MJPEG Stream</option>
                <option value="hls">HLS / WebRTC</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Địa chỉ IP Camera</Label>
              <Input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.108"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cổng kết nối (Port)</Label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="554"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tài khoản RTSP Camera (Username)</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mật khẩu Camera (Được mã hóa)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu bảo vệ camera"
                  className="pr-10 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">RTSP Stream Path / URL đầy đủ</Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {ipAddress}:{port}
              </span>
            </div>
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://admin:pass@192.168.1.108:554/Streaming/Channels/101"
              className="font-mono text-xs text-foreground bg-muted/30"
            />
          </div>

          {/* Test Camera Connection Button & Result Panel */}
          <div className="border border-border/80 rounded-xl p-4 bg-muted/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  Kiểm Tra Kết Nối Camera IP Thực Tế
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Gửi gói tin ping và kiểm tra cổng RTSP ({ipAddress}:{port}) theo cấu hình
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestCameraConnection}
                disabled={isTestingCamera || !ipAddress.trim()}
                className="text-xs border-primary/40 hover:bg-primary/10 text-primary font-semibold h-8"
              >
                <Radio className={`w-3.5 h-3.5 mr-1.5 ${isTestingCamera ? 'animate-pulse text-amber-500' : ''}`} />
                {isTestingCamera ? 'Đang Kiểm Tra IP...' : 'Kiểm Tra Kết Nối Camera'}
              </Button>
            </div>

            {/* Diagnostic Result */}
            {cameraTestResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 animate-in fade-in duration-300 ${
                  cameraTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {cameraTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span>{cameraTestResult.message}</span>
                </div>

                {cameraTestResult.success && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-foreground">
                    <div className="bg-background/80 p-1.5 rounded border border-border">
                      <span className="text-muted-foreground block text-[10px]">ĐỘ TRỄ (PING):</span>
                      <span className="font-bold text-emerald-500">{cameraTestResult.latencyMs} ms</span>
                    </div>
                    <div className="bg-background/80 p-1.5 rounded border border-border">
                      <span className="text-muted-foreground block text-[10px]">ĐỘ PHÂN GIẢI:</span>
                      <span className="font-bold">{cameraTestResult.resolution}</span>
                    </div>
                    <div className="bg-background/80 p-1.5 rounded border border-border">
                      <span className="text-muted-foreground block text-[10px]">TỐC ĐỘ KHUNG HÌNH:</span>
                      <span className="font-bold">{cameraTestResult.fps} FPS</span>
                    </div>
                    <div className="bg-background/80 p-1.5 rounded border border-border">
                      <span className="text-muted-foreground block text-[10px]">BĂNG THÔNG:</span>
                      <span className="font-bold">{cameraTestResult.bitrate}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Settings switches */}
          <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tính năng AI nâng cao
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Tự động Zoom vùng biển số xe (Top-Left Zoom Box)
                </div>
                <div className="text-xs text-muted-foreground">
                  Phóng to biển số xe vào ô chữ nhật góc trên bên trái màn hình như ảnh thực tế
                </div>
              </div>
              <Switch checked={autoZoom} onCheckedChange={setAutoZoom} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Nhận diện phương tiện & Đối soát danh sách tự động
                </div>
                <div className="text-xs text-muted-foreground">
                  Khung viền xanh bám theo xe, tự động đọc biển số và đối chiếu danh mục xe đã đăng ký
                </div>
              </div>
              <Switch checked={aiDetection} onCheckedChange={setAiDetection} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="text-sm h-10 px-5">
              <Save className="w-4 h-4 mr-1.5" />
              {isCreatingNew ? 'Thêm Kênh Camera Mới' : 'Lưu Cấu Hình Camera'}
            </Button>
          </div>
        </form>

        {/* Dialog: Delete Camera Confirmation */}
        <Dialog open={Boolean(cameraToDelete)} onOpenChange={(open) => !open && setCameraToDelete(null)}>
          <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Xóa Kênh Camera
              </DialogTitle>
              <DialogDescription className="text-xs">
                Bạn có chắc chắn muốn gỡ kênh Camera{' '}
                <strong className="text-foreground font-semibold">[{cameraToDelete?.name}]</strong> khỏi hệ thống?
              </DialogDescription>
            </DialogHeader>

            {cameraToDelete && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs space-y-1">
                <div>Vị trí: <span className="font-mono text-foreground font-semibold">{cameraToDelete.location}</span></div>
                <div>Địa chỉ IP: <span className="font-mono text-foreground">{cameraToDelete.ipAddress}:{cameraToDelete.port}</span></div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setCameraToDelete(null)} disabled={isDeletingCam}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleExecuteDeleteCamera} disabled={isDeletingCam}>
                {isDeletingCam && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Xác nhận xóa camera
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {/* Sub Tab 3: Telegram Bot Notification */}
      {activeSubTab === 'telegram' && (
        <form onSubmit={handleSaveTelegram} className="space-y-4">
          <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-xl flex items-start gap-3">
            <Send className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-foreground">
              <span className="font-semibold text-sky-400">Thông Báo Tức Thì Qua Telegram:</span> Mỗi khi camera AI phát
              hiện và zoom biển số xe chạy qua trạm, hệ thống sẽ tự động gửi tin nhắn báo cáo (biển số xe, tên tài xế,
              loại xe, thời gian, vị trí camera) về kênh hoặc nhóm Telegram của bạn.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telegram Bot Token *</Label>
              <div className="relative">
                <Input
                  type={showTgToken ? 'text' : 'password'}
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="Ví dụ: 7123456789:AAFlkjw9823k4j1234..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTgToken(!showTgToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showTgToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Lấy từ bot @BotFather trên Telegram</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telegram Chat ID / Group ID *</Label>
              <Input
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                placeholder="Ví dụ: -100123456789 hoặc @ten_nhom_xe"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">ID người nhận hoặc ID nhóm chat kiểm soát xe</p>
            </div>
          </div>

          {/* Options */}
          <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Tự động gửi thông báo khi camera phát hiện xe
                </div>
                <div className="text-xs text-muted-foreground">
                  Gửi tin nhắn Telegram ngay khi xe di chuyển vào vùng quét của camera
                </div>
              </div>
              <Switch checked={tgEnabled} onCheckedChange={setTgEnabled} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div>
                <div className="text-sm font-semibold text-foreground">Gửi thông báo cho tất cả xe</div>
                <div className="text-xs text-muted-foreground">
                  {tgNotifyAll
                    ? 'Bật: Gửi cả xe đã đăng ký và xe ngoài danh mục'
                    : 'Tắt: Chỉ gửi khi phát hiện xe lạ chưa đăng ký'}
                </div>
              </div>
              <Switch checked={tgNotifyAll} onCheckedChange={setTgNotifyAll} />
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-primary" />
              Cách tạo Telegram Bot & Lấy Chat ID trong 1 phút:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1">
              <li>
                Mở Telegram, gõ tìm <strong>@BotFather</strong>, gửi lệnh <code>/newbot</code> rồi làm theo hướng dẫn để
                nhận <strong>HTTP API Token</strong>.
              </li>
              <li>
                Tạo một nhóm Telegram (ví dụ: &quot;Báo Cáo Xe Qua Trạm Cân&quot;) và thêm Bot vừa tạo vào nhóm với tư
                cách Quản trị viên (Admin).
              </li>
              <li>
                Thêm bot <strong>@userinfobot</strong> hoặc gửi tin nhắn vào nhóm rồi mở{' '}
                <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> để xem Chat ID.
              </li>
              <li>
                Dán Token và Chat ID vào 2 ô trên, bấm <strong>&quot;Gửi tin nhắn thử nghiệm&quot;</strong> để kiểm tra.
              </li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestTelegram}
              disabled={isTestingTg}
              className="text-xs h-9 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
            >
              <Send className={`w-3.5 h-3.5 mr-1.5 ${isTestingTg ? 'animate-bounce' : ''}`} />
              {isTestingTg ? 'Đang gửi thử...' : 'Gửi Tin Nhắn Thử Nghiệm'}
            </Button>

            <Button type="submit" disabled={isSavingTg} className="text-xs h-9 px-4">
              <Save className="w-4 h-4 mr-1.5" />
              {isSavingTg ? 'Đang lưu...' : 'Lưu Cấu Hình Telegram'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
